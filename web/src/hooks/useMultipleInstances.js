import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * useMultipleInstances Hook
 * 管理多个编辑器实例的状态和操作
 */

// 最大实例数量限制
const MAX_INSTANCES = 10;

// localStorage 存储键名
const DEFAULT_STORAGE_KEY = 'warpparse_multiple_instances';

// 当前数据版本
const CURRENT_VERSION = '1.0.0';

/**
 * 生成 UUID
 * @returns {string} UUID 字符串
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 生成默认实例名称
 * @param {number} number - 实例编号
 * @param {Function} t - i18n translation function (optional, for backward compatibility)
 * @returns {string} 默认名称，格式为 "实例 N" 或 "Instance N"
 */
export function generateDefaultName(number, t = null) {
  if (t) {
    const translated = t('multipleInstances.defaultName', { number });
    return translated.replace('{{number}}', number).replace('{number}', number);
  }
  // Fallback for tests and backward compatibility
  return `实例 ${number}`;
}

/**
 * 创建默认实例数据结构
 * @param {number} instanceNumber - 实例编号，用于生成默认名称
 * @param {Function} t - i18n translation function (optional)
 * @returns {Object} 默认实例对象
 */
export function createDefaultInstance(instanceNumber = 1, t = null) {
  return {
    id: generateUUID(),
    name: generateDefaultName(instanceNumber, t),
    log: '',
    wpl: 'package /path/ {\n    rule name {\n        ()\n    }\n}',
    oml: 'name : /example \nrule : /path/name/*\n---\n* = take();',
    parseResult: null,
    parseError: null,
    transformParseResult: null,
    transformResult: null,
    transformError: null,
    selectedExample: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 默认实例数据结构定义
 * 这是一个模板，展示了实例对象的完整结构
 */
export const DEFAULT_INSTANCE_STRUCTURE = {
  id: '',                          // 唯一标识符
  name: '',                        // 实例名称
  log: '',                         // 日志内容
  wpl: '',                         // WPL规则
  oml: '',                         // OML规则
  parseResult: null,               // 解析结果
  parseError: null,                // 解析错误
  transformParseResult: null,      // 转换解析结果
  transformResult: null,           // 转换结果
  transformError: null,            // 转换错误
  selectedExample: null,           // 选中的示例
  createdAt: 0,                    // 创建时间戳
  updatedAt: 0,                    // 更新时间戳
};

/**
 * 数据迁移函数
 * 将旧版本数据迁移到当前版本
 * @param {Object} data - 存储的数据
 * @returns {Object} 迁移后的数据
 */
export function migrateData(data) {
  if (!data.version) {
    // 从无版本迁移到 v1.0.0
    return {
      ...data,
      version: CURRENT_VERSION,
      instances: (data.instances || []).map(instance => ({
        ...instance,
        createdAt: instance.createdAt || Date.now(),
        updatedAt: instance.updatedAt || Date.now(),
      })),
    };
  }
  return data;
}

/**
 * 从 localStorage 加载数据
 * @returns {Object|null} 加载的数据或 null
 */
export function loadFromStorage(storageKey = DEFAULT_STORAGE_KEY) {
  try {
    const stored = localStorage.getItem(storageKey);
    
    // 处理空数据情况
    if (!stored) {
      return null;
    }

    // 解析 JSON 数据
    const data = JSON.parse(stored);

    // 验证数据格式
    if (!data.instances || !Array.isArray(data.instances)) {
      console.error('Invalid data format: instances is not an array');
      return null;
    }

    if (typeof data.activeInstanceIndex !== 'number') {
      console.error('Invalid data format: activeInstanceIndex is not a number');
      return null;
    }

    // 数据迁移
    const migratedData = migrateData(data);

    return migratedData;
  } catch (error) {
    // 处理解析错误和数据损坏情况
    console.error('Failed to load data from localStorage:', error);
    return null;
  }
}

/**
 * 保存数据到 localStorage
 * @param {Array} instances - 实例列表
 * @param {number} activeInstanceIndex - 激活实例索引
 * @returns {boolean} 是否保存成功
 */
export function saveToStorage(instances, activeInstanceIndex, storageKey = DEFAULT_STORAGE_KEY) {
  try {
    const data = {
      instances,
      activeInstanceIndex,
      version: CURRENT_VERSION,
      lastSaved: Date.now(),
    };

    const serialized = JSON.stringify(data);
    localStorage.setItem(storageKey, serialized);
    return true;
  } catch (error) {
    // 处理存储错误（如存储已满）
    console.error('Failed to save data to localStorage:', error);
    return false;
  }
}

/**
 * useMultipleInstances Hook
 * 管理多个编辑器实例
 * @returns {Object} Hook 返回值
 */
export function useMultipleInstances(options = {}) {
  const { t } = useTranslation();
  const storageKey = options.storageKey || DEFAULT_STORAGE_KEY;
  const createInstance = useCallback((instanceNumber) => {
    if (typeof options.createDefaultInstance === 'function') {
      return options.createDefaultInstance(instanceNumber, t);
    }
    return createDefaultInstance(instanceNumber, t);
  }, [options.createDefaultInstance, t]);
  
  // 状态管理：实例列表和激活索引
  // 初始化时从 localStorage 加载数据
  const normalizeInstances = useCallback((list) => {
    return (list || []).map((instance, index) => {
      const name = instance?.name || '';
      if (typeof options.normalizeName === 'function') {
        const normalized = options.normalizeName(instance, index, t);
        if (normalized && normalized !== name) {
          return {
            ...instance,
            name: normalized,
          };
        }
      }
      if (name.includes('{number}') || name.includes('{{number}}')) {
        return {
          ...instance,
          name: generateDefaultName(index + 1, t),
        };
      }
      if (/^(实例|Instance)\s*\d+$/.test(name)) {
        return {
          ...instance,
          name: generateDefaultName(index + 1, t),
        };
      }
      return instance;
    });
  }, [options.normalizeName, t]);

  const [instances, setInstances] = useState(() => {
    const loaded = loadFromStorage(storageKey);
    if (loaded && loaded.instances && loaded.instances.length > 0) {
      return normalizeInstances(loaded.instances);
    }
    return [createInstance(1)];
  });

  useEffect(() => {
    setInstances((prev) => {
      const next = normalizeInstances(prev);
      if (next.length !== prev.length) {
        return next;
      }
      for (let i = 0; i < next.length; i += 1) {
        if (next[i] !== prev[i]) {
          return next;
        }
      }
      return prev;
    });
  }, [normalizeInstances]);

  const [activeInstanceIndex, setActiveInstanceIndex] = useState(() => {
    const loaded = loadFromStorage(storageKey);
    if (loaded && typeof loaded.activeInstanceIndex === 'number') {
      // 确保索引在有效范围内
      const maxIndex = (loaded.instances?.length || 1) - 1;
      return Math.min(Math.max(0, loaded.activeInstanceIndex), maxIndex);
    }
    return 0;
  });

  // 使用 ref 来存储防抖定时器
  const saveTimeoutRef = useRef(null);

  // 计算当前激活的实例
  const activeInstance = useMemo(() => {
    return instances[activeInstanceIndex] || instances[0];
  }, [instances, activeInstanceIndex]);

  // 计算是否可以添加新实例
  const canAddInstance = useMemo(() => {
    return instances.length < MAX_INSTANCES;
  }, [instances.length]);

  // 实现防抖保存机制
  // 监听实例数据变化，使用 setTimeout 实现500ms防抖
  useEffect(() => {
    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 设置新的定时器，500ms后保存
    saveTimeoutRef.current = setTimeout(() => {
      saveToStorage(instances, activeInstanceIndex, storageKey);
    }, 500);

    // 清理函数
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [instances, activeInstanceIndex, storageKey]);

  // 添加新实例
  const addInstance = useCallback(() => {
    if (!canAddInstance) {
      return;
    }

    const newInstance = createInstance(instances.length + 1);
    setInstances(prev => [...prev, newInstance]);
  }, [canAddInstance, instances.length, createInstance]);

  // 删除实例
  const removeInstance = useCallback((index) => {
    // 验证索引有效性
    if (index < 0 || index >= instances.length) {
      return;
    }

    // 如果删除最后一个实例，创建新的默认实例
    if (instances.length === 1) {
      const newInstance = createInstance(1);
      setInstances([newInstance]);
      setActiveInstanceIndex(0);
      return;
    }

    // 从列表中移除指定索引的实例
    setInstances(prev => prev.filter((_, i) => i !== index));

    // 如果删除的是激活实例，自动切换到索引0
    if (index === activeInstanceIndex) {
      setActiveInstanceIndex(0);
    } else if (index < activeInstanceIndex) {
      // 如果删除的实例在激活实例之前，需要调整激活索引
      setActiveInstanceIndex(prev => prev - 1);
    }
  }, [instances.length, activeInstanceIndex, t]);

  // 切换实例
  const switchInstance = useCallback((index) => {
    // 验证目标索引有效性
    if (index < 0 || index >= instances.length) {
      return;
    }

    // 更新 activeInstanceIndex
    setActiveInstanceIndex(index);
  }, [instances.length]);

  // 重命名实例
  const renameInstance = useCallback((index, name) => {
    // 验证索引有效性
    if (index < 0 || index >= instances.length) {
      return;
    }

    setInstances(prev => prev.map((instance, i) => {
      if (i === index) {
        // 处理空字符串情况（恢复默认名称）
        const newName = name.trim() === '' ? generateDefaultName(index + 1, t) : name;
        return {
          ...instance,
          name: newName,
          updatedAt: Date.now(),
        };
      }
      return instance;
    }));
  }, [instances.length, t]);

  // 更新激活实例
  const updateActiveInstance = useCallback((updates) => {
    setInstances(prev => prev.map((instance, i) => {
      if (i === activeInstanceIndex) {
        // 只更新激活实例的指定字段，并更新 updatedAt 时间戳
        return {
          ...instance,
          ...updates,
          updatedAt: Date.now(),
        };
      }
      return instance;
    }));
  }, [activeInstanceIndex]);

  // 清空激活实例
  const clearActiveInstance = useCallback(() => {
    setInstances(prev => prev.map((instance, i) => {
      if (i === activeInstanceIndex) {
        // 重置激活实例为默认值，但保留实例ID和名称
        const defaultInstance = createInstance(1);
        return {
          ...defaultInstance,
          id: instance.id,
          name: instance.name,
          updatedAt: Date.now(),
        };
      }
      return instance;
    }));
  }, [activeInstanceIndex, createInstance]);

  // 清空所有实例
  const clearAllInstances = useCallback(() => {
    // 删除所有实例，创建一个新的默认实例
    const newInstance = createInstance(1);
    setInstances([newInstance]);
    setActiveInstanceIndex(0);
  }, [createInstance]);

  const restoreFromStorage = useCallback(() => {
    const loaded = loadFromStorage(storageKey);
    if (loaded && loaded.instances && loaded.instances.length > 0) {
      setInstances(normalizeInstances(loaded.instances));
      const maxIndex = loaded.instances.length - 1;
      const nextIndex = typeof loaded.activeInstanceIndex === 'number'
        ? Math.min(Math.max(0, loaded.activeInstanceIndex), maxIndex)
        : 0;
      setActiveInstanceIndex(nextIndex);
      return;
    }
    setInstances([createInstance(1)]);
    setActiveInstanceIndex(0);
  }, [storageKey, createInstance, normalizeInstances]);

  return {
    instances,
    activeInstanceIndex,
    activeInstance,
    maxInstances: MAX_INSTANCES,
    canAddInstance,
    addInstance,
    removeInstance,
    switchInstance,
    renameInstance,
    updateActiveInstance,
    clearActiveInstance,
    clearAllInstances,
    saveToStorage: () => saveToStorage(instances, activeInstanceIndex, storageKey),
    loadFromStorage: () => loadFromStorage(storageKey),
    restoreFromStorage,
  };
}
