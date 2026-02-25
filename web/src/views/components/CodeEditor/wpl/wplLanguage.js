import { snippetCompletion } from '@codemirror/autocomplete';
import { StreamLanguage } from '@codemirror/language';
import WPL_COMPLETION_TABLE_ZH from './wplCompletionTable';
import WPL_COMPLETION_TABLE_EN from './wplCompletionTable.en';
import { buildCompletionInfo, getCompletionLabels } from '../completionLabels';

const LANGUAGE_DEFINITIONS = {
  wpl: {
    keywords: [
      'package',
      'rule',
      'plg_pipe',
      'alt',
      'opt',
      'some_of',
      'seq',
      'order',
      'tag',
      'copy_raw',
      'include',
      'macro',
    ],
    types: [
      'peek_symbol',
      'symbol',
      'bool',
      'auto',
      'chars',
      'digit',
      'float',
      'time',
      'time_iso',
      'time_3339',
      'time_2822',
      'time/clf',
      'time/apache',
      'time/httpd',
      'time/nginx',
      'time/rfc3339',
      'time/rfc2822',
      'time/timestamp',
      'time_timestamp',
      'ip',
      'ip_net',
      'domain',
      'email',
      'port',
      'kv',
      'kvarr',
      'json',
      'exact_json',
      'array',
      'http/request',
      'http/status',
      'http/agent',
      'http/user_agent',
      'http/method',
      'hex',
      'base64',
      'url',
      'proto_text',
      'proto/text',
      'obj',
      'sn',
      'id_card',
      'mobile_phone',
      '_',
    ],
    functions: [
      'decode/base64',
      'decode/hex',
      'strip/bom',
      'unquote/unescape',
      'take',
      'last',
      'f_has',
      'f_chars_has',
      'f_chars_not_has',
      'f_chars_in',
      'f_digit_has',
      'f_digit_in',
      'f_ip_in',
      'has',
      'chars_has',
      'chars_not_has',
      'chars_in',
      'starts_with',
      'regex_match',
      'digit_has',
      'digit_in',
      'digit_range',
      'ip_in',
      'json_unescape',
      'base64_decode',
      'chars_replace',
      'not',
    ],
    constants: [],
  },
};

const WPL_DEFINITION = LANGUAGE_DEFINITIONS.wpl;
const WPL_KEYWORDS = new Set(WPL_DEFINITION.keywords);
const WPL_TYPES = new Set(WPL_COMPLETION_TABLE_ZH.filter((item) => item.kind === 'type').map((item) => item.label));
const WPL_FUNCTIONS = new Set(
  WPL_COMPLETION_TABLE_ZH.filter((item) => item.kind === 'function').map((item) => item.label),
);
const WPL_BUILTINS = new Set(WPL_DEFINITION.constants);

export const WPL_COMPLETION_VALID_FOR = /[\w/]+|\|/;

export const buildWplCompletionOptions = (lang) => {
  const labels = getCompletionLabels(lang);
  const table = lang === 'en-US' ? WPL_COMPLETION_TABLE_EN : WPL_COMPLETION_TABLE_ZH;
  return [
    snippetCompletion(['package /${path}/ {', '}'].join('\n'), {
      label: 'package',
      type: 'keyword',
      detail: labels.packageDetail,
      info: labels.packageInfo,
    }),
    snippetCompletion(['rule ${name} {(', ')}'].join('\n'), {
      label: 'rule',
      type: 'keyword',
      detail: labels.ruleDetail,
      info: labels.ruleInfo,
    }),
    ...table.map((item) => {
      const description = item.description;
      return snippetCompletion(item.insertText, {
        label: item.label,
        type: item.kind,
        detail: description,
        info: buildCompletionInfo(labels, description, item.example),
      });
    }),
  ];
};

export const wplLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) {
      return null;
    }
    const ch = stream.peek();
    if (ch === '"') {
      stream.next();
      while (!stream.eol()) {
        if (stream.next() === '"' && !stream.match(/\\$/, false)) {
          break;
        }
      }
      return 'string';
    }
    if (stream.match(/-?\d+(\.\d+)?/)) {
      return 'number';
    }
    if (stream.match(/[\w/]+/)) {
      const word = stream.current();
      if (word === 'array' || word.startsWith('array/')) return 'typeName';
      if (WPL_KEYWORDS.has(word)) return 'keyword';
      if (WPL_TYPES.has(word)) return 'typeName';
      if (WPL_FUNCTIONS.has(word) || word.startsWith('plg_pipe/')) return 'variableName.function';
      if (WPL_BUILTINS.has(word)) return 'atom';
      return 'variableName';
    }
    if (stream.match(/[{}()[\],|:]/)) {
      return 'operator';
    }
    stream.next();
    return null;
  },
});
