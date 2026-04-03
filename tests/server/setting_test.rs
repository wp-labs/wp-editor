use std::fs;
use tempfile::TempDir;
use wp_editor::server::Setting;

/// 测试在没有配置文件情况下的设置加载
/// 验证系统能够在缺少配置文件时使用合理的默认值
#[test]
fn test_setting_load_default() {
    // 在没有配置文件的情况下加载设置
    let setting = Setting::load();

    // 应该使用默认值
    assert!(!setting.log.level.is_empty());
    assert!(setting.web.port > 0);
    assert!(!setting.repo.wpl_rule_repo.is_empty());
    assert!(!setting.repo.oml_rule_repo.is_empty());
}

/// 测试配置文件的加载和解析功能
/// 验证系统能够正确读取和解析TOML格式的配置文件，包括完整和部分配置
#[test]
fn test_setting_config_file_loading() {
    // 创建临时目录和完整配置文件
    let temp_dir = TempDir::new().unwrap();
    let config_dir = temp_dir.path().join("config");
    fs::create_dir_all(&config_dir).unwrap();

    let config_content = r#"
[log]
level = "info"
output = "File"
output_path = "/tmp/logs/"

[web]
host = "127.0.0.1"
port = 9090

[repo]
wpl_rule_repo = "/custom/wpl/path"
oml_rule_repo = "/custom/oml/path"
"#;

    let config_path = config_dir.join("config.toml");
    fs::write(&config_path, config_content).unwrap();

    // 验证配置文件存在
    assert!(config_path.exists(), "配置文件应该被创建");

    // 验证配置内容可以被解析
    let config_str = fs::read_to_string(&config_path).unwrap();
    assert!(config_str.contains("info"));
    assert!(config_str.contains("9090"));

    // 测试部分配置
    let partial_config = r#"
[web]
port = 3000
"#;

    let partial_config_path = config_dir.join("partial_config.toml");
    fs::write(&partial_config_path, partial_config).unwrap();

    // 验证部分配置文件存在并包含预期内容
    assert!(partial_config_path.exists(), "部分配置文件应该被创建");

    let partial_config_str = fs::read_to_string(&partial_config_path).unwrap();
    assert!(partial_config_str.contains("3000"), "配置应该包含端口3000");

    // 测试配置可以被解析为TOML
    let parsed: toml::Value = toml::from_str(&partial_config_str).unwrap();
    assert_eq!(parsed["web"]["port"].as_integer().unwrap(), 3000);
}

/// 测试无效配置文件的错误处理和恢复机制
/// 验证系统在遇到格式错误的配置文件时能够回退到默认配置
#[test]
fn test_setting_load_invalid_config() {
    // 创建临时目录和无效配置文件
    let temp_dir = TempDir::new().unwrap();
    let config_dir = temp_dir.path().join("config");
    fs::create_dir_all(&config_dir).unwrap();

    let invalid_config = r#"
[log
level = "info"
invalid toml syntax
"#;

    let config_path = config_dir.join("config.toml");
    fs::write(&config_path, invalid_config).unwrap();

    // 改变当前目录到临时目录
    let original_dir = std::env::current_dir().unwrap();
    std::env::set_current_dir(temp_dir.path()).unwrap();

    // 加载配置，应该回退到默认值
    let setting = Setting::load();

    // 恢复原始目录
    std::env::set_current_dir(original_dir).unwrap();

    // 应该使用默认配置
    assert_eq!(setting.log.level, "debug");
}
