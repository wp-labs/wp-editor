use crate::{OmlFormatter, WplFormatter, utils::format::remove_annotations};
use serde::{Deserialize, Serialize};
use std::{collections::BTreeMap, fs::File, io::Read, path::PathBuf};
use wp_oml::parser::oml_parse;
use wp_specs::WildArray;
use wpl::WplCode;

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct WplExample {
    pub name: String,
    pub wpl_code: String,
    pub oml_code: String,
    pub sample_data: String,
}

pub fn wpl_examples(
    wpl_path: PathBuf,
    oml_examples: &Vec<(WildArray, String)>,
    examples: &mut BTreeMap<String, WplExample>,
) -> Result<(), Box<dyn std::error::Error>> {
    if !wpl_path.exists() {
        return Ok(());
    }
    if wpl_path.is_file() {
        if wpl_path.extension().and_then(|ext| ext.to_str()) != Some("wpl") {
            return Ok(());
        }
        let wpl_formatter = WplFormatter::new();
        let mut example = WplExample::default();
        let mut file = File::open(&wpl_path)?;
        // 获取原始的wpl代码
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;
        example.wpl_code = wpl_formatter.format_content_or_original(&contents);
        // 获取日志示例数据
        let sample_data_dir = wpl_path.parent().unwrap().join("sample.dat");
        let mut sample_data = String::new();
        if sample_data_dir.is_file() {
            let mut file = File::open(&sample_data_dir)?;
            file.read_to_string(&mut sample_data)?;
        }
        example.sample_data = sample_data.clone();

        let code = WplCode::build(wpl_path.clone(), &contents)
            .map_err(|e| e.into_std())?;

        let pkg = code.parse_pkg().map_err(|e| e.into_std())?;
        let pkg_name_raw = pkg.name().to_string();
        let mut pkg_name = pkg_name_raw.trim();
        pkg_name = pkg_name.strip_suffix('/').unwrap_or(pkg_name);
        example.name = pkg_name.to_string();

        pkg.rules.iter().for_each(|rule| {
            let binding = rule.name().to_string();
            let rule_name = binding.trim();
            let wpl_name = format!("{}/{}", pkg_name, rule_name);
            // 在 OML 规则示例中查找与当前 WPL 规则匹配的 OML 代码
            if let Some((_, oml_code)) = oml_examples
                .iter()
                .find(|(rules, _)| rules.0.iter().any(|r| r.matches(&wpl_name)))
            {
                // 关联匹配的 OML 代码到当前示例
                example.oml_code = oml_code.clone();
            }
        });
        examples.insert(example.name.clone(), example);
        return Ok(());
    }
    wpl_path.read_dir()?.for_each(|entry| {
        if let Ok(entry) = entry {
            let path = entry.path();
            let _ = wpl_examples(path, oml_examples, examples);
        }
    });
    Ok(())
}

pub async fn oml_examples(
    oml_path: PathBuf,
) -> Result<Vec<(WildArray, String)>, Box<dyn std::error::Error>> {
    let mut results = Vec::new();
    if !oml_path.exists() {
        return Ok(results);
    }
    if oml_path.is_file() {
        if oml_path.extension().and_then(|ext| ext.to_str()) != Some("oml") {
            return Ok(results);
        }
        let oml_formatter = OmlFormatter::new();
        let mut file = File::open(&oml_path)?;
        // 获取原始的oml代码
        let mut contents = String::new();
        file.read_to_string(&mut contents)?;
        let oml_fmt = oml_formatter.format_content_or_original(&contents);

        // 去除注释
        contents = remove_annotations(&contents);
        let mut parse_input = contents.as_str();
        let code = oml_parse(&mut parse_input, "").await.map_err(|e| e.into_std())?;
        results.push((code.rules().clone(), oml_fmt));
        return Ok(results);
    }
    for entry in oml_path.read_dir()? {
        let entry = entry?;
        let path = entry.path();
        let mut items = Box::pin(oml_examples(path)).await?;
        results.append(&mut items);
    }
    Ok(results)
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_wpl_examples_with_directory() {
        let temp_dir = TempDir::new().unwrap();
        let sub_dir = temp_dir.path().join("subdir");
        fs::create_dir(&sub_dir).unwrap();
        let file_path = sub_dir.join("nested.wpl");
        let wpl_content = r#"package /nested/ {
   rule nested_rule {
        (ip:sip)
   }
}"#;
        fs::write(&file_path, wpl_content).unwrap();

        let mut examples = BTreeMap::new();
        let result = wpl_examples(
            temp_dir.path().to_path_buf(),
            &oml_examples(temp_dir.path().to_path_buf()).await.unwrap(),
            &mut examples,
        );

        assert!(result.is_ok());
        assert_eq!(examples.len(), 1);
    }

    #[tokio::test]
    async fn test_wpl_examples_with_invalid_content() {
        let temp_dir = TempDir::new().unwrap();
        let file_path = temp_dir.path().join("invalid.wpl");
        let invalid_content = "this is not valid wpl content";
        fs::write(&file_path, invalid_content).unwrap();

        let mut examples = BTreeMap::new();
        let result = wpl_examples(
            file_path,
            &oml_examples(temp_dir.path().to_path_buf()).await.unwrap(),
            &mut examples,
        );
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_wpl_examples_non_existent_path() {
        let non_existent = PathBuf::from("/non/existent/path/xyz.wpl");
        let mut examples = BTreeMap::new();
        let temp_dir = TempDir::new().unwrap();
        let result = wpl_examples(
            non_existent.clone(),
            &oml_examples(temp_dir.path().to_path_buf()).await.unwrap(),
            &mut examples,
        );
        assert!(result.is_ok());
    }
}
