// 工具模块

pub mod format;
pub mod oml;
pub mod wpl;

pub use oml::{OmlFormatError, OmlFormatter, convert_record};
pub use wpl::{ParsedField, WplFormatError, WplFormatter, record_to_fields, warp_check_record};
