use wp_data_fmt::{FormatType, Json, RecordFormatter};
use wp_editor::{convert_record, record_to_fields, warp_check_record};

#[tokio::test]
async fn test_wpl_to_oml_transform() {
    let log_data = r#"222.133.52.20 - - [06/Aug/2019:12:12:19 +0800] "GET /nginx-logo.png HTTP/1.1" 200 368 "http://119.122.1.4/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36" "-""#;

    let wpl_rule = r#"package /example/simple {
rule nginx {
    (ip:sip,2*_,time:recv_time<[,]>,http/request",http/status,digit,chars",http/agent",_")
}
}"#;

    let oml_rule = r#"name : /oml/example/simple

rule :
    /example/simple*
---
recv_time  = take() ;
occur_time = Now::time() ;
from_ip    = take(option:[from-ip]) ;
src_ip     = take(option:[src-ip,sip,source-ip] );
*  = take() ;"#;

    // WPL 解析
    let wpl_record = warp_check_record(wpl_rule, log_data).expect("WPL 解析应该成功");

    // OML 转换
    let oml_record = convert_record(oml_rule, wpl_record)
        .await
        .expect("OML 转换应该成功");
    let fields = record_to_fields(&oml_record);

    // 验证转换后的字段
    assert!(!fields.is_empty(), "转换后应该有字段");

    // 辅助函数：验证字段存在
    let assert_field_exists = |name: &str| {
        assert!(
            fields.iter().any(|f| f.name == name),
            "应该有 {} 字段",
            name
        );
    };

    // 验证 OML 规则中定义的关键字段
    assert_field_exists("recv_time");
    assert_field_exists("occur_time");
    assert_field_exists("src_ip");

    // 验证 src_ip 的值（应该从 sip 字段获取）
    let src_ip_field = fields
        .iter()
        .find(|f| f.name == "src_ip")
        .expect("应该有 src_ip 字段");
    assert_eq!(
        src_ip_field.value, "222.133.52.20",
        "src_ip 应该从 sip 获取正确的值"
    );

    // 测试 JSON 格式化
    let formatter = FormatType::Json(Json);
    let json_string = formatter.fmt_record(&oml_record);

    assert!(!json_string.is_empty(), "JSON 格式化结果不应为空");
    assert!(json_string.contains("src_ip"), "JSON 应包含 src_ip 字段");
}
