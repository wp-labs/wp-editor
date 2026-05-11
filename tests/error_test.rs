use actix_web::{ResponseError, http::StatusCode};
use serde_json::Value;
use wp_editor::error::{AppError, AppReason, DbError};

#[actix_web::test]
async fn test_app_error_creation() {
    let conn_err = AppError::invalid_connection(123);
    assert_eq!(
        conn_err.reason(),
        &AppReason::InvalidConnection { connection_id: 123 }
    );

    let internal_err = AppError::internal_msg("test error");
    assert_eq!(
        internal_err.reason(),
        &AppReason::Internal("test error".into())
    );

    let git_err = AppError::git("git failed");
    assert_eq!(git_err.reason(), &AppReason::Git("git failed".into()));

    let wpl_msg_err = AppError::wpl_parse_msg("parse failed");
    assert_eq!(
        wpl_msg_err.reason(),
        &AppReason::WplParse("parse failed".into())
    );

    let oml_err = AppError::oml_transform_msg("transform failed");
    assert_eq!(
        oml_err.reason(),
        &AppReason::OmlTransform("transform failed".into())
    );

    let not_found_err = AppError::not_found("resource not found");
    assert_eq!(
        not_found_err.reason(),
        &AppReason::NotFound("resource not found".into())
    );

    let validation_err = AppError::validation("invalid input");
    assert_eq!(
        validation_err.reason(),
        &AppReason::Validation("invalid input".into())
    );

    let port_err = AppError::port_unreachable("localhost:8080", "connection refused");
    assert_eq!(
        port_err.reason(),
        &AppReason::PortUnreachable {
            addr: "localhost:8080".into(),
            reason: "connection refused".into()
        }
    );

    let token_err = AppError::invalid_git_token("invalid token");
    assert_eq!(
        token_err.reason(),
        &AppReason::InvalidGitToken("invalid token".into())
    );
}

#[actix_web::test]
async fn test_app_error_display() {
    let conn_err = AppError::invalid_connection(123);
    let display_str = format!("{}", conn_err);
    assert!(display_str.contains("连接 ID 不存在或已删除"));

    let validation_err = AppError::validation("test validation");
    let display_str = format!("{}", validation_err);
    assert!(display_str.contains("参数验证失败"));
    assert!(display_str.contains("test validation"));
}

#[actix_web::test]
async fn test_app_error_response_error() {
    let test_cases = vec![
        (AppError::invalid_connection(123), StatusCode::BAD_REQUEST),
        (AppError::validation("test"), StatusCode::BAD_REQUEST),
        (AppError::not_found("test"), StatusCode::NOT_FOUND),
        (
            AppError::internal_msg("test"),
            StatusCode::INTERNAL_SERVER_ERROR,
        ),
        (
            AppError::from(AppReason::ConnectionMismatch {
                resource_id: 1,
                resource_connection_id: 2,
                requested_connection_id: 3,
            }),
            StatusCode::FORBIDDEN,
        ),
    ];

    for (error, expected_status) in test_cases {
        let response = error.error_response();
        assert_eq!(response.status(), expected_status);

        let body = actix_web::body::to_bytes(response.into_body())
            .await
            .unwrap();
        let json: Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["success"], false);
        assert!(json["error"]["code"].is_string());
        assert!(json["error"]["message"].is_string());
    }
}

#[actix_web::test]
async fn test_db_error_complete() {
    let not_found_err = DbError::not_found("user");
    let display_str = format!("{}", not_found_err);
    assert!(display_str.contains("user"));
    assert!(display_str.contains("不存在"));

    let db_not_found = DbError::not_found("connection");
    let app_error: AppError = db_not_found.into();
    assert_eq!(
        app_error.reason(),
        &AppReason::NotFound("connection 不存在或已删除".into())
    );
    assert_eq!(app_error.stable_code(), "biz.not_found");
}

#[actix_web::test]
async fn test_error_codes() {
    let test_cases: Vec<(AppError, &str)> = vec![
        (AppError::invalid_connection(1), "biz.invalid_connection"),
        (AppError::not_found("test"), "biz.not_found"),
        (AppError::validation("test"), "biz.validation_error"),
        (AppError::internal_msg("test"), "sys.internal_error"),
        (AppError::git("test"), "sys.git_error"),
        (AppError::wpl_parse_msg("test"), "biz.wpl_parse_error"),
        (AppError::oml_transform_msg("test"), "biz.oml_transform_error"),
        (AppError::from(AppReason::NoParseResult), "biz.no_parse_result"),
        (
            AppError::port_unreachable("addr", "reason"),
            "sys.port_unreachable",
        ),
        (
            AppError::invalid_git_token("reason"),
            "biz.invalid_git_token",
        ),
    ];

    for (error, expected_code) in test_cases {
        assert_eq!(
            error.stable_code(),
            expected_code,
            "expected code '{expected_code}' but got '{}'",
            error.stable_code()
        );

        let response = error.error_response();
        let body = actix_web::body::to_bytes(response.into_body())
            .await
            .unwrap();
        let json: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], expected_code);
    }
}
