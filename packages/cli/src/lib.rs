mod api;
mod auth;
mod aws;
pub mod cli;
mod commands;
mod config;

use std::process::ExitCode;

use clap::Parser;
use cli::Cli;

pub fn run() -> ExitCode {
    let cli = Cli::parse();
    commands::dispatch(cli)
}
