use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Deserialize)]
struct IssueRequest {
    agent_did: String,
    resource: String,
    scopes: Vec<String>,
    ttl_seconds: u32,
}

#[derive(Deserialize)]
struct RevokeRequest {
    reference: String,
}

#[derive(Deserialize)]
struct PlaceholderProxyRequest {
    resource: String,
    upstream_url: String,
    method: String,
}

#[derive(Serialize)]
struct IssueResponse {
    reference: String,
    resource: String,
    expires_in_seconds: u32,
    sealed_secret_key: String,
}

pub fn issue_temp_credential(input: &[u8]) -> Result<Vec<u8>, String> {
    let req: IssueRequest = serde_json::from_slice(input).map_err(|e| e.to_string())?;
    if req.ttl_seconds == 0 || req.ttl_seconds > 3600 {
        return Err("ttl_seconds must be between 1 and 3600".to_string());
    }
    if req.scopes.is_empty() {
        return Err("at least one scope is required".to_string());
    }

    let sealed_secret_key = format!("{}_credential", req.resource);
    let _sealed_secret_reference = read_secret(&sealed_secret_key)?;
    put_revocation_marker(&format!("active:{}", req.agent_did), b"true")?;

    let response = IssueResponse {
        reference: format!("av_tmp_{}", short_fingerprint(&req.agent_did, &req.resource)),
        resource: req.resource,
        expires_in_seconds: req.ttl_seconds,
        sealed_secret_key,
    };

    serde_json::to_vec(&response).map_err(|e| e.to_string())
}

pub fn revoke_temp_credential(input: &[u8]) -> Result<Vec<u8>, String> {
    let req: RevokeRequest = serde_json::from_slice(input).map_err(|e| e.to_string())?;
    put_revocation_marker(&format!("revoked:{}", req.reference), b"true")?;
    serde_json::to_vec(&json!({ "status": "revoked", "reference": req.reference })).map_err(|e| e.to_string())
}

pub fn proxy_with_placeholders(input: &[u8]) -> Result<Vec<u8>, String> {
    let req: PlaceholderProxyRequest = serde_json::from_slice(input).map_err(|e| e.to_string())?;
    let api_key = read_secret(&format!("{}_credential", req.resource))?;

    let body = json!({
        "agentvault": {
            "resource": req.resource,
            "profile_email": "{{profile.verified_contacts.email.value}}",
            "profile_first_name": "{{profile.first_name}}",
            "profile_last_name": "{{profile.last_name}}"
        }
    });

    let _ = api_key;
    serde_json::to_vec(&json!({
        "placeholder_proxy_ready": true,
        "url": req.upstream_url,
        "method": req.method,
        "body": body
    })).map_err(|e| e.to_string())
}

fn read_secret(key: &str) -> Result<String, String> {
    Ok(format!("sealed://z:<tid>:secrets/{key}"))
}

fn put_revocation_marker(key: &str, value: &[u8]) -> Result<(), String> {
    let _ = (key, value);
    Ok(())
}

fn short_fingerprint(agent_did: &str, resource: &str) -> String {
    let mut out = String::new();
    for byte in agent_did.as_bytes().iter().chain(resource.as_bytes()).take(18) {
        out.push_str(&format!("{byte:02x}"));
    }
    out.chars().take(18).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn issues_temp_reference_for_valid_request() {
        let input = br#"{"agent_did":"did:t3n:test","resource":"openai","scopes":["responses:create"],"ttl_seconds":60}"#;
        let output = issue_temp_credential(input).expect("issue response");
        let value: serde_json::Value = serde_json::from_slice(&output).expect("json response");

        assert_eq!(value["resource"], "openai");
        assert_eq!(value["expires_in_seconds"], 60);
        assert!(value["reference"].as_str().unwrap().starts_with("av_tmp_"));
        assert_eq!(value["sealed_secret_key"], "openai_credential");
    }

    #[test]
    fn rejects_empty_scope_request() {
        let input = br#"{"agent_did":"did:t3n:test","resource":"openai","scopes":[],"ttl_seconds":60}"#;
        let error = issue_temp_credential(input).expect_err("empty scopes rejected");
        assert_eq!(error, "at least one scope is required");
    }

    #[test]
    fn revokes_reference() {
        let input = br#"{"reference":"av_tmp_test"}"#;
        let output = revoke_temp_credential(input).expect("revoke response");
        let value: serde_json::Value = serde_json::from_slice(&output).expect("json response");

        assert_eq!(value["status"], "revoked");
        assert_eq!(value["reference"], "av_tmp_test");
    }
}
