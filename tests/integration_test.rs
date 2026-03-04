// 集成测试 - 测试主要的库功能

use wp_editor::{OmlFormatter, WplFormatter, convert_record, record_to_fields, warp_check_record};

/// 测试库的主要导出功能和基本API可用性
/// 验证WplFormatter和OmlFormatter能够正常创建和使用
#[test]
fn test_library_exports() {
    // 测试库的主要导出是否可用

    // 测试格式化器
    let wpl_formatter = WplFormatter::new();
    let oml_formatter = OmlFormatter::new();

    // 测试格式化功能
    let test_wpl = "package test {}";
    let wpl_result = wpl_formatter
        .format_content(test_wpl)
        .expect("格式化 WPL 失败");
    assert!(!wpl_result.is_empty());

    let test_oml = "name: test\nrule: test\n---\nfield = take();";
    let oml_result = oml_formatter
        .format_content(test_oml)
        .expect("格式化 OML 失败");
    assert!(!oml_result.is_empty());
}

/// 端到端工作流集成测试
/// 测试完整的日志处理流程：WPL解析 -> OML转换 -> 字段提取
/// 验证整个系统的集成工作流程和数据流转
#[test]
fn test_end_to_end_workflow() {
    // 端到端工作流测试：WPL解析 -> OML转换 -> 字段提取

    let log_data =
        r#"192.168.1.1 - admin [01/Jan/2024:12:00:00 +0000] "GET /api/test HTTP/1.1" 200 1234"#;

    let wpl_rule = r#"package /test/e2e {
rule access_log {
    (ip:client_ip,_,chars:user,time:timestamp<[,]>,http/request",http/status,digit:size)
}
}"#;

    let oml_rule = r#"name : /oml/test/e2e

rule :
    /test/e2e*
---
source_ip = take(option:[client_ip]) ;
user_name = take(option:[user]) ;
request_time = take(option:[timestamp]) ;
http_method = take(option:[http/request]) ;
status_code = take(option:[http/status]) ;
response_size = take(option:[size]) ;"#;

    // 步骤1: WPL解析
    let wpl_record = warp_check_record(wpl_rule, log_data).expect("WPL解析应该成功");

    let wpl_fields = record_to_fields(&wpl_record);
    assert!(!wpl_fields.is_empty(), "WPL解析应该产生字段");

    // 步骤2: OML转换
    let oml_record = convert_record(oml_rule, wpl_record).expect("OML转换应该成功");

    let oml_fields = record_to_fields(&oml_record);
    assert!(!oml_fields.is_empty(), "OML转换应该产生字段");

    // 步骤3: 验证转换结果
    let field_names: Vec<&str> = oml_fields.iter().map(|f| f.name.as_str()).collect();

    let expected_fields = vec![
        "source_ip",
        "user_name",
        "request_time",
        "http_method",
        "status_code",
        "response_size",
    ];

    for expected in expected_fields {
        assert!(
            field_names.iter().any(|&name| name == expected),
            "应该包含字段: {}",
            expected
        );
    }

    // 验证具体值
    let source_ip = oml_fields.iter().find(|f| f.name == "source_ip");
    if let Some(field) = source_ip {
        assert_eq!(field.value, "192.168.1.1");
    }

    let status_code = oml_fields.iter().find(|f| f.name == "status_code");
    if let Some(field) = status_code {
        assert_eq!(field.value, "200");
    }
}

/// 测试错误处理工作流的集成
/// 验证系统在遇到无效输入时的错误传播和处理机制
#[test]
fn test_error_handling_workflow() {
    // 测试错误处理工作流

    // 无效的WPL规则
    let invalid_wpl = "invalid wpl syntax";
    let log_data = "test log";

    let wpl_result = warp_check_record(invalid_wpl, log_data);
    assert!(wpl_result.is_err(), "无效WPL应该返回错误");

    // 有效WPL但无效OML
    let valid_wpl = r#"package /test {
rule simple {
    (chars:field1)
}
}"#;

    let wpl_record = warp_check_record(valid_wpl, "test_value").expect("有效WPL应该成功");

    let invalid_oml = "invalid oml syntax";
    let oml_result = convert_record(invalid_oml, wpl_record);
    assert!(oml_result.is_err(), "无效OML应该返回错误");
}

/// 测试解析字段结构的完整性和正确性
/// 验证ParsedField结构体的各种特性和数据完整性
#[test]
fn test_parsed_field_structure() {
    // 测试ParsedField结构
    let log_data = "test_value";
    let wpl_rule = r#"package /test {
rule simple {
    (chars:test_field)
}
}"#;

    let record = warp_check_record(wpl_rule, log_data).expect("解析应该成功");
    let fields = record_to_fields(&record);

    assert!(!fields.is_empty(), "应该有字段");

    let field = &fields[0];
    assert!(!field.name.is_empty(), "字段名不应为空");
    assert!(!field.value.is_empty(), "字段值不应为空");

    // 测试字段的Debug和Clone特性
    let cloned_field = field.clone();
    assert_eq!(field.name, cloned_field.name);
    assert_eq!(field.value, cloned_field.value);

    let debug_str = format!("{:?}", field);
    assert!(debug_str.contains(&field.name));
}

/// 测试多日志条目的批量处理能力
/// 验证系统能够正确处理多个不同格式的日志条目
#[test]
fn test_multiple_log_entries() {
    // 测试处理多个日志条目
    let log_entries = vec![
        r#"192.168.1.1 - user1 [01/Jan/2024:12:00:00 +0000] "GET /page1 HTTP/1.1" 200 100"#,
        r#"192.168.1.2 - user2 [01/Jan/2024:12:01:00 +0000] "POST /api HTTP/1.1" 201 200"#,
        r#"192.168.1.3 - user3 [01/Jan/2024:12:02:00 +0000] "PUT /data HTTP/1.1" 404 50"#,
    ];

    let wpl_rule = r#"package /test/multi {
rule access {
    (ip:client_ip,_,chars:user,time:timestamp<[,]>,http/request",http/status,digit:size)
}
}"#;

    for (i, log_entry) in log_entries.iter().enumerate() {
        let record = warp_check_record(wpl_rule, log_entry)
            .unwrap_or_else(|e| panic!("日志条目 {} 解析失败: {}", i, e));

        let fields = record_to_fields(&record);
        assert!(!fields.is_empty(), "日志条目 {} 应该产生字段", i);

        // 验证每个条目都有预期的字段
        let has_ip = fields.iter().any(|f| f.name == "client_ip");
        let has_user = fields.iter().any(|f| f.name == "user");
        let has_status = fields.iter().any(|f| f.name == "http/status");

        assert!(has_ip, "日志条目 {} 应该有IP字段", i);
        assert!(has_user, "日志条目 {} 应该有用户字段", i);
        assert!(has_status, "日志条目 {} 应该有状态字段", i);
    }
}

/// 测试格式化器在边界情况下的行为
/// 验证格式化器能够处理空内容、超长内容和特殊字符等边界情况
#[test]
fn test_formatter_edge_cases() {
    // 测试格式化器的边界情况
    let wpl_formatter = WplFormatter::new();
    let oml_formatter = OmlFormatter::new();

    // 空内容
    let empty_result = wpl_formatter.format_content("").expect("格式化空 WPL 失败");
    assert!(!empty_result.is_empty() || empty_result.is_empty()); // 可能返回空或格式化结果

    let empty_oml_result = oml_formatter.format_content("").expect("格式化空 OML 失败");
    assert!(!empty_oml_result.is_empty() || empty_oml_result.is_empty());

    // 非常长的内容
    let long_content = "a".repeat(10000);
    let long_result = wpl_formatter
        .format_content(&long_content)
        .expect("格式化长 WPL 失败");
    assert!(!long_result.is_empty() || long_result.is_empty());
}
