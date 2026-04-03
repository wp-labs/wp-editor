use crate::{error::AppError, utils::format::remove_annotations};
use wp_model_core::model::DataRecord;
use wp_oml::{AsyncDataTransformer};
use wp_oml::parser::oml_parse;
use wp_knowledge::cache::FieldQueryCache;

pub async fn convert_record(oml: &str, record: DataRecord) -> Result<DataRecord, AppError> {
    // 预处理：去除注释
    let filter_oml = remove_annotations(oml);
    let model = oml_parse(&mut filter_oml.as_str(), "").await?;
    let mut cache = FieldQueryCache::with_capacity(10);
    let target = model.transform_ref_async(&record, &mut cache).await;
    Ok(target)
}
