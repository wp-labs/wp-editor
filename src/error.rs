use actix_web::{HttpResponse, ResponseError};
use orion_error::conversion_ext::ConvStructError;
use orion_error::{ErrorIdentityProvider, OrionError, StructError, UvsReason};
use serde::Serialize;
use std::fmt;
use wp_error::parse_error::OMLCodeReason;
use wpl::parser::error::WplCodeReason;
use wpl::WparseReason;

// ── Domain Reason ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, OrionError)]
pub enum AppReason {
    #[orion_error(identity = "biz.invalid_connection", message = "连接 ID 不存在或已删除")]
    InvalidConnection { connection_id: i32 },

    #[orion_error(identity = "biz.connection_mismatch", message = "该资源不属于指定连接")]
    ConnectionMismatch {
        resource_id: i32,
        resource_connection_id: i32,
        requested_connection_id: i32,
    },

    #[orion_error(identity = "biz.not_found", message = "资源不存在")]
    NotFound(String),

    #[orion_error(identity = "biz.validation_error", message = "参数验证失败")]
    Validation(String),

    #[orion_error(identity = "sys.internal_error", message = "服务器内部错误")]
    Internal(String),

    #[orion_error(identity = "sys.git_error", message = "Git 操作失败")]
    Git(String),

    #[orion_error(identity = "biz.wpl_parse_error", message = "WPL 解析失败")]
    WplParse(String),

    #[orion_error(identity = "biz.oml_transform_error", message = "OML 转换失败")]
    OmlTransform(String),

    #[orion_error(identity = "biz.no_parse_result", message = "未找到解析结果")]
    NoParseResult,

    #[orion_error(identity = "sys.port_unreachable", message = "端口不可达")]
    PortUnreachable { addr: String, reason: String },

    #[orion_error(identity = "biz.invalid_git_token", message = "Git Token 无效")]
    InvalidGitToken(String),

    #[orion_error(identity = "biz.invalid_base64", message = "Base64 解码失败")]
    InvalidBase64(String),

    #[orion_error(transparent)]
    Uvs(UvsReason),
}

// ── From<UpstreamReason> for AppReason ─────────────────────────────────────

impl From<WplCodeReason> for AppReason {
    fn from(r: WplCodeReason) -> Self {
        match r {
            WplCodeReason::Plugin(s) => AppReason::WplParse(s),
            WplCodeReason::Syntax(s) => AppReason::WplParse(s),
            WplCodeReason::Empty(s) => AppReason::WplParse(s),
            WplCodeReason::UnSupport(s) => AppReason::WplParse(s),
            WplCodeReason::Uvs(uvs) => AppReason::Uvs(uvs),
        }
    }
}

impl From<WparseReason> for AppReason {
    fn from(r: WparseReason) -> Self {
        match r {
            WparseReason::Plugin(s) => AppReason::WplParse(s),
            WparseReason::NotMatch => AppReason::WplParse("规则不匹配".into()),
            WparseReason::LineProc(s) => AppReason::WplParse(s),
            WparseReason::Uvs(uvs) => AppReason::Uvs(uvs),
        }
    }
}

impl From<OMLCodeReason> for AppReason {
    fn from(r: OMLCodeReason) -> Self {
        match r {
            OMLCodeReason::Syntax(s) => AppReason::OmlTransform(s),
            OMLCodeReason::NotFound(s) => AppReason::NotFound(s),
            OMLCodeReason::Uvs(uvs) => AppReason::Uvs(uvs),
        }
    }
}

// ── AppError newtype ───────────────────────────────────────────────────────

#[derive(Debug)]
pub struct AppError(StructError<AppReason>);

impl AppError {
    pub fn invalid_connection(connection_id: i32) -> Self {
        AppError(StructError::from(AppReason::InvalidConnection { connection_id }))
    }

    pub fn internal<E: std::error::Error + Send + Sync + 'static>(e: E) -> Self {
        AppError(
            StructError::builder(AppReason::Internal(e.to_string()))
                .attach_source(e)
                .finish(),
        )
    }

    pub fn internal_msg(msg: impl Into<String>) -> Self {
        AppError(StructError::from(AppReason::Internal(msg.into())))
    }

    pub fn git(msg: impl Into<String>) -> Self {
        AppError(StructError::from(AppReason::Git(msg.into())))
    }

    pub fn wpl_parse_msg(msg: impl Into<String>) -> Self {
        let msg = msg.into();
        AppError(StructError::from(AppReason::WplParse(msg.clone())).with_detail(msg))
    }

    pub fn wpl_best_error(depth: usize, hint: impl Into<String>) -> Self {
        let hint_str = hint.into();
        let err_msg = format!("解析深度: {depth}\n{hint_str}");
        AppError(StructError::from(AppReason::WplParse(err_msg.clone())).with_detail(err_msg))
    }

    pub fn oml_transform<E: std::error::Error + Send + Sync + 'static>(e: E) -> Self {
        AppError(
            StructError::builder(AppReason::OmlTransform(e.to_string()))
                .attach_source(e)
                .finish(),
        )
    }

    pub fn oml_transform_msg(msg: impl Into<String>) -> Self {
        AppError(StructError::from(AppReason::OmlTransform(msg.into())))
    }

    pub fn not_found(msg: impl Into<String>) -> Self {
        let msg = msg.into();
        AppError(StructError::from(AppReason::NotFound(msg.clone())).with_detail(msg))
    }

    pub fn validation(msg: impl Into<String>) -> Self {
        let msg = msg.into();
        AppError(StructError::from(AppReason::Validation(msg.clone())).with_detail(msg))
    }

    pub fn port_unreachable(addr: impl Into<String>, reason: impl fmt::Display) -> Self {
        AppError(StructError::from(AppReason::PortUnreachable {
            addr: addr.into(),
            reason: reason.to_string(),
        }))
    }

    pub fn invalid_git_token(reason: impl Into<String>) -> Self {
        AppError(StructError::from(AppReason::InvalidGitToken(reason.into())))
    }

    pub fn reason(&self) -> &AppReason {
        self.0.reason()
    }

    pub fn stable_code(&self) -> &'static str {
        self.0.stable_code()
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::Display::fmt(&self.0, f)
    }
}

// ── From impls ─────────────────────────────────────────────────────────────

impl From<AppReason> for AppError {
    fn from(reason: AppReason) -> Self {
        AppError(StructError::from(reason))
    }
}

impl From<StructError<WplCodeReason>> for AppError {
    fn from(e: StructError<WplCodeReason>) -> Self {
        AppError(e.conv())
    }
}

impl From<StructError<WparseReason>> for AppError {
    fn from(e: StructError<WparseReason>) -> Self {
        AppError(e.conv())
    }
}

impl From<StructError<OMLCodeReason>> for AppError {
    fn from(e: StructError<OMLCodeReason>) -> Self {
        AppError(e.conv())
    }
}

// ── ResponseError ──────────────────────────────────────────────────────────

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

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        use actix_web::http::StatusCode;

        let reason = self.reason();

        let status = match reason {
            AppReason::InvalidConnection { .. }
            | AppReason::Validation(_)
            | AppReason::WplParse(_)
            | AppReason::OmlTransform(_)
            | AppReason::NoParseResult
            | AppReason::PortUnreachable { .. }
            | AppReason::InvalidGitToken(_) => StatusCode::BAD_REQUEST,

            AppReason::ConnectionMismatch { .. } => StatusCode::FORBIDDEN,

            AppReason::NotFound(_) => StatusCode::NOT_FOUND,

            AppReason::Internal(_)
            | AppReason::Git(_)
            | AppReason::InvalidBase64(_) => StatusCode::INTERNAL_SERVER_ERROR,

            AppReason::Uvs(uvs) => match uvs {
                UvsReason::NotFoundError => StatusCode::NOT_FOUND,
                UvsReason::ValidationError => StatusCode::BAD_REQUEST,
                UvsReason::PermissionError => StatusCode::FORBIDDEN,
                _ => StatusCode::INTERNAL_SERVER_ERROR,
            },
        };

        let details = match reason {
            AppReason::InvalidConnection { connection_id } => {
                Some(serde_json::json!({ "connection_id": connection_id }))
            }
            AppReason::ConnectionMismatch {
                resource_id,
                resource_connection_id,
                requested_connection_id,
            } => Some(serde_json::json!({
                "resource_id": resource_id,
                "resource_connection_id": resource_connection_id,
                "requested_connection_id": requested_connection_id,
            })),
            AppReason::PortUnreachable { addr, reason: msg } => {
                Some(serde_json::json!({ "addr": addr, "reason": msg }))
            }
            AppReason::InvalidGitToken(reason) => {
                Some(serde_json::json!({ "reason": reason }))
            }
            _ => None,
        };

        let body = ErrorBody {
            success: false,
            error: ErrorDetail {
                code: self.stable_code(),
                message: self.to_string(),
                details,
            },
        };

        HttpResponse::build(status).json(body)
    }
}

// ── DbError ────────────────────────────────────────────────────────────────

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

impl From<DbError> for AppError {
    fn from(e: DbError) -> Self {
        match e {
            DbError::NotFound { entity } => {
                AppError::not_found(format!("{} 不存在或已删除", entity))
            }
            DbError::Db(db_err) => AppError::internal(db_err),
        }
    }
}
