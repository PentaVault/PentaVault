use std::fs::{self, OpenOptions};
use std::io;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use directories::ProjectDirs;
use serde::{Deserialize, Serialize};

pub const PROJECT_CONFIG_FILE: &str = ".pentavault.toml";

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
pub struct AppConfig {
    pub api_url: Option<String>,
    pub organization: Option<String>,
    pub project: Option<String>,
    pub environment: Option<String>,
    pub config: Option<String>,
    pub format: Option<String>,
}

impl AppConfig {
    pub fn value(&self, key: &str) -> Result<Option<String>, String> {
        match key {
            "api_url" | "api-url" => Ok(self.api_url.clone()),
            "organization" | "org" => Ok(self.organization.clone()),
            "project" => Ok(self.project.clone()),
            "env" | "environment" => Ok(self.environment.clone()),
            "config" => Ok(self.config.clone()),
            "format" => Ok(self.format.clone()),
            _ => Err(format!("unknown config key `{key}`")),
        }
    }

    pub fn set(&mut self, key: &str, value: String) -> Result<(), String> {
        match key {
            "api_url" | "api-url" => self.api_url = Some(value),
            "organization" | "org" => self.organization = Some(value),
            "project" => self.project = Some(value),
            "env" | "environment" => self.environment = Some(value),
            "config" => self.config = Some(value),
            "format" => self.format = Some(value),
            _ => return Err(format!("unknown config key `{key}`")),
        }

        Ok(())
    }

    pub fn unset(&mut self, key: &str) -> Result<(), String> {
        match key {
            "api_url" | "api-url" => self.api_url = None,
            "organization" | "org" => self.organization = None,
            "project" => self.project = None,
            "env" | "environment" => self.environment = None,
            "config" => self.config = None,
            "format" => self.format = None,
            _ => return Err(format!("unknown config key `{key}`")),
        }

        Ok(())
    }
}

pub struct ConfigStore {
    path: PathBuf,
}

impl ConfigStore {
    pub fn platform() -> Result<Self, String> {
        let project_dirs = ProjectDirs::from("com", "PentaVault", "cli")
            .ok_or_else(|| "unable to resolve platform config directory".to_owned())?;

        Ok(Self::new(project_dirs.config_dir().join("config.toml")))
    }

    pub fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    pub fn project(path: impl Into<PathBuf>) -> Self {
        Self::new(path.into().join(PROJECT_CONFIG_FILE))
    }

    pub fn discover_project() -> Result<Option<Self>, String> {
        let current = std::env::current_dir()
            .map_err(|error| format!("unable to resolve current directory: {error}"))?;
        Ok(Self::discover_project_from(&current))
    }

    pub fn discover_project_from(start: &Path) -> Option<Self> {
        start.ancestors().take(32).find_map(|directory| {
            let candidate = directory.join(PROJECT_CONFIG_FILE);
            candidate.is_file().then(|| Self::new(candidate))
        })
    }

    pub fn effective() -> Result<Self, String> {
        Ok(Self::discover_project()?.unwrap_or(Self::platform()?))
    }

    pub fn load_resolved() -> Result<AppConfig, String> {
        let global = Self::platform()?.load()?;
        let Some(local_store) = Self::discover_project()? else {
            return Ok(global);
        };
        let local = local_store.load()?;
        Ok(global.overlay(local))
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn load(&self) -> Result<AppConfig, String> {
        match fs::read_to_string(&self.path) {
            Ok(contents) => toml::from_str(&contents)
                .map_err(|error| format!("unable to parse config file: {error}")),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(AppConfig::default()),
            Err(error) => Err(format!("unable to read config file: {error}")),
        }
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), String> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("unable to create config directory: {error}"))?;
        }

        let contents = toml::to_string_pretty(config)
            .map_err(|error| format!("unable to serialize config: {error}"))?;

        atomic_write(&self.path, contents.as_bytes())
    }

    pub fn update(
        &self,
        edit: impl FnOnce(&mut AppConfig) -> Result<(), String>,
    ) -> Result<(), String> {
        let mut config = self.load()?;
        edit(&mut config)?;
        self.save(&config)
    }
}

pub fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), String> {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("unable to create config write nonce: {error}"))?
        .as_nanos();
    let temporary_path = path.with_extension(format!("tmp-{}-{nonce}", std::process::id()));
    let write_result = (|| {
        let mut file = OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary_path)
            .map_err(|error| format!("unable to create temporary config file: {error}"))?;
        file.write_all(contents)
            .and_then(|()| file.sync_all())
            .map_err(|error| format!("unable to write config file: {error}"))?;
        fs::rename(&temporary_path, path)
            .map_err(|error| format!("unable to replace config file: {error}"))
    })();
    if write_result.is_err() {
        let _ = fs::remove_file(&temporary_path);
    }
    write_result
}

impl AppConfig {
    fn overlay(self, local: Self) -> Self {
        Self {
            api_url: local.api_url.or(self.api_url),
            organization: local.organization.or(self.organization),
            project: local.project.or(self.project),
            environment: local.environment.or(self.environment),
            config: local.config.or(self.config),
            format: local.format.or(self.format),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn saves_and_loads_non_secret_config() {
        let temp_dir = tempfile::tempdir().expect("temp dir");
        let store = ConfigStore::new(temp_dir.path().join("config.toml"));

        store
            .update(|config| {
                config.set("api-url", "https://api.example.test".to_owned())?;
                config.set("project", "project_123".to_owned())?;
                config.set("env", "env_123".to_owned())
            })
            .expect("config saved");

        let loaded = store.load().expect("config loaded");

        assert_eq!(loaded.api_url.as_deref(), Some("https://api.example.test"));
        assert_eq!(loaded.project.as_deref(), Some("project_123"));
        assert_eq!(loaded.environment.as_deref(), Some("env_123"));
    }

    #[test]
    fn rejects_unknown_config_keys() {
        let mut config = AppConfig::default();

        assert!(config.set("token", "secret".to_owned()).is_err());
    }

    #[test]
    fn rejects_unknown_keys_in_toml() {
        let error = toml::from_str::<AppConfig>("token = 'secret'")
            .expect_err("secret-bearing unknown keys must fail closed");
        assert!(error.to_string().contains("unknown field"));
    }

    #[test]
    fn project_config_overrides_global_values() {
        let global = AppConfig {
            api_url: Some("https://api.example.test".to_owned()),
            project: Some("global-project".to_owned()),
            environment: Some("development".to_owned()),
            ..AppConfig::default()
        };
        let local = AppConfig {
            project: Some("local-project".to_owned()),
            ..AppConfig::default()
        };

        let resolved = global.overlay(local);
        assert_eq!(resolved.project.as_deref(), Some("local-project"));
        assert_eq!(resolved.environment.as_deref(), Some("development"));
    }
}
