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
(type_name (identifier) @type)
(ns_type namespace: (identifier) @type name: (identifier) @type)

; ── Variable binding ──
(field binding: (var_name) @variable)
(subfield binding: (var_name) @variable)

; ── Subfield @ref ──
(subfield ref: (ref_path) @variable.special)

; ── Preprocessor ──
(preproc_path ns: (identifier) @function.builtin name: (identifier) @function.builtin)

; ── Function calls ──
(fun_call function: (identifier) @function)
(fun_call function: "not" @function)

; ── Annotation tag key ──
(tag_kv key: (identifier) @property)

; ── Plain identifiers (fallback) ──
(identifier) @variable
