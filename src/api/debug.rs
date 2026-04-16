use std::collections::BTreeMap;
use std::path::PathBuf;

// 模拟调试 API
use crate::error::AppError;
use crate::server::examples;
use crate::utils::format::remove_annotations;
use crate::utils::{convert_record, record_to_fields, warp_check_record};
use crate::{OmlFormatter, ParsedField, Setting, WplFormatter};
use actix_web::{HttpResponse, get, post, web};
use base64::Engine;
use base64::engine::general_purpose;
use serde::{Deserialize, Serialize};
use wp_data_fmt::{FormatType, Json, RecordFormatter};
use wp_model_core::model::data::Record;
use wp_model_core::model::fmt_def::TextFmt;
use wp_model_core::model::{DataField, DataRecord};

#[derive(Deserialize, Serialize)]
pub struct DebugParseRequest {
    pub connection_id: Option<i32>,
    pub rules: String,
    pub logs: String,
}

// 新版调试接口：解析日志并返回字段列表
#[post("/api/debug/parse")]
pub async fn debug_parse(req: web::Json<DebugParseRequest>) -> Result<HttpResponse, AppError> {
    // 调用 warp_check_record 获取 DataRecord
    let filtered = remove_annotations(&req.rules);
    let record = warp_check_record(&filtered, &req.logs)?;

    // 直接返回 DataField 列表，由 Actix 负责序列化为 JSON
    let formatter = FormatType::from(&TextFmt::Json);
    let json_string = formatter.fmt_record(&record);
    Ok(HttpResponse::Ok().json(RecordResponseRaw {
        fields: record,
        format_json: json_string,
    }))
}

#[derive(Deserialize, Serialize)]
pub struct DebugTransformRequest {
    pub connection_id: Option<i32>,
    pub parse_result: ParseResultWrapper,
    pub oml: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct ParseResultWrapper {
    pub fields: Vec<DataField>,
}

#[derive(Serialize, Deserialize)]
pub struct RecordResponse {
    pub fields: Vec<DataField>,
    pub format_json: String,
}

#[derive(Serialize, Deserialize)]
pub struct RecordResponseWithArray {
    pub fields: Vec<ParsedField>,
    pub format_json: String,
}

#[derive(Serialize, Deserialize)]
pub struct RecordResponseRaw {
    pub fields: DataRecord,
    pub format_json: String,
}

// 新版调试接口：基于解析结果和 OML 进行转换
#[post("/api/debug/transform")]
pub async fn debug_transform(
    req: web::Json<DebugTransformRequest>,
) -> Result<HttpResponse, AppError> {
    let DebugTransformRequest {
        connection_id: _,
        parse_result,
        oml,
    } = req.into_inner();
    let parse_result = parse_result.fields.clone();
    let res = Record::from(parse_result);
    let transformed = convert_record(&oml, res).await?;

    let formatter = FormatType::Json(Json);
    let json_string = formatter.fmt_record(&transformed);

    let parsed_fields: Vec<ParsedField> = record_to_fields(&transformed);

    Ok(HttpResponse::Ok().json(RecordResponseWithArray {
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

#[get("/api/debug/examples")]
pub async fn debug_examples() -> HttpResponse {
    let setting = Setting::load();
    let mut rule_map = BTreeMap::new();

    // 加载 OML 规则
    let oml_result = match examples::oml_examples(PathBuf::from(&setting.repo.oml_rule_repo)).await
    {
        Ok(result) => result,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": {
                    "code": "OML_RULE_LOAD_ERROR",
                    "message": "加载 OML 规则失败",
                    "detail": e.to_string()
                }
            }));
        }
    };

    // 加载 WPL 规则
    match examples::wpl_examples(
        PathBuf::from(&setting.repo.wpl_rule_repo),
        &oml_result,
        &mut rule_map,
    ) {
        Ok(_) => HttpResponse::Ok().json(rule_map),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "WPL_RULE_LOAD_ERROR",
                "message": "加载 WPL 规则失败",
                "detail": e.to_string()
            }
        })),
    }
}

#[post("/api/debug/wpl/format")]
pub async fn wpl_format(req: String) -> HttpResponse {
    let formatter = WplFormatter::new();
    match formatter.format_with_error(&req) {
        Ok(formatted) => HttpResponse::Ok().json(formatted),
        Err(err) => HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "WPL_FORMAT_ERROR",
                "message": "格式化 WPL 代码失败",
                "detail": err.to_string()
            }
        })),
    }
}

#[post("/api/debug/oml/format")]
pub async fn oml_format(req: String) -> HttpResponse {
    let formatter = OmlFormatter::new();
    match formatter.format_with_error(&req) {
        Ok(formatted) => HttpResponse::Ok().json(formatted),
        Err(err) => HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "OML_FORMAT_ERROR",
                "message": "格式化 OML 代码失败",
                "detail": err.to_string()
            }
        })),
    }
}

#[post("/api/debug/decode/base64")]
pub async fn decode_base64(req: String) -> HttpResponse {
    let cleaned = req.replace(|c: char| c.is_whitespace(), "");
    match general_purpose::STANDARD.decode(cleaned) {
        Ok(decoded) => HttpResponse::Ok().json(String::from_utf8_lossy(&decoded)),
        Err(e) => HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "error": {
                "code": "BASE64_DECODE_ERROR",
                "message": "Base64 解码失败",
                "detail": e.to_string()
            }
        })),
    }
}
