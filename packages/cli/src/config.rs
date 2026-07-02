use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use directories::ProjectDirs;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub struct AppConfig {
    pub api_url: Option<String>,
    pub project: Option<String>,
    pub environment: Option<String>,
    pub config: Option<String>,
    pub format: Option<String>,
}

impl AppConfig {
    pub fn value(&self, key: &str) -> Result<Option<String>, String> {
        match key {
            "api_url" | "api-url" => Ok(self.api_url.clone()),
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

        fs::write(&self.path, contents)
            .map_err(|error| format!("unable to write config file: {error}"))
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
}
