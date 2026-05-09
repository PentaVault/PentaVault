use std::thread;
use std::time::{Duration, Instant};

use reqwest::blocking::Client;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use serde::{Deserialize, Serialize};
use serde_json::json;

const CLIENT_ID: &str = "pentavault-cli";
const DEVICE_GRANT_TYPE: &str = "urn:ietf:params:oauth:grant-type:device_code";
const DEFAULT_API_ORIGIN: &str = "http://localhost:3001";
const DEFAULT_DEVICE_CODE_EXPIRES_IN_SECONDS: u64 = 600;
const DEFAULT_DEVICE_POLL_INTERVAL_SECONDS: u64 = 5;
const USER_AGENT: &str = concat!("PentaVault CLI/", env!("CARGO_PKG_VERSION"));

#[derive(Debug, Deserialize)]
pub struct DeviceCode {
    pub device_code: String,
    pub user_code: String,
    pub verification_uri: String,
    pub expires_in: Option<u64>,
    pub interval: Option<u64>,
}

#[derive(Debug)]
pub enum PollResult {
    Authorized(String),
    Pending,
    SlowDown,
    Denied,
    Expired,
}

#[derive(Debug, Deserialize)]
struct DeviceTokenResponse {
    access_token: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

pub struct ApiClient {
    base_url: String,
    http: Client,
}

#[derive(Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliProject {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub visibility: String,
    pub status: String,
    pub role: Option<String>,
    pub can_access: bool,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliProjectsResponse {
    pub active_organization_id: Option<String>,
    pub active_organization_slug: Option<String>,
    pub projects: Vec<CliProject>,
}

#[derive(Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliEnvironment {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub color: String,
    pub is_default: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliEnvironmentsResponse {
    pub project_id: String,
    pub environments: Vec<CliEnvironment>,
}

#[derive(Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliSecret {
    pub id: String,
    pub name: String,
    pub project_id: String,
    pub environment: String,
    pub environment_id: Option<String>,
    pub mode: String,
    pub scope: String,
    pub status: String,
    pub version: Option<i64>,
    pub current_version_id: String,
    pub is_sensitive: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliSecretsResponse {
    pub project_id: String,
    pub environment: String,
    pub environment_id: Option<String>,
    pub secrets: Vec<CliSecret>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliSecretValueResponse {
    pub project_id: String,
    pub environment: String,
    pub environment_id: Option<String>,
    pub secret: CliSecret,
    pub value: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliSecretValuesResponse {
    pub project_id: String,
    pub environment: String,
    pub environment_id: Option<String>,
    pub values: std::collections::BTreeMap<String, String>,
}

impl ApiClient {
    pub fn new(api_url: Option<&str>) -> Result<Self, String> {
        let base_url = normalize_api_origin(api_url.unwrap_or(DEFAULT_API_ORIGIN))?;
        let http = Client::builder()
            .timeout(Duration::from_secs(15))
            .user_agent(USER_AGENT)
            .build()
            .map_err(|error| format!("unable to create HTTP client: {error}"))?;

        Ok(Self { base_url, http })
    }

    pub fn request_device_code(&self) -> Result<DeviceCode, String> {
        let response = self
            .http
            .post(self.url("/api/auth/device/code"))
            .json(&json!({
                "client_id": CLIENT_ID,
                "scope": "openid profile email",
            }))
            .send()
            .map_err(|error| format!("unable to start device login: {error}"))?;

        if !response.status().is_success() {
            return Err(format!(
                "device login failed with HTTP status {}",
                response.status()
            ));
        }

        response
            .json::<DeviceCode>()
            .map_err(|error| format!("unable to parse device login response: {error}"))
            .and_then(|code| {
                if code.device_code.trim().is_empty()
                    || code.user_code.trim().is_empty()
                    || code.verification_uri.trim().is_empty()
                {
                    Err("device login response was missing required fields".to_owned())
                } else {
                    Ok(code)
                }
            })
    }

    pub fn poll_device_token(&self, device_code: &str) -> Result<PollResult, String> {
        let response = self
            .http
            .post(self.url("/api/auth/device/token"))
            .json(&json!({
                "grant_type": DEVICE_GRANT_TYPE,
                "device_code": device_code,
                "client_id": CLIENT_ID,
            }))
            .send()
            .map_err(|error| format!("unable to poll device login: {error}"))?;
        let status = response.status();
        let payload = response
            .json::<DeviceTokenResponse>()
            .map_err(|error| format!("unable to parse device token response: {error}"))?;

        if let Some(token) = payload
            .access_token
            .filter(|token| !token.trim().is_empty())
        {
            return Ok(PollResult::Authorized(token));
        }

        match payload.error.as_deref() {
            Some("authorization_pending") => Ok(PollResult::Pending),
            Some("slow_down") => Ok(PollResult::SlowDown),
            Some("access_denied") => Ok(PollResult::Denied),
            Some("expired_token") => Ok(PollResult::Expired),
            Some(error) => Err(format!(
                "device login failed: {}",
                payload
                    .error_description
                    .unwrap_or_else(|| error.to_owned())
            )),
            None => Err(format!("device login failed with HTTP status {status}")),
        }
    }

    pub fn wait_for_device_token(&self, code: &DeviceCode) -> Result<String, String> {
        let mut interval = Duration::from_secs(
            code.interval
                .unwrap_or(DEFAULT_DEVICE_POLL_INTERVAL_SECONDS)
                .max(1),
        );
        let timeout = Duration::from_secs(
            code.expires_in
                .unwrap_or(DEFAULT_DEVICE_CODE_EXPIRES_IN_SECONDS),
        );
        let expires_at = Instant::now() + timeout;

        loop {
            if Instant::now() >= expires_at {
                return Err("device login expired. Run `pv login` again.".to_owned());
            }

            thread::sleep(interval);

            match self.poll_device_token(&code.device_code)? {
                PollResult::Authorized(token) => return Ok(token),
                PollResult::Pending => {}
                PollResult::SlowDown => interval += Duration::from_secs(5),
                PollResult::Denied => return Err("device login was denied.".to_owned()),
                PollResult::Expired => {
                    return Err("device login expired. Run `pv login` again.".to_owned());
                }
            }
        }
    }

    pub fn list_projects(&self, token: &str) -> Result<CliProjectsResponse, String> {
        self.get_json(token, "/api/v1/cli/projects", &[])
    }

    pub fn list_environments(
        &self,
        token: &str,
        project_id: &str,
    ) -> Result<CliEnvironmentsResponse, String> {
        self.get_json(
            token,
            &format!("/api/v1/cli/projects/{project_id}/environments"),
            &[],
        )
    }

    pub fn list_secrets(
        &self,
        token: &str,
        project_id: &str,
        environment: &str,
    ) -> Result<CliSecretsResponse, String> {
        self.get_json(
            token,
            &format!("/api/v1/cli/projects/{project_id}/secrets"),
            &[("environment", environment)],
        )
    }

    pub fn get_secret(
        &self,
        token: &str,
        project_id: &str,
        environment: &str,
        name: &str,
    ) -> Result<CliSecretValueResponse, String> {
        self.get_json(
            token,
            &format!("/api/v1/cli/projects/{project_id}/secrets/{name}"),
            &[("environment", environment)],
        )
    }

    pub fn get_secret_values(
        &self,
        token: &str,
        project_id: &str,
        environment: &str,
        purpose: &str,
    ) -> Result<CliSecretValuesResponse, String> {
        self.get_json(
            token,
            &format!("/api/v1/cli/projects/{project_id}/secrets/values"),
            &[("environment", environment), ("purpose", purpose)],
        )
    }

    pub fn display_url(&self, value: &str) -> String {
        if value.starts_with("http://") || value.starts_with("https://") {
            value.to_owned()
        } else {
            format!("{}{}", self.base_url, value)
        }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    fn get_json<T: for<'de> Deserialize<'de>>(
        &self,
        token: &str,
        path: &str,
        query: &[(&str, &str)],
    ) -> Result<T, String> {
        let response = self
            .http
            .get(self.url(path))
            .headers(auth_headers(token)?)
            .query(query)
            .send()
            .map_err(|error| format!("request failed: {error}"))?;
        let status = response.status();

        if !status.is_success() {
            let body = response.text().unwrap_or_default();
            return Err(if body.trim().is_empty() {
                format!("request failed with HTTP status {status}")
            } else {
                format!("request failed with HTTP status {status}: {body}")
            });
        }

        response
            .json::<T>()
            .map_err(|error| format!("unable to parse API response: {error}"))
    }
}

fn auth_headers(token: &str) -> Result<HeaderMap, String> {
    let token = token.trim();
    if token.is_empty() {
        return Err("authentication token is empty".to_owned());
    }

    let mut headers = HeaderMap::new();
    let bearer = HeaderValue::from_str(&format!("Bearer {token}"))
        .map_err(|error| format!("invalid authentication token: {error}"))?;
    headers.insert(AUTHORIZATION, bearer);

    if token.starts_with("pvk_") {
        let api_key = HeaderValue::from_str(token)
            .map_err(|error| format!("invalid API key credential: {error}"))?;
        headers.insert("x-pv-api-key", api_key);
    }

    Ok(headers)
}

fn normalize_api_origin(input: &str) -> Result<String, String> {
    let trimmed = input.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("API URL cannot be empty".to_owned());
    }

    let without_api_suffix = trimmed.strip_suffix("/api").unwrap_or(trimmed);
    if !(without_api_suffix.starts_with("http://") || without_api_suffix.starts_with("https://")) {
        return Err("API URL must start with http:// or https://".to_owned());
    }

    Ok(without_api_suffix.to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_api_suffix_from_configured_api_url() {
        assert_eq!(
            normalize_api_origin("http://localhost:3001/api").expect("url"),
            "http://localhost:3001"
        );
    }

    #[test]
    fn auth_headers_support_bearer_and_fallback_api_keys() {
        let bearer_headers = auth_headers("session_token").expect("headers");
        assert_eq!(
            bearer_headers
                .get(AUTHORIZATION)
                .expect("authorization")
                .to_str()
                .expect("header"),
            "Bearer session_token"
        );
        assert!(bearer_headers.get("x-pv-api-key").is_none());

        let api_key_headers = auth_headers("pvk_secret").expect("headers");
        assert_eq!(
            api_key_headers
                .get("x-pv-api-key")
                .expect("api key")
                .to_str()
                .expect("header"),
            "pvk_secret"
        );
    }
}
