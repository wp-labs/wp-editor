/**
 * 调试服务模块
 * 提供日志解析、记录转换、知识库状态查询和性能测试功能
 */

import httpRequest from './request';

/**
 * 解析日志
 * @param {Object} options - 解析选项
 * @param {string} options.logs - 日志内容
 * @param {string} options.rules - 解析规则
 * @param {number} [options.connectionId] - 连接 ID（可选）
 * @returns {Promise<Object>} 解析结果
 */
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
    const payload = data;

    return {
      fields: Array.isArray(payload?.fields) ? payload.fields : [],
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
  const { oml, connectionId } = options;

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
      parse_result: {}, // 占位，后端使用 SharedRecord
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
    const payload = data;

    return {
      fields: Array.isArray(payload?.fields) ? payload.fields : [],
      // 提供给前端 JSON 模式直接展示的标准 JSON 字符串
      formatJson: typeof payload?.format_json === 'string' ? payload.format_json : '',
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
