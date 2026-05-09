use std::env;
use std::io::Read;

use keyring::{Entry, Error as KeyringError};

const SERVICE_NAME: &str = "pentavault-cli";
const ACCOUNT_NAME: &str = "default";
const TOKEN_ENV: &str = "PENTAVAULT_TOKEN";

#[derive(Debug, Eq, PartialEq)]
pub enum Credential {
    EnvironmentToken,
    StoredToken,
}

pub fn effective_credential() -> Result<Option<Credential>, String> {
    if env::var(TOKEN_ENV)
        .ok()
        .is_some_and(|token| !token.trim().is_empty())
    {
        return Ok(Some(Credential::EnvironmentToken));
    }

    match entry()?.get_password() {
        Ok(_) => Ok(Some(Credential::StoredToken)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(error) => Err(format!("unable to read OS credential store: {error}")),
    }
}

pub fn store_token_from_stdin(mut input: impl Read) -> Result<(), String> {
    let mut token = String::new();
    input
        .read_to_string(&mut token)
        .map_err(|error| format!("unable to read token from stdin: {error}"))?;

    let token = token.trim();
    if token.is_empty() {
        return Err("refusing to store an empty token".to_owned());
    }

    store_token(token)
}

pub fn store_token(token: &str) -> Result<(), String> {
    let token = token.trim();
    if token.is_empty() {
        return Err("refusing to store an empty token".to_owned());
    }

    entry()?
        .set_password(token)
        .map_err(|error| format!("unable to write OS credential store: {error}"))
}

pub fn delete_stored_token() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(error) => Err(format!("unable to delete OS credential: {error}")),
    }
}

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, ACCOUNT_NAME)
        .map_err(|error| format!("unable to open OS credential store: {error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_empty_stdin_tokens() {
        let error = store_token_from_stdin(std::io::Cursor::new("  \r\n"))
            .expect_err("empty token rejected");

        assert!(error.contains("empty token"));
    }
}
