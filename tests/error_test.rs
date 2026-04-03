use actix_web::{ResponseError, http::StatusCode};
use serde_json::Value;
use wp_editor::error::AppError;

/// 测试AppError的各种创建方法
/// 验证所有错误类型都能正确创建，包括参数传递和类型匹配
#[actix_web::test]
async fn test_app_error_creation() {
    // 测试各种错误创建方法
    let conn_err = AppError::invalid_connection(123);
    assert!(matches!(
        conn_err,
        AppError::InvalidConnection { connection_id: 123 }
    ));

    let internal_err = AppError::internal("test error");
    assert!(matches!(internal_err, AppError::Internal(_)));

    let git_err = AppError::git("git failed");
    assert!(matches!(git_err, AppError::Git(_)));

    let wpl_err = AppError::wpl_parse("parse failed");
    assert!(matches!(wpl_err, AppError::WplParse(_)));

    let oml_err = AppError::oml_transform_msg("transform failed");
    assert!(matches!(oml_err, AppError::OmlTransform(_)));

    let not_found_err = AppError::not_found("resource not found");
    assert!(matches!(not_found_err, AppError::NotFound(_)));

    let validation_err = AppError::validation("invalid input");
    assert!(matches!(validation_err, AppError::Validation(_)));

    let port_err = AppError::port_unreachable("localhost:8080", "connection refused");
    assert!(matches!(port_err, AppError::PortUnreachable { .. }));

    let token_err = AppError::invalid_git_token("invalid token");
    assert!(matches!(token_err, AppError::InvalidGitToken { .. }));
}

/// 测试AppError的Display trait实现
/// 验证错误消息能够正确格式化和显示，包含必要的上下文信息
#[actix_web::test]
async fn test_app_error_display() {
    let conn_err = AppError::invalid_connection(123);
    let display_str = format!("{}", conn_err);
    assert!(display_str.contains("123"));
    assert!(display_str.contains("连接 ID"));

    let validation_err = AppError::validation("test validation");
    let display_str = format!("{}", validation_err);
    assert!(display_str.contains("test validation"));
}

/// 测试AppError的HTTP响应错误转换
/// 验证错误能够正确转换为HTTP响应，包括状态码和响应体格式
#[actix_web::test]
async fn test_app_error_response_error() {
    // 测试不同错误的HTTP响应
    let test_cases = vec![
        (AppError::invalid_connection(123), StatusCode::BAD_REQUEST),
        (AppError::validation("test"), StatusCode::BAD_REQUEST),
        (AppError::not_found("test"), StatusCode::NOT_FOUND),
        (
            AppError::internal("test"),
            StatusCode::INTERNAL_SERVER_ERROR,
        ),
        (
            AppError::ConnectionMismatch {
                resource_id: 1,
                resource_connection_id: 2,
                requested_connection_id: 3,
            },
            StatusCode::FORBIDDEN,
        ),
    ];

    for (error, expected_status) in test_cases {
        let response = error.error_response();
        assert_eq!(response.status(), expected_status);

        // 验证响应体结构
        let body = actix_web::body::to_bytes(response.into_body())
            .await
            .unwrap();
        let json: Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["success"], false);
        assert!(json["error"]["code"].is_string());
        assert!(json["error"]["message"].is_string());
    }
}

/// 测试DbError的完整功能
/// 验证DbError的创建、显示和到AppError的转换功能
#[actix_web::test]
async fn test_db_error_complete() {
    use wp_editor::error::DbError;

    // 测试DbError创建和显示
    let not_found_err = DbError::not_found("user");
    assert!(matches!(
        not_found_err,
        DbError::NotFound { entity: "user" }
    ));

    let display_str = format!("{}", not_found_err);
    assert!(display_str.contains("user"));
    assert!(display_str.contains("不存在"));

    // 测试DbError到AppError的转换
    let db_not_found = DbError::not_found("connection");
    let app_error: AppError = db_not_found.into();

    assert!(matches!(app_error, AppError::NotFound(_)));
    let display_str = format!("{}", app_error);
    assert!(display_str.contains("connection"));
}

/// 测试错误代码映射的完整性
/// 验证所有错误类型都有正确的错误代码映射，用于API响应
#[actix_web::test]
async fn test_error_codes() {
    // 测试错误代码映射
    let test_cases = vec![
        (AppError::invalid_connection(1), "INVALID_CONNECTION"),
        (AppError::not_found("test"), "NOT_FOUND"),
        (AppError::validation("test"), "VALIDATION_ERROR"),
        (AppError::internal("test"), "INTERNAL_ERROR"),
        (AppError::git("test"), "GIT_ERROR"),
        (AppError::wpl_parse("test"), "WPL_PARSE_ERROR"),
        (AppError::oml_transform_msg("test"), "OML_TRANSFORM_ERROR"),
        (AppError::NoParseResult, "NO_PARSE_RESULT"),
        (
            AppError::port_unreachable("addr", "reason"),
            "PORT_UNREACHABLE",
        ),
        (AppError::invalid_git_token("reason"), "INVALID_GIT_TOKEN"),
        (
            AppError::InvalidBase64("test".to_string()),
            "INVALID_BASE64",
        ),
    ];

    for (error, expected_code) in test_cases {
        let response = error.error_response();
        let body = actix_web::body::to_bytes(response.into_body())
            .await
            .unwrap();
        let json: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["code"], expected_code);
    }
}
