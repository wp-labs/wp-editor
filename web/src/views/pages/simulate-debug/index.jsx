import { Table, message } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  convertRecord,
  fetchDebugExamples,
  parseLogs,
  wplCodeFormat,
  omlCodeFormat,
  base64Decode,
} from '@/services/debug';
import CodeEditor from '@/views/components/CodeEditor';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useMultipleInstances, createDefaultInstance } from '@/hooks/useMultipleInstances';
import InstanceSelector from '@/views/components/InstanceSelector';

/**
 * Wp Editor
 * 功能：
 * 1. 日志解析
 * 2. 记录转换
 * 3. 知识库状态查询
 * 对应原型：pages/views/simulate-debug/simulate-parse.html
 */

// 默认示例列表，保存在前端，便于无网络或后端无数据时直接展示
const DEFAULT_EXAMPLES = [
  {
    name: 'nginx',
    wpl_code:
      'package /nginx/ {\n    rule nginx {\n        (\n            ip:sip,2*_,chars:timestamp<[,]>,http/request",chars:status,chars:size,chars:referer",http/agent",_"\n        )\n    }\n}\n',
    oml_code: '',
    sample_data:
      '180.57.30.148 - - [21/Jan/2025:01:40:02 +0800] "GET /nginx-logo.png HTTP/1.1" 500 368 "<http://207.131.38.110/>" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36" "-"',
  },
];

const buildTypedName = (i18nT, type, number) => {
  const prefix = i18nT(`multipleInstances.type.${type}`);
  const useNoSpace = type === 'log' && /[\u4e00-\u9fff]/.test(prefix);
  const spacer = useNoSpace ? '' : ' ';
  return `${prefix}${spacer}${number}`;
};

const shouldNormalizeTypedName = (name) => {
  if (!name) return true;
  if (name.includes('{number}') || name.includes('{{number}}')) return true;
  if (/^(实例|Instance)\s*\d+$/.test(name)) return true;
  if (/^(日志)\d+$/.test(name)) return true;
  if (/^(log|wpl|oml)\s*\d+$/i.test(name)) return true;
  return false;
};

const createLogInstance = (instanceNumber, i18nT) => {
  const instance = createDefaultInstance(instanceNumber, i18nT);
  return {
    ...instance,
    name: buildTypedName(i18nT, 'log', instanceNumber),
    wpl: '',
    oml: '',
  };
};

const createWplInstance = (instanceNumber, i18nT) => {
  const instance = createDefaultInstance(instanceNumber, i18nT);
  return {
    ...instance,
    name: buildTypedName(i18nT, 'wpl', instanceNumber),
    log: '',
    oml: '',
  };
};

const createOmlInstance = (instanceNumber, i18nT) => {
  const instance = createDefaultInstance(instanceNumber, i18nT);
  return {
    ...instance,
    name: buildTypedName(i18nT, 'oml', instanceNumber),
    log: '',
    wpl: '',
  };
};

function SimulateDebugPage() {
  const { t } = useTranslation();
  
  // 工作区管理
  const {
    workspaceMode,
    workspaceData,
    saveWorkspace,
    updateWorkspace,
    clearWorkspace,
    switchMode,
  } = useWorkspace();
  
  // 多实例管理（日志/WPL/OML 分离）
  const {
    instances: logInstances,
    activeInstanceIndex: activeLogIndex,
    activeInstance: activeLogInstance,
    addInstance: addLogInstance,
    removeInstance: removeLogInstance,
    switchInstance: switchLogInstance,
    renameInstance: renameLogInstance,
    updateActiveInstance: updateActiveLogInstance,
    clearAllInstances: clearAllLogInstances,
    saveToStorage: saveLogInstances,
    restoreFromStorage: restoreLogInstances,
  } = useMultipleInstances({
    storageKey: 'warpparse_multiple_instances_log',
    createDefaultInstance: createLogInstance,
    normalizeName: (instance, index, i18nT) => (
      shouldNormalizeTypedName(instance?.name) ? buildTypedName(i18nT, 'log', index + 1) : null
    ),
  });

  const {
    instances: wplInstances,
    activeInstanceIndex: activeWplIndex,
    activeInstance: activeWplInstance,
    addInstance: addWplInstance,
    removeInstance: removeWplInstance,
    switchInstance: switchWplInstance,
    renameInstance: renameWplInstance,
    updateActiveInstance: updateActiveWplInstance,
    clearAllInstances: clearAllWplInstances,
    saveToStorage: saveWplInstances,
    restoreFromStorage: restoreWplInstances,
  } = useMultipleInstances({
    storageKey: 'warpparse_multiple_instances_wpl',
    createDefaultInstance: createWplInstance,
    normalizeName: (instance, index, i18nT) => (
      shouldNormalizeTypedName(instance?.name) ? buildTypedName(i18nT, 'wpl', index + 1) : null
    ),
  });

  const {
    instances: omlInstances,
    activeInstanceIndex: activeOmlIndex,
    activeInstance: activeOmlInstance,
    addInstance: addOmlInstance,
    removeInstance: removeOmlInstance,
    switchInstance: switchOmlInstance,
    renameInstance: renameOmlInstance,
    updateActiveInstance: updateActiveOmlInstance,
    clearAllInstances: clearAllOmlInstances,
    saveToStorage: saveOmlInstances,
    restoreFromStorage: restoreOmlInstances,
  } = useMultipleInstances({
    storageKey: 'warpparse_multiple_instances_oml',
    createDefaultInstance: createOmlInstance,
    normalizeName: (instance, index, i18nT) => (
      shouldNormalizeTypedName(instance?.name) ? buildTypedName(i18nT, 'oml', index + 1) : null
    ),
  });
  
  const [activeKey, setActiveKey] = useState('parse');
  const isExamplesMode = workspaceMode === 'examples';
  
  // 示例区独立状态（避免污染工作区）
  const [exampleLog, setExampleLog] = useState('');
  const [exampleWpl, setExampleWpl] = useState('');
  const [exampleOml, setExampleOml] = useState('');
  const [exampleParseResult, setExampleParseResult] = useState(null);
  const [exampleParseError, setExampleParseError] = useState(null);
  const [exampleTransformParseResult, setExampleTransformParseResult] = useState(null);
  const [exampleTransformResult, setExampleTransformResult] = useState(null);
  const [exampleTransformError, setExampleTransformError] = useState(null);
  const [exampleSelected, setExampleSelected] = useState(null);

  // 从激活实例中提取数据（日志/WPL/OML 分离）
  const inputValue = isExamplesMode ? exampleLog : activeLogInstance.log;
  const setInputValue = (value) => (
    isExamplesMode ? setExampleLog(value) : updateActiveLogInstance({ log: value })
  );
  const ruleValue = isExamplesMode ? exampleWpl : activeWplInstance.wpl;
  const setRuleValue = (value) => (
    isExamplesMode ? setExampleWpl(value) : updateActiveWplInstance({ wpl: value })
  );
  const result = isExamplesMode ? exampleParseResult : activeLogInstance.parseResult;
  const setResult = (value) => (
    isExamplesMode ? setExampleParseResult(value) : updateActiveLogInstance({ parseResult: value })
  );
  const parseError = isExamplesMode ? exampleParseError : activeLogInstance.parseError;
  const setParseError = (value) => (
    isExamplesMode ? setExampleParseError(value) : updateActiveLogInstance({ parseError: value })
  );
  const transformOml = isExamplesMode ? exampleOml : activeOmlInstance.oml;
  const setTransformOml = (value) => (
    isExamplesMode ? setExampleOml(value) : updateActiveOmlInstance({ oml: value })
  );
  const transformParseResult = isExamplesMode ? exampleTransformParseResult : activeLogInstance.transformParseResult;
  const setTransformParseResult = (value) => (
    isExamplesMode
      ? setExampleTransformParseResult(value)
      : updateActiveLogInstance({ transformParseResult: value })
  );
  const transformResult = isExamplesMode ? exampleTransformResult : activeOmlInstance.transformResult;
  const setTransformResult = (value) => (
    isExamplesMode ? setExampleTransformResult(value) : updateActiveOmlInstance({ transformResult: value })
  );
  const transformError = isExamplesMode ? exampleTransformError : activeOmlInstance.transformError;
  const setTransformError = (value) => (
    isExamplesMode ? setExampleTransformError(value) : updateActiveOmlInstance({ transformError: value })
  );
  const selectedExample = isExamplesMode ? exampleSelected : activeLogInstance.selectedExample;
  const setSelectedExample = (value) => (
    isExamplesMode ? setExampleSelected(value) : updateActiveLogInstance({ selectedExample: value })
  );
  
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  // 解析页“显示空值”开关
  const [showEmpty, setShowEmpty] = useState(true);


  // 转换相关状态
  const [transformParseViewMode, setTransformParseViewMode] = useState('table');
  const [transformResultViewMode, setTransformResultViewMode] = useState('table');
  // 转换页"显示空值"开关（转换结果）
  const [transformResultShowEmpty, setTransformResultShowEmpty] = useState(true);
  // 转换页"显示空值"开关（解析结果）
  const [transformParseShowEmpty, setTransformParseShowEmpty] = useState(true);
  
  // 示例列表状态
  const [examples, setExamples] = useState(DEFAULT_EXAMPLES);
  const examplesOpen = true;
  const [examplesLoading, setExamplesLoading] = useState(false);
  const [examplesLoaded, setExamplesLoaded] = useState(false);
  const examplesFetchedRef = useRef(false); // 防止严格模式导致的重复请求

  const formatJsonForDisplay = (formatJson, fallbackData, postProcess) => {
    if (formatJson) {
      try {
        const parsed = JSON.parse(formatJson);
        const processed = postProcess ? postProcess(parsed) : parsed;
        return JSON.stringify(processed, null, 2);
      } catch (_e) {
        return formatJson;
      }
    }
    return JSON.stringify(fallbackData, null, 2);
  };

  /**
   * 处理测试/解析按钮点击
   * 调用服务层解析日志
   */
  const handleTest = async () => {
    setLoading(true);
    setParseError(null); // 重置错误状态
    try {
      // 调用服务层解析日志（使用对象参数）
      const response = await parseLogs({
        logs: inputValue,
        rules: ruleValue,
      });
      setResult(response);
      // 同步更新转换页的解析结果（使用原始数据用于转换，展示数据用于显示）
      if (response?.fields && response?.rawFields) {
        console.log('转换页解析结果:', response.rawFields);
        setTransformParseResult({ fields: response.rawFields, formatJson: response.formatJson });
      }
    } catch (error) {
      setParseError(error); // 将错误存储到状态中
    } finally {
      setLoading(false);
    }
  };

  /**
   * 展示示例列表，按需拉取数据（默认展开，不再折叠）
   */
  const handleToggleExamples = async () => {
    if (examplesLoading || examplesLoaded || examplesFetchedRef.current) {
      return;
    }
    examplesFetchedRef.current = true;
    // 拉取示例列表，供用户选择
    setExamplesLoading(true);
    try {
      const data = await fetchDebugExamples();
      const list = data && typeof data === 'object' ? Object.values(data) : [];
      if (Array.isArray(list) && list.length > 0) {
        setExamples(list);
        setExamplesLoaded(true);
      } else if (!examplesLoaded && (!list || list.length === 0)) {
        message.info(t('simulateDebug.examples.noAvailable'));
      }
    } catch (error) {
      message.error(`${t('simulateDebug.examples.fetchError')}：${error?.message || error}`);
    } finally {
      setExamplesLoading(false);
    }
  };

  const wplFormat = async () => {
    try {
      const response = await wplCodeFormat(ruleValue);
      const formattedWpl = response?.wpl_code || '';
      setRuleValue(formattedWpl);
      setParseError(null);
    } catch (error) {
      const detail = error?.responseData?.error?.detail;
      const baseMessage = error?.responseData?.error?.message || error?.message || error;
      const fullMessage = detail || baseMessage;
      const err = new Error(fullMessage);
      err.code = error?.code || error?.responseData?.error?.code;
      err.responseData = error?.responseData;
      setParseError(err);
      setResult(null);
    }
  };

  // 监听输入变化，在工作区模式下更新工作区数据
  useEffect(() => {
    if (workspaceMode === 'workspace') {
      // 保存所有实例到工作区
      updateWorkspace({
        logInstances: logInstances,
        logActiveIndex: activeLogIndex,
        wplInstances: wplInstances,
        wplActiveIndex: activeWplIndex,
        omlInstances: omlInstances,
        omlActiveIndex: activeOmlIndex,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logInstances, activeLogIndex, wplInstances, activeWplIndex, omlInstances, activeOmlIndex, workspaceMode]);

  // 页面加载后默认展开示例并尝试拉取
  useEffect(() => {
    handleToggleExamples();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 应用某个示例到日志、规则与 OML 输入区域，并自动尝试解析
   */
  const handleApplyExample = async exampleItem => {
    if (!exampleItem) return;
    const { sample_data: sampleData, wpl_code: wplCode, oml_code: omlCode } = exampleItem;
    
    setExampleLog(sampleData || '');
    setExampleWpl(wplCode || '');
    setExampleOml(omlCode || '');
    setExampleSelected(exampleItem.name); // 更新选中的示例

    if (!sampleData || !wplCode) {
      return;
    }

    setLoading(true);
    setExampleParseError(null);
    try {
      const response = await parseLogs({
        logs: sampleData,
        rules: wplCode,
      });
      setExampleParseResult(response);
      if (response?.fields && response?.rawFields) {
        setExampleTransformParseResult({ fields: response.rawFields, formatJson: response.formatJson });
      }
    } catch (error) {
      setExampleParseError(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 一键清空
   * 清空解析和转换的所有输入和结果
   */
  const handleClear = () => {
    if (workspaceMode === 'examples') {
      setExampleLog('');
      setExampleWpl('');
      setExampleOml('');
      setExampleParseResult(null);
      setExampleParseError(null);
      setExampleTransformParseResult(null);
      setExampleTransformResult(null);
      setExampleTransformError(null);
      setExampleSelected(null);
      return;
    }

    // 使用 clearAllInstances 清空所有实例
    clearAllLogInstances();
    clearAllWplInstances();
    clearAllOmlInstances();
    
    // 如果在工作区模式，也清空工作区数据（包括解析结果）
    if (workspaceMode === 'workspace') {
      clearWorkspace();
    }
  };
  
  /**
   * 切换工作区/示例区
   */
  const handleSwitchMode = (mode) => {
    if (workspaceMode === 'workspace' && mode === 'examples') {
      saveLogInstances();
      saveWplInstances();
      saveOmlInstances();
    }

    // 保存所有实例数据
    const currentData = {
      logInstances: logInstances,
      logActiveIndex: activeLogIndex,
      wplInstances: wplInstances,
      wplActiveIndex: activeWplIndex,
      omlInstances: omlInstances,
      omlActiveIndex: activeOmlIndex,
    };
    
    const loadedData = switchMode(mode, currentData);
    
    if (mode === 'workspace') {
      restoreLogInstances();
      restoreWplInstances();
      restoreOmlInstances();
    }

    if (mode === 'workspace' && loadedData) {
      // 切换回工作区，恢复所有实例
      // 注意：实例数据已经通过 useMultipleInstances 持久化到 localStorage
      // 这里只需要显示提示消息
      message.success(t('simulateDebug.workspace.loadSuccess'));
    } else if (mode === 'examples') {
      // 切换到示例区
      message.success(t('simulateDebug.workspace.autoSaved'));
    }
  };

  // 处理 Base64 解码按钮点击
  const handleBase64Decode = async () => {
    try {
      const response = await base64Decode(inputValue);
      const decodedValue = response || '';
      setInputValue(decodedValue);
    } catch (error) {
      message.error(`${t('simulateDebug.logData.base64Error')}`);
    }
  };

  const handleTransform = async () => {
    if (!transformOml) {
      message.warning(t('simulateDebug.omlInput.fillOmlWarning'));
      return;
    }
    setLoading(true);
    setTransformError(null);
    try {
      const response = await convertRecord({
        oml: transformOml,
        parseResult: transformParseResult,
      });
      let fieldsData = [];
      if (Array.isArray(response?.fields)) {
        fieldsData = response.fields;
      } else if (response?.fields && Array.isArray(response?.fields?.items)) {
        fieldsData = response.fields.items;
      }
      const processedFields = processFieldsForDisplay(fieldsData, response.formatJson || '');
      setTransformResult({
        fields: processedFields,
        formatJson: response.formatJson || '',
        rawFields: fieldsData,
      });
      setTransformError(null);
    } catch (error) {
      message.error(`${t('simulateDebug.convertResult.convertError')}：${error?.message || error}`);
      setTransformError(error);
      setTransformResult(null);
    } finally {
      setLoading(false);
    }
  };

  const omlFormat = async () => {
    try {
      const response = await omlCodeFormat(transformOml);
      const formattedOml = response?.oml_code || '';
      setTransformOml(formattedOml);
      setTransformError(null);
    } catch (error) {
      const detail = error?.responseData?.error?.detail;
      const baseMessage = error?.responseData?.error?.message || error?.message || error;
      const fullMessage = detail || baseMessage;
      const err = new Error(fullMessage);
      err.code = error?.code || error?.responseData?.error?.code;
      err.responseData = error?.responseData;
      setTransformError(err);
      setTransformResult(null);
    }
  };

  const menuItems = [
    { key: 'parse', label: t('simulateDebug.tabs.parse') },
    { key: 'convert', label: t('simulateDebug.tabs.convert') },
  ];

  const resultColumns = [
    { title: t('simulateDebug.table.no'), dataIndex: 'no', key: 'no', width: 60 },
    { title: t('simulateDebug.table.meta'), dataIndex: 'meta', key: 'meta', width: 120 },
    { title: t('simulateDebug.table.name'), dataIndex: 'name', key: 'name', width: 150 },
    {
      title: t('simulateDebug.table.value'),
      dataIndex: 'value',
      key: 'value',
      width: 300,
      render: (text) => (
        <div style={{ 
          wordWrap: 'break-word', 
          wordBreak: 'break-all', 
          maxWidth: '300px',
          whiteSpace: 'pre-wrap'
        }}>
          {text}
        </div>
      ),
    },
  ];

  /**
   * 按"显示空值"开关过滤字段列表
   * showEmptyFlag=false 时，过滤掉 value 为空字符串/null/undefined 的行
   */
  const filterFieldsByShowEmpty = (fields, showEmptyFlag) => {
    const list = Array.isArray(fields) ? fields : [];
    if (showEmptyFlag) {
      return list;
    }
    return list.filter(fieldItem => {
      if (!fieldItem || typeof fieldItem !== 'object') {
        return false;
      }
      const fieldValue = fieldItem.value;
      return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
    });
  };

  /**
   * 过滤 JSON 对象中的空字段
   * 用于 JSON 模式下的显示空值开关
   */
  const filterEmptyFields = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj
        .map(item => filterEmptyFields(item))
        .filter(item => item !== null && item !== undefined && item !== '');
    }
    
    const filtered = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'object') {
          const filteredValue = filterEmptyFields(value);
          if (Object.keys(filteredValue).length > 0 || Array.isArray(filteredValue)) {
            filtered[key] = filteredValue;
          }
        } else {
          filtered[key] = value;
        }
      }
    });
    
    return filtered;
  };

  /**
   * 从 value 对象中提取值
   * @param {Object} valueObj - value 对象，如 { "IpAddr": "..." } 或 { "Chars": "..." }
   * @param {string} fieldName - 字段名称
   * @param {string} formatJson - format_json 字符串
   * @returns {string} 提取的值字符串
   */
  const extractValueFromObj = (valueObj, fieldName, formatJson) => {
    if (valueObj === null || valueObj === undefined) {
      return '';
    }

    if (typeof valueObj !== 'object') {
      return String(valueObj);
    }

    // 处理普通数组
    if (Array.isArray(valueObj)) {
      const arrayValues = valueObj
        .map(item => extractValueFromObj(item, fieldName, formatJson))
        .filter(val => val !== '' && val !== null && val !== undefined);
      return arrayValues.length > 0 ? `[${arrayValues.join(', ')}]` : '';
    }

    // 处理 Array 字段（包含 meta/name/value 结构的数组）
    if (Array.isArray(valueObj.Array)) {
      const arrayValues = valueObj.Array.map(item => {
        if (item && typeof item === 'object' && 'value' in item) {
          return extractValueFromObj(item.value, fieldName, formatJson);
        }
        return extractValueFromObj(item, fieldName, formatJson);
      }).filter(val => val !== '' && val !== null && val !== undefined);
      return arrayValues.length > 0 ? `[${arrayValues.join(', ')}]` : '';
    }

    const keys = Object.keys(valueObj);
    if (keys.length === 0) {
      return '';
    }

    const firstKey = keys[0];
    const rawValue = valueObj[firstKey];

    if (rawValue === null || rawValue === undefined) {
      return '';
    }

    // 对于复杂嵌套对象（如 IpNet），尝试从 format_json 中读取
    if (typeof rawValue === 'object' && fieldName && formatJson) {
      try {
        const jsonData = JSON.parse(formatJson);
        if (jsonData && jsonData[fieldName] !== undefined) {
          return String(jsonData[fieldName]);
        }
      } catch (e) {
        // JSON 解析失败，继续使用原有逻辑
      }
    }

    if (typeof rawValue === 'object') {
      return extractValueFromObj(rawValue, fieldName, formatJson);
    }

    return String(rawValue);
  };

  /**
   * 处理需要展示的字段列表，添加 no 序号并提取 value 值
   * @param {Array} fields - 原始字段数组
   * @param {string} formatJson - format_json 字符串
   * @returns {Array} 处理后的字段数组
   */
  const processFieldsForDisplay = (fields, formatJson) => {
    const list = Array.isArray(fields) ? fields : [];
    return list.map((field, index) => {
      // 处理 meta 字段
      let metaDisplay = field.meta;
      if (field.meta && typeof field.meta === 'object') {
        if (field.meta.array) {
          // 数组类型：显示为 "array:元素类型"
          metaDisplay = `array:${field.meta.array}`;
        } else {
          // 其他对象类型：转换为 JSON 字符串
          metaDisplay = JSON.stringify(field.meta);
        }
      }

      return {
        ...field,
        no: index + 1,
        meta: metaDisplay,
        value: extractValueFromObj(field?.value, field?.name, formatJson),
      };
    });
  };

  // 统一渲染解析错误内容，仅保留错误标题和错误码提示
  const renderParseError = () => {
    if (!parseError) return null;

    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#fff1f0',
          border: '1px solid #ffccc7',
          borderRadius: 4,
          margin: '10px',
        }}
      >
        <h4 style={{ color: '#f5222d', marginBottom: '8px', fontWeight: 'bold' }}>
          {t('simulateDebug.parseResult.parseFailed')}
        </h4>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            color: '#666',
            margin: '0 0 8px 0',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        >
          {parseError.message || t('simulateDebug.parseResult.parseError')}
        </pre>
        {parseError.code && (
          <p style={{ color: '#f5222d', margin: '8px 0 0 0' }}>
            <span style={{ fontWeight: 'bold' }}>{t('simulateDebug.parseResult.errorCode')}：</span>
            {parseError.code}
          </p>
        )}
      </div>
    );
  };

  // 转换错误展示，仅保留错误标题与错误码
  const renderTransformError = () => {
    if (!transformError) return null;
    const errorMessage =
      transformError.responseData?.error?.detail ||
      transformError.message ||
      transformError.responseData?.error?.message ||
      transformError.data?.error?.message ||
      t('simulateDebug.convertResult.convertError');

    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#fff1f0',
          border: '1px solid #ffccc7',
          borderRadius: 4,
          margin: '10px',
        }}
      >
        <h4 style={{ color: '#f5222d', marginBottom: '8px', fontWeight: 'bold' }}>
          {t('simulateDebug.convertResult.convertFailed')}
        </h4>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            color: '#666',
            margin: '0 0 8px 0',
            fontSize: '14px',
            lineHeight: '1.5',
          }}
        >
          {errorMessage}
        </pre>
        {transformError.code && (
          <p style={{ color: '#f5222d', margin: '8px 0 0 0' }}>
            <span style={{ fontWeight: 'bold' }}>{t('simulateDebug.parseResult.errorCode')}：</span>
            {transformError.code}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <div>
        <aside className="side-nav" data-group="simulate-debug">
          <button
            type="button"
            className={`side-item ${activeKey === 'parse' ? 'is-active' : ''}`}
            onClick={() => setActiveKey('parse')}
          >
            <h2>{t('simulateDebug.tabs.parse')}</h2>
          </button>
          <button
            type="button"
            className={`side-item ${activeKey === 'convert' ? 'is-active' : ''}`}
            onClick={() => setActiveKey('convert')}
          >
            <h2>{t('simulateDebug.tabs.convert')}</h2>
          </button>
        </aside>

        <aside style={{ marginTop: "10px", marginBottom: "10px" }} className="side-nav" data-group="workspace-mode">
          <button
            type="button"
            className={`side-item ${workspaceMode === 'workspace' ? 'is-active' : ''}`}
            onClick={() => handleSwitchMode('workspace')}
          >
            <h2>{t('simulateDebug.workspace.title')}</h2>
          </button>
          <button
            type="button"
            className={`side-item ${workspaceMode === 'examples' ? 'is-active' : ''}`}
            onClick={() => handleSwitchMode('examples')}
          >
            <h2>{t('simulateDebug.examples.title')}</h2>
          </button>
        </aside>
        
        {workspaceMode === 'examples' && (
          <div className="example-list example-list--compact example-list--spaced">
            <div className="example-list__header">
              <div>
                <h4 className="example-list__title">{t('simulateDebug.examples.title')}</h4>
                <p className="example-list__desc">{t('simulateDebug.examples.desc')}</p>
              </div>
            </div>
            {examplesLoading ? (
              <div className="example-list__message">{t('simulateDebug.examples.loading')}</div>
            ) : examples && examples.length > 0 ? (
              <div className="example-list__grid example-list__grid--small">
                {examples.map(exampleItem => (
                  <button
                    key={exampleItem.name || exampleItem.key}
                    type="button"
                    className={`example-list__item ${selectedExample === exampleItem.name ? 'is-active' : ''}`}
                    onClick={() => handleApplyExample(exampleItem)}
                  >
                    {exampleItem.name || t('simulateDebug.examples.unnamed')}
                  </button>
                ))}
              </div>
            ) : (
              <div className="example-list__message">{t('simulateDebug.examples.noData')}</div>
            )}
          </div>
        )}
      </div>
      <section className="page-panels">
        <article className="panel is-visible">
          <section className="panel-body simulate-body">
            {/* 解析页面 */}
            {activeKey === 'parse' && (
              <>
                <div className="panel-block">
                  <div className="block-header" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
                    <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <h3>{t('simulateDebug.logData.title')}</h3>
                      {workspaceMode === 'workspace' && (
                        <InstanceSelector
                          instances={logInstances}
                          activeIndex={activeLogIndex}
                          maxInstances={10}
                          onSwitch={switchLogInstance}
                          onAdd={addLogInstance}
                          onRemove={removeLogInstance}
                          onRename={renameLogInstance}
                          inline
                          showAddButton={false}
                          collapseThreshold={6}
                        />
                      )}
                    </div>
                    <div
                      className="block-actions"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', minWidth: 0 }}
                    >
                      {workspaceMode === 'workspace' && (
                        <button
                          type="button"
                          className="btn primary"
                          onClick={addLogInstance}
                          disabled={logInstances.length >= 10}
                          title={logInstances.length >= 10
                            ? t('multipleInstances.maxInstancesReached')
                            : t('multipleInstances.addInstance')}
                        >
                          {t('multipleInstances.addInstance')}
                        </button>
                      )}
                      <button type="button" className="btn ghost" onClick={handleBase64Decode}>
                        {t('simulateDebug.logData.base64Decode')}
                      </button>
                      <button type="button" className="btn ghost" onClick={handleClear}>
                        {t('simulateDebug.logData.clearAll')}
                      </button>
                    </div>
                  </div>
                <CodeEditor
                  key={`log-${workspaceMode}-${activeLogInstance?.id || activeLogIndex}`}
                  className="code-area"
                  language="json"
                  theme="vscodeDark"
                  value={inputValue}
                  onChange={value => setInputValue(value)}
                />
                </div>

                <div className="split-layout">
                  <div className="split-col">
                    <div className="panel-block panel-block--fill">
                      <div className="block-header" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
                        <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <h3>{t('simulateDebug.parseRule.title')}</h3>
                          {workspaceMode === 'workspace' && (
                            <InstanceSelector
                              instances={wplInstances}
                              activeIndex={activeWplIndex}
                              maxInstances={10}
                              onSwitch={switchWplInstance}
                              onAdd={addWplInstance}
                              onRemove={removeWplInstance}
                              onRename={renameWplInstance}
                              inline
                              inlineMaxWidth="400px"
                              showAddButton={false}
                              collapseThreshold={6}
                            />
                          )}
                        </div>
                        <div className="block-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', minWidth: 0 }}>
                          {workspaceMode === 'workspace' && (
                            <button
                              type="button"
                              className="btn primary"
                              onClick={addWplInstance}
                              disabled={wplInstances.length >= 10}
                              title={wplInstances.length >= 10
                                ? t('multipleInstances.maxInstancesReached')
                                : t('multipleInstances.addInstance')}
                            >
                              {t('multipleInstances.addInstance')}
                            </button>
                          )}
                          <button type="button" className="btn ghost" onClick={wplFormat}>
                            {t('simulateDebug.parseRule.format')}
                          </button>
                          <button
                            type="button"
                            className="btn primary"
                            onClick={handleTest}
                            disabled={loading}
                          >
                            {loading
                              ? t('simulateDebug.parseRule.parsing')
                              : t('simulateDebug.parseRule.parse')}
                          </button>
                        </div>
                      </div>
                    <CodeEditor
                      key={`wpl-${workspaceMode}-${activeWplInstance?.id || activeWplIndex}`}
                      className="code-area code-area--large"
                      language="wpl"
                      value={ruleValue}
                      onChange={value => setRuleValue(value)}
                    />
                    </div>
                  </div>

                  <div className="split-col">
                    <div className="panel-block panel-block--stretch panel-block--scrollable">
                      <div className="block-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <h3>{t('simulateDebug.parseResult.title')}</h3>
                          <div className="mode-toggle">
                            <button
                              type="button"
                              className={`toggle-btn ${viewMode === 'table' ? 'is-active' : ''}`}
                              onClick={() => setViewMode('table')}
                            >
                              {t('simulateDebug.parseResult.tableMode')}
                            </button>
                            <button
                              type="button"
                              className={`toggle-btn ${viewMode === 'json' ? 'is-active' : ''}`}
                              onClick={() => setViewMode('json')}
                            >
                              {t('simulateDebug.parseResult.jsonMode')}
                            </button>
                          </div>
                        </div>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={showEmpty}
                            onChange={e => setShowEmpty(e.target.checked)}
                          />
                          <span className="switch-slider"></span>
                          <span className="switch-label">
                            {t('simulateDebug.parseResult.showEmpty')}
                          </span>
                        </label>
                      </div>
                      <div className={`mode-content ${viewMode === 'table' ? 'is-active' : ''}`}>
                        {parseError ? (
                          renderParseError()
                        ) : result ? (
                          <div style={{ paddingBottom: '10px' }}>
                            <Table
                              size="small"
                              columns={resultColumns}
                              dataSource={filterFieldsByShowEmpty(result.fields, showEmpty)}
                              pagination={false}
                              rowKey="no"
                              className="data-table compact"
                              scroll={{ y: 'calc(100vh - 450px)', scrollToFirstRowOnChange: true }}
                            />
                          </div>
                        ) : (
                          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                            {t('simulateDebug.parseResult.clickToParse')}
                          </div>
                        )}
                      </div>
                      <div className={`mode-content ${viewMode === 'json' ? 'is-active' : ''}`}>
                        {parseError ? (
                          renderParseError()
                        ) : result ? (
                          <SyntaxHighlighter
                            className="code-block"
                            language="json"
                            style={oneDark}
                            customStyle={{ 
                              margin: 0, 
                              background: '#0f172a',
                              maxWidth: '100%',
                              width: '100%',
                              overflowX: 'hidden'
                            }}
                            codeTagProps={{ style: { background: 'transparent' } }}
                            wrapLines
                            lineProps={{ style: { background: 'transparent' } }}
                            wrapLongLines
                          >
                            {formatJsonForDisplay(result.formatJson, {
                              ...result,
                              fields: filterFieldsByShowEmpty(result.fields, showEmpty),
                            })}
                          </SyntaxHighlighter>
                        ) : (
                          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                            {t('simulateDebug.parseResult.clickToParse')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 转换页面 */}
            {activeKey === 'convert' && (
              <div className="split-layout transform-layout">
                <div className="split-col transform-col">
                  <div className="panel-block panel-block--stretch panel-block--fill">
                    <div className="block-header" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
                      <div style={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h3>{t('simulateDebug.omlInput.title')}</h3>
                        {workspaceMode === 'workspace' && (
                          <InstanceSelector
                            instances={omlInstances}
                            activeIndex={activeOmlIndex}
                            maxInstances={10}
                            onSwitch={switchOmlInstance}
                            onAdd={addOmlInstance}
                            onRemove={removeOmlInstance}
                            onRename={renameOmlInstance}
                            inline
                            inlineMaxWidth="400px"
                            showAddButton={false}
                            collapseThreshold={6}
                          />
                        )}
                      </div>
                      <div className="block-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'nowrap', minWidth: 0 }}>
                        {workspaceMode === 'workspace' && (
                          <button
                            type="button"
                            className="btn primary"
                            onClick={addOmlInstance}
                            disabled={omlInstances.length >= 10}
                            title={omlInstances.length >= 10
                              ? t('multipleInstances.maxInstancesReached')
                              : t('multipleInstances.addInstance')}
                          >
                            {t('multipleInstances.addInstance')}
                          </button>
                        )}
                        <button type="button" className="btn primary" onClick={omlFormat}>
                          {t('simulateDebug.omlInput.format')}
                        </button>
                        <button
                          type="button"
                          className="btn primary"
                          onClick={handleTransform}
                          disabled={loading}
                        >
                          {loading
                            ? t('simulateDebug.omlInput.converting')
                            : t('simulateDebug.omlInput.convert')}
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setTransformOml('')}
                        >
                          {t('simulateDebug.omlInput.clear')}
                        </button>
                      </div>
                    </div>
                    <CodeEditor
                      key={`oml-${workspaceMode}-${activeOmlInstance?.id || activeOmlIndex}`}
                      className="code-area code-area--large"
                      language="oml"
                      value={transformOml}
                      onChange={value => setTransformOml(value)}
                    />
                  </div>
                </div>
                <div className="split-col transform-col">
                  <div className="panel-block panel-block--scrollable">
                    <div className="block-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h3>{t('simulateDebug.parseResult.title')}</h3>
                        <div className="mode-toggle">
                          <button
                            type="button"
                            className={`toggle-btn ${
                              transformParseViewMode === 'table' ? 'is-active' : ''
                            }`}
                            onClick={() => setTransformParseViewMode('table')}
                          >
                            {t('simulateDebug.parseResult.tableMode')}
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${
                              transformParseViewMode === 'json' ? 'is-active' : ''
                            }`}
                            onClick={() => setTransformParseViewMode('json')}
                          >
                            {t('simulateDebug.parseResult.jsonMode')}
                          </button>
                        </div>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={transformParseShowEmpty}
                          onChange={e => setTransformParseShowEmpty(e.target.checked)}
                        />
                        <span className="switch-slider"></span>
                        <span className="switch-label">
                          {t('simulateDebug.parseResult.showEmpty')}
                        </span>
                      </label>
                    </div>
                    <div
                      className={`mode-content ${
                        transformParseViewMode === 'table' ? 'is-active' : ''
                      }`}
                    >
                      {transformParseResult ? (
                        <div style={{ paddingBottom: '10px' }}>
                          <Table
                            size="small"
                            columns={resultColumns}
                            dataSource={filterFieldsByShowEmpty(
                              processFieldsForDisplay(transformParseResult.fields, transformParseResult.formatJson),
                              transformParseShowEmpty
                            )}
                            pagination={false}
                            rowKey="no"
                            className="data-table compact"
                            scroll={{ y: 'calc(50vh - 300px)', scrollToFirstRowOnChange: true }}
                          />
                        </div>
                      ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          {t('simulateDebug.parseResult.willShowHere')}
                        </div>
                      )}
                    </div>
                    <div
                      className={`mode-content ${
                        transformParseViewMode === 'json' ? 'is-active' : ''
                      }`}
                    >
                      {transformParseResult ? (
                        <SyntaxHighlighter
                          className="code-block"
                          language="json"
                          style={oneDark}
                          customStyle={{ 
                            margin: 0, 
                            background: '#0f172a',
                            maxWidth: '100%',
                            width: '100%',
                            overflowX: 'hidden'
                          }}
                          codeTagProps={{ style: { background: 'transparent' } }}
                          wrapLines
                          lineProps={{ style: { background: 'transparent' } }}
                          wrapLongLines
                        >
                          {formatJsonForDisplay(transformParseResult.formatJson, {
                            ...transformParseResult,
                            fields: filterFieldsByShowEmpty(
                              processFieldsForDisplay(transformParseResult.fields, transformParseResult.formatJson),
                              transformParseShowEmpty
                            ),
                          })}
                        </SyntaxHighlighter>
                      ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          {t('simulateDebug.parseResult.willShowHere')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="panel-block panel-block--scrollable">
                    <div className="block-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h3>{t('simulateDebug.convertResult.title')}</h3>
                        <div className="mode-toggle">
                          <button
                            type="button"
                            className={`toggle-btn ${
                              transformResultViewMode === 'table' ? 'is-active' : ''
                            }`}
                            onClick={() => setTransformResultViewMode('table')}
                          >
                            {t('simulateDebug.parseResult.tableMode')}
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${
                              transformResultViewMode === 'json' ? 'is-active' : ''
                            }`}
                            onClick={() => setTransformResultViewMode('json')}
                          >
                            {t('simulateDebug.parseResult.jsonMode')}
                          </button>
                        </div>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={transformResultShowEmpty}
                          onChange={e => setTransformResultShowEmpty(e.target.checked)}
                        />
                        <span className="switch-slider"></span>
                        <span className="switch-label">
                          {t('simulateDebug.parseResult.showEmpty')}
                        </span>
                      </label>
                    </div>
                    <div
                      className={`mode-content ${
                        transformResultViewMode === 'table' ? 'is-active' : ''
                      }`}
                    >
                      {transformError ? (
                        renderTransformError()
                      ) : transformResult ? (
                        <div style={{ paddingBottom: '10px' }}>
                          <Table
                            size="small"
                            columns={resultColumns}
                            dataSource={filterFieldsByShowEmpty(
                              transformResult.fields,
                              transformResultShowEmpty
                            )}
                            pagination={false}
                            rowKey="no"
                            className="data-table compact"
                            scroll={{ y: 'calc(50vh - 300px)', scrollToFirstRowOnChange: true }}
                          />
                        </div>
                      ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          {t('simulateDebug.convertResult.willShowHere')}
                        </div>
                      )}
                    </div>
                    <div
                      className={`mode-content ${
                        transformResultViewMode === 'json' ? 'is-active' : ''
                      }`}
                    >
                      {transformError ? (
                        renderTransformError()
                      ) : transformResult ? (
                        <SyntaxHighlighter
                          className="code-block"
                          language="json"
                          style={oneDark}
                          customStyle={{ 
                            margin: 0, 
                            background: '#0f172a',
                            maxWidth: '100%',
                            width: '100%',
                            overflowX: 'hidden'
                          }}
                          codeTagProps={{ style: { background: 'transparent' } }}
                          wrapLines
                          lineProps={{ style: { background: 'transparent' } }}
                          wrapLongLines
                        >
                          {formatJsonForDisplay(
                            transformResult.formatJson,
                            {
                              ...transformResult,
                              fields: filterFieldsByShowEmpty(
                                transformResult.fields,
                                transformResultShowEmpty
                              ),
                            },
                            parsed =>
                              transformResultShowEmpty ? parsed : filterEmptyFields(parsed)
                          )}
                        </SyntaxHighlighter>
                      ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          {t('simulateDebug.convertResult.willShowHere')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </article>
      </section>
    </>
  );
}

export default SimulateDebugPage;
