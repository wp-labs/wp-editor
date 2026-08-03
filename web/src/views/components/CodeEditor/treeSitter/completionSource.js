/**
 * Tree-sitter 补全源模块。
 *
 * 提供通用的 CodeMirror 补全源工厂函数，
 * 从语言 bundle JSON 动态加载补全数据。
 *
 * 使用方式：
 *   const source = createBundleCompletionSource('oml', 'zh-CN');
 *   autocompletion({ override: [source] })
 */

import { snippetCompletion } from '@codemirror/autocomplete';
import { fetchCompletionBundle } from './assetRegistry';

const optionsCache = new Map();
const regexCache = new Map();

/**
 * 将 bundle JSON 中的补全数据转换为 CodeMirror 补全选项。
 *
 * @param {Object} bundle - 补全 bundle 对象
 * @param {string} lang - 语言代码，如 'zh-CN'、'en-US'
 * @returns {Array} CodeMirror Completion 对象数组
 */
export const buildCompletionOptionsFromBundle = (bundle, lang) => {
  const items = bundle?.locales?.[lang] || bundle?.locales?.['zh-CN'] || [];
  return items.map((item) =>
    snippetCompletion(item.insert_text, {
      label: item.label,
      type: item.type,
      detail: item.detail,
      info: item.info,
    }),
  );
};

/**
 * 获取补全触发词正则（从 bundle 中读取，支持缓存）。
 */
const getValidFor = (languageId, bundle) => {
  const cacheKey = `${languageId}:${bundle?.valid_for || ''}`;
  if (regexCache.has(cacheKey)) {
    return regexCache.get(cacheKey);
  }

  const validFor = new RegExp(bundle?.valid_for || '[\\w/:\\[\\]]+|\\|');
  regexCache.set(cacheKey, validFor);
  return validFor;
};

/**
 * 获取指定语言的补全选项（支持缓存）。
 */
const getCompletionOptions = async (languageId, lang) => {
  const cacheKey = `${languageId}:${lang}`;
  if (optionsCache.has(cacheKey)) {
    return optionsCache.get(cacheKey);
  }

  const loader = (async () => {
    const bundle = await fetchCompletionBundle(languageId);
    if (!bundle) {
      return { bundle: null, options: [] };
    }

    return {
      bundle,
      options: buildCompletionOptionsFromBundle(bundle, lang),
    };
  })();

  optionsCache.set(cacheKey, loader);
  return loader;
};

/**
 * 创建基于 JSON bundle 的 CodeMirror 补全源。
 *
 * @param {string} languageId - 语言标识
 * @param {string} lang - 语言代码，如 'zh-CN'
 * @returns {Function} CodeMirror 补全源函数
 */
export const createBundleCompletionSource = (languageId, lang) => async (context) => {
  const { bundle, options } = await getCompletionOptions(languageId, lang);
  if (!bundle) {
    return null;
  }

  const validFor = getValidFor(languageId, bundle);
  const word = context.matchBefore(validFor);
  const pipe = context.matchBefore(/\|/);

  if (!word && !pipe && !context.explicit) {
    return null;
  }

  return {
    from: (pipe || word)?.from ?? context.pos,
    options,
    validFor,
  };
};
