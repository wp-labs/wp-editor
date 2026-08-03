/**
 * Tree-sitter 高亮扩展模块。
 *
 * 提供通用的 CodeMirror 语法高亮扩展工厂函数，
 * 通过 languageId 参数化支持多种语言。
 *
 * 使用方式：
 *   const ext = createTreeSitterHighlightExtension('oml');
 *   // ext 是 [decorations, plugin] 数组，可直接传入 EditorState.create({ extensions })
 */

import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin } from '@codemirror/view';
import { Parser, Language, Query } from 'web-tree-sitter';
import { fetchLanguageManifest, resolveLanguageAssetUrl } from './assetRegistry';

let runtimeInitPromise = null;
const resourcesCache = new Map();

/** 初始化 web-tree-sitter 运行时（全局单例）。 */
const initRuntime = async () => {
  if (!runtimeInitPromise) {
    runtimeInitPromise = Parser.init({
      locateFile: (file) =>
        file === 'tree-sitter.wasm' || file === 'web-tree-sitter.wasm'
          ? '/tree-sitter/tree-sitter.wasm'
          : file,
    });
  }
  return runtimeInitPromise;
};

/**
 * 将 tree-sitter capture name 映射为 CSS 类名。
 * 不同语言通过 languageId 自动区分前缀，例如：
 * - OML: cm-oml-keyword, cm-oml-type, ...
 * - WPL: cm-wpl-keyword, cm-wpl-type, ...
 */
const classForCapture = (languageId, name) => {
  const prefix = `cm-${languageId}`;
  if (name.startsWith('keyword')) return `${prefix}-keyword`;
  if (name.startsWith('type')) return `${prefix}-type`;
  if (name.startsWith('function')) return `${prefix}-function`;
  if (name.startsWith('operator')) return `${prefix}-operator`;
  if (name.startsWith('punctuation')) return `${prefix}-punctuation`;
  if (name.startsWith('string')) return `${prefix}-string`;
  if (name.startsWith('number')) return `${prefix}-number`;
  if (name.startsWith('comment')) return `${prefix}-comment`;
  if (name.startsWith('variable.special')) return `${prefix}-special`;
  if (name.startsWith('variable')) return `${prefix}-variable`;
  if (name.startsWith('property')) return `${prefix}-property`;
  if (name.startsWith('constant')) return `${prefix}-special`;
  return null;
};

/** 将 query 文本按空行拆分为独立 block。 */
const splitQueryBlocks = (queryText) =>
  queryText
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

/**
 * 安全构建 Query 对象。
 * 当部分 block 与当前 parser 版本不兼容时，跳过不兼容的 block
 * 并使用剩余有效的 block 构建 Query。
 */
const buildQuerySafely = (language, queryText, languageId) => {
  try {
    return new Query(language, queryText);
  } catch (initialError) {
    const validBlocks = [];
    const skippedBlocks = [];

    for (const block of splitQueryBlocks(queryText)) {
      try {
        new Query(language, block);
        validBlocks.push(block);
      } catch (blockError) {
        skippedBlocks.push({
          block,
          reason: blockError?.message || String(blockError),
        });
      }
    }

    if (!validBlocks.length) {
      throw initialError;
    }

    if (typeof console !== 'undefined' && skippedBlocks.length) {
      console.warn(
        `[tree-sitter] ${languageId} highlights query contains incompatible blocks; skipped ${skippedBlocks.length} block(s).`,
        skippedBlocks.map(({ block, reason }) => ({
          reason,
          preview: block.split('\n').slice(0, 3).join(' '),
        })),
      );
    }

    return new Query(language, validBlocks.join('\n\n'));
  }
};

/**
 * 加载指定语言的 tree-sitter 资源（parser、language、query）。
 * 结果按 languageId 缓存，避免重复初始化。
 */
const loadLanguageResources = async (languageId) => {
  if (resourcesCache.has(languageId)) {
    return resourcesCache.get(languageId);
  }

  const loader = (async () => {
    await initRuntime();

    const manifest = await fetchLanguageManifest(languageId);
    const parser = new Parser();
    const language = await Language.load(
      resolveLanguageAssetUrl(languageId, manifest.parser_wasm || manifest.parser_wasm_file_name),
    );
    const queryText = await fetch(
      resolveLanguageAssetUrl(languageId, manifest.highlights_query),
    ).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load highlights query for ${languageId}`);
      }
      return response.text();
    });

    parser.setLanguage(language);
    const query = buildQuerySafely(language, queryText, languageId);

    return {
      parser,
      query,
    };
  })();

  resourcesCache.set(
    languageId,
    loader.catch((error) => {
      resourcesCache.delete(languageId);
      throw error;
    }),
  );
  return resourcesCache.get(languageId);
};

/**
 * 创建基于 tree-sitter 的 CodeMirror 语法高亮扩展。
 *
 * @param {string} languageId - 语言标识，如 'oml'、'wpl'
 * @returns {Array} [decorations, plugin] 扩展数组
 */
export const createTreeSitterHighlightExtension = (languageId) => {
  const setDecorations = StateEffect.define();

  const decorations = StateField.define({
    create() {
      return Decoration.none;
    },
    update(value, tr) {
      for (const effect of tr.effects) {
        if (effect.is(setDecorations)) {
          return effect.value;
        }
      }
      if (tr.docChanged) {
        return value.map(tr.changes);
      }
      return value;
    },
    provide: (field) => EditorView.decorations.from(field),
  });

  const plugin = ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.destroyed = false;
        this.requestId = 0;
        void this.recompute(view);
      }

      update(update) {
        if (update.docChanged) {
          void this.recompute(update.view);
        }
      }

      destroy() {
        this.destroyed = true;
      }

      async recompute(view) {
        const requestId = (this.requestId += 1);

        try {
          const { parser, query } = await loadLanguageResources(languageId);
          if (this.destroyed || requestId !== this.requestId) {
            return;
          }

          const tree = parser.parse(view.state.doc.toString());
          const captures = query.captures(tree.rootNode);
          const marks = captures
            .map((capture) => {
              const className = classForCapture(languageId, capture.name);
              if (!className || capture.node.startIndex === capture.node.endIndex) {
                return null;
              }
              return Decoration.mark({ class: className }).range(
                capture.node.startIndex,
                capture.node.endIndex,
              );
            })
            .filter(Boolean);

          if (this.destroyed || requestId !== this.requestId) {
            return;
          }

          view.dispatch({
            effects: setDecorations.of(Decoration.set(marks, true)),
          });
        } catch (error) {
          if (this.destroyed || requestId !== this.requestId) {
            return;
          }

          view.dispatch({
            effects: setDecorations.of(Decoration.none),
          });
        }
      }
    },
  );

  return [decorations, plugin];
};
