use crate::{error::AppError, utils::format::remove_annotations};
use wp_data_utils::cache::FieldQueryCache;
use wp_model_core::model::DataRecord;
use wp_oml::{core::DataTransformer, parser::oml_parse};

pub fn convert_record(oml: &str, record: DataRecord) -> Result<DataRecord, AppError> {
    // 预处理：去除注释
    let filter_oml = remove_annotations(oml);
    let model = oml_parse(&mut filter_oml.as_str(), "")?;
    let mut cache = FieldQueryCache::with_capacity(10);
    let target = model.transform_ref(&record, &mut cache);
    Ok(target)
}
