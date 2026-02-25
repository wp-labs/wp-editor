import { snippetCompletion } from '@codemirror/autocomplete';
import { StreamLanguage } from '@codemirror/language';
import OML_COMPLETION_TABLE_ZH from './omlCompletionTable';
import OML_COMPLETION_TABLE_EN from './omlCompletionTable.en';
import { buildCompletionInfo, getCompletionLabels } from '../completionLabels';

const LANGUAGE_DEFINITIONS = {
  oml: {
    keywords: [
      'match', 'object', 'pipe', 'option', 'collect', 'fmt',
      'select', 'from', 'where', 'in', 'get',
      'and', 'or', 'not',
      'name', 'rule'
    ],
    types: ['auto', 'chars', 'digit', 'float', 'time', 'bool', 'ip', 'obj', 'array'],
    functions: [
      'read',
      'take',
      'Now::time',
      'Now::date',
      'Now::hour',
      'Time::to_ts_zone',
      'Time::to_ts',
      'Time::to_ts_ms',
      'Time::to_ts_us',
      'base64_decode',
      'base64_encode',
      'html_escape',
      'html_unescape',
      'json_escape',
      'json_unescape',
      'str_escape',
      'to_str',
      'to_json',
      'ip4_to_int',
      'nth',
      'get',
      'path',
      'url',
      'starts_with',
      'map_to',
      'str_unescape',
      'extract_main_word',
      'extract_subject_object',
      'skip_empty',
    ],
    privacyTypes: [],
    constants: [],
  },
};

const OML_DEFINITION = LANGUAGE_DEFINITIONS.oml;
const OML_KEYWORDS = new Set(OML_DEFINITION.keywords);
const OML_TYPES = new Set(OML_DEFINITION.types);
const OML_FUNCTIONS = new Set(OML_DEFINITION.functions);
const OML_PRIVACY_TYPES = new Set(OML_DEFINITION.privacyTypes);
const OML_CONSTANTS = new Set(OML_DEFINITION.constants);

export const OML_COMPLETION_VALID_FOR = /[\w/:\[\]]+|\|/;

export const buildOmlCompletionOptions = (lang) => {
  const labels = getCompletionLabels(lang);
  const table = lang === 'en-US' ? OML_COMPLETION_TABLE_EN : OML_COMPLETION_TABLE_ZH;
  return table.map((item) => {
    const description = item.description;
    return snippetCompletion(item.insertText, {
      label: item.label,
      type: 'function',
      detail: description,
      info: buildCompletionInfo(labels, description, item.example),
    });
  });
};

export const omlLanguage = StreamLanguage.define({
  startState() {
    return {
      inHeader: false,
      inPrivacy: false,
      afterColon: false,
      afterEqual: false,
    };
  },
  
  token(stream, state) {
    if (stream.eatSpace()) {
      return null;
    }

    const ch = stream.peek();

    // 注释
    if (ch === '#' || (ch === '/' && stream.match('//', false))) {
      stream.skipToEnd();
      return 'comment';
    }

    // 分隔符 ---
    if (stream.match(/^---/)) {
      if (!state.inHeader) {
        state.inHeader = true;
      } else if (!state.inPrivacy) {
        state.inPrivacy = true;
      }
      return 'keyword';
    }

    // 字符串
    if (ch === '"' || ch === "'") {
      const quote = ch;
      stream.next();
      while (!stream.eol()) {
        const next = stream.next();
        if (next === quote) {
          break;
        }
        if (next === '\\') {
          stream.next();
        }
      }
      return 'string';
    }

    // 数字（包括 IP 地址）
    if (stream.match(/^-?\d+(\.\d+){0,3}/)) {
      return 'number';
    }

    // @ 符号（用于 fmt 表达式中的变量引用）
    if (ch === '@') {
      stream.next();
      if (stream.match(/\w+/)) {
        return 'variableName';
      }
      return 'operator';
    }

    // JSON 路径
    if (ch === '/' && stream.match(/^\/[\w/\[\]]+/)) {
      return 'string';
    }

    // 操作符和标点
    if (stream.match(/^[{}()[\],|;=!:]/)) {
      const op = stream.current();
      if (op === ':') state.afterColon = true;
      if (op === '=') state.afterEqual = true;
      if (op === ';') {
        state.afterEqual = false;
        state.afterColon = false;
      }
      return 'operator';
    }

    // 标识符和关键字
    if (stream.match(/^[\w:]+/)) {
      const word = stream.current();
      const normalized = word.replace(/:+$/, '');
      
      // 向前查看是否有括号（不消耗字符）
      const savedPos = stream.pos;
      let hasCall = false;
      while (stream.peek() === ' ' || stream.peek() === '\t') {
        stream.next();
      }
      if (stream.peek() === '(') {
        hasCall = true;
      }
      stream.pos = savedPos; // 恢复位置

      // 隐私段中的隐私类型
      if (state.inPrivacy && state.afterColon && OML_PRIVACY_TYPES.has(word)) {
        state.afterColon = false;
        return 'typeName';
      }

      // 类型声明（在冒号后面，等号前面）
      if (state.afterColon && !state.afterEqual && OML_TYPES.has(word)) {
        state.afterColon = false;
        return 'typeName';
      }

      // 常量
      if (OML_CONSTANTS.has(word)) {
        return 'atom';
      }

      // 关键字
      if (OML_KEYWORDS.has(word) || OML_KEYWORDS.has(normalized)) {
        return 'keyword';
      }

      // 类型名
      if (OML_TYPES.has(word) || OML_TYPES.has(normalized)) {
        return 'typeName';
      }

      // 函数：包含 :: 或在函数列表中或后面跟括号
      if (word.includes('::') || OML_FUNCTIONS.has(word) || OML_FUNCTIONS.has(normalized) || hasCall) {
        return 'variableName.function';
      }

      // 隐私类型
      if (OML_PRIVACY_TYPES.has(word)) {
        return 'typeName';
      }

      // 默认为变量名
      return 'variableName';
    }

    // 其他字符
    stream.next();
    return null;
  },
});
