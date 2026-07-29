use assert_cmd::Command;
use predicates::prelude::*;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::sync::mpsc;
use std::thread;

fn pv() -> Command {
    Command::cargo_bin("pv").expect("pv binary should build")
}

struct TestServer {
    url: String,
    request: mpsc::Receiver<String>,
}

fn serve_once(body: &'static str) -> TestServer {
    let listener = TcpListener::bind("127.0.0.1:0").expect("test server binds");
    let url = format!("http://{}", listener.local_addr().expect("local addr"));
    let (sender, receiver) = mpsc::channel();

    thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("test connection");
        let mut buffer = [0; 4096];
        let read = stream.read(&mut buffer).expect("request read");
        let request = String::from_utf8_lossy(&buffer[..read]).to_string();
        sender.send(request).expect("request sent");

        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body
        );
        stream
            .write_all(response.as_bytes())
            .expect("response written");
    });

    TestServer {
        url,
        request: receiver,
    }
}

fn serve_sequence(bodies: Vec<&'static str>) -> TestServer {
    let listener = TcpListener::bind("127.0.0.1:0").expect("test server binds");
    let url = format!("http://{}", listener.local_addr().expect("local addr"));
    let (sender, receiver) = mpsc::channel();

    thread::spawn(move || {
        for body in bodies {
            let (mut stream, _) = listener.accept().expect("test connection");
            let mut buffer = [0; 8192];
            let read = stream.read(&mut buffer).expect("request read");
            let request = String::from_utf8_lossy(&buffer[..read]).to_string();
            sender.send(request).expect("request sent");
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            stream
                .write_all(response.as_bytes())
                .expect("response written");
        }
    });

    TestServer {
        url,
        request: receiver,
    }
}

#[test]
fn help_includes_core_workflows() {
    pv().arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("Fetch, inject, and manage"))
        .stdout(predicate::str::contains("secrets"))
        .stdout(predicate::str::contains("completion"));
}

#[test]
fn version_supports_human_output() {
    pv().arg("version")
        .assert()
        .success()
        .stdout(predicate::str::contains("pv 0.1.0"));
}

#[test]
fn version_supports_json_output() {
    pv().args(["--json", "version"])
        .assert()
        .success()
        .stdout(predicate::str::contains("\"name\":\"pv\""))
        .stdout(predicate::str::contains("\"version\":\"0.1.0\""));
}

#[test]
fn doctor_reports_current_security_status_without_stale_setup_text() {
    pv().arg("doctor")
        .assert()
        .success()
        .stdout(predicate::str::contains("PentaVault CLI doctor"))
        .stdout(predicate::str::contains("Auth:"))
        .stdout(predicate::str::contains("Offline cache: disabled"))
        .stdout(predicate::str::contains("skeleton").not())
        .stdout(predicate::str::contains("until interactive auth lands").not());
}

#[test]
fn api_key_creation_defaults_to_read_only_permissions() {
    let server = serve_once(
        r#"{"headerName":"x-pentavault-key","key":"pvk_new_secret","apiKey":{"id":"key_123","name":"CI read key","prefix":"pvk","start":"pvk_new","tokenType":"personal","organizationId":"org_123"}}"#,
    );

    pv().args([
        "--api-url",
        &server.url,
        "api-keys",
        "create",
        "--name",
        "CI read key",
    ])
    .env("PENTAVAULT_TOKEN", "session_secret")
    .assert()
    .success()
    .stdout(predicate::str::contains("pvk_new_secret"));

    let request = server.request.recv().expect("captured request");
    assert!(request.starts_with("POST /api/v1/auth/api-keys "));
    let body = request
        .split_once("\r\n\r\n")
        .map(|(_, body)| body)
        .expect("request body");
    let payload: serde_json::Value = serde_json::from_str(body).expect("request JSON");
    assert_eq!(payload["permissions"]["proxy"], serde_json::json!(["read"]));
    assert!(!body.contains("session_secret"));
}

#[test]
fn whoami_uses_process_token_without_printing_it() {
    let server = serve_once(
        r#"{"session":{"id":"session_123","expiresAt":"2026-12-01T00:00:00.000Z","activeOrganizationId":"org_123","activeOrganizationSlug":"pentavault"},"user":{"id":"user_123","email":"king@example.test","name":"King","username":"king","emailVerified":true,"twoFactorEnabled":true}}"#,
    );

    pv().args(["--api-url", &server.url, "whoami"])
        .env("PENTAVAULT_TOKEN", "pv_test_secret_token")
        .assert()
        .success()
        .stdout(predicate::str::contains("King"))
        .stdout(predicate::str::contains("Credential: environment"))
        .stdout(predicate::str::contains("pv_test_secret_token").not());

    let request = server.request.recv().expect("captured request");
    assert!(request.starts_with("GET /api/v1/auth/session "));
    assert!(request.contains("authorization: Bearer pv_test_secret_token"));
}

#[test]
fn login_validates_configured_api_url() {
    pv().args(["--api-url", "not-a-url", "login"])
        .assert()
        .code(2)
        .stderr(predicate::str::contains("API URL must start with"));
}

#[test]
fn powershell_completion_is_available() {
    pv().args(["completion", "power-shell"])
        .assert()
        .success()
        .stdout(predicate::str::contains("Register-ArgumentCompleter"));
}

#[test]
fn online_commands_fail_closed_without_authentication() {
    pv().args(["secrets", "list"])
        .env_remove("PENTAVAULT_TOKEN")
        .assert()
        .code(3)
        .stderr(predicate::str::contains("not authenticated"));
}

#[test]
fn projects_list_uses_bearer_auth_without_printing_token() {
    let server = serve_once(
        r#"{"activeOrganizationId":"org_123","activeOrganizationSlug":"pentavault","projects":[{"id":"project_123","slug":"core","name":"Core","visibility":"private","status":"active","role":"member","canAccess":true,"updatedAt":"2026-05-02T00:00:00.000Z"}]}"#,
    );

    pv().args(["--api-url", &server.url, "projects", "list"])
        .env("PENTAVAULT_TOKEN", "pv_test_secret_token")
        .assert()
        .success()
        .stdout(predicate::str::contains("Projects for pentavault"))
        .stdout(predicate::str::contains("project_123"))
        .stdout(predicate::str::contains("pv_test_secret_token").not());

    let request = server.request.recv().expect("captured request");
    assert!(request.starts_with("GET /api/v1/cli/projects "));
    assert!(request.contains("authorization: Bearer pv_test_secret_token"));
}

#[test]
fn secrets_pull_outputs_dotenv_without_printing_token() {
    let server = serve_once(
        r#"{"projectId":"project_123","environment":"development","environmentId":null,"values":{"DATABASE_URL":"postgres://example","QUOTED":"needs spaces"}}"#,
    );

    pv().args([
        "--api-url",
        &server.url,
        "--project",
        "project_123",
        "--env",
        "development",
        "secrets",
        "pull",
    ])
    .env("PENTAVAULT_TOKEN", "pv_test_secret_token")
    .assert()
    .success()
    .stdout(predicate::str::contains("DATABASE_URL=postgres://example"))
    .stdout(predicate::str::contains("QUOTED=\"needs spaces\""))
    .stdout(predicate::str::contains("pv_test_secret_token").not());

    let request = server.request.recv().expect("captured request");
    assert!(request.starts_with(
        "GET /api/v1/cli/projects/project_123/secrets/values?environment=development&purpose=pull "
    ));
}

#[test]
fn organizations_list_shows_active_scope_without_printing_token() {
    let server = serve_once(
        r#"{"organizations":[{"organization":{"id":"org_123","name":"PentaVault","slug":"pentavault","active":true},"membership":{"role":"owner"}}]}"#,
    );

    pv().args(["--api-url", &server.url, "organizations", "list"])
        .env("PENTAVAULT_TOKEN", "session_secret")
        .assert()
        .success()
        .stdout(predicate::str::contains("Organizations (1)"))
        .stdout(predicate::str::contains("owner"))
        .stdout(predicate::str::contains("session_secret").not());

    let request = server.request.recv().expect("captured request");
    assert!(request.starts_with("GET /api/v1/auth/organizations "));
}

#[test]
fn api_key_credentials_cannot_mint_more_keys() {
    pv().args(["api-keys", "create", "--name", "nested"])
        .env("PENTAVAULT_TOKEN", "pvk_secret_that_must_not_print")
        .assert()
        .code(3)
        .stderr(predicate::str::contains("cannot manage other API keys"))
        .stderr(predicate::str::contains("pvk_secret_that_must_not_print").not());
}

#[test]
fn access_status_lists_only_the_authenticated_users_requests() {
    let server = serve_once(
        r#"{"requests":[{"id":"access_123","projectId":"project_123","organizationId":"org_123","requesterId":"user_123","requestedRole":"member","message":"Need access","status":"pending","reviewedBy":null,"reviewerNote":null,"createdAt":"2026-05-02T00:00:00.000Z","updatedAt":"2026-05-02T00:00:00.000Z"}]}"#,
    );

    pv().args([
        "--api-url",
        &server.url,
        "--project",
        "project_123",
        "access",
        "status",
        "--status",
        "pending",
    ])
    .env("PENTAVAULT_TOKEN", "session_secret")
    .assert()
    .success()
    .stdout(predicate::str::contains("access_123"))
    .stdout(predicate::str::contains("session_secret").not());

    let request = server.request.recv().expect("captured request");
    assert!(request
        .starts_with("GET /api/v1/access-requests/mine?projectId=project_123&status=pending "));
}

#[test]
fn init_persists_only_project_routing_metadata() {
    let server = serve_sequence(vec![
        r#"{"session":{"id":"session_123","expiresAt":"2026-12-01T00:00:00.000Z","activeOrganizationId":"org_123","activeOrganizationSlug":"pentavault"},"user":{"id":"user_123","email":"king@example.test","name":"King","username":"king","emailVerified":true,"twoFactorEnabled":true}}"#,
        r#"{"organizations":[{"organization":{"id":"org_123","name":"PentaVault","slug":"pentavault","active":true},"membership":{"role":"owner"}}]}"#,
        r#"{"activeOrganizationId":"org_123","activeOrganizationSlug":"pentavault","projects":[{"id":"project_123","slug":"core","name":"Core","visibility":"private","status":"active","role":"owner","canAccess":true,"updatedAt":"2026-05-02T00:00:00.000Z"}]}"#,
        r##"{"projectId":"project_123","environments":[{"id":"env_123","name":"Development","slug":"development","color":"#123456","isDefault":true,"createdAt":"2026-05-02T00:00:00.000Z"}]}"##,
        r#"{"projectId":"project_123","configs":[{"id":"cfg_123","projectId":"project_123","environmentId":"env_123","parentConfigId":null,"type":"root","name":"Development","slug":"development","isProtected":true,"visibility":"protected","canEdit":true,"canShare":false,"isPersonalDefault":false,"createdAt":"2026-05-02T00:00:00.000Z","updatedAt":"2026-05-02T00:00:00.000Z"}]}"#,
    ]);
    let directory = tempfile::tempdir().expect("temp dir");

    pv().args(["--api-url", &server.url, "init", "--yes"])
        .current_dir(directory.path())
        .env("PENTAVAULT_TOKEN", "session_secret")
        .assert()
        .success()
        .stdout(predicate::str::contains("Welcome, King"))
        .stdout(predicate::str::contains("Next: pv secrets list"))
        .stdout(predicate::str::contains("session_secret").not());

    let config = std::fs::read_to_string(directory.path().join(".pentavault.toml"))
        .expect("project config written");
    assert!(config.contains("organization = \"org_123\""));
    assert!(config.contains("project = \"project_123\""));
    assert!(config.contains("environment = \"development\""));
    assert!(!config.contains("session_secret"));
}

#[test]
fn identity_login_sends_the_assertion_and_prints_only_the_token_on_stdout() {
    let server = serve_once(
        r#"{"accessToken":"pv_mid_test_token","expiresAt":"2026-07-28T12:15:00.000Z","identityId":"identity_1","projectIds":["project_123"]}"#,
    );

    pv().args([
        "--api-url",
        &server.url,
        "identity",
        "login",
        "--organization",
        "org_123",
        "--name",
        "ci-deploy",
        "--assertion-env",
        "TEST_OIDC_ASSERTION",
    ])
    .env("TEST_OIDC_ASSERTION", "header.payload.signature")
    .assert()
    .success()
    // The token is the only thing on stdout, so `$(pv identity login ...)`
    // captures a usable value and nothing else.
    .stdout(predicate::str::contains("pv_mid_test_token"))
    .stdout(predicate::str::contains("identity_1").not())
    .stderr(predicate::str::contains("identity_1"));

    let request = server.request.recv().expect("captured request");
    assert!(request.starts_with("POST /api/v1/identities/login "));
    assert!(request.contains("header.payload.signature"));
    // Login is unauthenticated: the assertion is the credential, so no stored
    // session token may be attached.
    assert!(!request.to_lowercase().contains("authorization:"));
}

#[test]
fn identity_login_reads_the_assertion_from_stdin() {
    let server = serve_once(
        r#"{"accessToken":"pv_mid_test_token","expiresAt":"2026-07-28T12:15:00.000Z","identityId":"identity_1","projectIds":[]}"#,
    );

    pv().args([
        "--api-url",
        &server.url,
        "identity",
        "login",
        "--organization",
        "org_123",
        "--name",
        "ci-deploy",
        "--assertion-file",
        "-",
        "--token-only",
    ])
    .write_stdin("header.payload.signature\n")
    .assert()
    .success()
    .stdout(predicate::str::contains("pv_mid_test_token"));

    let request = server.request.recv().expect("captured request");
    assert!(request.contains("header.payload.signature"));
}

#[test]
fn identity_login_requires_an_assertion_source() {
    // Accepting the assertion as a bare argument would expose it in the process
    // list and in CI logs, so there is deliberately no such flag.
    pv().args([
        "identity",
        "login",
        "--organization",
        "org_123",
        "--name",
        "ci-deploy",
    ])
    .assert()
    .failure()
    .stderr(predicate::str::contains("--assertion-file"));
}

#[test]
fn identity_login_rejects_an_empty_assertion() {
    pv().args([
        "identity",
        "login",
        "--organization",
        "org_123",
        "--name",
        "ci-deploy",
        "--assertion-env",
        "TEST_OIDC_ASSERTION",
    ])
    .env("TEST_OIDC_ASSERTION", "   ")
    .assert()
    .failure()
    .stderr(predicate::str::contains("assertion is empty"));
}

#[test]
fn identity_whoami_reports_the_grant_without_echoing_the_token() {
    let server = serve_once(
        r#"{"identityId":"identity_1","subject":"repo:acme/api:ref:refs/heads/main","expiresAt":"2026-07-28T12:15:00.000Z","projectIds":["project_123"]}"#,
    );

    pv().args(["--api-url", &server.url, "identity", "whoami"])
        .env("PENTAVAULT_TOKEN", "pv_mid_test_token")
        .assert()
        .success()
        .stdout(predicate::str::contains("repo:acme/api"))
        .stdout(predicate::str::contains("project_123"))
        .stdout(predicate::str::contains("pv_mid_test_token").not());

    let request = server.request.recv().expect("captured request");
    assert!(request.starts_with("GET /api/v1/identity/context "));
    assert!(request.contains("authorization: Bearer pv_mid_test_token"));
}

#[test]
fn identity_whoami_fails_closed_without_a_token() {
    pv().args(["identity", "whoami"])
        .env_remove("PENTAVAULT_TOKEN")
        .assert()
        .failure()
        .stderr(predicate::str::contains("PENTAVAULT_TOKEN"));
}

#[test]
fn secrets_pull_uses_the_workload_route_for_a_machine_identity_token() {
    let server = serve_once(
        r#"{"projectId":"project_123","environment":"production","environmentId":"env_prod","values":{"DATABASE_URL":"postgres://example"}}"#,
    );

    pv().args([
        "--api-url",
        &server.url,
        "--project",
        "project_123",
        "--env",
        "production",
        "secrets",
        "pull",
    ])
    .env("PENTAVAULT_TOKEN", "pv_mid_test_token")
    .assert()
    .success()
    .stdout(predicate::str::contains("DATABASE_URL=postgres://example"))
    .stdout(predicate::str::contains("pv_mid_test_token").not());

    let request = server.request.recv().expect("captured request");
    // A workload token must not be sent to the human CLI route, whose
    // authorization model assumes a session user.
    assert!(request.starts_with(
        "GET /api/v1/identity/projects/project_123/secrets/values?environment=production "
    ));
}

#[test]
fn secrets_pull_refuses_a_config_branch_for_a_machine_identity() {
    // Ignoring --config would quietly return production values instead of the
    // branch the caller asked for.
    pv().args([
        "--api-url",
        "http://127.0.0.1:1",
        "--project",
        "project_123",
        "--env",
        "production",
        "--config",
        "feature-branch",
        "secrets",
        "pull",
    ])
    .env("PENTAVAULT_TOKEN", "pv_mid_test_token")
    .assert()
    .failure()
    .stderr(predicate::str::contains("machine identity"));
}
