use wp_editor::OmlFormatter;

#[test]
fn format_content_should_keep_blocks_neat() {
    let formatter = OmlFormatter::new();
    let raw = "name : demo \r\nrule : demo/rule\r\n---\r\nblock = match read(kind){\r\nchars(A)=>{\r\nvalue = 1;\r\n}\r\n\r\nchars(B)=>{\r\n    value=2;\r\n}\r\n}\r\n";

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
name : demo
rule : demo/rule
---

block = match read(kind) {
    chars(A) => {
        value = 1 ;
    }
    chars(B) => {
        value = 2 ;
    }
}
";

    assert_eq!(formatted, expected, "格式化后应统一缩进与换行");
    assert!(
        !formatted.contains('\t'),
        "格式化后不应包含制表符，便于编辑器展示"
    );
}

#[test]
fn format_content_should_split_by_semicolon_outside_string() {
    let formatter = OmlFormatter::new();
    let raw = r#"pos_sn = read(option:[serial_num]); access_ip: ip = read(access_ip);"#;

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
pos_sn = read(option:[serial_num]) ;
access_ip : ip = read(access_ip) ;
";

    assert_eq!(
        formatted, expected,
        "语句分号应拆分成多行，但字符串内的分号需保留"
    );
}

#[test]
fn format_content_should_remove_space_before_semicolon() {
    let formatter = OmlFormatter::new();
    let raw = "value = 1 \n ; another = 2\t ;";

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
value = 1 ;
another = 2 ;
";

    assert_eq!(
        formatted, expected,
        "分号前不应存在空格或换行，语句需收敛到同一行"
    );
}

#[test]
fn format_content_should_follow_supplement_examples() {
    let formatter = OmlFormatter::new();
    let raw = "\
name : flow_ssl
rule : skyeye/flow_ssl_kafka
---
vlan_id: digit = match read(vlan_id) {
    in ( digit(0), digit(4095) ) => read(vlan_id) ;
    _ => digit(0) ;
}
;
vxlan_id: digit = match read(option:[vxlan_id]) {
    in ( digit(0), digit(16777215) ) => read(vxlan_id) ;
    _ => digit(0) ;
}
;
gre_key: digit = match read(option:[gre_key]) {
    in ( digit(0), digit(4294967295) ) => read(gre_key) ;
    _ => digit(0) ;
}
;
extend_fields = object {
    backrule_id, priv_info = read();
}
;
data_src_system = digit(13);

";

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
name : flow_ssl
rule : skyeye/flow_ssl_kafka
---

vlan_id : digit = match read(vlan_id) {
    in(digit(0), digit(4095)) => read(vlan_id) ;
    _ => digit(0) ;
} ;
vxlan_id : digit = match read(option:[vxlan_id]) {
    in(digit(0), digit(16777215)) => read(vxlan_id) ;
    _ => digit(0) ;
} ;
gre_key : digit = match read(option:[gre_key]) {
    in(digit(0), digit(4294967295)) => read(gre_key) ;
    _ => digit(0) ;
} ;
extend_fields = object {
    backrule_id, priv_info = read() ;
} ;
data_src_system = digit(13) ;
";

    assert_eq!(
        formatted, expected,
        "应与补充示例二一致：分号前无空格，普通等号两侧有空格且保持同一行"
    );
}

#[test]
fn format_content_should_insert_space_around_pipe() {
    let formatter = OmlFormatter::new();
    let raw = "\
name : pipe_case
rule : demo
---
collect_time=pipe @collect_time_tmp|Time::to_ts_ms;
value = read(a)
| Func::call;

";

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
name : pipe_case
rule : demo
---

collect_time = pipe @collect_time_tmp | Time::to_ts_ms ;
value = read(a) | Func::call ;
";

    assert_eq!(
        formatted, expected,
        "管道两侧应补 1 个空格，且换行符应收敛为同一行"
    );
}

#[test]
fn format_content_should_keep_double_colon_in_pipeline_calls() {
    let formatter = OmlFormatter::new();
    let raw = "\
name : /lean/json
rule : /learn/json/*
---

time_int = pipe take(date) | Time::to_ts_ms ;
ip_int = pipe take(src_ip) | ip4_to_int ;
* = take() ;
";

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
name : /lean/json
rule : /learn/json/*
---

time_int = pipe take(date) | Time::to_ts_ms ;
ip_int = pipe take(src_ip) | ip4_to_int ;
* = take() ;
";

    assert_eq!(
        formatted, expected,
        "命名空间函数调用中的双冒号不应被拆成带空格的两个冒号"
    );
}

#[test]
fn format_content_should_keep_comment_untouched() {
    let formatter = OmlFormatter::new();
    let raw = "\
name : comment_case
rule : demo
---
    // comment with ; and | should stay
value = 1;
";

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
name : comment_case
rule : demo
---

// comment with ; and | should stay
value = 1 ;
";

    assert_eq!(
        formatted, expected,
        "注释行应保持原文，不应因分号或管道被拆开，并顶格输出"
    );
}

#[test]
fn format_content_should_keep_attribute_on_single_line() {
    let formatter = OmlFormatter::new();
    let raw = r#"#[tag(
        dev_vendor: "青藤云", dev_name: "万相主机自适应安全平台", dev_type: "青藤云HIDS系统"
    )
    , copy_raw(
        name:"raw_msg"
    )
]
rule : qingteng/host
---
block = {}
"#;

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
#[tag(
dev_vendor : \"青藤云\", dev_name : \"万相主机自适应安全平台\", dev_type : \"青藤云HIDS系统\"), copy_raw(name : \"raw_msg\")]
rule : qingteng/host
---

block = {
}
";

    assert_eq!(formatted, expected, "属性块应折叠为单行，内容保持原有顺序");
}

#[test]
fn format_content_should_collapse_multiple_blank_lines() {
    let formatter = OmlFormatter::new();
    let raw = "\
rule : test
---

block = {}


value = 1;



value = 2;
";

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
rule : test
---

block = {
}
value = 1 ;
value = 2 ;
";

    assert_eq!(
        formatted, expected,
        "连续空行应被折叠为单个空行，保持结构紧凑"
    );
}

#[test]
fn format_content_should_indent_header_value_on_next_line() {
    let formatter = OmlFormatter::new();
    let raw = "\
name : atk_module_log
rule :
huawei/atk_module_log/FIREWALLATCK
---

pos_sn = read(dev_sn);
";

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
name : atk_module_log
rule : huawei/atk_module_log/FIREWALLATCK
---

pos_sn = read(dev_sn) ;
";

    assert_eq!(
        formatted, expected,
        "头部 key:value 应收敛到同一行，值在下一行时需合并"
    );
}

#[test]
fn format_content_should_indent_multiple_header_values() {
    let formatter = OmlFormatter::new();
    let raw = "\
name : nsf_probes_flow_log
rule : 
nsf/nsf_probes_flow_http_log
nsf/nsf_probes_flow_ftp_log
nsf/nsf_probes_flow_dns_log
nsf/nsf_probes_flow_mail_log
nsf/nsf_probes_flow_ssl_log
nsf/nsf_probes_flow_telnet_log
nsf/nsf_probes_flow_tcpudp_log
    nsf/nsf_probes_flow_icmp_log
nsf/nsf_probes_flow_dbop_log
nsf/nsf_probes_flow_filetransfer_log
nsf/nsf_probes_flow_login_log
---

pos_sn = read(dev_sn);
";

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
name : nsf_probes_flow_log
rule : nsf/nsf_probes_flow_http_log nsf/nsf_probes_flow_ftp_log nsf/nsf_probes_flow_dns_log nsf/nsf_probes_flow_mail_log nsf/nsf_probes_flow_ssl_log nsf/nsf_probes_flow_telnet_log nsf/nsf_probes_flow_tcpudp_log nsf/nsf_probes_flow_icmp_log nsf/nsf_probes_flow_dbop_log nsf/nsf_probes_flow_filetransfer_log nsf/nsf_probes_flow_login_log
---

pos_sn = read(dev_sn) ;
";

    assert_eq!(
        formatted, expected,
        "rule 的多行值应逐行缩进 1 层，保持顺序与原文行数一致"
    );
}

#[test]
fn format_content_should_keep_chars_body_raw() {
    let formatter = OmlFormatter::new();
    let raw = "\
name : skyeye_flow_td_ioc_kafka
rule : skyeye/skyeye_flow_td_ioc_kafka
---

event_risk_level = match read(option:[judgeForTI]) {
    digit(0) => chars(不告警;情报库未命中);
    digit(1) => chars(告警;可拦截);
    digit(2) => chars(告警;不拦截);
    digit(3) => chars(不告警;不拦截);
    digit(4) => chars(不告警;可拦截);
};
";

    let formatted = formatter.format_content(raw).expect("格式化失败");
    let expected = "\
name : skyeye_flow_td_ioc_kafka
rule : skyeye/skyeye_flow_td_ioc_kafka
---

event_risk_level = match read(option:[judgeForTI]) {
    digit(0) => chars(不告警 ;
    情报库未命中) ;
    digit(1) => chars(告警 ;
    可拦截) ;
    digit(2) => chars(告警 ;
    不拦截) ;
    digit(3) => chars(不告警 ;
    不拦截) ;
    digit(4) => chars(不告警 ;
    可拦截) ;
} ;
";

    assert_eq!(
        formatted, expected,
        "chars(...) 内部内容应保持原样，不因分号被拆分"
    );
}
