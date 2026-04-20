use tree_sitter::Parser;

/// WPL 代码格式化器：通过轻量词法扫描与缩进规则生成稳定输出。
/// 设计目标：
/// - 不做完整语法解析，仅依赖字符级扫描以保证鲁棒性；
/// - 对字符串、原始字符串与 raw 函数内部内容保持原样；
/// - 对结构符号（括号、管道、逗号）做有限规则化排版。
pub struct WplFormatter {
    /// 每级缩进空格数。
    indent: usize,
}

impl Default for WplFormatter {
    fn default() -> Self {
        Self::new()
    }
}

impl WplFormatter {
    // 需要保持原样的函数列表（内部不解析管道/逗号/括号）
    const RAW_FUNCS: &[&str] = &[
        "symbol",
        "f_chars_not_has",
        "f_chars_has",
        "kv",
        "f_chars_in",
    ];

    /// 默认 4 空格缩进。
    pub fn new() -> Self {
        Self { indent: 4 }
    }

    /// 自定义缩进宽度（单位：空格）。
    pub fn with_indent(indent: usize) -> Self {
        Self {
            indent: indent.max(1),
        }
    }

    /// 兼容旧行为：出错时返回原文，避免影响调用方。
    pub fn format_content_or_original(&self, content: &str) -> String {
        match self.format_content(content) {
            Ok(v) => v,
            Err(_) => content.to_string(),
        }
    }

    /// 对外提供可返回错误信息的格式化接口。
    /// 当前为 `format_content` 的兼容别名，便于保留既有调用点。
    pub fn format_with_error(&self, content: &str) -> Result<String, WplFormatError> {
        self.format_content(content)
    }

    /// 对外入口：返回格式化结果或具体错误信息。
    /// 核心格式化流程：
    /// 1) 统一换行符；
    /// 2) 逐字符扫描并按规则输出；
    /// 3) 收尾时合并多余空行。
    pub fn format_content(&self, content: &str) -> Result<String, WplFormatError> {
        // 统一换行符，避免不同平台的换行差异干扰缩进逻辑。
        let normalized = content.replace("\r\n", "\n").replace('\r', "\n");
        let (separator_ranges, ts_ok) = collect_separator_ranges(&normalized);
        // 预估容量，减少扩容次数。
        let mut out = String::with_capacity(normalized.len() + 64);
        let mut byte_offsets = Vec::new();
        let chars: Vec<char> = normalized
            .char_indices()
            .map(|(idx, ch)| {
                byte_offsets.push(idx);
                ch
            })
            .collect();
        let input_len = normalized.len();

        // 轻量语法校验在格式化过程中进行（括号匹配/字符串闭合）。
        let mut bracket_stack: Vec<(char, char)> = Vec::new();

        // i：扫描指针；indent：当前缩进层级；start_of_line：是否位于行首。
        let mut i = 0usize;
        let mut indent = 0usize;
        let mut start_of_line = true;
        let mut line_no = 1usize;

        let bytes = normalized.as_bytes();
        while i < chars.len() {
            let byte_idx = byte_offsets[i];
            if let Some((range_start, range_end)) = find_range_at(&separator_ranges, byte_idx) {
                let slice_start = if byte_idx < range_start {
                    range_start
                } else {
                    byte_idx
                };
                let slice = &normalized[slice_start..range_end];
                self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                out.push_str(slice);
                line_no = line_no.saturating_add(slice.matches('\n').count());
                start_of_line = slice.ends_with('\n');
                i = byte_to_char_index(&byte_offsets, range_end, input_len);
                continue;
            }
            let c = chars[i];
            // 判断当前位置字符是否被转义，用于规避结构字符误判。
            let escaped = i > 0 && chars[i - 1] == '\\';

            // 处理字符串与原始字符串，内部内容保持不变
            if c == '"' {
                // 行内残留引号（如最后一个逗号后的未闭合引号）按普通字符处理。
                let next_non_ws = self.next_non_whitespace_pos(&chars, i + 1);
                let comma_follows = next_non_ws.is_some_and(|idx| chars[idx] == ',');
                let has_closing_quote = self.has_closing_quote(&chars, i + 1);
                if comma_follows || !has_closing_quote {
                    self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                    out.push('"');
                    let new_i = next_non_ws.unwrap_or(i + 1);
                    line_no = line_no
                        .saturating_add(chars[i..new_i].iter().filter(|ch| **ch == '\n').count());
                    i = new_i;
                    start_of_line = false;
                    continue;
                }
                // 读取完整字符串字面量（含转义）。
                let (literal, consumed) = self.read_string(&chars[i..], line_no)?;
                self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                out.push_str(&literal);
                line_no = line_no.saturating_add(literal.matches('\n').count());
                i += consumed;
                start_of_line = false;
                continue;
            }
            if c == 'r' && i + 1 < chars.len() && chars[i + 1] == '#' {
                // 原始字符串：r#"..."#，内部不处理转义。
                let (literal, consumed) = self.read_raw_string(&chars[i..], line_no)?;
                self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                out.push_str(&literal);
                line_no = line_no.saturating_add(literal.matches('\n').count());
                i += consumed;
                start_of_line = false;
                continue;
            }

            // 注解块 #[...] 直接压缩为单行，避免影响后续缩进。
            if c == '#' && i + 1 < chars.len() && chars[i + 1] == '[' {
                let (ann, consumed) = self.read_bracket_block(&chars[i..], '[', ']', line_no)?;
                self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                out.push_str(
                    &ann.replace('\n', " ")
                        .split_whitespace()
                        .collect::<Vec<_>>()
                        .join(" "),
                );
                out.push('\n');
                line_no = line_no.saturating_add(ann.matches('\n').count());
                i += consumed;
                start_of_line = true;
                continue;
            }

            // 格式占位（如 <[,]>) 保持内部逗号不拆分。
            if c == '<' {
                let (fmt_block, consumed) =
                    self.read_bracket_block(&chars[i..], '<', '>', line_no)?;
                self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                out.push_str(&fmt_block);
                line_no = line_no.saturating_add(fmt_block.matches('\n').count());
                i += consumed;
                start_of_line = false;
                continue;
            }

            // 空白合并：多空白折叠为单空格；换行保持为真实换行。
            if c.is_whitespace() {
                // 连续空白折叠为单空格，行首跳过
                if c == '\n' {
                    if !start_of_line {
                        out.push('\n');
                    }
                    start_of_line = true;
                    line_no = line_no.saturating_add(1);
                } else if !start_of_line {
                    out.push(' ');
                }
                i += 1;
                continue;
            }

            // 自定义 raw 函数：内部内容按原样保留，不解析管道/逗号。
            if let Some(name_len) = self.starts_with_raw_func(&chars, i, Self::RAW_FUNCS)
                && let Some((block, consumed)) = self.read_raw_func_block(&chars[i..], name_len)
            {
                self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                out.push_str(&block);
                line_no = line_no.saturating_add(block.matches('\n').count());
                start_of_line = false;
                i += consumed;
                continue;
            }

            // 对已转义的结构字符，按普通字符处理，避免误触发缩进/折行。
            if escaped && (c == '(' || c == ')' || c == '{' || c == '}' || c == '|' || c == ',') {
                self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                out.push(c);
                start_of_line = false;
                i += 1;
                continue;
            }

            match c {
                '{' => {
                    if let Some(end) = find_separator_block(bytes, byte_idx, &separator_ranges) {
                        let slice = &normalized[byte_idx..end];
                        self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                        out.push_str(slice);
                        line_no = line_no.saturating_add(slice.matches('\n').count());
                        start_of_line = slice.ends_with('\n');
                        i = byte_to_char_index(&byte_offsets, end, input_len);
                        continue;
                    }
                    bracket_stack.push(('{', '}'));
                    // 块起始：换行并增加缩进层级。
                    self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                    out.push('{');
                    out.push('\n');
                    indent += 1;
                    start_of_line = true;
                    i += 1;
                }
                '}' => {
                    if let Some((_, expected)) = bracket_stack.pop() {
                        if expected != '}' {
                            return Err(WplFormatError::MismatchedBracket {
                                expected,
                                found: '}',
                                line: line_no,
                            });
                        }
                    } else if ts_ok {
                        let inferred = infer_closing_indent(&out, self.indent);
                        indent = inferred;
                        if !start_of_line {
                            out.push('\n');
                        }
                        self.write_indent_if_needed(true, indent, &mut out)?;
                        out.push('}');
                        out.push('\n');
                        start_of_line = true;
                        i += 1;
                        continue;
                    } else {
                        return Err(WplFormatError::UnexpectedClosing {
                            close: '}',
                            line: line_no,
                        });
                    }
                    // 块结束：先降级缩进，再输出。
                    indent = indent.saturating_sub(1);
                    if !start_of_line {
                        out.push('\n');
                    }
                    self.write_indent_if_needed(true, indent, &mut out)?;
                    out.push('}');
                    out.push('\n');
                    start_of_line = true;
                    i += 1;
                }
                '(' => {
                    // 若括号内不含逗号/管道，保持在一行，减少无意义换行。
                    if let Some((inner, consumed)) = self.peek_block(&chars[i..], '(', ')')
                        && !inner.contains(',')
                        && !inner.contains('|')
                    {
                        self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                        out.push('(');
                        out.push_str(inner.trim());
                        out.push(')');
                        line_no = line_no.saturating_add(
                            chars[i..i + consumed]
                                .iter()
                                .filter(|ch| **ch == '\n')
                                .count(),
                        );
                        start_of_line = false;
                        i += consumed;
                        continue;
                    }
                    bracket_stack.push(('(', ')'));
                    self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                    out.push('(');
                    out.push('\n');
                    indent += 1;
                    start_of_line = true;
                    i += 1;
                }
                ')' => {
                    if let Some((_, expected)) = bracket_stack.pop() {
                        if expected != ')' {
                            return Err(WplFormatError::MismatchedBracket {
                                expected,
                                found: ')',
                                line: line_no,
                            });
                        }
                    } else if ts_ok {
                        let inferred = infer_closing_indent(&out, self.indent);
                        indent = inferred;
                        if !start_of_line {
                            out.push('\n');
                        }
                        self.write_indent_if_needed(true, indent, &mut out)?;
                        out.push(')');
                        start_of_line = false;
                        i += 1;
                        continue;
                    } else {
                        return Err(WplFormatError::UnexpectedClosing {
                            close: ')',
                            line: line_no,
                        });
                    }
                    // 括号结束：降级缩进并输出。
                    indent = indent.saturating_sub(1);
                    if !start_of_line {
                        out.push('\n');
                    }
                    self.write_indent_if_needed(true, indent, &mut out)?;
                    out.push(')');
                    start_of_line = false;
                    i += 1;
                }
                ',' => {
                    // 逗号后强制换行，形成“每项一行”的视觉结构。
                    out.push(',');
                    out.push('\n');
                    start_of_line = true;
                    i += 1;
                }
                '|' => {
                    // 管道符前后保持空格，并吞掉后续空白，避免重复空格。
                    self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                    if !start_of_line && !matches!(out.chars().last(), Some(' ' | '\n')) {
                        out.push(' ');
                    }
                    out.push('|');
                    out.push(' ');
                    while i + 1 < chars.len() && chars[i + 1].is_whitespace() {
                        if chars[i + 1] == '\n' {
                            line_no = line_no.saturating_add(1);
                        }
                        i += 1;
                    }
                    start_of_line = false;
                    i += 1;
                }
                _ => {
                    // 普通字符：按当前缩进直接写入。
                    self.write_indent_if_needed(start_of_line, indent, &mut out)?;
                    out.push(c);
                    start_of_line = false;
                    i += 1;
                }
            }
        }

        if let Some((open, close)) = bracket_stack.pop() {
            return Err(WplFormatError::UnclosedBracket {
                open,
                close,
                line: line_no,
            });
        }

        // 折叠多余空行，最多保留一个空行。
        let mut final_out = String::new();
        let mut last_blank = false;
        for line in out.trim_end().lines() {
            let blank = line.trim().is_empty();
            if blank && last_blank {
                continue;
            }
            last_blank = blank;
            final_out.push_str(line);
            final_out.push('\n');
        }

        // 清理末尾多余的换行，最多保留一个空行。
        while final_out.ends_with("\n\n\n") {
            final_out.pop();
        }

        Ok(final_out)
    }

    fn write_indent_if_needed(
        &self,
        start_of_line: bool,
        indent: usize,
        buf: &mut String,
    ) -> Result<(), WplFormatError> {
        // 仅在行首输出缩进，避免中途插入。
        if start_of_line {
            for _ in 0..indent {
                buf.push_str(&" ".repeat(self.indent));
            }
        }
        Ok(())
    }

    fn read_string(
        &self,
        input: &[char],
        line_no: usize,
    ) -> Result<(String, usize), WplFormatError> {
        // 读取普通字符串字面量，识别转义与闭合引号。
        let mut out = String::new();
        let mut escaped = false;
        for (idx, ch) in input.iter().enumerate() {
            out.push(*ch);
            if escaped {
                escaped = false;
                continue;
            }
            if *ch == '\\' {
                escaped = true;
            } else if *ch == '"' && idx > 0 {
                return Ok((out, idx + 1));
            }
        }
        Err(WplFormatError::UnclosedString { line: line_no })
    }

    fn read_raw_string(
        &self,
        input: &[char],
        line_no: usize,
    ) -> Result<(String, usize), WplFormatError> {
        // 读取 Rust 风格 raw 字符串：r###"..."###。
        let mut out = String::new();
        let mut hash_count = 0usize;
        let mut idx = 0usize;

        if input.get(idx) != Some(&'r') {
            return Err(WplFormatError::InvalidRawStringStart { line: line_no });
        }
        out.push('r');
        idx += 1;

        while idx < input.len() && input[idx] == '#' {
            out.push('#');
            hash_count += 1;
            idx += 1;
        }
        if idx >= input.len() || input[idx] != '"' {
            return Err(WplFormatError::InvalidRawStringStart { line: line_no });
        }
        out.push('"');
        idx += 1;

        while idx < input.len() {
            let ch = input[idx];
            out.push(ch);
            if ch == '"' {
                let mut matched = true;
                for h in 0..hash_count {
                    if idx + 1 + h >= input.len() || input[idx + 1 + h] != '#' {
                        matched = false;
                        break;
                    }
                }
                if matched {
                    for _ in 0..hash_count {
                        out.push('#');
                    }
                    return Ok((out, idx + 1 + hash_count));
                }
            }
            idx += 1;
        }
        Err(WplFormatError::UnclosedRawString { line: line_no })
    }

    fn read_bracket_block(
        &self,
        input: &[char],
        open: char,
        close: char,
        line_no: usize,
    ) -> Result<(String, usize), WplFormatError> {
        // 读取任意成对括号块，支持嵌套。
        let mut out = String::new();
        let mut depth = 0usize;
        for (idx, ch) in input.iter().enumerate() {
            out.push(*ch);
            if *ch == open {
                depth += 1;
            } else if *ch == close {
                depth = depth.saturating_sub(1);
                if depth == 0 {
                    return Ok((out, idx + 1));
                }
            }
        }
        Err(WplFormatError::UnclosedBracket {
            open,
            close,
            line: line_no,
        })
    }

    fn peek_block(&self, input: &[char], open: char, close: char) -> Option<(String, usize)> {
        // 预览括号内内容（不含最外层括号），忽略字符串内的括号。
        let mut out = String::new();
        let mut depth = 0usize;
        let mut escaped = false;
        let mut in_str = false;
        for (idx, ch) in input.iter().enumerate() {
            if escaped {
                out.push(*ch);
                escaped = false;
                continue;
            }
            match ch {
                '\\' => {
                    out.push(*ch);
                    escaped = true;
                }
                '"' => {
                    out.push(*ch);
                    in_str = !in_str;
                }
                _ if in_str => out.push(*ch),
                _ if *ch == open => {
                    depth += 1;
                    if depth == 1 {
                        continue;
                    }
                    out.push(*ch);
                }
                _ if *ch == close => {
                    depth = depth.saturating_sub(1);
                    if depth == 0 {
                        return Some((out, idx + 1));
                    }
                    out.push(*ch);
                }
                _ => out.push(*ch),
            }
        }
        None
    }

    /// 获取从指定位置开始首个非空白字符的下标。
    fn next_non_whitespace_pos(&self, input: &[char], start: usize) -> Option<usize> {
        input
            .iter()
            .enumerate()
            .skip(start)
            .find(|(_, ch)| !ch.is_whitespace())
            .map(|(idx, _)| idx)
    }

    /// 判断后续是否存在未被转义的双引号，用于区分字符串与行尾残留引号。
    fn has_closing_quote(&self, input: &[char], start: usize) -> bool {
        let mut escaped = false;
        for ch in input.iter().skip(start) {
            if escaped {
                escaped = false;
                continue;
            }
            match ch {
                '\\' => escaped = true,
                '"' => return true,
                _ => {}
            }
        }
        false
    }

    /// 检测是否匹配 raw 函数名并紧跟 '('，返回函数名长度。
    fn starts_with_raw_func(&self, input: &[char], idx: usize, names: &[&str]) -> Option<usize> {
        // 通过函数名 + '(' 的连续匹配判断，避免误把前缀当函数。
        for name in names {
            let pat: Vec<char> = name.chars().chain(['(']).collect();
            if idx + pat.len() > input.len() {
                continue;
            }
            if input[idx..idx + pat.len()]
                .iter()
                .zip(pat.iter())
                .all(|(a, b)| a == b)
            {
                return Some(name.len());
            }
        }
        None
    }

    /// 读取 raw 函数块（如 symbol/自定义函数），内部内容原样保留（含管道/逗号/转义）。
    fn read_raw_func_block(&self, input: &[char], name_len: usize) -> Option<(String, usize)> {
        // 读取函数调用的完整括号范围，期间忽略字符串与转义字符。
        let mut out = String::new();
        let mut depth = 0i32;
        let mut in_str = false;
        let mut escaped = false;
        let mut seen_func = false;

        for (idx, ch) in input.iter().enumerate() {
            out.push(*ch);
            // 首个 '(' 之前确保匹配函数名，避免误读相似前缀
            if !seen_func && idx + 1 == name_len {
                seen_func = true;
            }
            if escaped {
                escaped = false;
                continue;
            }
            if *ch == '\\' {
                escaped = true;
                continue;
            }
            if *ch == '"' {
                in_str = !in_str;
                continue;
            }
            if in_str {
                continue;
            }
            if *ch == '(' {
                depth += 1;
            } else if *ch == ')' {
                depth -= 1;
                if depth == 0 {
                    return Some((out, idx + 1));
                }
            }
        }
        None
    }
}

fn collect_separator_ranges(input: &str) -> (Vec<(usize, usize)>, bool) {
    let mut parser = Parser::new();
    if let Err(err) = parser.set_language(&tree_sitter_wpl::language()) {
        let _ = err;
        return (Vec::new(), false);
    }
    let tree = match parser.parse(input, None) {
        Some(value) => value,
        None => {
            return (Vec::new(), false);
        }
    };
    let root = tree.root_node();
    let mut ranges = Vec::new();
    fn visit(node: tree_sitter::Node, ranges: &mut Vec<(usize, usize)>, input: &str) {
        let kind = node.kind();
        if matches!(kind, "pattern_sep" | "shortcut_sep") {
            let range = expand_separator_range(node.byte_range(), input);
            ranges.push(range);
        }
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            visit(child, ranges, input);
        }
    }
    visit(root, &mut ranges, input);
    collect_pattern_sep_blocks(input, root, &mut ranges);
    ranges.sort_unstable();
    ranges.dedup();
    (ranges, true)
}

fn expand_separator_range(range: std::ops::Range<usize>, input: &str) -> (usize, usize) {
    let bytes = input.as_bytes();
    let mut start = range.start;
    let mut end = range.end;
    if start > 0 && bytes.get(start.saturating_sub(1)) == Some(&b'{') {
        start = start.saturating_sub(1);
    }
    if end < bytes.len() && bytes.get(end) == Some(&b'}') {
        end = end.saturating_add(1);
    }
    (start, end)
}

fn collect_pattern_sep_blocks(
    input: &str,
    root: tree_sitter::Node,
    ranges: &mut Vec<(usize, usize)>,
) {
    let bytes = input.as_bytes();
    let mut i = 0usize;
    while i < bytes.len() {
        if bytes[i] != b'{' {
            i += 1;
            continue;
        }
        let mut end = i + 1;
        while end < bytes.len() && bytes[end] != b'}' {
            end += 1;
        }
        if end >= bytes.len() || bytes[end] != b'}' {
            i += 1;
            continue;
        }
        let inner_start = i.saturating_add(1);
        let inner_end = end;
        if let Some(node) = root.descendant_for_byte_range(inner_start, inner_end)
            && has_separator_ancestor(node)
        {
            ranges.push((i, end.saturating_add(1)));
        }

        i = end.saturating_add(1);
    }
}

fn has_separator_ancestor(node: tree_sitter::Node) -> bool {
    let mut current = Some(node);
    while let Some(n) = current {
        let kind = n.kind();
        if matches!(kind, "separator" | "pattern_sep") {
            return true;
        }
        current = n.parent();
    }
    false
}

fn find_range_at(ranges: &[(usize, usize)], offset: usize) -> Option<(usize, usize)> {
    if ranges.is_empty() {
        return None;
    }
    match ranges.binary_search_by_key(&offset, |(s, _)| *s) {
        Ok(idx) => Some(ranges[idx]),
        Err(0) => None,
        Err(idx) => {
            let (start, end) = ranges[idx - 1];
            if offset >= start && offset < end {
                Some((start, end))
            } else {
                None
            }
        }
    }
}

fn find_separator_block(bytes: &[u8], start: usize, ranges: &[(usize, usize)]) -> Option<usize> {
    if bytes.get(start) != Some(&b'{') {
        return None;
    }
    ranges.iter().find(|(s, _)| *s == start).map(|(_, e)| *e)
}

fn byte_to_char_index(offsets: &[usize], end: usize, input_len: usize) -> usize {
    if end >= input_len {
        return offsets.len();
    }
    match offsets.binary_search(&end) {
        Ok(idx) => idx,
        Err(idx) => idx,
    }
}

fn infer_closing_indent(out: &str, indent_unit: usize) -> usize {
    let line = out
        .rsplit('\n')
        .find(|value| {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                return false;
            }
            // 跳过仅包含闭合符号的行，避免缩进被归零。
            !trimmed.chars().all(|ch| matches!(ch, ')' | '}' | ']'))
        })
        .unwrap_or("");
    let leading = line.chars().take_while(|ch| *ch == ' ').count();
    let trimmed = line.trim_end();
    let ends_with_open = trimmed.ends_with('{') || trimmed.ends_with('(') || trimmed.ends_with('[');
    let is_annotation = trimmed.starts_with("#[");
    if ends_with_open || is_annotation {
        return leading / indent_unit;
    }
    if leading >= indent_unit {
        leading / indent_unit - 1
    } else {
        0
    }
}

#[derive(Debug)]
pub enum WplFormatError {
    /// 普通字符串缺少闭合引号。
    UnclosedString { line: usize },
    /// raw 字符串未正确起始（缺少 r 或 "）。
    InvalidRawStringStart { line: usize },
    /// raw 字符串缺少闭合引号/井号。
    UnclosedRawString { line: usize },
    /// 任意成对括号缺少闭合。
    UnclosedBracket {
        open: char,
        close: char,
        line: usize,
    },
    /// 括号类型不匹配。
    MismatchedBracket {
        expected: char,
        found: char,
        line: usize,
    },
    /// 遇到多余的闭合括号。
    UnexpectedClosing { close: char, line: usize },
}

impl std::fmt::Display for WplFormatError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WplFormatError::UnclosedString { line } => {
                write!(f, "第 {} 行：字符串字面量未闭合", line)
            }
            WplFormatError::InvalidRawStringStart { line } => {
                write!(f, "第 {} 行：raw 字符串起始格式不正确", line)
            }
            WplFormatError::UnclosedRawString { line } => {
                write!(f, "第 {} 行：raw 字符串未闭合", line)
            }
            WplFormatError::UnclosedBracket { open, close, line } => {
                write!(f, "第 {} 行：括号未闭合：{} ... {}", line, open, close)
            }
            WplFormatError::MismatchedBracket {
                expected,
                found,
                line,
            } => {
                write!(
                    f,
                    "第 {} 行：括号不匹配，期望 {}，但遇到 {}",
                    line, expected, found
                )
            }
            WplFormatError::UnexpectedClosing { close, line } => {
                write!(f, "第 {} 行：多余的闭合括号 {}", line, close)
            }
        }
    }
}

impl std::error::Error for WplFormatError {}
