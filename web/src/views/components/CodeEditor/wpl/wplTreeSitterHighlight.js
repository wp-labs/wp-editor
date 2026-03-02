import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import { Parser, Language, Query } from 'web-tree-sitter';

let parserPromise = null;
let languagePromise = null;
let queryPromise = null;

async function loadHighlightsQuery(language) {
  if (queryPromise) return queryPromise;
  queryPromise = (async () => {
    const response = await fetch('/tree-sitter/queries/wpl-highlights.scm');
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
    languagePromise = Language.load('/tree-sitter/tree-sitter-wpl.wasm');
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

const setWplDecorations = StateEffect.define();

const wplDecorations = StateField.define({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setWplDecorations)) return effect.value;
    }
    if (tr.docChanged) return value.map(tr.changes);
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

function classForCapture(name) {
  if (name === 'keyword' || name === 'keyword.operator') return 'cm-wpl-keyword';
  if (name.startsWith('type')) return 'cm-wpl-type';
  if (name.startsWith('function')) return 'cm-wpl-function';
  if (name.startsWith('operator')) return 'cm-wpl-operator';
  if (name.startsWith('punctuation')) return 'cm-wpl-punctuation';
  if (name.startsWith('string')) return 'cm-wpl-string';
  if (name.startsWith('number')) return 'cm-wpl-number';
  if (name.startsWith('comment')) return 'cm-wpl-comment';
  if (name.startsWith('variable.special')) return 'cm-wpl-special';
  if (name.startsWith('variable')) return 'cm-wpl-variable';
  if (name.startsWith('property')) return 'cm-wpl-property';
  if (name.startsWith('constant')) return 'cm-wpl-special';
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

const wplHighlighter = ViewPlugin.fromClass(
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
      view.dispatch({ effects: setWplDecorations.of(decorations) });
    }
  },
);

export function wplHighlightExtension() {
  return [wplDecorations, wplHighlighter];
}
