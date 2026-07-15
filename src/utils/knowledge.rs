use crate::error::AppError;
use std::{collections::HashMap, path::PathBuf};
use tracing::info;
use wp_data_utils::cache::FieldQueryCache;
use wp_knowledge::facade;
use wp_model_core::model::{DataField, DataRecord};
use wp_oml::{DataRecordRef, core::FieldExtractor, language::SqlQuery, types::AnyResult};

pub fn db_init(_connection_id: i32) -> AnyResult<Vec<DataField>> {
    //todo 写一个加载 project_root/1/models/knowledge下所有数据的方法
    Ok(vec![])
}

pub fn sql_query(_connection_id: i32, sql: &str) -> AnyResult<Vec<DataField>> {
    let cache = &mut FieldQueryCache::default();
    let query = SqlQuery::new(sql.to_string(), HashMap::default());
    let result = query.extract_more(
        &mut DataRecordRef::from(&DataRecord::default()),
        &DataRecord::default(),
        cache,
    );
    info!("数据查询: {:?}", result);
    Ok(result)
}

pub fn sql_knowdb_list(_connection_id: i32) -> AnyResult<Vec<String>> {
    let sql = r#"SELECT GROUP_CONCAT(name, ', ') as name FROM sqlite_master WHERE type='table'"#;
    let cache = &mut FieldQueryCache::default();
    let query = SqlQuery::new(sql.to_string(), HashMap::default());
    let result = query.extract_more(
        &mut DataRecordRef::from(&DataRecord::default()),
        &DataRecord::default(),
        cache,
    );
    info!("查询知识库列表: {:?}", result);
    match result.first() {
        Some(value) => {
            let list = format!("{}", value.get_value());
            info!("{}", list);
            let items: Vec<String> = list
                .split(',')
                .map(|s: &str| s.trim().to_string())
                .collect();
            Ok(items)
        }
        None => Ok(vec![]),
    }
}

pub fn load_knowledge(project_dir: &str) -> AnyResult<()> {
    let root = PathBuf::from(&project_dir).canonicalize().map_err(|e| {
        error!("无法解析项目目录路径: {}", e);
        AppError::internal(e).into_std()
    })?;

    let knowdb_path = root.join("models/knowledge/knowdb.toml");
    let auth_path = root.join(".run/authority.sqlite");
    if auth_path.exists() {
        let _ = std::fs::remove_file(&auth_path);
    }
    let auth_uri = format!("file:{}?mode=rwc&uri=true", auth_path.display());
    info!(
        "初始化知识库: root={}, knowdb={}",
        root.display(),
        knowdb_path.display()
    );
    if let Err(e) = facade::init_thread_cloned_from_knowdb(&root, &knowdb_path, &auth_uri) {
        error!("初始化知识库失败：{:?}", e);
        return Err(AppError::internal(e).into_std().into());
    }
    Ok(())
}
