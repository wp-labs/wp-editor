use wp_editor::WplFormatter;

// 基础格式化：注解、规则、字段与管道应保持结构且具备幂等性。
#[test]
fn format_should_be_idempotent() {
    let formatter = WplFormatter::new();
    let raw = r#"
#[tag(dev_vendor:"示例",dev_name:"demo"),copy_raw(name:"raw_msg")]
package demo{
rule r{
| decode/base64 | unquote/unescape |
(3*ip@sip:src, chars(host)\@host:dst[16]<[,]>\, | f_has(src), json(@k:v))
}
}
"#;

    let once = formatter.format_content(raw);
    let twice = formatter.format_content(&once);
    assert_eq!(once, twice, "多次格式化应保持输出不变");
    assert!(
        once.contains("| decode/base64 |"),
        "预处理链应被保留：{}",
        once
    );
    assert!(once.contains("f_has("), "字段管道函数应被保留：{}", once);
}

// 复杂分组与子字段：校验分组、子字段缩进与尾随逗号。
#[test]
fn format_should_layout_groups_and_subfields() {
    let formatter = WplFormatter::new();
    let raw = r#"
package log_pkg {
    rule complex {
        alt(
            kv(
                chars@id:id,
                opt(domain)@host:host_name^2,
                json(
                    digit@count,
                    chars@label:label_val
                )| ip_in([127.0.0.1])
            ),
            seq(ip, symbol(ok|!), _@*)
        )
    }
}
"#;

    let formatted = formatter.format_content(raw);
    assert!(
        formatted.contains("opt(domain)@host:host_name"),
        "可选子字段与路径应保留：{}",
        formatted
    );
    assert!(
        formatted.contains("ip_in([127.0.0.1])"),
        "函数参数应被正确渲染：{}",
        formatted
    );
    assert!(
        formatted.contains("kv(") && formatted.contains("json("),
        "嵌套分组应存在：{}",
        formatted
    );
}

// 逃逸括号与管道应视为普通字符，不应被重新缩进或拆分。
#[test]
fn format_should_keep_escaped_parens() {
    let formatter = WplFormatter::new();
    let raw = r#"
package huawei {
    rule common_module_log {
        (
            chars\#,
            time:TimeStamp,
            _,
            chars:Hostname,
            chars\%\%,
            digit:dd,
            chars:ModuleName\/,
            chars:SeverityHeader\/,
        ),
        alt(
            symbol(LOGONFAIL),
            symbol(RESOURCE),
        )\(,
        (
            chars:type\),
            chars:Cnunt<[,]>,
            chars\:,
            chars:Description\&\*,
        )
    }
}
"#;

    let formatted = formatter.format_content(raw);
    assert!(
        formatted.contains(r")\("),
        "转义括号不应触发分组重排：{}",
        formatted
    );
    assert!(
        formatted.contains(r"chars:type\)"),
        "字段中的转义括号应原样保留：{}",
        formatted
    );
}

// symbol(...) 自定义函数内的管道与内容不应被拆分，仅格式化周边缩进/换行。
#[test]
fn format_should_keep_symbol_block_raw() {
    let formatter = WplFormatter::new();
    let raw = r#"
#[tag(dev_vendor: "天眼分析平台", dev_name: "天眼分析平台", dev_type: "syslog"), copy_raw(name:"raw_msg")]
package skyeye_platform {
    #[tag(log_desc: "告警日志", log_type: "skyeye_platform_sensor_alert", alert_src: "52")]
    rule skyeye_platform_sensor_alert {
        (
            _:pri<<,>>,
            5*_
        ),
        (
            time:update_time\|\!,
            ip:access_ip\|\!,
            symbol(alarm|!)
        )
    }
}
"#;

    let formatted = formatter.format_content(raw);
    let expected = r#"#[tag(dev_vendor: "天眼分析平台", dev_name: "天眼分析平台", dev_type: "syslog"), copy_raw(name:"raw_msg")]
package skyeye_platform {
    #[tag(log_desc: "告警日志", log_type: "skyeye_platform_sensor_alert", alert_src: "52")]
    rule skyeye_platform_sensor_alert {
        (
            _:pri<<,>>,
            5*_
        ),
        (
            time:update_time\|\!,
            ip:access_ip\|\!,
            symbol(alarm|!)
        )
    }
}
"#;

    assert_eq!(
        formatted, expected,
        "symbol(alarm|!) 内部管道应保持原样，不被拆分或加空格"
    );
}

// f_chars_not_has/f_chars_has 函数内部不应被拆分，仍需保留行内内容。
#[test]
fn format_should_keep_f_chars_raw() {
    let formatter = WplFormatter::new();
    let raw = r#"
package demo {
    rule r {
        f_chars_not_has(a|b|c),
        f_chars_has(x|y|z),
        symbol(alarm|!)
    }
}
"#;

    let formatted = formatter.format_content(raw);
    let expected = r#"package demo {
    rule r {
        f_chars_not_has(a|b|c),
        f_chars_has(x|y|z),
        symbol(alarm|!)
    }
}
"#;

    assert_eq!(
        formatted, expected,
        "自定义 raw 函数内容应保持原样，仅调整缩进换行"
    );
}

// 被转义的逗号应视为普通字符，不触发换行。
#[test]
fn format_should_keep_escaped_comma_inline() {
    let formatter = WplFormatter::new();
    let raw = r#"
package demo {
    rule r {
        chars\,literal, chars\,literal2
    }
}
"#;

    let formatted = formatter.format_content(raw);
    let expected = r#"package demo {
    rule r {
        chars\,literal,
        chars\,literal2
    }
}
"#;

    assert_eq!(
        formatted, expected,
        "转义逗号不应触发折行，换行只由未转义逗号决定"
    );
}

// 转义括号应被视为普通字符，不触发缩进或闭合匹配。
#[test]
fn format_should_keep_escaped_parens_literal() {
    let formatter = WplFormatter::new();
    let raw = r#"
package demo {
    rule r {
        symbol(LOGONFAIL)\(,
        chars:Description\&\*,
        kv(chars@ruleId)\.,
    }
}
"#;

    let formatted = formatter.format_content(raw);
    let expected = r#"package demo {
    rule r {
        symbol(LOGONFAIL)\(,
        chars:Description\&\*,
        kv(chars@ruleId)\.,
    }
}
"#;

    assert_eq!(
        formatted, expected,
        "转义括号应保持原样，不应改变缩进或被视为结构括号"
    );
}

// 双引号后紧跟逗号（仅有空白插入）时视为普通字符，避免误判字符串导致格式化失败。
#[test]
fn format_should_keep_trailing_quote_before_comma_literal() {
    let formatter = WplFormatter::new();
    let raw = r#"
package /raw/web {
    rule nginx {
        (
            ip:sip,
            2*_,
            chars:timestamp<[,]>,
            http/request"
                ,chars:status,
            chars:size,
            chars:referer"
                ,
            http/agent"
                ,   _"
        )
    }
}
"#;

    let formatted = formatter.format_content(raw);
    let expected = r#"package /raw/web {
    rule nginx {
        (
            ip:sip,
            2*_,
            chars:timestamp<[,]>,
            http/request",
            chars:status,
            chars:size,
            chars:referer",
            http/agent",
            _"
        )
    }
}
"#;

    assert_eq!(
        formatted, expected,
        "双引号后紧跟逗号的场景应按普通字符处理，保持换行与缩进"
    );
}

#[test]
fn format_should_not_error_for_balanced_parens() {
    let formatter = WplFormatter::new();
    let raw = r#"
package /path/ {
    rule name {
        (
            mobile_phone
        )
    }
}
"#;

    let result = formatter.format_with_error(raw);
    assert!(result.is_ok(), "括号成对闭合的 WPL 不应触发格式化错误");
}

#[test]
fn format_should_report_line_for_unclosed_paren() {
    let formatter = WplFormatter::new();
    let raw = r#"
package /path/ {
    rule name {
        (
            mobile_phone
    }
}
"#;

    let err = formatter
        .format_with_error(raw)
        .expect_err("缺少闭合括号应返回错误");
    let err_text = err.to_string();
    assert!(
        err_text.contains("第 6 行") || err_text.contains("第 5 行"),
        "错误信息应包含行号，当前为：{}",
        err_text
    );
}
