/**
 * Tree-sitter 语言资产管理模块。
 *
 * 职责：
 * - 根据 languageId 加载编辑器资产清单（asset-manifest.json）；
 * - 解析语言资源的完整 URL；
 * - 加载补全 JSON bundle。
 *
 * 资源路径约定：
 * /tree-sitter/languages/{languageId}/editor/asset-manifest.json
 */

const manifestCache = new Map();
const bundleCache = new Map();

/** 根据 languageId 返回语言根路径。 */
const toLanguageRoot = (languageId) => `/tree-sitter/languages/${languageId}/`;

/**
 * 加载指定语言的编辑器资产清单。
 *
 * @param {string} languageId - 语言标识，如 'oml'、'wpl'
 * @returns {Promise<Object>} 清单对象，包含 parser_wasm、highlights_query 等字段
 */
export const fetchLanguageManifest = async (languageId) => {
  if (!languageId) {
    throw new Error('languageId is required');
  }

  if (manifestCache.has(languageId)) {
    return manifestCache.get(languageId);
  }

  const loader = (async () => {
    const response = await fetch(`${toLanguageRoot(languageId)}editor/asset-manifest.json`);
    if (!response.ok) {
      throw new Error(`Failed to load asset manifest for ${languageId}`);
    }
    return response.json();
  })();

  manifestCache.set(
    languageId,
    loader.catch((error) => {
      manifestCache.delete(languageId);
      throw error;
    }),
  );
  return manifestCache.get(languageId);
};

/**
 * 解析语言资产的完整 URL。
 *
 * @param {string} languageId - 语言标识
 * @param {string} relativePath - manifest 中的相对路径
 * @returns {string|null} 完整 URL，relativePath 为空时返回 null
 */
export const resolveLanguageAssetUrl = (languageId, relativePath) => {
  if (!relativePath) {
    return null;
  }
  return new URL(relativePath, window.location.origin + toLanguageRoot(languageId)).toString();
};

/**
 * 加载指定语言的补全 JSON bundle。
 *
 * @param {string} languageId - 语言标识
 * @returns {Promise<Object|null>} 补全数据，manifest 未配置 completion_bundle 时返回 null
 */
export const fetchCompletionBundle = async (languageId) => {
  if (!languageId) {
    return null;
  }

  if (bundleCache.has(languageId)) {
    return bundleCache.get(languageId);
  }

  const loader = (async () => {
    const manifest = await fetchLanguageManifest(languageId);
    if (!manifest?.completion_bundle) {
      return null;
    }

    const response = await fetch(resolveLanguageAssetUrl(languageId, manifest.completion_bundle));
    if (!response.ok) {
      throw new Error(`Failed to load completion bundle for ${languageId}`);
    }
    return response.json();
  })();

  bundleCache.set(
    languageId,
    loader.catch((error) => {
      bundleCache.delete(languageId);
      throw error;
    }),
  );
  return bundleCache.get(languageId);
};
