//! Signature Version 4 for a single call: `sts:GetCallerIdentity`.
//!
//! PentaVault's AWS authentication method works by having the workload sign
//! that call with the credentials it already has, then replaying the signed
//! request server-side so AWS itself reports who signed it. Nothing here talks
//! to AWS — it only produces the request PentaVault will replay.
//!
//! Only the one operation is signed, and the canonical request is built from a
//! fixed header set, so this is deliberately not a general-purpose signer.

use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

use ring::{digest, hmac};

/// Header carrying the auth method's audience. It is signed, which is what
/// stops a `GetCallerIdentity` signature made for anything else being replayed
/// against PentaVault.
pub const AUDIENCE_HEADER: &str = "x-pentavault-audience";

const ALGORITHM: &str = "AWS4-HMAC-SHA256";
const SERVICE: &str = "sts";
const BODY: &str = "Action=GetCallerIdentity&Version=2011-06-15";
const CONTENT_TYPE: &str = "application/x-www-form-urlencoded";

/// Credentials read from the workload's environment.
#[derive(Debug)]
pub struct AwsCredentials {
    pub access_key_id: String,
    pub secret_access_key: String,
    pub session_token: Option<String>,
}

impl AwsCredentials {
    /// Reads the standard environment variables an AWS runtime exports.
    ///
    /// Deliberately no instance-metadata fallback: reaching a link-local
    /// address to fetch credentials is a meaningful amount of behaviour to hide
    /// inside a CLI flag. Where the environment does not already carry
    /// credentials, export them first — every AWS SDK and the `aws` CLI can.
    pub fn from_env() -> Result<Self, String> {
        let access_key_id = required_env("AWS_ACCESS_KEY_ID")?;
        let secret_access_key = required_env("AWS_SECRET_ACCESS_KEY")?;
        let session_token = std::env::var("AWS_SESSION_TOKEN")
            .ok()
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty());

        Ok(Self {
            access_key_id,
            secret_access_key,
            session_token,
        })
    }
}

fn required_env(name: &str) -> Result<String, String> {
    std::env::var(name)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| format!("{name} is not set; export AWS credentials before signing"))
}

/// The pieces PentaVault needs in order to replay the request.
#[derive(Debug)]
pub struct SignedRequest {
    pub method: &'static str,
    pub url: String,
    pub headers: BTreeMap<String, String>,
    pub body: &'static str,
}

/// Resolves the STS endpoint. `None` selects the global endpoint, which signs
/// against us-east-1 — the server derives exactly the same pair, so a mismatch
/// is caught before anything is replayed.
pub fn endpoint_for_region(region: Option<&str>) -> (String, String) {
    match region {
        Some(region) => (
            format!("sts.{region}.amazonaws.com"),
            region.to_ascii_lowercase(),
        ),
        None => ("sts.amazonaws.com".to_owned(), "us-east-1".to_owned()),
    }
}

pub fn sign_get_caller_identity(
    credentials: &AwsCredentials,
    region: Option<&str>,
    audience: &str,
) -> Result<SignedRequest, String> {
    sign_with_timestamp(credentials, region, audience, current_amz_date()?)
}

/// Split out so the signature can be checked against a known-good vector.
pub fn sign_with_timestamp(
    credentials: &AwsCredentials,
    region: Option<&str>,
    audience: &str,
    amz_date: String,
) -> Result<SignedRequest, String> {
    if audience.trim().is_empty() {
        return Err("an audience is required to bind the signature to PentaVault".to_owned());
    }
    let (host, signing_region) = endpoint_for_region(region);
    let date_stamp = amz_date
        .get(..8)
        .ok_or_else(|| "the timestamp is malformed".to_owned())?
        .to_owned();

    // BTreeMap keeps the canonical header list sorted, which SigV4 requires.
    let mut headers: BTreeMap<String, String> = BTreeMap::new();
    headers.insert("content-type".to_owned(), CONTENT_TYPE.to_owned());
    headers.insert("host".to_owned(), host.clone());
    headers.insert("x-amz-date".to_owned(), amz_date.clone());
    headers.insert(AUDIENCE_HEADER.to_owned(), audience.trim().to_owned());
    if let Some(token) = &credentials.session_token {
        // Signed rather than merely sent: an unsigned session token could be
        // swapped for another, which would change who AWS reports.
        headers.insert("x-amz-security-token".to_owned(), token.clone());
    }

    let signed_headers = headers.keys().cloned().collect::<Vec<_>>().join(";");
    let canonical_headers = headers
        .iter()
        .map(|(name, value)| format!("{name}:{}\n", value.trim()))
        .collect::<String>();

    let canonical_request = format!(
        "POST\n/\n\n{canonical_headers}\n{signed_headers}\n{}",
        hex_digest(BODY.as_bytes())
    );

    let scope = format!("{date_stamp}/{signing_region}/{SERVICE}/aws4_request");
    let string_to_sign = format!(
        "{ALGORITHM}\n{amz_date}\n{scope}\n{}",
        hex_digest(canonical_request.as_bytes())
    );

    let signature = hex(&derive_signature(
        &credentials.secret_access_key,
        &date_stamp,
        &signing_region,
        string_to_sign.as_bytes(),
    ));

    headers.insert(
        "authorization".to_owned(),
        format!(
            "{ALGORITHM} Credential={}/{scope}, SignedHeaders={signed_headers}, Signature={signature}",
            credentials.access_key_id
        ),
    );

    Ok(SignedRequest {
        method: "POST",
        url: format!("https://{host}/"),
        headers,
        body: BODY,
    })
}

fn derive_signature(
    secret_access_key: &str,
    date_stamp: &str,
    region: &str,
    string_to_sign: &[u8],
) -> Vec<u8> {
    let key = signing_key(secret_access_key, date_stamp, region, SERVICE);
    hmac_sha256(&key, string_to_sign)
}

/// The four-step derivation from the SigV4 specification. `service` is a
/// parameter only so the tests can check it against AWS's published vector,
/// which is stated for `iam`.
fn signing_key(secret_access_key: &str, date_stamp: &str, region: &str, service: &str) -> Vec<u8> {
    let mut key = hmac_sha256(
        format!("AWS4{secret_access_key}").as_bytes(),
        date_stamp.as_bytes(),
    );
    key = hmac_sha256(&key, region.as_bytes());
    key = hmac_sha256(&key, service.as_bytes());
    hmac_sha256(&key, b"aws4_request")
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
    let key = hmac::Key::new(hmac::HMAC_SHA256, key);
    hmac::sign(&key, data).as_ref().to_vec()
}

fn hex_digest(data: &[u8]) -> String {
    hex(digest::digest(&digest::SHA256, data).as_ref())
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

/// Formats the current instant as `YYYYMMDDTHHMMSSZ`.
fn current_amz_date() -> Result<String, String> {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "the system clock is before the Unix epoch".to_owned())?
        .as_secs();
    Ok(format_amz_date(seconds))
}

/// Civil date from a Unix timestamp, so no date library is needed for the one
/// timestamp format SigV4 uses.
pub fn format_amz_date(seconds: u64) -> String {
    let days = (seconds / 86_400) as i64;
    let time_of_day = seconds % 86_400;

    // Days shifted so the year starts in March, which makes the leap day the
    // last day of the cycle and removes it from the month-length arithmetic.
    let shifted = days + 719_468;
    let era = shifted.div_euclid(146_097);
    let day_of_era = shifted.rem_euclid(146_097);
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let shifted_month = (5 * day_of_year + 2) / 153;

    let day = day_of_year - (153 * shifted_month + 2) / 5 + 1;
    let month = if shifted_month < 10 {
        shifted_month + 3
    } else {
        shifted_month - 9
    };
    let year = year_of_era + era * 400 + i64::from(month <= 2);

    format!(
        "{year:04}{month:02}{day:02}T{:02}{:02}{:02}Z",
        time_of_day / 3_600,
        (time_of_day % 3_600) / 60,
        time_of_day % 60
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn credentials() -> AwsCredentials {
        AwsCredentials {
            access_key_id: "AKIDEXAMPLE".to_owned(),
            secret_access_key: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY".to_owned(),
            session_token: None,
        }
    }

    #[test]
    fn formats_a_timestamp_the_way_sigv4_expects() {
        assert_eq!(format_amz_date(0), "19700101T000000Z");
        assert_eq!(format_amz_date(1_771_070_400), "20260214T120000Z");
        // Non-zero minutes and seconds, so the time-of-day split is covered.
        assert_eq!(format_amz_date(1_755_090_203), "20250813T130323Z");
        // A leap day, which the shifted-year arithmetic exists to get right.
        assert_eq!(format_amz_date(1_709_164_800), "20240229T000000Z");
    }

    #[test]
    fn derives_the_signing_key_published_by_aws() {
        // AWS states this value for secret `wJalr...`, 20150830, us-east-1,
        // iam. Matching it proves the four-step derivation is the real one and
        // not merely self-consistent.
        assert_eq!(
            hex(&signing_key(
                "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
                "20150830",
                "us-east-1",
                "iam",
            )),
            "c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9"
        );
    }

    #[test]
    fn signs_a_request_the_server_will_accept() {
        let signed = sign_with_timestamp(
            &credentials(),
            None,
            "pentavault",
            "20260813T120000Z".to_owned(),
        )
        .expect("signs");

        assert_eq!(signed.method, "POST");
        assert_eq!(signed.url, "https://sts.amazonaws.com/");
        assert_eq!(signed.body, "Action=GetCallerIdentity&Version=2011-06-15");
        assert_eq!(signed.headers.get("host").unwrap(), "sts.amazonaws.com");
        assert_eq!(signed.headers.get(AUDIENCE_HEADER).unwrap(), "pentavault");

        // Pinned against a signature computed by a separate implementation, so
        // this covers the canonical request byte for byte — a stray newline or
        // a header in the wrong order would change it.
        assert_eq!(
            signed.headers.get("authorization").expect("authorization"),
            "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20260813/us-east-1/sts/aws4_request, \
             SignedHeaders=content-type;host;x-amz-date;x-pentavault-audience, \
             Signature=088f6b4a77ec0e8f8ea2a82cb7a1a388a11fdd3a70da9c41008659563f6925dc"
        );
    }

    #[test]
    fn signs_the_session_token_when_one_is_present() {
        let mut creds = credentials();
        creds.session_token = Some("session-token".to_owned());

        let signed =
            sign_with_timestamp(&creds, None, "pentavault", "20260813T120000Z".to_owned()).unwrap();

        assert_eq!(
            signed.headers.get("x-amz-security-token").unwrap(),
            "session-token"
        );
        assert!(signed
            .headers
            .get("authorization")
            .unwrap()
            .contains("x-amz-security-token"));
    }

    #[test]
    fn targets_the_regional_endpoint_and_signs_for_that_region() {
        let signed = sign_with_timestamp(
            &credentials(),
            Some("eu-west-1"),
            "pentavault",
            "20260813T120000Z".to_owned(),
        )
        .unwrap();

        assert_eq!(signed.url, "https://sts.eu-west-1.amazonaws.com/");
        assert_eq!(
            signed.headers.get("host").unwrap(),
            "sts.eu-west-1.amazonaws.com"
        );
        assert!(signed
            .headers
            .get("authorization")
            .unwrap()
            .contains("/eu-west-1/sts/aws4_request"));
    }

    #[test]
    fn produces_a_different_signature_for_a_different_audience() {
        let one =
            sign_with_timestamp(&credentials(), None, "a", "20260813T120000Z".to_owned()).unwrap();
        let two =
            sign_with_timestamp(&credentials(), None, "b", "20260813T120000Z".to_owned()).unwrap();

        assert_ne!(
            one.headers.get("authorization"),
            two.headers.get("authorization")
        );
    }

    #[test]
    fn refuses_an_empty_audience() {
        let error = sign_with_timestamp(&credentials(), None, "   ", "20260813T120000Z".to_owned())
            .unwrap_err();
        assert!(error.contains("audience"));
    }

    #[test]
    fn endpoint_pairs_host_with_its_signing_region() {
        assert_eq!(
            endpoint_for_region(None),
            ("sts.amazonaws.com".to_owned(), "us-east-1".to_owned())
        );
        assert_eq!(
            endpoint_for_region(Some("ap-south-1")),
            (
                "sts.ap-south-1.amazonaws.com".to_owned(),
                "ap-south-1".to_owned()
            )
        );
    }
}
