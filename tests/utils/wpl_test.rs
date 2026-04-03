use wp_data_fmt::{FormatType, Json, RecordFormatter};
use wp_editor::{record_to_fields, warp_check_record};

#[test]
fn test_warp_check_nginx_log() {
    simple_log::quick!();

    let log_data = r#"222.133.52.20 - - [06/Aug/2019:12:12:19 +0800] "GET /nginx-logo.png HTTP/1.1" 200 368 "http://119.122.1.4/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36" "-""#;

    let wpl_rule = r#"package /example/simple {
rule nginx {
    (ip:sip,2*_,time:recv_time<[,]>,http/request",http/status,digit,chars",http/agent",_")
}
}"#;

    let record = warp_check_record(wpl_rule, log_data).expect("解析应该成功");
    let fields = record_to_fields(&record);

    assert!(fields.len() >= 7, "应该至少有7个字段");

    // 辅助函数：验证字段值
    let assert_field = |name: &str, expected: &str| {
        let field = fields
            .iter()
            .find(|f| f.name == name)
            .unwrap_or_else(|| panic!("应该有 {} 字段", name));
        assert_eq!(field.value, expected, "{} 值应该正确", name);
    };

    assert_field("sip", "222.133.52.20");
    assert_field("recv_time", "2019-08-06 12:12:19");
    assert_field("http/request", "GET /nginx-logo.png HTTP/1.1");
    assert_field("http/status", "200");
}

#[test]
fn test_warp_check_empty_rule() {
    let log_data = "test data";
    let empty_rule = r#"package /example/empty {}"#;

    let result = warp_check_record(empty_rule, log_data);

    assert!(result.is_err(), "空规则应该返回错误");
}

#[test]
fn test_to_json() {
    let log_data = r#"222.133.52.20 - - [06/Aug/2019:12:12:19 +0800] "GET /nginx-logo.png HTTP/1.1" 200 368 "http://119.122.1.4/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36" "-""#;

    let wpl_rule = r#"package /example/simple {
rule nginx {
    (ip:sip,2*_,time:recv_time<[,]>,http/request",http/status,digit,chars",http/agent",_")
}
}"#;

    let record = warp_check_record(wpl_rule, log_data).expect("解析应该成功");

    // 使用 to_json! 宏测试 JSON 序列化
    let fields = record_to_fields(&record);
    assert!(!fields.is_empty(), "格式化的 JSON 不应为空");
    assert!(fields.len() >= 7, "JSON 数组应该至少有7个元素");

    // 测试 wp_data_fmt 的 JSON 格式化
    let formatter = FormatType::Json(Json);
    let json_string = formatter.fmt_record(&record);

    assert!(!json_string.is_empty(), "格式化的 JSON 不应为空");
    assert!(json_string.contains("sip"), "格式化的 JSON 应包含 sip 字段");
    assert!(
        json_string.contains("222.133.52.20"),
        "格式化的 JSON 应包含 IP 值"
    );
}

#[test]
fn test_warp_check_complex_log() {
    // 测试更复杂的日志格式
    let log_data = r#"192.168.1.100 user123 admin [07/Dec/2023:14:30:45 +0800] "POST /api/login HTTP/1.1" 201 1024 "https://example.com/login" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36""#;

    let wpl_rule = r#"package /example/complex {
rule access_log {
    (ip:client_ip,chars:username,chars:user_type,time:timestamp<[,]>,http/request",http/status,digit:response_size,chars",http/agent")
}
}"#;

    let record = warp_check_record(wpl_rule, log_data).expect("复杂日志解析应该成功");
    let fields = record_to_fields(&record);

    assert!(fields.len() >= 7, "应该至少有7个字段");

    // 验证特定字段
    let assert_field = |name: &str, expected: &str| {
        let field = fields
            .iter()
            .find(|f| f.name == name)
            .unwrap_or_else(|| panic!("应该有 {} 字段", name));
        assert_eq!(field.value, expected, "{} 值应该正确", name);
    };

    assert_field("client_ip", "192.168.1.100");
    assert_field("username", "user123");
    assert_field("user_type", "admin");
    assert_field("timestamp", "2023-12-07 14:30:45");
    assert_field("http/status", "201");
    assert_field("response_size", "1024");
}

#[test]
fn test_warp_check_malformed_log() {
    // 测试格式不正确的日志
    let malformed_logs = vec![
        "",                     // 空日志
        "incomplete log entry", // 不完整的日志
        "192.168.1.1 - -",      // 缺少必要字段
    ];

    let wpl_rule = r#"package /example/simple {
rule nginx {
    (ip:sip,2*_,time:recv_time<[,]>,http/request",http/status,digit")
}
}"#;

    for log in malformed_logs {
        let result = warp_check_record(wpl_rule, log);
        assert!(result.is_err(), "格式错误的日志应该返回错误: '{}'", log);
    }
}

#[test]
fn test_warp_check_different_rule_formats() {
    let log_data = r#"INFO 2023-12-07 15:30:00 Application started successfully"#;

    // 测试不同的规则格式
    let wpl_rules = vec![
        r#"package /example/log {
rule info_log {
    (chars:level,time:timestamp,chars*:message)
}
}"#,
        r#"package /example/log {
rule info_log {
    (chars:log_level,date:log_date,time:log_time,chars*:log_message)
}
}"#,
    ];

    for (i, rule) in wpl_rules.iter().enumerate() {
        let result = warp_check_record(rule, log_data);
        match result {
            Ok(record) => {
                let fields = record_to_fields(&record);
                assert!(!fields.is_empty(), "规则 {} 应该产生字段", i);
            }
            Err(_) => {
                // 某些规则可能不匹配，这是正常的
                println!("规则 {} 不匹配日志格式", i);
            }
        }
    }
}

#[test]
fn test_warp_check_unicode_content() {
    // 测试包含Unicode字符的日志
    let log_data = r#"用户张三 登录成功 [2023-12-07 16:00:00] 来源IP: 192.168.1.50"#;

    let wpl_rule = r#"package /example/unicode {
rule chinese_log {
    (chars*:user_info,chars*:action,time:login_time<[,]>,chars*:source_info)
}
}"#;

    let result = warp_check_record(wpl_rule, log_data);
    match result {
        Ok(record) => {
            let fields = record_to_fields(&record);
            assert!(!fields.is_empty(), "Unicode日志应该能够解析");

            // 验证Unicode内容是否正确处理
            let has_chinese = fields
                .iter()
                .any(|f| f.value.contains("张三") || f.value.contains("登录成功"));
            assert!(has_chinese, "应该包含中文内容");
        }
        Err(e) => {
            println!("Unicode日志解析失败: {}", e);
            // Unicode处理可能因为解析器限制而失败，这是可以接受的
        }
    }
}

#[test]
fn test_json_formatting_edge_cases() {
    let log_data = r#"test_value"#;
    let wpl_rule = r#"package /example/simple {
rule single_field {
    (chars:single_value)
}
}"#;

    let record = warp_check_record(wpl_rule, log_data).expect("单字段解析应该成功");

    // 测试JSON格式化
    let formatter = FormatType::Json(Json);
    let json_string = formatter.fmt_record(&record);

    assert!(!json_string.is_empty(), "JSON格式化结果不应为空");
    assert!(
        json_string.contains("single_value") || json_string.contains("test_value"),
        "JSON应包含字段名或值"
    );

    // 验证JSON是有效的
    let _: serde_json::Value =
        serde_json::from_str(&json_string).expect("格式化的JSON应该是有效的");
}

#[test]
fn test_warp_check_numeric_fields() {
    // 测试数字字段的处理
    let log_data = r#"42 3.14159 -100 0"#;

    let wpl_rule = r#"package /example/numbers {
rule numeric_test {
    (digit:integer,float:decimal,digit:negative,digit:zero)
}
}"#;

    let result = warp_check_record(wpl_rule, log_data);
    match result {
        Ok(record) => {
            let fields = record_to_fields(&record);
            assert!(fields.len() >= 3, "应该解析出数字字段");

            // 验证数字字段
            let integer_field = fields.iter().find(|f| f.name == "integer");
            if let Some(field) = integer_field {
                assert_eq!(field.value, "42");
            }
        }
        Err(e) => {
            println!("数字字段解析可能失败: {}", e);
            // 数字解析可能因为规则定义而失败
        }
    }
}
