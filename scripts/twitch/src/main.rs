//! Generates bindings to the twitch API based off of the OpenAPI
//! spec.
//!
//! Because we have a... unique way of managing subscriptions and API
//! keys, we don't want to force the user to manage the keys
//! themselves. Instead, we'll provide a facade that will handle the
//! keys for them.
//!
//! However, the surface area of the API is quite large, so we'll need
//! to generate the bindings for the API. This is where this project
//! comes in.
//!
//! Twitch does not generally publish their OpenAPI spec, so we'll use
//! a project that generates the OpenAPI spec based on the Twitch API.
//! The project is located [here].
//!
//! [here]: https://github.com/DmitryScaletta/twitch-api-swagger

use std::path::PathBuf;

mod extract;
mod file;
mod render;

fn main() -> Result<(), anyhow::Error> {
    let api = file::load(std::env::args_os().nth(1))?;
    let mut extract = self::extract::Extract::new(&api)?;
    let out = std::env::args_os()
        .nth(2)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("./clients/twitch/api"));
    extract.namespaces.remove("eventSub");

    self::render::render(&extract, &api, &out)?;

    Ok(())
}
