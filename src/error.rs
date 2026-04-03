use actix_web::{HttpResponse, ResponseError};
use serde::Serialize;
use std::fmt::Display;
use wp_error::OMLCodeError;
use wp_lang::WparseReason;

#[derive(Debug, Serialize)]
pub struct ErrorBody<T = serde_json::Value> {
    pub success: bool,
    pub error: ErrorDetail<T>,
}

#[derive(Debug, Serialize)]
pub struct ErrorDetail<T = serde_json::Value> {
    pub code: &'static str,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<T>,
}

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("连接 ID {connection_id} 不存在或已删除")]
    InvalidConnection { connection_id: i32 },

    #[error("该资源不属于指定连接")]
    ConnectionMismatch {
        resource_id: i32,
        resource_connection_id: i32,
        requested_connection_id: i32,
    },

    #[error("资源不存在: {0}")]
    NotFound(String),

    #[error("参数验证失败: {0}")]
    Validation(String),

    #[error("服务器内部错误: {0}")]
    Internal(String),

    // Git/Gitea 相关错误
    #[error("Git 操作失败: {0}")]
    Git(String),

    // WPL 解析相关错误
    #[error("WPL 解析失败: {0}")]
    WplParse(String),

    #[error("Wpl 解析失败: {0}")]
    WplParseOrion(#[from] orion_error::StructError<WparseReason>),

    // OML 转换相关错误
    #[error("OML 转换失败: {0}")]
    OmlTransform(String),
    //OmlTransform(anyhow::Error),
    #[error("OML 解析失败: {0}")]
    OmlParseOrion(#[from] OMLCodeError),

    // 调试相关错误
    #[error("未找到解析结果，请先执行日志解析")]
    NoParseResult,

    // 连接测试相关错误
    #[error("端口 {addr} 不可达: {reason}")]
    PortUnreachable { addr: String, reason: String },

    #[error("Git Token 无效: {reason}")]
    InvalidGitToken { reason: String },

    #[error("Base64 解码失败: {0}")]
    InvalidBase64(String),
}

impl AppError {
    pub fn invalid_connection(connection_id: i32) -> Self {
        AppError::InvalidConnection { connection_id }
    }

    pub fn internal<E: Display>(e: E) -> Self {
        AppError::Internal(e.to_string())
    }

    pub fn git<E: Display>(e: E) -> Self {
        AppError::Git(e.to_string())
    }

    pub fn wpl_parse<E>(e: E) -> Self
    where
        E: Display,
    {
        AppError::WplParse(e.to_string())
    }

    pub fn wpl_best_error(depth: usize, hint: impl Into<String>) -> Self {
        let hint_str = hint.into();
        let err_msg = format!("解析深度: {depth}\n{hint_str}");
        AppError::WplParse(err_msg)
    }

    pub fn wpl_parse_msg(msg: impl Into<String>) -> Self {
        AppError::WplParse(msg.into())
    }

    pub fn oml_transform<E>(e: E) -> Self
    where
        E: std::error::Error + Send + Sync + Display + 'static,
    {
        AppError::OmlTransform(e.to_string())
    }

    pub fn oml_transform_msg(msg: impl Into<String>) -> Self {
        AppError::OmlTransform(msg.into())
    }
    /// 创建 NotFound 错误
    pub fn not_found(msg: impl Into<String>) -> Self {
        AppError::NotFound(msg.into())
    }

    /// 创建 Validation 错误
    pub fn validation(msg: impl Into<String>) -> Self {
        AppError::Validation(msg.into())
    }

    /// 创建 PortUnreachable 错误
    pub fn port_unreachable(addr: impl Into<String>, reason: impl Display) -> Self {
        AppError::PortUnreachable {
            addr: addr.into(),
            reason: reason.to_string(),
        }
    }

    /// 创建 InvalidGitToken 错误
    pub fn invalid_git_token(reason: impl Into<String>) -> Self {
        AppError::InvalidGitToken {
            reason: reason.into(),
        }
    }

    fn code(&self) -> &'static str {
        match self {
            AppError::InvalidConnection { .. } => "INVALID_CONNECTION",
            AppError::ConnectionMismatch { .. } => "CONNECTION_MISMATCH",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::Internal(_) => "INTERNAL_ERROR",
            AppError::Git(_) => "GIT_ERROR",
            AppError::WplParse(_) => "WPL_PARSE_ERROR",
            AppError::OmlTransform(_) => "OML_TRANSFORM_ERROR",
            AppError::NoParseResult => "NO_PARSE_RESULT",
            AppError::PortUnreachable { .. } => "PORT_UNREACHABLE",
            AppError::InvalidGitToken { .. } => "INVALID_GIT_TOKEN",
            AppError::InvalidBase64(_) => "INVALID_BASE64",
            AppError::WplParseOrion(_) => "WPL_PARSE_ORION_ERROR",
            AppError::OmlParseOrion(_) => "OML_PARSE_ORION_ERROR",
        }
    }
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        use actix_web::http::StatusCode;

        let status = match self {
            // 400 Bad Request - 客户端输入错误
            AppError::InvalidConnection { .. }
            | AppError::Validation(_)
            | AppError::WplParse(_)
            | AppError::OmlTransform(_)
            | AppError::NoParseResult
            | AppError::PortUnreachable { .. }
            | AppError::OmlParseOrion(_)
            | AppError::WplParseOrion(_)
            | AppError::InvalidGitToken { .. } => StatusCode::BAD_REQUEST,

            // 403 Forbidden - 权限/关联错误
            AppError::ConnectionMismatch { .. } => StatusCode::FORBIDDEN,

            // 404 Not Found - 资源不存在
            AppError::NotFound(_) => StatusCode::NOT_FOUND,

            // 500 Internal Server Error - 服务器内部错误
            AppError::Internal(_) | AppError::Git(_) => StatusCode::INTERNAL_SERVER_ERROR,

            // 500 Bad Request - Base64 解码错误
            AppError::InvalidBase64(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        let details = match self {
            AppError::InvalidConnection { connection_id } => {
                Some(serde_json::json!({ "connection_id": connection_id }))
            }
            AppError::ConnectionMismatch {
                resource_id,
                resource_connection_id,
                requested_connection_id,
            } => Some(serde_json::json!({
                "resource_id": resource_id,
                "resource_connection_id": resource_connection_id,
                "requested_connection_id": requested_connection_id,
            })),
            AppError::PortUnreachable { addr, reason } => {
                Some(serde_json::json!({ "addr": addr, "reason": reason }))
            }
            AppError::InvalidGitToken { reason } => Some(serde_json::json!({ "reason": reason })),
            _ => None,
        };

        let body = ErrorBody {
            success: false,
            error: ErrorDetail {
                code: self.code(),
                message: self.to_string(),
                details,
            },
        };

        HttpResponse::build(status).json(body)
    }
}

/// 通用数据库错误，供所有仓储层复用
#[derive(Debug, thiserror::Error)]
pub enum DbError {
    #[error("{entity} 不存在")]
    NotFound { entity: &'static str },

    #[error("数据库错误: {0}")]
    Db(#[from] sea_orm::DbErr),
}

pub type DbResult<T> = std::result::Result<T, DbError>;

impl DbError {
    pub fn not_found(entity: &'static str) -> Self {
        DbError::NotFound { entity }
    }
}

/// 自动转换 DbError 为 AppError
impl From<DbError> for AppError {
    fn from(e: DbError) -> Self {
        match e {
            DbError::NotFound { entity } => {
                AppError::NotFound(format!("{} 不存在或已删除", entity))
            }
            DbError::Db(db_err) => AppError::internal(db_err),
        }
    }
}
