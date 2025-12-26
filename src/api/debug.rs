// 模拟调试 API
use crate::ParsedField;
use crate::error::AppError;
use crate::utils::{convert_record, record_to_fields, warp_check_record};
use actix_web::{HttpResponse, post, web};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use wp_data_fmt::{DataFormat, FormatType, Json};
use wp_model_core::model::DataRecord;
use wp_model_core::model::fmt_def::TextFmt;

// SharedRecord 类型定义：用于在 API 之间共享解析结果
pub type SharedRecord = Arc<Mutex<Option<DataRecord>>>;

#[derive(Deserialize)]
pub struct DebugParseRequest {
    pub connection_id: Option<i32>,
    pub rules: String,
    pub logs: String,
}

// 新版调试接口：解析日志并返回字段列表
#[post("/api/debug/parse")]
pub async fn debug_parse(
    shared_record: web::Data<SharedRecord>,
    req: web::Json<DebugParseRequest>,
) -> Result<HttpResponse, AppError> {
    // 调用 warp_check_record 获取 DataRecord
    let record = warp_check_record(&req.rules, &req.logs)?;

    // 存入 SharedRecord，供后续转换使用
    let mut record_guard = shared_record.lock().await;
    *record_guard = Some(record.clone());

    // 直接返回 ParsedField 列表，由 Actix 负责序列化为 JSON
    let parsed_fields = record_to_fields(&record);
    let formatter = FormatType::from(&TextFmt::Json);
    let json_string = formatter.format_record(&record);
    Ok(HttpResponse::Ok().json(RecordResponse {
        fields: parsed_fields,
        format_json: json_string,
    }))
}

#[derive(Deserialize)]
pub struct DebugTransformRequest {
    pub connection_id: Option<i32>,
    pub parse_result: serde_json::Value,
    pub oml: String,
}

#[derive(Serialize, Deserialize)]
pub struct RecordResponse {
    pub fields: Vec<ParsedField>,
    pub format_json: String,
}

// 新版调试接口：基于解析结果和 OML 进行转换
#[post("/api/debug/transform")]
pub async fn debug_transform(
    shared_record: web::Data<SharedRecord>,
    req: web::Json<DebugTransformRequest>,
) -> Result<HttpResponse, AppError> {
    let record_guard = shared_record.lock().await;
    let record = record_guard.as_ref().ok_or(AppError::NoParseResult)?;

    let transformed = convert_record(&req.oml, record.clone())?;

    //转换标准 json
    let formatter = FormatType::Json(Json);
    let json_string = formatter.format_record(&transformed);

    //转化为标准的 fields
    let parsed_fields = record_to_fields(&transformed);

    Ok(HttpResponse::Ok().json(RecordResponse {
        fields: parsed_fields,
        format_json: json_string,
    }))
}

// 知识库调试
#[derive(Deserialize)]
pub struct DebugKnowledgeStatusQuery {
    pub connection_id: i32,
}

#[derive(Serialize)]
pub struct DebugKnowledgeStatusItem {
    pub tag_name: String,
    pub is_active: bool,
}

#[derive(Deserialize)]
pub struct DebugKnowledgeQueryRequest {
    pub connection_id: i32,
    pub table: String,
    pub sql: String,
}

#[derive(Serialize)]
pub struct DebugKnowledgeQueryResponse {
    pub success: bool,
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
    pub total: usize,
}

// 执行知识库 SQL 查询（调试用）
#[post("/api/debug/knowledge/query")]
pub async fn debug_knowledge_query(
    req: web::Json<DebugKnowledgeQueryRequest>,
) -> Result<HttpResponse, AppError> {
    // 暂时直接复用旧的 sql_query，未来可以根据 connection_id 切换数据库
    let _sql = req.sql.clone();

    todo!()
}
