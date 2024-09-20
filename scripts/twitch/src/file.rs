use anyhow::Context as _;
use std::path::PathBuf;

const RAW_JSON_FILE: &str =
    "https://github.com/DmitryScaletta/twitch-api-swagger/raw/main/openapi.json";

pub fn load<P: Into<PathBuf>>(path: Option<P>) -> Result<openapiv3::OpenAPI, anyhow::Error> {
    let path = attempt_download(path)?;
    let file = std::fs::File::open(&path).context("when opening openapi file")?;
    let reader = std::io::BufReader::new(file);
    let mut api = serde_json::from_reader::<_, serde_json::Value>(reader)
        .context("when parsing openapi file")?;
    let point = api
        .pointer_mut("/components/schemas/UpdateUserExtensionsBody/properties/data")
        .expect("Failed to find UpdateUserExtensionsBody");
    let point_object = point
        .as_object_mut()
        .expect("Failed to cast UpdateUserExtensionsBody to object");

    assert!(point_object.get("type").is_none());
    point_object.insert(
        "type".to_string(),
        serde_json::Value::String("object".to_string()),
    );

    serde_json::from_value(api).context("when deserializing openapi file")
}

fn attempt_download<P: Into<PathBuf>>(path: Option<P>) -> Result<PathBuf, anyhow::Error> {
    let path = path
        .map(|p| p.into())
        .unwrap_or_else(|| PathBuf::from("./openapi.json"));
    if !path.exists() {
        let response = ureq::get(RAW_JSON_FILE)
            .call()
            .context("when attempting to download openapi file")?;
        if response.status() != 200 {
            anyhow::bail!("Failed to download openapi file: {}", response.status());
        } else {
            let mut file = std::fs::File::create(&path).context("when creating openapi file")?;
            std::io::copy(&mut response.into_reader(), &mut file)
                .context("when writing openapi file")?;
            file.sync_all().context("when syncing openapi file")?;
            Ok(path)
        }
    } else {
        Ok(path)
    }
}
