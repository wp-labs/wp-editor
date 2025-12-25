use actix_web::test;
use actix_web::{App, body::to_bytes, http::StatusCode};
use serde::Deserialize;

use wp_editer::api;

#[derive(Deserialize)]
struct VersionResponse {
    wp_editer: String,
    warp_engine: String,
}

#[actix_web::test]
async fn api_get_version_returns_versions() {
    let app = test::init_service(App::new().service(api::get_version)).await;

    let resp = test::TestRequest::get()
        .uri("/api/version")
        .send_request(&app)
        .await;
    assert_eq!(resp.status(), StatusCode::OK);

    let body_bytes = to_bytes(resp.into_body()).await.expect("read body failed");
    let version: VersionResponse =
        serde_json::from_slice(&body_bytes).expect("parse version response failed");

    assert!(!version.wp_editer.is_empty());
    assert!(!version.warp_engine.is_empty());
}
