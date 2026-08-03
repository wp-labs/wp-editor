; WPL Syntax Highlighting Queries (default)

; ── Keywords ──
[
  "package"
  "rule"
  "plg_pipe"
  "alt"
  "opt"
  "some_of"
  "seq"
  "not"
  "tag"
  "copy_raw"
  "array"
] @keyword

; ── Operators / punctuation ──
"*" @operator
"|" @operator
"@" @operator

; ── Punctuation ──
[ "(" ")" "{" "}" "[" "]" "<" ">" ] @punctuation.bracket
[ "," ":" ] @punctuation.delimiter

; ── String literals ──
(quoted_string) @string
(raw_string) @string
(single_quoted_raw) @string

; ── Number literals ──
(number) @number

; ── Escape characters ──
(escape_char) @string.escape

; ── Format ──
(scope_format) @string.special
(quote_format) @string.special
(pattern_sep) @string.special

; ── Package name ──
(package_decl name: (path_name) @type.definition)

; ── Rule name ──
(rule_decl name: (path_name) @function.definition)

; ── Type names ──
(meta_token) @type
(subfield_meta) @type

; ── Variable binding ──
(field binding: (var_name) @variable)
(subfield binding: (var_name) @variable)

; ── Subfield @ref ──
(subfield ref: (ref_path_or_quoted) @variable.special)

; ── Preprocessor ──
(preproc_step) @function.builtin
(plg_pipe_step name: (key) @function)

; ── Function calls ──
(fun_call function: (function_name) @function)

; ── Annotation tag key ──
(tag_kv key: (key) @property)

; ── Plain identifiers (fallback) ──
(identifier) @variable
