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
fn doctor_reports_m1_status() {
    pv().arg("doctor")
        .assert()
        .success()
        .stdout(predicate::str::contains("PentaVault CLI doctor"))
        .stdout(predicate::str::contains("Auth:"));
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
