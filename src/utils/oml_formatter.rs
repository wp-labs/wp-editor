/// OML 代码格式化器：保持语义不变，统一缩进/空行/行内空格与属性折叠。
pub struct OmlFormatter {
    /// 每级缩进的空格数。
    indent: usize,
}

impl Default for OmlFormatter {
    fn default() -> Self {
        Self::new()
    }
}

impl OmlFormatter {
    /// 默认 4 空格缩进。
    pub fn new() -> Self {
        Self { indent: 4 }
    }

    /// 对外入口：格式化失败时回退为原内容，保证调用方不崩溃。
    pub fn format_content(&self, content: &str) -> String {
        self.format_with_error(content)
            .unwrap_or_else(|_| content.to_string())
    }

    /// 对外提供可返回错误信息的格式化接口。
    pub fn format_with_error(&self, content: &str) -> Result<String, OmlFormatError> {
        self.format(content)
    }

    /// 主格式化流程：分离头部/主体、规整头部属性，再格式化主体。
    fn format(&self, content: &str) -> Result<String, OmlFormatError> {
        // 统一换行符，避免不同平台的 CRLF/CR 影响解析逻辑。
        let normalized = content.replace("\r\n", "\n").replace('\r', "\n");
        // 将制表符转换为空格，确保缩进宽度一致。
        let normalized = normalized.replace('\t', &" ".repeat(self.indent));

        // 分离头部与主体（用 `---` 作为分隔符）
        let mut header = Vec::new();
        let mut body_lines: Vec<String> = Vec::new();
        let mut had_sep = false;
        let mut body_start_line = 1usize;
        let mut line_no = 1usize;
        let mut lines = normalized.lines().peekable();
        while let Some(line) = lines.next() {
            let trimmed = line.trim();
            if trimmed == "---" {
                had_sep = true;
                body_start_line = line_no.saturating_add(1);
                break;
            }
            // 头部允许多行属性块，需整体收集后再处理。
            if trimmed.starts_with("#[") {
                let start_line = line_no;
                header.push(collect_attr_block_lines(
                    trimmed,
                    &mut lines,
                    &mut line_no,
                    start_line,
                )?);
                line_no = line_no.saturating_add(1);
                continue;
            }
            // 忽略头部空行，避免无效噪音影响后续输出。
            if !trimmed.is_empty() {
                header.push(trimmed.to_string());
            }
            line_no = line_no.saturating_add(1);
        }
        if had_sep {
            // 存在分隔符：分隔符之后全部作为主体保留。
            for line in lines {
                body_lines.push(line.to_string());
                line_no = line_no.saturating_add(1);
            }
        } else {
            // 不存在分隔符：视为只有主体，头部清空。
            body_lines = normalized.lines().map(|l| l.to_string()).collect();
            header.clear();
            body_start_line = 1;
        }

        let mut out = String::new();
        let indent_unit = " ".repeat(self.indent);
        let mut idx = 0usize;
        while idx < header.len() {
            let line = &header[idx];
            if line.trim_start().starts_with("#[") {
                // 头部属性块统一折叠为单行。
                out.push_str(&format_attribute(line));
                out.push('\n');
                idx += 1;
                continue;
            }
            if let Some((k, v)) = line.split_once(':') {
                let key = k.trim_end();
                let val = v.trim_start();
                // 处理 "key:" + 多行值的场景：将后续连续值行缩进输出。
                if val.is_empty() && idx + 1 < header.len() {
                    let next = &header[idx + 1];
                    if !next.contains(':') {
                        out.push_str(&format!("{} : \n", key));
                        // 收集所有连续的值行，逐行缩进
                        let mut val_idx = idx + 1;
                        while val_idx < header.len() {
                            let val_line = header[val_idx].as_str();
                            if val_line.contains(':') || val_line.trim().is_empty() {
                                break;
                            }
                            out.push_str(&format!("{}{}\n", indent_unit, val_line.trim_start()));
                            val_idx += 1;
                        }
                        idx = val_idx;
                        continue;
                    }
                }
                // 常规 "key: value" 形式：规范化冒号两侧空格。
                out.push_str(&format!("{} : {}\n", key, val));
            } else {
                // 非键值行直接输出（去除首尾空白）。
                out.push_str(line.trim());
                out.push('\n');
            }
            idx += 1;
        }
        let mut body_formatted = self.format_body(&body_lines.join("\n"), body_start_line)?;

        if had_sep || !header.is_empty() {
            // 头部与主体之间强制插入分隔符。
            out.push_str("---\n");
            if !body_formatted.trim().is_empty() {
                // 主体存在内容时，再插入一个空行提升可读性。
                out.push('\n');
            }
            // 清理主体开头多余空行，保证分隔符后最多一个空行。
            while body_formatted.starts_with('\n') {
                body_formatted.remove(0);
            }
        }

        out.push_str(&body_formatted);

        // 清理末尾多余的换行，最多保留一个空行
        while out.ends_with("\n\n\n") {
            out.pop();
        }

        Ok(out)
    }

    /// 主体格式化：空白收敛、语句/块缩进、属性/注释/字符串特殊处理。
    fn format_body(&self, body: &str, start_line: usize) -> Result<String, OmlFormatError> {
        let mut out = String::new();
        let mut chars = body.chars().peekable();
        let mut indent = 0usize;
        let indent_unit = " ".repeat(self.indent);
        let mut start_of_line = true;
        let mut line_no = start_line;
        // 延迟处理换行：允许根据后续 token 决定是否换行/空行。
        let mut pending_newlines = 0usize;
        // 记录是否刚处理过 '='，用于控制等号后保持同一行。
        let mut after_eq = false;
        // 需要“原样保留”的函数列表（内部内容不做分号/管道拆分）。
        const RAW_FUNCS: &[&str] = &["chars"];

        while let Some(ch) = chars.next() {
            if ch.is_whitespace() {
                if ch == '\n' {
                    // 收集换行数量，稍后统一处理。
                    pending_newlines += 1;
                    line_no = line_no.saturating_add(1);
                } else if !start_of_line && !out.ends_with(' ') && !out.ends_with('\n') {
                    // 行内多空白折叠为一个空格。
                    out.push(' ');
                }
                continue;
            }

            // 自定义原样函数：内部内容保持原样，不拆分分号/管道
            if let Some((name, name_len)) = starts_with_raw_func(ch, &chars, RAW_FUNCS) {
                self.write_indent_if_needed(start_of_line, indent, &indent_unit, &mut out);
                let block = read_raw_func_block(ch, &mut chars, name_len).ok_or(
                    OmlFormatError::UnclosedRawFunc {
                        name: name.to_string(),
                        line: line_no,
                    },
                )?;
                line_no = line_no.saturating_add(block.matches('\n').count());
                out.push_str(&block);
                start_of_line = false;
                continue;
            }

            if pending_newlines > 0 {
                if ch == ';' {
                    // 分号前不允许空格/换行，直接贴合上一 token
                    start_of_line = false;
                } else if ch == '=' || ch == '|' || after_eq {
                    // 等号/管道及其后的 token 统一保持同一行
                    if !start_of_line && !out.ends_with(' ') && !out.ends_with('\n') {
                        out.push(' ');
                    }
                    start_of_line = false;
                } else {
                    // 其他情况：1 个换行为软换行；多个换行为一个空行。
                    let count = if pending_newlines > 1 { 2 } else { 1 };
                    if count == 1 {
                        if !out.ends_with('\n') {
                            out.push('\n');
                        }
                    } else {
                        out.push('\n');
                        out.push('\n');
                    }
                    start_of_line = true;
                }
                pending_newlines = 0;
            }

            // 单行注释（以 // 开头）：保持内容不变，仅顶格输出
            if ch == '/' && matches!(chars.peek(), Some('/')) {
                after_eq = false;
                if !start_of_line && !out.ends_with('\n') {
                    out.push('\n');
                }
                // 写入注释起始符
                out.push_str("//");
                chars.next();
                // 复制注释剩余部分直到行尾
                while let Some(c) = chars.peek() {
                    if *c == '\n' {
                        break;
                    }
                    out.push(*c);
                    chars.next();
                }
                out.push('\n');
                start_of_line = true;
                continue;
            }

            // 属性块
            if ch == '#' && matches!(chars.peek(), Some('[')) {
                after_eq = false;
                if !start_of_line && !out.ends_with('\n') {
                    out.push('\n');
                }
                if indent > 0 {
                    out.push_str(&indent_unit.repeat(indent));
                }
                // 将属性块压缩为单行输出。
                let block = collect_attr_block("#[", &mut chars, line_no)?;
                line_no = line_no.saturating_add(block.matches('\n').count());
                out.push_str(&format_attribute(&block));
                out.push('\n');
                start_of_line = true;
                continue;
            }

            // 字符串字面量
            if ch == '"' {
                after_eq = false;
                self.write_indent_if_needed(start_of_line, indent, &indent_unit, &mut out);
                out.push('"');
                let mut escaped = false;
                let mut closed = false;
                for c in chars.by_ref() {
                    out.push(c);
                    if c == '\n' {
                        line_no = line_no.saturating_add(1);
                    }
                    if escaped {
                        escaped = false;
                    } else if c == '\\' {
                        escaped = true;
                    } else if c == '"' {
                        // 直到遇到未转义的引号才结束字符串。
                        closed = true;
                        break;
                    }
                }
                if !closed {
                    return Err(OmlFormatError::UnclosedString { line: line_no });
                }
                start_of_line = false;
                continue;
            }

            // => 运算符
            if ch == '=' && matches!(chars.peek(), Some('>')) {
                after_eq = false;
                self.write_indent_if_needed(start_of_line, indent, &indent_unit, &mut out);
                if !start_of_line && !out.ends_with(' ') && !out.ends_with('\n') {
                    out.push(' ');
                }
                // 保证 `=>` 两侧空格一致。
                out.push_str("=>");
                chars.next();
                out.push(' ');
                start_of_line = false;
                continue;
            }

            // 普通等号，统一两侧空格，且保持同一行
            if ch == '=' {
                self.write_indent_if_needed(start_of_line, indent, &indent_unit, &mut out);
                if !start_of_line && !out.ends_with(' ') && !out.ends_with('\n') {
                    out.push(' ');
                }
                out.push('=');
                out.push(' ');
                start_of_line = false;
                // 标记等号后第一个 token，避免被换行切断。
                after_eq = true;
                continue;
            }

            // 管道：两侧补足空格，保证在同一行
            if ch == '|' {
                after_eq = false;
                self.write_indent_if_needed(start_of_line, indent, &indent_unit, &mut out);
                if !start_of_line && !out.ends_with(' ') && !out.ends_with('\n') {
                    out.push(' ');
                }
                out.push('|');
                // 吃掉管道后的所有空白，统一加 1 个空格
                while matches!(chars.peek(), Some(c) if c.is_whitespace()) {
                    chars.next();
                }
                out.push(' ');
                start_of_line = false;
                continue;
            }

            // 左花括号
            if ch == '{' {
                after_eq = false;
                if !start_of_line && !out.ends_with(' ') && !out.ends_with('\n') {
                    out.push(' ');
                }
                // 检查空块
                let mut clone_iter = chars.clone();
                while matches!(clone_iter.peek(), Some(c) if c.is_whitespace()) {
                    clone_iter.next();
                }
                if matches!(clone_iter.next(), Some('}')) {
                    // 空块 `{}` 直接合并为单行输出。
                    self.write_indent_if_needed(start_of_line, indent, &indent_unit, &mut out);
                    out.push_str("{}");
                    while let Some(c) = chars.peek() {
                        if c.is_whitespace() {
                            chars.next();
                        } else {
                            break;
                        }
                    }
                    chars.next(); // consume '}'
                    start_of_line = false;
                } else {
                    // 非空块：换行并提升缩进层级。
                    self.write_indent_if_needed(start_of_line, indent, &indent_unit, &mut out);
                    out.push('{');
                    out.push('\n');
                    indent += 1;
                    start_of_line = true;
                }
                continue;
            }

            // 右花括号
            if ch == '}' {
                after_eq = false;
                // 闭合块时先降低缩进层级。
                indent = indent.saturating_sub(1);
                if !start_of_line {
                    out.push('\n');
                }
                self.write_indent_if_needed(true, indent, &indent_unit, &mut out);
                out.push('}');

                // 若后续紧跟分号（可跨空白），则同一行输出 `};`
                let mut lookahead = chars.clone();
                let mut skipped = 0usize;
                while matches!(lookahead.peek(), Some(c) if c.is_whitespace()) {
                    lookahead.next();
                    skipped += 1;
                }
                if matches!(lookahead.peek(), Some(';')) {
                    for _ in 0..skipped {
                        chars.next();
                    }
                    chars.next(); // consume ';'
                    out.push(';');
                    out.push('\n');
                } else {
                    out.push('\n');
                }
                start_of_line = true;
                continue;
            }

            // 语句结束
            if ch == ';' {
                after_eq = false;
                // 移除语句前多余空格/换行，使分号紧贴最后一个 token。
                while matches!(out.chars().last(), Some(' ' | '\n')) {
                    out.pop();
                }
                out.push(';');
                out.push('\n');
                start_of_line = true;
                continue;
            }

            self.write_indent_if_needed(start_of_line, indent, &indent_unit, &mut out);
            out.push(ch);
            start_of_line = false;
            after_eq = false;
        }

        let mut res = collapse_blank_lines(&out);
        // 清理末尾多余的换行，最多保留一个空行
        while res.ends_with("\n\n\n") {
            res.pop();
        }
        Ok(res)
    }

    /// 在行首按需写入缩进。
    fn write_indent_if_needed(
        &self,
        start_of_line: bool,
        indent: usize,
        indent_unit: &str,
        out: &mut String,
    ) {
        if start_of_line {
            out.push_str(&indent_unit.repeat(indent));
        }
    }
}

/// 收集属性块文本（跨行），直到匹配到对应的 ']'
fn collect_attr_block_lines<'a, I>(
    start_line: &str,
    lines: &mut std::iter::Peekable<I>,
    line_no: &mut usize,
    start_line_no: usize,
) -> Result<String, OmlFormatError>
where
    I: Iterator<Item = &'a str>,
{
    let mut buf = String::new();
    buf.push_str(start_line);
    buf.push('\n');
    // 通过括号深度判断属性块是否结束，避免在字符串内误判。
    let mut depth = start_line.matches('[').count() as i32 - start_line.matches(']').count() as i32;
    let mut in_str = false;
    let mut escaped = false;

    for line in lines {
        for ch in line.chars() {
            buf.push(ch);
            if escaped {
                escaped = false;
                continue;
            }
            if ch == '\\' {
                escaped = true;
                continue;
            }
            if ch == '"' {
                in_str = !in_str;
            }
            if !in_str {
                if ch == '[' {
                    depth += 1;
                } else if ch == ']' {
                    depth -= 1;
                }
            }
        }
        buf.push('\n');
        *line_no = line_no.saturating_add(1);
        if depth <= 0 {
            return Ok(buf.trim_end().to_string());
        }
    }

    Err(OmlFormatError::UnclosedBracket {
        open: '[',
        close: ']',
        line: start_line_no,
    })
}

/// 收集属性块文本（字符级）
fn collect_attr_block<T>(
    start: &str,
    iter: &mut T,
    line_no: usize,
) -> Result<String, OmlFormatError>
where
    T: Iterator<Item = char>,
{
    let mut buf = String::from(start);
    // 用深度计数定位成对的 `[` `]`，允许嵌套属性。
    let mut depth = start.chars().filter(|c| *c == '[').count() as i32;
    let mut in_str = false;
    let mut escaped = false;
    for c in iter.by_ref() {
        buf.push(c);
        if escaped {
            escaped = false;
            continue;
        }
        if c == '\\' {
            escaped = true;
            continue;
        }
        if c == '"' {
            in_str = !in_str;
        }
        if !in_str {
            if c == '[' {
                depth += 1;
            } else if c == ']' {
                depth -= 1;
                if depth == 0 {
                    return Ok(buf);
                }
            }
        }
    }
    Err(OmlFormatError::UnclosedBracket {
        open: '[',
        close: ']',
        line: line_no,
    })
}

/// 将属性块压缩为单行，保持键值顺序
fn format_attribute(raw: &str) -> String {
    let inner = raw.trim().trim_start_matches("#[").trim_end_matches(']');
    // 先按顶层逗号拆分属性项，忽略字符串/嵌套括号中的逗号。
    let items = split_top_level(inner, ',');
    let mut parts = Vec::new();

    for item in items {
        let trimmed = collapse_ws(item.trim());
        if let Some((name, args_raw)) = trimmed.split_once('(') {
            let args_inner = args_raw.trim_end_matches(')');
            let args = split_top_level(args_inner, ',');
            let mut arg_parts = Vec::new();
            for arg in args {
                let arg_clean = collapse_ws(arg.trim());
                if let Some((k, v)) = arg_clean.split_once(':') {
                    let k = k.trim();
                    let v = v.trim();
                    // tag(...) 的键值对在冒号后保留空格，其它属性紧凑输出。
                    if name.trim() == "tag" {
                        arg_parts.push(format!("{}: {}", k, v));
                    } else {
                        arg_parts.push(format!("{}:{}", k, v));
                    }
                } else {
                    arg_parts.push(arg_clean);
                }
            }
            // 函数式属性：收敛为 `name(arg1,arg2)` 的紧凑形式。
            parts.push(format!("{}({})", name.trim(), arg_parts.join(",")));
        } else if !trimmed.is_empty() {
            parts.push(trimmed.to_string());
        }
    }

    // 最终输出为单行属性块。
    format!("#[{}]", parts.join(",")).replace('\n', "")
}

/// 按顶层分隔符拆分，忽略字符串与嵌套括号
fn split_top_level(input: &str, delim: char) -> Vec<String> {
    let mut res = Vec::new();
    let mut buf = String::new();
    let mut depth = 0i32;
    let mut in_str = false;
    let mut escaped = false;

    for ch in input.chars() {
        if escaped {
            buf.push(ch);
            escaped = false;
            continue;
        }
        match ch {
            '\\' => {
                buf.push(ch);
                escaped = true;
            }
            '"' => {
                buf.push(ch);
                in_str = !in_str;
            }
            '(' | '[' | '{' if !in_str => {
                depth += 1;
                buf.push(ch);
            }
            ')' | ']' | '}' if !in_str => {
                depth -= 1;
                buf.push(ch);
            }
            _ if ch == delim && depth == 0 && !in_str => {
                // 仅在顶层分隔符处切分，避免破坏嵌套结构。
                res.push(buf.trim().to_string());
                buf.clear();
            }
            _ => buf.push(ch),
        }
    }
    if !buf.trim().is_empty() {
        res.push(buf.trim().to_string());
    }
    res
}

/// 将多余空白收敛为单空格，并去除首尾空白。
fn collapse_ws(s: &str) -> String {
    let mut out = String::new();
    let mut prev_space = false;
    for ch in s.chars() {
        if ch.is_whitespace() {
            if !prev_space {
                out.push(' ');
                prev_space = true;
            }
        } else {
            prev_space = false;
            out.push(ch);
        }
    }
    out.trim().to_string()
}

/// 折叠连续空行为单个空行
fn collapse_blank_lines(text: &str) -> String {
    let mut result = String::new();
    let mut last_blank = false;

    for line in text.lines() {
        let blank = line.trim().is_empty();
        if blank && last_blank {
            continue;
        }
        last_blank = blank;
        // 保持行尾无多余空白，统一补回 '\n' 便于后续拼接。
        result.push_str(line.trim_end());
        result.push('\n');
    }

    result
}

/// 判断当前位置是否匹配需要原样保留的函数（名称后紧跟 '('）
fn starts_with_raw_func(
    first: char,
    iter: &std::iter::Peekable<std::str::Chars<'_>>,
    names: &[&str],
) -> Option<(String, usize)> {
    // 预读一定长度的字符，快速匹配候选函数名。
    let max_len = names.iter().map(|n| n.len() + 1).max().unwrap_or(0);
    let mut buf = String::new();
    buf.push(first);
    let mut clone_iter = iter.clone();
    while buf.len() < max_len {
        if let Some(c) = clone_iter.peek() {
            buf.push(*c);
            clone_iter.next();
        } else {
            break;
        }
    }
    for name in names {
        let pat = format!("{name}(");
        if buf.starts_with(&pat) {
            return Some((name.to_string(), name.len()));
        }
    }
    None
}

/// 读取原样保留函数体，直到匹配到首层闭合 ')'
fn read_raw_func_block(
    first: char,
    iter: &mut std::iter::Peekable<std::str::Chars<'_>>,
    name_len: usize,
) -> Option<String> {
    let mut out = String::new();
    out.push(first);
    let mut depth = 0i32;
    let mut in_str = false;
    let mut escaped = false;
    let mut seen_func = false;

    for c in iter.by_ref() {
        out.push(c);
        if !seen_func && out.len() > name_len && c == '(' {
            seen_func = true;
        }
        if escaped {
            escaped = false;
            continue;
        }
        if c == '\\' {
            escaped = true;
            continue;
        }
        if c == '"' {
            in_str = !in_str;
            continue;
        }
        if in_str {
            continue;
        }
        if c == '(' {
            depth += 1;
        } else if c == ')' {
            depth -= 1;
            if depth == 0 && seen_func {
                // 读取到首层闭合，返回完整函数块。
                return Some(out);
            }
        }
    }
    None
}

#[derive(Debug)]
pub enum OmlFormatError {
    /// 字符串字面量未闭合。
    UnclosedString { line: usize },
    /// 任意成对括号缺少闭合。
    UnclosedBracket {
        open: char,
        close: char,
        line: usize,
    },
    /// 原样函数调用未闭合。
    UnclosedRawFunc { name: String, line: usize },
}

impl std::fmt::Display for OmlFormatError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            OmlFormatError::UnclosedString { line } => {
                write!(f, "第 {} 行：字符串字面量未闭合", line)
            }
            OmlFormatError::UnclosedBracket { open, close, line } => {
                write!(f, "第 {} 行：括号未闭合：{} ... {}", line, open, close)
            }
            OmlFormatError::UnclosedRawFunc { name, line } => {
                write!(f, "第 {} 行：函数调用未闭合：{}", line, name)
            }
        }
    }
}

impl std::error::Error for OmlFormatError {}
