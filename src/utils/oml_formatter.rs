/// OML 代码格式化器：保持语义不变，统一缩进/空行/行内空格。
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

    /// 对外入口：返回格式化结果或具体错误信息。
    pub fn format_content(&self, content: &str) -> Result<String, OmlFormatError> {
        let tokens = tokenize(content)?;
        Ok(format_tokens(&tokens, self.indent))
    }

    /// 兼容旧行为：格式化失败时回退为原内容，保证调用方不崩溃。
    pub fn format_content_or_original(&self, content: &str) -> String {
        self.format_content(content)
            .unwrap_or_else(|_| content.to_string())
    }

    /// 对外提供可返回错误信息的格式化接口。
    /// 当前为 `format_content` 的兼容别名，便于保留既有调用点。
    pub fn format_with_error(&self, content: &str) -> Result<String, OmlFormatError> {
        self.format_content(content)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum Symbol {
    LParen,
    RParen,
    LBrace,
    RBrace,
    LBracket,
    RBracket,
    Comma,
    Semicolon,
    Colon,
    DoubleColon,
    Equal,
    FatArrow,
    Pipe,
    Separator,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum TokenKind {
    Word,
    StringLiteral,
    Comment,
    Symbol(Symbol),
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct Token {
    kind: TokenKind,
    text: String,
}

fn tokenize(input: &str) -> Result<Vec<Token>, OmlFormatError> {
    let mut iter = input.char_indices().peekable();
    let mut line = 1usize;
    let mut tokens = Vec::new();
    let input_len = input.len();

    while let Some((idx, ch)) = iter.next() {
        if ch.is_whitespace() {
            if ch == '\n' {
                line = line.saturating_add(1);
            }
            continue;
        }

        if ch == '#' {
            let start = idx;
            let mut end = input_len;
            // 当注释内容包含换行符时，注释结束位置为换行符位置
            while let Some(&(next_idx, next_ch)) = iter.peek() {
                if next_ch == '\n' {
                    end = next_idx;
                    break;
                }
                iter.next();
            }
            tokens.push(Token {
                kind: TokenKind::Comment,
                text: input[start..end].to_string(),
            });
            continue;
        }

        // 双斜杠的注释，直到换行符结束
        if ch == '/' && matches!(iter.peek().map(|(_, c)| *c), Some('/')) {
            let start = idx;
            iter.next();
            let mut end = input_len;
            while let Some(&(next_idx, next_ch)) = iter.peek() {
                if next_ch == '\n' {
                    end = next_idx;
                    break;
                }
                iter.next();
            }
            tokens.push(Token {
                kind: TokenKind::Comment,
                text: input[start..end].to_string(),
            });
            continue;
        }

        if ch == '-' {
            let mut lookahead = iter.clone();
            if matches!(lookahead.next().map(|(_, c)| c), Some('-'))
                && matches!(lookahead.next().map(|(_, c)| c), Some('-'))
            {
                tokens.push(Token {
                    kind: TokenKind::Symbol(Symbol::Separator),
                    text: "---".to_string(),
                });
                iter.next();
                iter.next();
                continue;
            }
        }

        if ch == '"' || ch == '\'' {
            let quote = ch;
            let start = idx;
            let start_line = line;
            let mut closed = false;
            while let Some((_, next_ch)) = iter.next() {
                if next_ch == '\n' {
                    line = line.saturating_add(1);
                }
                if next_ch == '\\' {
                    if let Some((_, escaped)) = iter.next()
                        && escaped == '\n'
                    {
                        line = line.saturating_add(1);
                    }
                    continue;
                }
                if next_ch == quote {
                    closed = true;
                    break;
                }
            }
            if !closed {
                return Err(OmlFormatError::UnclosedString { line: start_line });
            }
            let end = iter.peek().map(|(i, _)| *i).unwrap_or(input_len);
            tokens.push(Token {
                kind: TokenKind::StringLiteral,
                text: input[start..end].to_string(),
            });
            continue;
        }

        match ch {
            '(' => {
                tokens.push(symbol_token(Symbol::LParen, "("));
                continue;
            }
            ')' => {
                tokens.push(symbol_token(Symbol::RParen, ")"));
                continue;
            }
            '{' => {
                tokens.push(symbol_token(Symbol::LBrace, "{"));
                continue;
            }
            '}' => {
                tokens.push(symbol_token(Symbol::RBrace, "}"));
                continue;
            }
            '[' => {
                tokens.push(symbol_token(Symbol::LBracket, "["));
                continue;
            }
            ']' => {
                tokens.push(symbol_token(Symbol::RBracket, "]"));
                continue;
            }
            ',' => {
                tokens.push(symbol_token(Symbol::Comma, ","));
                continue;
            }
            ';' => {
                tokens.push(symbol_token(Symbol::Semicolon, ";"));
                continue;
            }
            ':' => {
                if matches!(iter.peek().map(|(_, c)| *c), Some(':')) {
                    tokens.push(symbol_token(Symbol::DoubleColon, "::"));
                    iter.next();
                } else {
                    tokens.push(symbol_token(Symbol::Colon, ":"));
                }
                continue;
            }
            '|' => {
                tokens.push(symbol_token(Symbol::Pipe, "|"));
                continue;
            }
            '=' => {
                if matches!(iter.peek().map(|(_, c)| *c), Some('>')) {
                    tokens.push(symbol_token(Symbol::FatArrow, "=>"));
                    iter.next();
                } else {
                    tokens.push(symbol_token(Symbol::Equal, "="));
                }
                continue;
            }
            _ => {}
        }

        let start = idx;
        let mut end = iter.peek().map(|(i, _)| *i).unwrap_or(input_len);
        while let Some(&(next_idx, next_ch)) = iter.peek() {
            if next_ch.is_whitespace() || is_punctuation(next_ch) || next_ch == '#' {
                break;
            }
            if next_ch == '/' {
                let mut lookahead = iter.clone();
                lookahead.next();
                if matches!(lookahead.next().map(|(_, c)| c), Some('/')) {
                    break;
                }
            }
            iter.next();
            end = iter.peek().map(|(i, _)| *i).unwrap_or(input_len);
            if next_idx == end {
                end = next_idx;
            }
        }
        tokens.push(Token {
            kind: TokenKind::Word,
            text: input[start..end].to_string(),
        });
    }

    Ok(tokens)
}

fn symbol_token(kind: Symbol, text: &str) -> Token {
    Token {
        kind: TokenKind::Symbol(kind),
        text: text.to_string(),
    }
}

fn is_punctuation(ch: char) -> bool {
    matches!(
        ch,
        '(' | ')' | '{' | '}' | '[' | ']' | ',' | ';' | ':' | '|' | '='
    )
}

fn format_tokens(tokens: &[Token], indent_spaces: usize) -> String {
    let mut out = String::new();
    let mut indent = 0usize;
    let mut line_empty = true;
    let mut paren_level = 0usize;
    let mut bracket_level = 0usize;
    let mut brace_level = 0usize;

    let mut i = 0usize;
    while i < tokens.len() {
        let token = &tokens[i];
        let next = tokens.get(i + 1);

        match &token.kind {
            TokenKind::Symbol(Symbol::Separator) => {
                if !line_empty {
                    newline(&mut out, &mut line_empty);
                }
                write_token(
                    &mut out,
                    &mut line_empty,
                    indent,
                    indent_spaces,
                    &token.text,
                );
                newline(&mut out, &mut line_empty);
                // 头部与主体之间保留一个空行。
                newline(&mut out, &mut line_empty);
                i += 1;
                continue;
            }
            TokenKind::Comment => {
                if !line_empty {
                    newline(&mut out, &mut line_empty);
                }
                write_token(
                    &mut out,
                    &mut line_empty,
                    indent,
                    indent_spaces,
                    &token.text,
                );
                newline(&mut out, &mut line_empty);
                i += 1;
                continue;
            }
            _ => {}
        }

        if is_top_level_header(token, paren_level, bracket_level, brace_level) && !line_empty {
            newline(&mut out, &mut line_empty);
        }

        match &token.kind {
            TokenKind::Symbol(Symbol::LBrace) => {
                if needs_space_before(token, tokens.get(i.wrapping_sub(1))) {
                    write_raw(&mut out, &mut line_empty, " ");
                }
                write_token(&mut out, &mut line_empty, indent, indent_spaces, "{");
                newline(&mut out, &mut line_empty);
                indent += 1;
                brace_level += 1;
            }
            TokenKind::Symbol(Symbol::RBrace) => {
                brace_level = brace_level.saturating_sub(1);
                indent = indent.saturating_sub(1);
                if !line_empty {
                    newline(&mut out, &mut line_empty);
                }
                write_token(&mut out, &mut line_empty, indent, indent_spaces, "}");
                if matches!(
                    next.map(|t| &t.kind),
                    Some(TokenKind::Symbol(Symbol::Semicolon))
                ) {
                    write_raw(&mut out, &mut line_empty, " ");
                    write_raw(&mut out, &mut line_empty, ";");
                    newline(&mut out, &mut line_empty);
                    i += 1;
                } else {
                    newline(&mut out, &mut line_empty);
                }
            }
            TokenKind::Symbol(Symbol::Semicolon) => {
                if !out.ends_with(' ') && !out.ends_with('\n') {
                    write_raw(&mut out, &mut line_empty, " ");
                }
                write_raw(&mut out, &mut line_empty, ";");
                newline(&mut out, &mut line_empty);
            }
            TokenKind::Symbol(Symbol::Comma) => {
                write_raw(&mut out, &mut line_empty, ",");
                if !matches!(
                    next.map(|t| &t.kind),
                    Some(TokenKind::Symbol(Symbol::RParen | Symbol::RBracket))
                ) {
                    write_raw(&mut out, &mut line_empty, " ");
                }
            }
            TokenKind::Symbol(Symbol::Pipe) => {
                if !out.ends_with(' ') && !out.ends_with('\n') {
                    write_raw(&mut out, &mut line_empty, " ");
                }
                write_raw(&mut out, &mut line_empty, "|");
                write_raw(&mut out, &mut line_empty, " ");
            }
            TokenKind::Symbol(Symbol::FatArrow) => {
                if !out.ends_with(' ') && !out.ends_with('\n') {
                    write_raw(&mut out, &mut line_empty, " ");
                }
                write_raw(&mut out, &mut line_empty, "=>");
                write_raw(&mut out, &mut line_empty, " ");
            }
            TokenKind::Symbol(Symbol::Equal) => {
                if !out.ends_with(' ') && !out.ends_with('\n') {
                    write_raw(&mut out, &mut line_empty, " ");
                }
                write_raw(&mut out, &mut line_empty, "=");
                write_raw(&mut out, &mut line_empty, " ");
            }
            TokenKind::Symbol(Symbol::Colon) => {
                let next_is_bracket = matches!(
                    next.map(|t| &t.kind),
                    Some(TokenKind::Symbol(Symbol::LBracket))
                );
                if next_is_bracket {
                    write_raw(&mut out, &mut line_empty, ":");
                } else {
                    if !out.ends_with(' ') && !out.ends_with('\n') {
                        write_raw(&mut out, &mut line_empty, " ");
                    }
                    write_raw(&mut out, &mut line_empty, ":");
                    write_raw(&mut out, &mut line_empty, " ");
                }
            }
            TokenKind::Symbol(Symbol::DoubleColon) => {
                write_raw(&mut out, &mut line_empty, "::");
            }
            TokenKind::Symbol(Symbol::LParen) => {
                if is_match_prefix(tokens.get(i.wrapping_sub(1))) {
                    write_raw(&mut out, &mut line_empty, " ");
                }
                write_raw(&mut out, &mut line_empty, "(");
                paren_level += 1;
            }
            TokenKind::Symbol(Symbol::RParen) => {
                write_raw(&mut out, &mut line_empty, ")");
                paren_level = paren_level.saturating_sub(1);
            }
            TokenKind::Symbol(Symbol::LBracket) => {
                write_raw(&mut out, &mut line_empty, "[");
                bracket_level += 1;
            }
            TokenKind::Symbol(Symbol::RBracket) => {
                write_raw(&mut out, &mut line_empty, "]");
                bracket_level = bracket_level.saturating_sub(1);
            }
            TokenKind::Word | TokenKind::StringLiteral => {
                if !line_empty && needs_space_before(token, tokens.get(i.wrapping_sub(1))) {
                    write_raw(&mut out, &mut line_empty, " ");
                }
                write_token(
                    &mut out,
                    &mut line_empty,
                    indent,
                    indent_spaces,
                    &token.text,
                );
            }
            TokenKind::Symbol(Symbol::Separator) | TokenKind::Comment => {}
        }

        i += 1;
    }

    if !out.ends_with('\n') {
        out.push('\n');
    }
    out
}

fn is_top_level_header(
    token: &Token,
    paren_level: usize,
    bracket_level: usize,
    brace_level: usize,
) -> bool {
    if paren_level != 0 || bracket_level != 0 || brace_level != 0 {
        return false;
    }
    if let TokenKind::Word = token.kind {
        matches!(token.text.as_str(), "name" | "rule" | "enable")
    } else {
        false
    }
}

fn is_match_prefix(prev: Option<&Token>) -> bool {
    matches!(prev.map(|t| t.text.as_str()), Some("match"))
}

fn needs_space_before(current: &Token, prev: Option<&Token>) -> bool {
    let prev = match prev {
        Some(value) => value,
        None => return false,
    };
    if matches!(
        current.kind,
        TokenKind::Symbol(Symbol::LParen | Symbol::LBracket | Symbol::RParen | Symbol::RBracket)
    ) {
        return false;
    }
    if matches!(
        prev.kind,
        TokenKind::Symbol(
            Symbol::LParen
                | Symbol::LBracket
                | Symbol::Pipe
                | Symbol::Equal
                | Symbol::Colon
                | Symbol::DoubleColon
                | Symbol::FatArrow
                | Symbol::Comma
        )
    ) {
        return false;
    }
    if matches!(prev.kind, TokenKind::Symbol(Symbol::LBrace)) {
        return false;
    }
    matches!(
        prev.kind,
        TokenKind::Word
            | TokenKind::StringLiteral
            | TokenKind::Symbol(Symbol::RParen | Symbol::RBracket | Symbol::RBrace)
    )
}

fn write_token(
    out: &mut String,
    line_empty: &mut bool,
    indent: usize,
    indent_spaces: usize,
    text: &str,
) {
    if *line_empty {
        out.push_str(&" ".repeat(indent * indent_spaces));
        *line_empty = false;
    }
    out.push_str(text);
}

fn write_raw(out: &mut String, line_empty: &mut bool, text: &str) {
    if *line_empty {
        out.push_str(&" ".repeat(0));
        *line_empty = false;
    }
    out.push_str(text);
}

fn newline(out: &mut String, line_empty: &mut bool) {
    while out.ends_with(' ') {
        out.pop();
    }
    out.push('\n');
    *line_empty = true;
}

#[derive(Debug)]
pub enum OmlFormatError {
    /// 字符串字面量未闭合。
    UnclosedString { line: usize },
    /// 任意成对括号缺少闭合（保留兼容）。
    UnclosedBracket {
        open: char,
        close: char,
        line: usize,
    },
    /// 原样函数调用未闭合（保留兼容）。
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
