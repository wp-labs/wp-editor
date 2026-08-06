; OML Syntax Highlighting Queries (default / tree-sitter native)

; ── Keywords ──
[
  "name"
  "rule"
  "enable"
  "read"
  "take"
  "pipe"
  "fmt"
  "object"
  "collect"
  "match"
  "static"
  "select"
  "from"
  "where"
  "and"
  "or"
  "not"
  "in"
  "option"
  "keys"
  "get"
] @keyword

; ── Data types ──
(data_type) @type.builtin

; ── Privacy types ──
(privacy_type) @type.builtin

; ── Built-in function calls (Now::*) ──
(fun_call) @function.builtin

; ── Pipe functions ──
(pipe_fun) @function.builtin

; ── Match functions ──
(match_fun) @function.builtin

; ── Operators ──
"|" @operator
"=>" @keyword.operator
"!" @operator
(sql_op) @operator

; ── Separator ──
(separator) @punctuation.special

; ── @ref ──
(at_ref) @variable.special

; ── Underscore wildcard ──
"_" @variable.builtin

; ── Boolean ──
(boolean) @constant.builtin

; ── Punctuation ──
[ "(" ")" "{" "}" "[" "]" ] @punctuation.bracket
[ "," ";" ":" "=" ] @punctuation.delimiter

; ── Strings ──
(string) @string

; ── Numbers ──
(number) @number
(ip_literal) @number

; ── Comments ──
(comment) @comment

; ── Target names (assignment LHS) ──
(target_name (identifier) @property)
(target_name (wild_key) @property)

; ── Static item targets ──
(static_item (target (target_name (identifier) @property)))

; ── Header name ──
(name_field name: (identifier) @type.definition)
(name_field name: (path) @type.definition)

; ── Paths ──
(path) @string.special

; ── JSON paths ──
(json_path) @string.special

; ── Privacy item name ──
(privacy_item name: (identifier) @property)

; ── Map targets ──
(map_targets (identifier) @property)

; ── Plain identifiers (fallback) ──
(identifier) @variable
