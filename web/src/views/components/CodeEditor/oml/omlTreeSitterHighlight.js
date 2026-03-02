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

async function buildDecorations(root, language) {
  const ranges = [];
  const query = await loadHighlightsQuery(language);
  const captures = query.captures(root);

  for (const capture of captures) {
    const className = classForCapture(capture.name);
    if (!className) continue;
    if (capture.node.startIndex === capture.node.endIndex) continue;
    ranges.push({
      from: capture.node.startIndex,
      to: capture.node.endIndex,
      className,
    });
  }

  const decorations = ranges.map((range) =>
    Decoration.mark({ class: range.className }).range(range.from, range.to),
  );

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
      const tree = parser.parse(view.state.doc.toString());
      const decorations = await buildDecorations(tree.rootNode, language);

      if (this.destroyed || requestId !== this.requestId) return;
      view.dispatch({ effects: setOmlDecorations.of(decorations) });
    }
  },
);

export function omlHighlightExtension() {
  return [omlDecorations, omlHighlighter];
}
