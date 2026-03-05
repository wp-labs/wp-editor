import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import { Parser, Language, Query } from 'web-tree-sitter';

let parserPromise = null;
let languagePromise = null;
let queryPromise = null;

async function loadHighlightsQuery(language) {
  if (queryPromise) return queryPromise;
  queryPromise = (async () => {
    const response = await fetch('/tree-sitter/queries/highlights.scm');
    const text = await response.text();
    return new Query(language, text);
  })();
  return queryPromise;
}

async function getParser() {
  if (parserPromise) return parserPromise;
  parserPromise = (async () => {
    await Parser.init({
      locateFile: (file) => (file === 'tree-sitter.wasm' ? '/tree-sitter/tree-sitter.wasm' : file),
    });
    const parser = new Parser();
    languagePromise = Language.load('/tree-sitter/tree-sitter-oml.wasm');
    const language = await languagePromise;
    parser.setLanguage(language);
    void loadHighlightsQuery(language);
    return parser;
  })();
  return parserPromise;
}

async function getLanguage() {
  if (!languagePromise) {
    await getParser();
  }
  return languagePromise;
}

const setOmlDecorations = StateEffect.define();

const OML_KEYWORDS = new Set([
  'name',
  'rule',
  'enable',
  'read',
  'take',
  'pipe',
  'fmt',
  'object',
  'collect',
  'match',
  'static',
  'select',
  'from',
  'where',
  'and',
  'or',
  'not',
  'in',
  'option',
  'keys',
  'get',
]);

const OML_KEYWORD_FUNCTIONS = new Set(['read', 'get']);

const omlDecorations = StateField.define({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setOmlDecorations)) return effect.value;
    }
    if (tr.docChanged) return value.map(tr.changes);
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

function classForCapture(name) {
  if (name === 'keyword' || name === 'keyword.operator') return 'cm-oml-keyword';
  if (name.startsWith('type')) return 'cm-oml-type';
  if (name.startsWith('function')) return 'cm-oml-function';
  if (name.startsWith('operator')) return 'cm-oml-operator';
  if (name.startsWith('punctuation')) return 'cm-oml-punctuation';
  if (name.startsWith('string')) return 'cm-oml-string';
  if (name.startsWith('number')) return 'cm-oml-number';
  if (name.startsWith('comment')) return 'cm-oml-comment';
  if (name.startsWith('variable.special')) return 'cm-oml-special';
  if (name.startsWith('variable')) return 'cm-oml-variable';
  if (name.startsWith('constant')) return 'cm-oml-special';
  return null;
}

function isFunctionLikeKeyword(text, tokenStart, tokenEnd) {
  const token = text.slice(tokenStart, tokenEnd);
  if (!OML_KEYWORD_FUNCTIONS.has(token)) return false;
  let i = tokenEnd;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  return text[i] === '(';
}

function addRegexRanges(text, regex, className, ranges) {
  for (let match = regex.exec(text); match; match = regex.exec(text)) {
    if (!match[0]) continue;
    ranges.push({
      from: match.index,
      to: match.index + match[0].length,
      className,
    });
  }
}

function buildFallbackRanges(text) {
  const ranges = [];

  addRegexRanges(text, /=>/g, 'cm-oml-keyword', ranges);
  addRegexRanges(text, /\|/g, 'cm-oml-operator', ranges);
  addRegexRanges(text, /[(){}\[\],;:]/g, 'cm-oml-punctuation', ranges);
  addRegexRanges(text, /=(?!>)/g, 'cm-oml-punctuation', ranges);

  const keywordRegex = new RegExp(
    `\\b(?:${Array.from(OML_KEYWORDS).join('|')})\\b(?!\\s*\\()`,
    'g',
  );
  addRegexRanges(text, keywordRegex, 'cm-oml-keyword', ranges);

  const fnRegex = /\b([A-Za-z_][\w:]*)\s*(?=\()/g;
  for (let match = fnRegex.exec(text); match; match = fnRegex.exec(text)) {
    if (!match[1]) continue;
    ranges.push({
      from: match.index,
      to: match.index + match[1].length,
      className: 'cm-oml-function',
    });
  }

  return ranges;
}

function buildLineRanges(text) {
  const ranges = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '\n') {
      ranges.push({ start, end: i });
      start = i + 1;
    }
  }
  ranges.push({ start, end: text.length });
  return ranges;
}

function lineIndexForPos(lineRanges, pos) {
  let low = 0;
  let high = lineRanges.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const range = lineRanges[mid];
    if (pos < range.start) {
      high = mid - 1;
    } else if (pos >= range.end) {
      low = mid + 1;
    } else {
      return mid;
    }
  }
  return -1;
}

function findPlainArgRanges(text) {
  const ranges = [];
  const callPattern = /[A-Za-z_][\w:]*\s*\(/g;

  for (let match = callPattern.exec(text); match; match = callPattern.exec(text)) {
    const openIndex = match.index + match[0].lastIndexOf('(');
    let depth = 1;
    let cursor = openIndex + 1;

    while (cursor < text.length && depth > 0) {
      const ch = text[cursor];
      if (ch === '(') depth += 1;
      if (ch === ')') depth -= 1;
      cursor += 1;
    }

    if (depth !== 0) continue;
    const closeIndex = cursor - 1;
    if (closeIndex <= openIndex + 1) continue;

    ranges.push({ from: openIndex + 1, to: closeIndex });
  }

  return ranges;
}

async function buildDecorations(root, language, text) {
  const ranges = [];
  const rawPlainRanges = findPlainArgRanges(text);
  const plainRanges = rawPlainRanges.map((range) =>
    Decoration.mark({ class: 'cm-oml-plain' }).range(range.from, range.to),
  );
  const isInsidePlain = (from, to) =>
    rawPlainRanges.some((range) => from >= range.from && to <= range.to);
  const lineRanges = buildLineRanges(text);
  const plainLines = new Set(
    rawPlainRanges
      .map((range) => lineIndexForPos(lineRanges, range.from))
      .filter((index) => index >= 0),
  );
  const isPlainLine = (from, to) => {
    const lineIndex = lineIndexForPos(lineRanges, from);
    if (lineIndex < 0) return false;
    if (to <= lineRanges[lineIndex].end) return plainLines.has(lineIndex);
    return true;
  };

  const query = await loadHighlightsQuery(language);
  const captures = query.captures(root);

  for (const capture of captures) {
    const className = classForCapture(capture.name);
    if (!className) continue;
    if (capture.node.startIndex === capture.node.endIndex) continue;
    if (isInsidePlain(capture.node.startIndex, capture.node.endIndex)) continue;
    if (isPlainLine(capture.node.startIndex, capture.node.endIndex)) continue;
    if (
      className === 'cm-oml-keyword' &&
      isFunctionLikeKeyword(text, capture.node.startIndex, capture.node.endIndex)
    ) {
      ranges.push({
        from: capture.node.startIndex,
        to: capture.node.endIndex,
        className: 'cm-oml-function',
      });
      continue;
    }
    ranges.push({
      from: capture.node.startIndex,
      to: capture.node.endIndex,
      className,
    });
  }

  const fallbackRanges = buildFallbackRanges(text)
    .filter((range) => !isInsidePlain(range.from, range.to))
    .filter((range) => isPlainLine(range.from, range.to))
    .map((range) => Decoration.mark({ class: range.className }).range(range.from, range.to));

  const decorations = [
    ...ranges.map((range) =>
      Decoration.mark({ class: range.className }).range(range.from, range.to),
    ),
    ...fallbackRanges,
    ...plainRanges,
  ];

  return Decoration.set(decorations, true);
}

const omlHighlighter = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.destroyed = false;
      this.requestId = 0;
      void this.recompute(view);
    }

    update(update) {
      if (update.docChanged) void this.recompute(update.view);
    }

    destroy() {
      this.destroyed = true;
    }

    async recompute(view) {
      const requestId = (this.requestId += 1);
      const parser = await getParser();
      if (this.destroyed || requestId !== this.requestId) return;

      const language = await getLanguage();
      const text = view.state.doc.toString();
      const tree = parser.parse(text);
      const decorations = await buildDecorations(tree.rootNode, language, text);

      if (this.destroyed || requestId !== this.requestId) return;
      view.dispatch({ effects: setOmlDecorations.of(decorations) });
    }
  },
);

export function omlHighlightExtension() {
  return [omlDecorations, omlHighlighter];
}
