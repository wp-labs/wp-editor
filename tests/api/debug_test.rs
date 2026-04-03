use actix_web::{App, http::StatusCode, test};

/// 测试Base64解码API端点的成功情况
/// 验证API能够正确处理有效的Base64编码内容并返回解码结果
#[actix_web::test]
async fn test_decode_base64_success() {
    use wp_editor::api::decode_base64;

    let app = test::init_service(App::new().service(decode_base64)).await;

    let base64_content = "SGVsbG8gV29ybGQ=";

    let resp = test::TestRequest::post()
        .uri("/api/debug/decode/base64")
        .set_payload(base64_content)
        .send_request(&app)
        .await;

    assert_eq!(resp.status(), StatusCode::OK);
}

/// 测试Base64解码API的错误处理情况
/// 验证API能够正确处理无效的Base64内容并返回适当的错误响应
#[actix_web::test]
async fn test_decode_base64_error_cases() {
    use wp_editor::api::decode_base64;

    let app = test::init_service(App::new().service(decode_base64)).await;

    // 测试无效的Base64内容
    let invalid_base64 = "invalid_base64_content!@#";

    let resp = test::TestRequest::post()
        .uri("/api/debug/decode/base64")
        .set_payload(invalid_base64)
        .send_request(&app)
        .await;

    // 应该返回错误状态码
    assert!(resp.status().is_client_error() || resp.status().is_server_error());
}
