use assert_cmd::Command;
use predicates::prelude::*;

fn pv() -> Command {
    Command::cargo_bin("pv").expect("pv binary should build")
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
    pv().arg("whoami")
        .env("PENTAVAULT_TOKEN", "pv_test_secret_token")
        .assert()
        .success()
        .stdout(predicate::str::contains("PENTAVAULT_TOKEN"))
        .stdout(predicate::str::contains("pv_test_secret_token").not());
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
fn future_commands_return_usage_error() {
    pv().args(["secrets", "list"])
        .assert()
        .code(2)
        .stderr(predicate::str::contains(
            "not implemented in the current CLI milestone",
        ));
}
