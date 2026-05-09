use std::thread;
use std::time::{Duration, Instant};

use reqwest::blocking::Client;
use serde::Deserialize;
use serde_json::json;

const CLIENT_ID: &str = "pentavault-cli";
const DEVICE_GRANT_TYPE: &str = "urn:ietf:params:oauth:grant-type:device_code";
const DEFAULT_API_ORIGIN: &str = "http://localhost:3001";
const DEFAULT_DEVICE_CODE_EXPIRES_IN_SECONDS: u64 = 600;
const DEFAULT_DEVICE_POLL_INTERVAL_SECONDS: u64 = 5;

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

impl ApiClient {
    pub fn new(api_url: Option<&str>) -> Result<Self, String> {
        let base_url = normalize_api_origin(api_url.unwrap_or(DEFAULT_API_ORIGIN))?;
        let http = Client::builder()
            .timeout(Duration::from_secs(15))
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
}
