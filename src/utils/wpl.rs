use std::path::PathBuf;

use crate::error::AppError;
use orion_error::UvsReason;
use serde::{Deserialize, Serialize};
use wp_engine::sources::event_id::next_event_id;
use wp_lang::{
    AnnotationType, WparseReason, WplCode, WplEvaluator, WplExpress, WplPackage, WplStatementType,
};
use wp_model_core::model::{DataField, DataRecord, DataType};
use wp_parse_api::RawData;

type RunParseProc = (WplExpress, Vec<AnnotationType>);

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ParsedField {
    pub no: i32,
    pub meta: String,
    pub name: String,
    pub value: String,
}

// 将 DataRecord 转换为 ParsedField 列表
pub fn record_to_fields(record: &DataRecord) -> Vec<ParsedField> {
    record
        .items
        .iter()
        .enumerate()
        .map(|(index, field)| ParsedField {
            no: index as i32 + 1,
            meta: field.meta.to_string(),
            name: field.name.to_string(),
            value: field.value.to_string(),
        })
        .collect()
}

// 内部/其他模块使用：返回原始 DataRecord，供 OML 等后续处理
pub fn warp_check_record(wpl: &str, data: &str) -> Result<DataRecord, AppError> {
    // 保留解析错误中的换行与指示符，避免转义
    let code = WplCode::build(PathBuf::from(""), wpl).map_err(AppError::wpl_parse)?;
    let wpl_package = code.parse_pkg().map_err(AppError::wpl_parse)?;
    // let wpl_package = parse_wpl_package(wpl)?;
    let rule_items = extract_rule_items(&wpl_package);

    if rule_items.is_empty() {
        return Err(AppError::wpl_parse_msg("WPL 中未找到任何规则"));
    }
    try_parse_with_rules(rule_items, data)
}

/// 尝试用规则列表解析数据
fn try_parse_with_rules(rule_items: Vec<RunParseProc>, data: &str) -> Result<DataRecord, AppError> {
    let mut max_depth = 0;
    let mut best_wpl = 1;
    for (index, (vm_unit, _funcs)) in rule_items.iter().enumerate() {
        let evaluator = WplEvaluator::from(vm_unit, None).map_err(AppError::wpl_parse)?;
        let raw = RawData::from_string(data.to_string());
        match evaluator.proc(0, raw, 0) {
            Ok((mut tdc, _pipeline)) => {
                if let Some(tags) = vm_unit.tags.clone() {
                    for tag in tags.export_tags() {
                        tdc.append(DataField::from_chars(tag.key.clone(), tag.val.clone()));
                    }
                }
                tdc.append(DataField::from_digit("wp_event_id", next_event_id() as i64));
                tdc.items.retain(|item| item.meta != DataType::Ignore);
                return Ok(DataRecord::from(tdc.items));
            }
            Err(e) => {
                // 记录解析深度最高的错误
                best_wpl = index + 1;
                if let WparseReason::Uvs(UvsReason::DataError(_, Some(pos))) = e.reason()
                    && *pos > max_depth
                {
                    max_depth = *pos;
                }
            }
        }
    }
    let friendly_hint = build_best_match_hint(data, max_depth, best_wpl);
    Err(AppError::wpl_best_error(max_depth, friendly_hint))
}

/// 从 WPL 包中提取规则项
fn extract_rule_items(wpl_package: &WplPackage) -> Vec<RunParseProc> {
    let mut rule_pairs = Vec::with_capacity(wpl_package.rules.len());

    for rule in wpl_package.rules.iter() {
        let rule_obj = match &rule.statement {
            WplStatementType::Express(code) => code.clone(),
        };
        let funcs = AnnotationType::convert(rule.statement.tags());
        rule_pairs.push((rule_obj, funcs));
    }
    rule_pairs
}

/// 构造更友好的日志位置提示，帮助用户快速定位解析中断点
fn build_best_match_hint(data: &str, depth: usize, rule_name: usize) -> String {
    let chars: Vec<char> = data.chars().collect();
    if chars.is_empty() {
        return format!(
            "rule {rule_name} Achieved the best match, but the log is empty and the location cannot be determined."
        );
    }

    let bounded_depth = depth.min(chars.len().saturating_sub(1));

    // 仅展示指针附近的片段，避免长行导致指针错位
    let window_before = 20;
    let window_after = 20;
    let ctx_start = bounded_depth.saturating_sub(window_before);
    let ctx_end = (bounded_depth + window_after + 1).min(chars.len());

    let snippet: String = chars[ctx_start..ctx_end].iter().collect();
    let prefix = if ctx_start > 0 { "…" } else { "" };
    let suffix = if ctx_end < chars.len() { "…" } else { "" };
    let snippet_line = format!("{prefix}{snippet}{suffix}");

    let pointer_offset = prefix.chars().count() + bounded_depth.saturating_sub(ctx_start);
    let pointer = format!(
        "{}↑ This is the final matching position.",
        " ".repeat(pointer_offset)
    );

    format!(
        "规则 {rule_name} 最深匹配字符序号 {pos}。日志上下文:\n{snippet_line}\n{pointer}",
        pos = bounded_depth + 1
    )
}
