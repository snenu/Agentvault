wit_bindgen::generate!({
    world: "agentvault",
    path: "wit",
    additional_derives: [
        serde::Deserialize,
        serde::Serialize,
    ],
    generate_all,
});

mod vault;

struct Component;

impl exports::z::agentvault::contracts::Guest for Component {
    fn issue_temp_credential(input: Vec<u8>) -> Result<Vec<u8>, String> {
        vault::issue_temp_credential(&input)
    }

    fn revoke_temp_credential(input: Vec<u8>) -> Result<Vec<u8>, String> {
        vault::revoke_temp_credential(&input)
    }

    fn proxy_with_placeholders(input: Vec<u8>) -> Result<Vec<u8>, String> {
        vault::proxy_with_placeholders(&input)
    }
}

#[cfg(target_arch = "wasm32")]
export!(Component);
