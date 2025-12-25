// API 模块

use actix_web::{HttpResponse, Responder, get};
use serde::Serialize;

pub mod debug;

#[derive(Serialize)]
struct VersionInfo {
    wp_editer: String,
    warp_engine: String,
}

/// 获取版本信息
#[get("/api/version")]
pub async fn get_version() -> impl Responder {
    HttpResponse::Ok().json(VersionInfo {
        wp_editer: env!("CARGO_PKG_VERSION").to_string(),
        warp_engine: env!("WARP_ENGINE_VERSION").to_string(), // 使用 wp_parser 依赖的版本
    })
}

pub use debug::{debug_parse, debug_transform};
