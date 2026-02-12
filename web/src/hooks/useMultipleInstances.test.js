import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  generateUUID, 
  generateDefaultName, 
  createDefaultInstance,
  DEFAULT_INSTANCE_STRUCTURE 
} from './useMultipleInstances';

describe('useMultipleInstances - Core Data Structures', () => {
  beforeEach(() => {
    // 重置随机数生成器的种子（如果需要）
    vi.clearAllMocks();
  });

  describe('DEFAULT_INSTANCE_STRUCTURE', () => {
    it('应该包含所有必需的字段', () => {
      const requiredFields = [
        'id',
        'name',
        'log',
        'wpl',
        'oml',
        'parseResult',
        'parseError',
        'transformParseResult',
        'transformResult',
        'transformError',
        'selectedExample',
        'createdAt',
        'updatedAt',
      ];

      requiredFields.forEach(field => {
        expect(DEFAULT_INSTANCE_STRUCTURE).toHaveProperty(field);
      });
    });

    it('应该有正确的字段数量', () => {
      const fieldCount = Object.keys(DEFAULT_INSTANCE_STRUCTURE).length;
      expect(fieldCount).toBe(13);
    });

    it('应该有正确的默认值类型', () => {
      expect(typeof DEFAULT_INSTANCE_STRUCTURE.id).toBe('string');
      expect(typeof DEFAULT_INSTANCE_STRUCTURE.name).toBe('string');
      expect(typeof DEFAULT_INSTANCE_STRUCTURE.log).toBe('string');
      expect(typeof DEFAULT_INSTANCE_STRUCTURE.wpl).toBe('string');
      expect(typeof DEFAULT_INSTANCE_STRUCTURE.oml).toBe('string');
      expect(DEFAULT_INSTANCE_STRUCTURE.parseResult).toBeNull();
      expect(DEFAULT_INSTANCE_STRUCTURE.parseError).toBeNull();
      expect(DEFAULT_INSTANCE_STRUCTURE.transformParseResult).toBeNull();
      expect(DEFAULT_INSTANCE_STRUCTURE.transformResult).toBeNull();
      expect(DEFAULT_INSTANCE_STRUCTURE.transformError).toBeNull();
      expect(DEFAULT_INSTANCE_STRUCTURE.selectedExample).toBeNull();
      expect(typeof DEFAULT_INSTANCE_STRUCTURE.createdAt).toBe('number');
      expect(typeof DEFAULT_INSTANCE_STRUCTURE.updatedAt).toBe('number');
    });
  });

  describe('generateUUID', () => {
    it('应该生成符合 UUID v4 格式的字符串', () => {
      const uuid = generateUUID();
      // UUID v4 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('应该生成唯一的 UUID', () => {
      const uuids = new Set();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        uuids.add(generateUUID());
      }

      // 所有生成的 UUID 应该都是唯一的
      expect(uuids.size).toBe(iterations);
    });

    it('应该生成长度为 36 的字符串（包含连字符）', () => {
      const uuid = generateUUID();
      expect(uuid.length).toBe(36);
    });

    it('应该在正确的位置包含连字符', () => {
      const uuid = generateUUID();
      expect(uuid[8]).toBe('-');
      expect(uuid[13]).toBe('-');
      expect(uuid[18]).toBe('-');
      expect(uuid[23]).toBe('-');
    });
  });

  describe('generateDefaultName', () => {
    it('应该生成正确格式的默认名称', () => {
      expect(generateDefaultName(1)).toBe('实例 1');
      expect(generateDefaultName(2)).toBe('实例 2');
      expect(generateDefaultName(10)).toBe('实例 10');
    });

    it('应该处理不同的数字输入', () => {
      expect(generateDefaultName(0)).toBe('实例 0');
      expect(generateDefaultName(999)).toBe('实例 999');
    });

    it('应该返回字符串类型', () => {
      const name = generateDefaultName(1);
      expect(typeof name).toBe('string');
    });

    it('应该包含"实例"前缀', () => {
      const name = generateDefaultName(5);
      expect(name).toContain('实例');
    });
  });

  describe('createDefaultInstance', () => {
    it('应该创建包含所有必需字段的实例', () => {
      const instance = createDefaultInstance(1);
      
      expect(instance).toHaveProperty('id');
      expect(instance).toHaveProperty('name');
      expect(instance).toHaveProperty('log');
      expect(instance).toHaveProperty('wpl');
      expect(instance).toHaveProperty('oml');
      expect(instance).toHaveProperty('parseResult');
      expect(instance).toHaveProperty('parseError');
      expect(instance).toHaveProperty('transformParseResult');
      expect(instance).toHaveProperty('transformResult');
      expect(instance).toHaveProperty('transformError');
      expect(instance).toHaveProperty('selectedExample');
      expect(instance).toHaveProperty('createdAt');
      expect(instance).toHaveProperty('updatedAt');
    });

    it('应该生成唯一的 ID', () => {
      const instance1 = createDefaultInstance(1);
      const instance2 = createDefaultInstance(2);
      
      expect(instance1.id).not.toBe(instance2.id);
    });

    it('应该使用提供的实例编号生成名称', () => {
      const instance1 = createDefaultInstance(1);
      const instance5 = createDefaultInstance(5);
      
      expect(instance1.name).toBe('实例 1');
      expect(instance5.name).toBe('实例 5');
    });

    it('应该使用默认编号 1 当没有提供参数时', () => {
      const instance = createDefaultInstance();
      expect(instance.name).toBe('实例 1');
    });

    it('应该初始化空的日志内容', () => {
      const instance = createDefaultInstance(1);
      expect(instance.log).toBe('');
    });

    it('应该初始化默认的 WPL 规则', () => {
      const instance = createDefaultInstance(1);
      expect(instance.wpl).toContain('package /path/');
      expect(instance.wpl).toContain('rule name');
    });

    it('应该初始化默认的 OML 规则', () => {
      const instance = createDefaultInstance(1);
      expect(instance.oml).toContain('name : /example');
      expect(instance.oml).toContain('rule : /path/name/*');
    });

    it('应该将所有结果字段初始化为 null', () => {
      const instance = createDefaultInstance(1);
      
      expect(instance.parseResult).toBeNull();
      expect(instance.parseError).toBeNull();
      expect(instance.transformParseResult).toBeNull();
      expect(instance.transformResult).toBeNull();
      expect(instance.transformError).toBeNull();
      expect(instance.selectedExample).toBeNull();
    });

    it('应该设置 createdAt 和 updatedAt 时间戳', () => {
      const beforeCreate = Date.now();
      const instance = createDefaultInstance(1);
      const afterCreate = Date.now();
      
      expect(instance.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(instance.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(instance.updatedAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(instance.updatedAt).toBeLessThanOrEqual(afterCreate);
    });

    it('应该创建的实例 createdAt 和 updatedAt 相同', () => {
      const instance = createDefaultInstance(1);
      expect(instance.createdAt).toBe(instance.updatedAt);
    });
  });
});

describe('useMultipleInstances - LocalStorage Functions', () => {
  let mockLocalStorage;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {
      data: {},
      getItem(key) {
        return this.data[key] || null;
      },
      setItem(key, value) {
        this.data[key] = value;
      },
      clear() {
        this.data = {};
      }
    };
    global.localStorage = mockLocalStorage;
  });

  describe('saveToStorage', () => {
    it('应该成功保存数据到 localStorage', async () => {
      const { saveToStorage } = await import('./useMultipleInstances');
      const instances = [createDefaultInstance(1), createDefaultInstance(2)];
      const result = saveToStorage(instances, 0);
      
      expect(result).toBe(true);
      expect(mockLocalStorage.data['warpparse_multiple_instances']).toBeDefined();
    });

    it('应该保存包含版本号的数据', async () => {
      const { saveToStorage } = await import('./useMultipleInstances');
      const instances = [createDefaultInstance(1)];
      saveToStorage(instances, 0);
      
      const stored = JSON.parse(mockLocalStorage.data['warpparse_multiple_instances']);
      expect(stored.version).toBe('1.0.0');
    });

    it('应该保存包含时间戳的数据', async () => {
      const { saveToStorage } = await import('./useMultipleInstances');
      const instances = [createDefaultInstance(1)];
      const beforeSave = Date.now();
      saveToStorage(instances, 0);
      const afterSave = Date.now();
      
      const stored = JSON.parse(mockLocalStorage.data['warpparse_multiple_instances']);
      expect(stored.lastSaved).toBeGreaterThanOrEqual(beforeSave);
      expect(stored.lastSaved).toBeLessThanOrEqual(afterSave);
    });

    it('应该保存完整的实例列表', async () => {
      const { saveToStorage } = await import('./useMultipleInstances');
      const instances = [createDefaultInstance(1), createDefaultInstance(2)];
      saveToStorage(instances, 1);
      
      const stored = JSON.parse(mockLocalStorage.data['warpparse_multiple_instances']);
      expect(stored.instances).toHaveLength(2);
      expect(stored.activeInstanceIndex).toBe(1);
    });
  });

  describe('loadFromStorage', () => {
    it('应该从 localStorage 加载数据', async () => {
      const { saveToStorage, loadFromStorage } = await import('./useMultipleInstances');
      const instances = [createDefaultInstance(1), createDefaultInstance(2)];
      saveToStorage(instances, 0);
      
      const loaded = loadFromStorage();
      expect(loaded).toBeDefined();
      expect(loaded.instances).toHaveLength(2);
      expect(loaded.activeInstanceIndex).toBe(0);
    });

    it('应该在空数据时返回 null', async () => {
      const { loadFromStorage } = await import('./useMultipleInstances');
      mockLocalStorage.clear();
      
      const loaded = loadFromStorage();
      expect(loaded).toBeNull();
    });

    it('应该在数据损坏时返回 null', async () => {
      const { loadFromStorage } = await import('./useMultipleInstances');
      mockLocalStorage.setItem('warpparse_multiple_instances', 'invalid json');
      
      const loaded = loadFromStorage();
      expect(loaded).toBeNull();
    });

    it('应该在数据格式无效时返回 null', async () => {
      const { loadFromStorage } = await import('./useMultipleInstances');
      mockLocalStorage.setItem('warpparse_multiple_instances', JSON.stringify({ invalid: 'data' }));
      
      const loaded = loadFromStorage();
      expect(loaded).toBeNull();
    });

    it('应该验证 instances 是数组', async () => {
      const { loadFromStorage } = await import('./useMultipleInstances');
      mockLocalStorage.setItem('warpparse_multiple_instances', JSON.stringify({
        instances: 'not an array',
        activeInstanceIndex: 0
      }));
      
      const loaded = loadFromStorage();
      expect(loaded).toBeNull();
    });

    it('应该验证 activeInstanceIndex 是数字', async () => {
      const { loadFromStorage } = await import('./useMultipleInstances');
      mockLocalStorage.setItem('warpparse_multiple_instances', JSON.stringify({
        instances: [],
        activeInstanceIndex: 'not a number'
      }));
      
      const loaded = loadFromStorage();
      expect(loaded).toBeNull();
    });
  });

  describe('migrateData', () => {
    it('应该为无版本数据添加版本号', async () => {
      const { migrateData } = await import('./useMultipleInstances');
      const oldData = {
        instances: [{ id: '1', name: 'Test' }],
        activeInstanceIndex: 0
      };
      
      const migrated = migrateData(oldData);
      expect(migrated.version).toBe('1.0.0');
    });

    it('应该为实例添加缺失的时间戳', async () => {
      const { migrateData } = await import('./useMultipleInstances');
      const oldData = {
        instances: [{ id: '1', name: 'Test' }],
        activeInstanceIndex: 0
      };
      
      const migrated = migrateData(oldData);
      expect(migrated.instances[0].createdAt).toBeDefined();
      expect(migrated.instances[0].updatedAt).toBeDefined();
    });

    it('应该保留已有版本的数据', async () => {
      const { migrateData } = await import('./useMultipleInstances');
      const data = {
        instances: [{ id: '1', name: 'Test', createdAt: 123, updatedAt: 456 }],
        activeInstanceIndex: 0,
        version: '1.0.0'
      };
      
      const migrated = migrateData(data);
      expect(migrated).toEqual(data);
    });

    it('应该处理空实例数组', async () => {
      const { migrateData } = await import('./useMultipleInstances');
      const oldData = {
        instances: [],
        activeInstanceIndex: 0
      };
      
      const migrated = migrateData(oldData);
      expect(migrated.instances).toEqual([]);
      expect(migrated.version).toBe('1.0.0');
    });
  });

  describe('localStorage round-trip', () => {
    it('应该能够保存和加载相同的数据', async () => {
      const { saveToStorage, loadFromStorage } = await import('./useMultipleInstances');
      const instances = [
        createDefaultInstance(1),
        createDefaultInstance(2),
        createDefaultInstance(3)
      ];
      const activeIndex = 1;
      
      saveToStorage(instances, activeIndex);
      const loaded = loadFromStorage();
      
      expect(loaded.instances).toHaveLength(instances.length);
      expect(loaded.activeInstanceIndex).toBe(activeIndex);
      
      // 验证实例数据完整性
      loaded.instances.forEach((loadedInstance, i) => {
        expect(loadedInstance.id).toBe(instances[i].id);
        expect(loadedInstance.name).toBe(instances[i].name);
        expect(loadedInstance.log).toBe(instances[i].log);
        expect(loadedInstance.wpl).toBe(instances[i].wpl);
        expect(loadedInstance.oml).toBe(instances[i].oml);
      });
    });
  });
});
