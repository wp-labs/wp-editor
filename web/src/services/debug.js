/**
 * 调试服务模块
 * 提供日志解析、记录转换、知识库状态查询和性能测试功能
 */

import httpRequest from './request';

export async function base64Decode(logValue) {
  try {
    const response = await httpRequest.post('/debug/decode/base64', logValue || '', {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      // 禁用默认 JSON 序列化，保持原始字符串透传
      transformRequest: [
        data => data,
      ],
    });
    const data = response && typeof response === 'object' && 'data' in response ? response.data : response;
    if (data && data.success === false) {
      const errorMessage = data.error?.message || 'Base64解码失败，请稍后重试';
      const error = new Error(errorMessage);
      error.code = data.error?.code;
      error.responseData = data;
      throw error;
    }
    return data || {};

  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(typeof error === 'string' ? error : 'Base64解码失败，请稍后重试');
  }
}

export async function wplCodeFormat(wplCode) {
  try {
    // 接口要求原始字符串入参，避免 JSON 序列化导致的类型不匹配
    const response = await httpRequest.post('/debug/wpl/format', wplCode || '', {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      // 禁用默认 JSON 序列化，保持原始字符串透传
      transformRequest: [
        data => data,
      ],
    });
    const data = response && typeof response === 'object' && 'data' in response ? response.data : response;
    if (data && data.success === false) {
      const errorMessage = data.error?.message || '格式化 WPL 代码失败，请稍后重试';
      const error = new Error(errorMessage);
      error.code = data.error?.code;
      error.responseData = data;
      throw error;
    }
    // 后端可能直接返回格式化后的字符串，或返回 { wpl_code: '' }
    if (typeof data === 'string') {
      return { wpl_code: data };
    }
    return data || {};
  } catch (error) {
    const responseData = error?.response?.data || error?.data;
    if (responseData && responseData.success === false) {
      const errorMessage = responseData.error?.message || error?.message || '格式化 WPL 代码失败，请稍后重试';
      const wrapped = new Error(errorMessage);
      wrapped.code = responseData.error?.code;
      wrapped.responseData = responseData;
      throw wrapped;
    }
    if (error instanceof Error) {
      if (responseData && !error.responseData) {
        error.responseData = responseData;
      }
      throw error;
    }
    throw new Error(typeof error === 'string' ? error : '格式化WPL代码失败，请稍后重试');
  }
}

export async function omlCodeFormat(omlCode) {
  try {
    // 接口要求原始字符串入参，避免 JSON 序列化导致的类型不匹配
    const response = await httpRequest.post('/debug/oml/format', omlCode || '', {
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      // 禁用默认 JSON 序列化，保持原始字符串透传
      transformRequest: [
        data => data,
      ],
    });
    const data = response && typeof response === 'object' && 'data' in response ? response.data : response;
    if (data && data.success === false) {
      const errorMessage = data.error?.message || '格式化 OML 代码失败，请稍后重试';
      const error = new Error(errorMessage);
      error.code = data.error?.code;
      error.responseData = data;
      throw error;
    }
    // 后端可能直接返回格式化后的字符串，或返回 { oml_code: '' }
    if (typeof data === 'string') {
      return { oml_code: data };
    }
    return data || {};
  } catch (error) {
    const responseData = error?.response?.data || error?.data;
    if (responseData && responseData.success === false) {
      const errorMessage = responseData.error?.message || error?.message || '格式化 OML 代码失败，请稍后重试';
      const wrapped = new Error(errorMessage);
      wrapped.code = responseData.error?.code;
      wrapped.responseData = responseData;
      throw wrapped;
    }
    if (error instanceof Error) {
      if (responseData && !error.responseData) {
        error.responseData = responseData;
      }
      throw error;
    }
    throw new Error(typeof error === 'string' ? error : '格式化WPL代码失败，请稍后重试');
  }
}

/**
 * 获取调试示例列表
 * @returns {Promise<Record<string, {name: string, wpl_code: string, oml_code: string, sample_data: string}>>}
 */
export async function fetchDebugExamples() {
  try {
    const response = await httpRequest.get('/debug/examples');
    const data = response && typeof response === 'object' && 'data' in response ? response.data : response;
    if (data && data.success === false) {
      const errorMessage = data.error?.message || '获取示例失败，请稍后重试';
      const error = new Error(errorMessage);
      error.code = data.error?.code;
      error.responseData = data;
      throw error;
    }
    return data || {};
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(typeof error === 'string' ? error : '获取示例失败，请稍后重试');
  }
}

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

  if (Array.isArray(valueObj)) {
    const arrayValues = valueObj
      .map(item => extractValueFromObj(item, fieldName, formatJson))
      .filter(val => val !== '' && val !== null && val !== undefined);
    return arrayValues.join(', ');
  }

  // 解析 { Array: [...] } 结构，提取每个子项的实际值
  if (Array.isArray(valueObj.Array)) {
    const arrayValues = valueObj.Array
      .map(item => {
        if (item && typeof item === 'object') {
          if ('value' in item) {
            return extractValueFromObj(item.value, fieldName, formatJson);
          }
          if ('Array' in item) {
            return extractValueFromObj(item, fieldName, formatJson);
          }
        }
        return '';
      })
      .filter(val => val !== '' && val !== null && val !== undefined);
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
    // 嵌套对象或数组继续递归，尽量拿到最终值
    return extractValueFromObj(rawValue, fieldName, formatJson);
  }

  return String(rawValue);
};

/**
 * 处理字段列表，添加 no 序号并提取 value 值
 * @param {Array} fields - 字段数组
 * @param {string} formatJson - format_json 字符串
 * @returns {Array} 处理后的字段数组
 */
const processFields = (fields, formatJson = '') => {
  if (!Array.isArray(fields)) {
    return [];
  }
  return fields.map((field, index) => {
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

export async function parseLogs(options) {
  const { logs, rules, connectionId } = options;

  /**
   * 统一构造解析错误对象，附带后端响应，便于前端展示
   * @param {Object} payload - 错误信息载体
   * @param {string} payload.message - 错误文案
   * @param {string} [payload.code] - 错误码
   * @param {Object} [payload.details] - 细节信息
   * @param {Object} [payload.responseData] - 原始响应体
   * @returns {Error} 带扩展字段的错误对象
   */
  const createParseError = (payload) => {
    const errorMessage = payload?.message || '执行解析失败，请稍后重试';
    const parseError = new Error(errorMessage);
    if (payload?.code) {
      parseError.code = payload.code;
    }
    if (payload?.details) {
      parseError.details = payload.details;
    }
    if (payload?.responseData) {
      parseError.responseData = payload.responseData;
    }
    return parseError;
  };

  try {
    // 调用后端解析接口：POST /api/debug/parse
    const response = await httpRequest.post('/debug/parse', {
      connection_id: connectionId,
      rules,
      logs,
    });

    // 兼容后端直接返回或包一层 data 的情况
    const data = response && typeof response === 'object' && 'data' in response
      ? response.data
      : response;

    // 如果后端返回 success:false，视为业务错误，抛出供调用方捕获
    if (data && data.success === false) {
      throw createParseError({
        message: data.error?.message,
        code: data.error?.code,
        details: data.error?.details || data.error,
        responseData: data,
      });
    }

    // 后端返回 RecordResponse 结构，包含 fields 和 format_json
    // fields 可能是数组或 { items: [...] } 结构
    const payload = data;

    let fieldsData = [];
    if (Array.isArray(payload?.fields)) {
      fieldsData = payload.fields;
    } else if (payload?.fields && Array.isArray(payload?.fields?.items)) {
      fieldsData = payload.fields.items;
    }

    return {
      fields: processFields(fieldsData, payload?.format_json || ''),
      rawFields: fieldsData,
      formatJson: typeof payload?.format_json === 'string' ? payload.format_json : '',
    };
  } catch (error) {
    // 将请求异常与业务异常统一为可展示的错误对象，优先挂载后端响应
    const responseData = error?.response?.data || error?.data;
    if (responseData && responseData.success === false) {
      throw createParseError({
        message: responseData.error?.message || error?.message,
        code: responseData.error?.code,
        details: responseData.error?.details || responseData.error,
        responseData,
      });
    }

    if (error instanceof Error) {
      if (responseData && !error.responseData) {
        error.responseData = responseData;
      }
      if (!error.details && responseData?.error) {
        error.details = responseData.error;
      }
      if (!error.code && responseData?.error?.code) {
        error.code = responseData.error.code;
      }
      throw error;
    }

    throw createParseError({
      message: typeof error === 'string' ? error : '执行解析失败，请稍后重试',
      responseData,
    });
  }
}

/**
 * 转换记录格式
 * @param {Object} options - 转换选项
 * @param {string} options.oml - OML 配置
 * @param {number} [options.connectionId] - 连接 ID（可选）
 * @returns {Promise<Object>} 转换结果
 */
export async function convertRecord(options) {
  const { oml, connectionId, parseResult } = options;

  /**
   * 构造转换错误对象，携带后端响应内容，便于前端展示
   * @param {Object} payload - 错误信息载体
   * @param {string} payload.message - 错误文案
   * @param {string} [payload.code] - 错误码
   * @param {Object} [payload.responseData] - 原始响应
   * @returns {Error} 带扩展字段的错误对象
   */
  const createTransformError = (payload) => {
    const errorMessage = payload?.message || '执行转换失败，请稍后重试';
    const transformError = new Error(errorMessage);
    if (payload?.code) {
      transformError.code = payload.code;
    }
    if (payload?.responseData) {
      transformError.responseData = payload.responseData;
    }
    return transformError;
  };

  try {
    // 调用后端转换接口：POST /api/debug/transform
    // parse_result 参数保留但后端实际使用 SharedRecord
    const response = await httpRequest.post('/debug/transform', {
      connection_id: connectionId,
      parse_result: parseResult || {}, // 占位，后端使用 SharedRecord
      oml,
    });

    // 兼容后端直接返回或包一层 data 的情况
    const data = response && typeof response === 'object' && 'data' in response
      ? response.data
      : response;

    // 如果后端返回 success:false，视为业务错误
    if (data && data.success === false) {
      throw createTransformError({
        message: data.error?.message,
        code: data.error?.code,
        responseData: data,
      });
    }

    // 后端返回 DebugTransformResponse 结构，包含 fields 和 format_json
    // fields 可能是数组或 { items: [...] } 结构
    const payload = data;

    let fieldsData = [];
    if (Array.isArray(payload?.fields)) {
      fieldsData = payload.fields;
    } else if (payload?.fields && Array.isArray(payload?.fields?.items)) {
      fieldsData = payload.fields.items;
    }

    return {
      fields: fieldsData,
      rawFields: fieldsData,
      formatJson: typeof payload?.format_json === 'string' ? payload?.format_json : '',
    };
  } catch (error) {
    const responseData = error?.response?.data || error?.data;
    if (responseData && responseData.success === false) {
      throw createTransformError({
        message: responseData.error?.message || error?.message,
        code: responseData.error?.code,
        responseData,
      });
    }

    if (error instanceof Error) {
      if (responseData && !error.responseData) {
        error.responseData = responseData;
      }
      if (!error.code && responseData?.error?.code) {
        error.code = responseData.error.code;
      }
      throw error;
    }

    throw createTransformError({
      message: typeof error === 'string' ? error : '执行转换失败，请稍后重试',
      responseData,
    });
  }
}

/**
 * 运行性能测试
 * @param {Object} options - 测试选项
 * @param {string} options.testType - 测试类型
 * @param {Object} options.config - 测试配置
 * @returns {Promise<Object>} 测试任务信息
 */
export async function runPerformanceTest(options) {
  const { testType, config } = options;

  // 调用后端性能测试接口：POST /api/debug/performance/run
  const response = await httpRequest.post('/debug/performance/run', {
    test_type: testType,
    config,
  });

  // 后端返回测试任务信息
  return response || {
    taskId: `perf-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`,
    status: 'running',
  };
}
