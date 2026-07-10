use std::thread;
use std::time::{Duration, Instant};

use percent_encoding::{utf8_percent_encode, AsciiSet, CONTROLS};
use reqwest::blocking::Client;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use reqwest::redirect::Policy;
use serde::{Deserialize, Serialize};
use serde_json::json;

const CLIENT_ID: &str = "pentavault-cli";
const DEVICE_GRANT_TYPE: &str = "urn:ietf:params:oauth:grant-type:device_code";
const DEFAULT_API_ORIGIN: &str = "http://localhost:3001";
const DEFAULT_DEVICE_CODE_EXPIRES_IN_SECONDS: u64 = 600;
const DEFAULT_DEVICE_POLL_INTERVAL_SECONDS: u64 = 5;
const MAX_ERROR_MESSAGE_LENGTH: usize = 1_024;
const USER_AGENT: &str = concat!("PentaVault CLI/", env!("CARGO_PKG_VERSION"));
const PATH_SEGMENT_ENCODE_SET: &AsciiSet = &CONTROLS
    .add(b' ')
    .add(b'"')
    .add(b'#')
    .add(b'%')
    .add(b'/')
    .add(b':')
    .add(b'<')
    .add(b'>')
    .add(b'?')
    .add(b'@')
    .add(b'[')
    .add(b'\\')
    .add(b']')
    .add(b'^')
    .add(b'`')
    .add(b'{')
    .add(b'|')
    .add(b'}');

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

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthSessionResponse {
    pub session: AuthSession,
    pub user: AuthUser,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthSession {
    pub id: Option<String>,
    pub expires_at: Option<String>,
    pub active_organization_id: Option<String>,
    pub active_organization_slug: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthUser {
    pub id: Option<String>,
    pub email: Option<String>,
    pub name: Option<String>,
    pub username: Option<String>,
    pub email_verified: bool,
    pub two_factor_enabled: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliOrganization {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub active: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliOrganizationMembership {
    pub role: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliOrganizationEntry {
    pub organization: CliOrganization,
    pub membership: CliOrganizationMembership,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CliOrganizationsResponse {
    pub organizations: Vec<CliOrganizationEntry>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveOrganizationResponse {
    pub active_organization_id: Option<String>,
    pub active_organization_slug: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliApiKey {
    pub id: String,
    pub name: Option<String>,
    pub start: Option<String>,
    pub prefix: Option<String>,
    pub enabled: bool,
    pub expires_at: Option<String>,
    pub created_at: String,
    pub last_request: Option<String>,
    pub request_count: u64,
    pub source: String,
    pub token_type: String,
    pub organization_id: Option<String>,
    pub organization_name: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliApiKeysResponse {
    pub api_keys: Vec<CliApiKey>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedApiKeyMetadata {
    pub id: Option<String>,
    pub name: Option<String>,
    pub start: Option<String>,
    pub prefix: Option<String>,
    pub expires_at: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateApiKeyResponse {
    pub header_name: String,
    pub key: String,
    pub api_key: CreatedApiKeyMetadata,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RevokeApiKeyResponse {
    pub revoked: bool,
    pub api_key_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RevokeCliSessionResponse {
    pub revoked: bool,
    pub session_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliAccessRequest {
    pub id: String,
    pub project_id: String,
    pub organization_id: String,
    pub requester_id: String,
    pub requested_role: String,
    pub message: Option<String>,
    pub status: String,
    pub reviewed_by: Option<String>,
    pub reviewer_note: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CliAccessRequestResponse {
    pub request: CliAccessRequest,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CliAccessRequestsResponse {
    pub requests: Vec<CliAccessRequest>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelAccessRequestResponse {
    pub cancelled: bool,
    pub request_id: String,
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
pub struct CliConfig {
    pub id: String,
    pub project_id: String,
    pub environment_id: String,
    pub parent_config_id: Option<String>,
    #[serde(rename = "type")]
    pub config_type: String,
    pub name: String,
    pub slug: String,
    pub is_protected: bool,
    pub visibility: Option<String>,
    pub can_edit: Option<bool>,
    pub can_share: Option<bool>,
    pub is_personal_default: Option<bool>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliConfigsResponse {
    pub project_id: String,
    pub configs: Vec<CliConfig>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CliConfigResponse {
    pub config: CliConfig,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliChangeRequest {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub source_config_id: String,
    pub target_config_id: String,
    pub requested_by_user_id: String,
    pub created_at: String,
    #[serde(default)]
    pub items: Vec<serde_json::Value>,
    #[serde(default)]
    pub approvals: Vec<serde_json::Value>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CliChangeRequestsResponse {
    pub requests: Vec<CliChangeRequest>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CliChangeRequestResponse {
    pub request: CliChangeRequest,
}

pub struct CreateChangeRequestInput<'a> {
    pub source_config_id: &'a str,
    pub target_config_id: Option<&'a str>,
    pub title: &'a str,
    pub description: Option<&'a str>,
    pub all_keys: bool,
    pub secret_names: &'a [String],
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
    pub fn new(api_url: Option<&str>, allow_insecure_http: bool) -> Result<Self, String> {
        let base_url =
            normalize_api_origin(api_url.unwrap_or(DEFAULT_API_ORIGIN), allow_insecure_http)?;
        let http = Client::builder()
            .connect_timeout(Duration::from_secs(5))
            .timeout(Duration::from_secs(15))
            .redirect(Policy::none())
            .user_agent(USER_AGENT)
            .build()
            .map_err(|error| format!("unable to create HTTP client: {error}"))?;

        Ok(Self { base_url, http })
    }

    pub fn session(&self, token: &str) -> Result<AuthSessionResponse, String> {
        self.get_json(token, "/api/v1/auth/session", &[])
    }

    pub fn list_organizations(&self, token: &str) -> Result<CliOrganizationsResponse, String> {
        self.get_json(token, "/api/v1/auth/organizations", &[])
    }

    pub fn set_active_organization(
        &self,
        token: &str,
        organization: &str,
    ) -> Result<ActiveOrganizationResponse, String> {
        self.post_json(
            token,
            "/api/v1/auth/organizations/active",
            &json!({ "organizationId": organization }),
        )
    }

    pub fn list_api_keys(&self, token: &str) -> Result<CliApiKeysResponse, String> {
        self.get_json(token, "/api/v1/auth/api-keys", &[])
    }

    pub fn create_api_key(
        &self,
        token: &str,
        name: Option<&str>,
        token_type: &str,
        organization_id: Option<&str>,
        permissions: &[&str],
    ) -> Result<CreateApiKeyResponse, String> {
        self.post_json(
            token,
            "/api/v1/auth/api-keys",
            &json!({
                "name": name,
                "organizationId": organization_id,
                "tokenType": token_type,
                "permissions": { "proxy": permissions },
            }),
        )
    }

    pub fn revoke_api_key(
        &self,
        token: &str,
        api_key_id: &str,
    ) -> Result<RevokeApiKeyResponse, String> {
        self.post_json(
            token,
            &format!(
                "/api/v1/auth/api-keys/{}/revoke",
                encode_path_segment(api_key_id)
            ),
            &json!({}),
        )
    }

    pub fn revoke_cli_session(
        &self,
        token: &str,
        session_id: &str,
    ) -> Result<RevokeCliSessionResponse, String> {
        self.delete_json(
            token,
            &format!("/api/v1/cli/sessions/{}", encode_path_segment(session_id)),
        )
    }

    pub fn create_access_request(
        &self,
        token: &str,
        project_id: &str,
        message: Option<&str>,
    ) -> Result<CliAccessRequestResponse, String> {
        self.post_json(
            token,
            &format!(
                "/api/v1/projects/{}/access-requests",
                encode_path_segment(project_id)
            ),
            &json!({ "requestedRole": "member", "message": message }),
        )
    }

    pub fn list_access_requests(
        &self,
        token: &str,
        project_id: Option<&str>,
        status: Option<&str>,
    ) -> Result<CliAccessRequestsResponse, String> {
        let mut query = Vec::new();
        if let Some(project_id) = project_id {
            query.push(("projectId", project_id));
        }
        if let Some(status) = status {
            query.push(("status", status));
        }
        self.get_json(token, "/api/v1/access-requests/mine", &query)
    }

    pub fn cancel_access_request(
        &self,
        token: &str,
        request_id: &str,
    ) -> Result<CancelAccessRequestResponse, String> {
        self.delete_json(
            token,
            &format!(
                "/api/v1/access-requests/{}",
                encode_path_segment(request_id)
            ),
        )
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
            &format!(
                "/api/v1/cli/projects/{}/environments",
                encode_path_segment(project_id)
            ),
            &[],
        )
    }

    pub fn list_configs(
        &self,
        token: &str,
        project_id: &str,
    ) -> Result<CliConfigsResponse, String> {
        self.get_json(
            token,
            &format!(
                "/api/v1/cli/projects/{}/configs",
                encode_path_segment(project_id)
            ),
            &[],
        )
    }

    pub fn create_config(
        &self,
        token: &str,
        project_id: &str,
        environment_id: &str,
        name: &str,
        slug: &str,
        parent_config_id: Option<&str>,
    ) -> Result<CliConfigResponse, String> {
        self.post_json(
            token,
            &format!(
                "/api/v1/projects/{}/configs",
                encode_path_segment(project_id)
            ),
            &json!({
                "environmentId": environment_id,
                "name": name,
                "slug": slug,
                "parentConfigId": parent_config_id,
            }),
        )
    }

    pub fn list_change_requests(
        &self,
        token: &str,
        project_id: &str,
    ) -> Result<CliChangeRequestsResponse, String> {
        self.get_json(
            token,
            &format!(
                "/api/v1/projects/{}/change-requests",
                encode_path_segment(project_id)
            ),
            &[],
        )
    }

    pub fn create_change_request(
        &self,
        token: &str,
        project_id: &str,
        input: CreateChangeRequestInput<'_>,
    ) -> Result<CliChangeRequestResponse, String> {
        self.post_json(
            token,
            &format!(
                "/api/v1/projects/{}/change-requests",
                encode_path_segment(project_id)
            ),
            &json!({
                "sourceConfigId": input.source_config_id,
                "targetConfigId": input.target_config_id,
                "title": input.title,
                "description": input.description,
                "allKeys": input.all_keys,
                "secretNames": input.secret_names,
            }),
        )
    }

    pub fn change_request_action(
        &self,
        token: &str,
        project_id: &str,
        request_id: &str,
        action: &str,
    ) -> Result<CliChangeRequestResponse, String> {
        debug_assert!(matches!(action, "approve" | "merge" | "cancel"));
        self.post_json(
            token,
            &format!(
                "/api/v1/projects/{}/change-requests/{}/{}",
                encode_path_segment(project_id),
                encode_path_segment(request_id),
                action
            ),
            &json!({}),
        )
    }

    pub fn list_secrets(
        &self,
        token: &str,
        project_id: &str,
        environment: &str,
        config: Option<&str>,
    ) -> Result<CliSecretsResponse, String> {
        let mut query = vec![("environment", environment)];
        if let Some(config) = config {
            query.push(("config", config));
        }
        self.get_json(
            token,
            &format!(
                "/api/v1/cli/projects/{}/secrets",
                encode_path_segment(project_id)
            ),
            &query,
        )
    }

    pub fn get_secret(
        &self,
        token: &str,
        project_id: &str,
        environment: &str,
        config: Option<&str>,
        name: &str,
    ) -> Result<CliSecretValueResponse, String> {
        let mut query = vec![("environment", environment)];
        if let Some(config) = config {
            query.push(("config", config));
        }
        self.get_json(
            token,
            &format!(
                "/api/v1/cli/projects/{}/secrets/{}",
                encode_path_segment(project_id),
                encode_path_segment(name)
            ),
            &query,
        )
    }

    pub fn get_secret_values(
        &self,
        token: &str,
        project_id: &str,
        environment: &str,
        config: Option<&str>,
        purpose: &str,
    ) -> Result<CliSecretValuesResponse, String> {
        let mut query = vec![("environment", environment), ("purpose", purpose)];
        if let Some(config) = config {
            query.push(("config", config));
        }
        self.get_json(
            token,
            &format!(
                "/api/v1/cli/projects/{}/secrets/values",
                encode_path_segment(project_id)
            ),
            &query,
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
            return Err(format_error_response(
                status,
                response.text().unwrap_or_default(),
            ));
        }

        response
            .json::<T>()
            .map_err(|error| format!("unable to parse API response: {error}"))
    }

    fn post_json<B: Serialize + ?Sized, T: for<'de> Deserialize<'de>>(
        &self,
        token: &str,
        path: &str,
        body: &B,
    ) -> Result<T, String> {
        let response = self
            .http
            .post(self.url(path))
            .headers(auth_headers(token)?)
            .json(body)
            .send()
            .map_err(|error| format!("request failed: {error}"))?;
        let status = response.status();
        if !status.is_success() {
            return Err(format_error_response(
                status,
                response.text().unwrap_or_default(),
            ));
        }

        response
            .json::<T>()
            .map_err(|error| format!("unable to parse API response: {error}"))
    }

    fn delete_json<T: for<'de> Deserialize<'de>>(
        &self,
        token: &str,
        path: &str,
    ) -> Result<T, String> {
        let response = self
            .http
            .delete(self.url(path))
            .headers(auth_headers(token)?)
            .send()
            .map_err(|error| format!("request failed: {error}"))?;
        let status = response.status();
        if !status.is_success() {
            return Err(format_error_response(
                status,
                response.text().unwrap_or_default(),
            ));
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

fn normalize_api_origin(input: &str, allow_insecure_http: bool) -> Result<String, String> {
    let trimmed = input.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("API URL cannot be empty".to_owned());
    }

    let without_api_suffix = trimmed.strip_suffix("/api").unwrap_or(trimmed);
    if !(without_api_suffix.starts_with("http://") || without_api_suffix.starts_with("https://")) {
        return Err("API URL must start with http:// or https://".to_owned());
    }
    let parsed = reqwest::Url::parse(without_api_suffix)
        .map_err(|error| format!("API URL is invalid: {error}"))?;
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("API URL must not contain embedded credentials".to_owned());
    }
    if parsed.query().is_some() || parsed.fragment().is_some() {
        return Err("API URL must not contain a query string or fragment".to_owned());
    }
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("API URL must start with http:// or https://".to_owned());
    }
    if parsed.scheme() == "http" && !allow_insecure_http && !is_loopback_host(parsed.host_str()) {
        return Err(
            "plain HTTP is only allowed for localhost. Use HTTPS or pass --allow-insecure-http for a trusted development network."
                .to_owned(),
        );
    }

    Ok(without_api_suffix.to_owned())
}

fn is_loopback_host(host: Option<&str>) -> bool {
    matches!(host, Some("localhost" | "127.0.0.1" | "::1"))
}

fn encode_path_segment(value: &str) -> String {
    utf8_percent_encode(value, PATH_SEGMENT_ENCODE_SET).to_string()
}

fn format_error_response(status: reqwest::StatusCode, body: String) -> String {
    let message = serde_json::from_str::<serde_json::Value>(&body)
        .ok()
        .and_then(|payload| {
            payload
                .get("error")
                .and_then(serde_json::Value::as_str)
                .or_else(|| payload.get("message").and_then(serde_json::Value::as_str))
                .map(str::to_owned)
        })
        .unwrap_or_else(|| body.trim().to_owned());
    let sanitized = message
        .chars()
        .map(|character| {
            if character.is_control() {
                ' '
            } else {
                character
            }
        })
        .take(MAX_ERROR_MESSAGE_LENGTH)
        .collect::<String>();

    if sanitized.trim().is_empty() {
        format!("request failed with HTTP status {status}")
    } else {
        format!(
            "request failed with HTTP status {status}: {}",
            sanitized.trim()
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_api_suffix_from_configured_api_url() {
        assert_eq!(
            normalize_api_origin("http://localhost:3001/api", false).expect("url"),
            "http://localhost:3001"
        );
    }

    #[test]
    fn rejects_insecure_remote_and_credentialed_api_urls() {
        assert!(normalize_api_origin("http://api.example.test", false).is_err());
        assert_eq!(
            normalize_api_origin("http://api.example.test", true).expect("explicit override"),
            "http://api.example.test"
        );
        assert!(normalize_api_origin("https://user:pass@api.example.test", false).is_err());
    }

    #[test]
    fn encodes_untrusted_path_segments() {
        let encoded = encode_path_segment("../secret/name");
        assert!(!encoded.contains('/'));
        assert!(encoded.contains("%2F"));
    }

    #[test]
    fn sanitizes_and_limits_error_responses() {
        let message = format_error_response(
            reqwest::StatusCode::BAD_REQUEST,
            serde_json::json!({ "error": format!("bad\u{1b}[31m{}", "x".repeat(2_000)) })
                .to_string(),
        );
        assert!(!message.contains('\u{1b}'));
        assert!(!message.contains('\n'));
        assert!(message.len() < 1_100);
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
