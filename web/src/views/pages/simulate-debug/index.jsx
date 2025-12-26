import { Table, message, Modal, Select, Tree } from 'antd';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseLogs, convertRecord } from '@/services/debug';

const MonacoEditor = lazy(() => import('@/views/components/MonacoEditor'));


/**
 * Wp Editor
 * 功能：
 * 1. 日志解析
 * 2. 记录转换
 * 3. 知识库状态查询
 * 对应原型：pages/views/simulate-debug/simulate-parse.html
 */

// 示例日志数据
const EXAMPLE_LOG = `222.133.52.20 - - [06/Aug/2019:12:12:19 +0800] "GET /nginx-logo.png HTTP/1.1" 200 368 "http://119.122.1.4/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36" "-"`;

// 示例解析规则
const EXAMPLE_RULE = `package /example/simple {
  rule nginx {
        (ip:sip,_^2,time:recv_time<[,]>,http/request",http/status,digit,chars",http/agent",_")
  }
}`;

function SimulateDebugPage() {
  const [activeKey, setActiveKey] = useState('parse');
  const [inputValue, setInputValue] = useState('');
  const [ruleValue, setRuleValue] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  // 解析页“显示空值”开关
  const [showEmpty, setShowEmpty] = useState(true);
  
  // 解析错误状态
  const [parseError, setParseError] = useState(null);
  
  // 转换相关状态
  const [transformOml, setTransformOml] = useState('');
  const [transformParseResult, setTransformParseResult] = useState(null);
  const [transformResult, setTransformResult] = useState(null);
  const [transformParseViewMode, setTransformParseViewMode] = useState('table');
  const [transformResultViewMode, setTransformResultViewMode] = useState('table');
  // 转换页"显示空值"开关（转换结果）
  const [transformResultShowEmpty, setTransformResultShowEmpty] = useState(true);
  // 转换页"显示空值"开关（解析结果）
  const [transformParseShowEmpty, setTransformParseShowEmpty] = useState(true);
  // 转换错误状态
  const [transformError, setTransformError] = useState(null);
  
  // 帮助中心相关状态
  const [helpSearchText, setHelpSearchText] = useState('');
  const [docToc, setDocToc] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);
  const [docContent, setDocContent] = useState('');
  const [docLoading, setDocLoading] = useState(false);

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
        rules: ruleValue 
      });
      setResult(response);
      // 同步更新转换页的解析结果
      if (response?.fields && Array.isArray(response.fields)) {
        setTransformParseResult({ fields: response.fields });
      }
    } catch (error) {
      setParseError(error); // 将错误存储到状态中
    } finally {
      setLoading(false);
    }
  };

  /**
   * 一键示例
   * 填充示例日志和规则,并自动执行解析,同时填充转换页面数据
   */
  const handleExample = async () => {
    setInputValue(EXAMPLE_LOG);
    setRuleValue(EXAMPLE_RULE);
    // 自动执行解析
    setLoading(true);
    setParseError(null); // 重置错误状态
    try {
      const response = await parseLogs({
        logs: EXAMPLE_LOG,
        rules: EXAMPLE_RULE
      });
      setResult(response);

      // 同时填充转换页面的数据
      const exampleOml = `name : /oml/example/simple

rule :
    /example/simple*
---
recv_time  = take() ;
occur_time = Now::time() ;
from_ip    = take(option:[from-ip]) ;
src_ip     = take(option:[src-ip,sip,source-ip] );
*  = take() ;`;

      setTransformOml(exampleOml);

      // 使用真实解析结果同步到转换页面
      if (response?.fields && Array.isArray(response.fields)) {
        setTransformParseResult({ fields: response.fields });
      }
    } catch (error) {
      setParseError(error); // 将错误存储到状态中
    } finally {
      setLoading(false);
    }
  };

  /**
   * 一键清空
   * 清空解析和转换的所有输入和结果
   */
  const handleClear = () => {
    // 清空解析页面
    setInputValue('');
    setRuleValue('');
    setResult(null);
    setParseError(null); // 清空解析错误
    // 清空转换页面
    setTransformOml('');
    setTransformParseResult(null);
    setTransformResult(null);
    setTransformError(null); // 清空转换错误
  };

  const handleTransform = async () => {
    if (!transformOml) {
      message.warning('请先填写 OML 转换规则');
      return;
    }
    setLoading(true);
    setTransformError(null); // 重置转换错误状态
    try {
      const response = await convertRecord({ oml: transformOml });
      // 新 API 直接返回 { fields: [...] } 格式
      setTransformResult({
        fields: Array.isArray(response?.fields) ? response.fields : [],
        formatJson: response.formatJson || '',
      });
      setTransformError(null);
    } catch (error) {
      message.error(`执行转换失败：${error?.message || error}`);
      setTransformError(error);
      setTransformResult(null);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { key: 'parse', label: '解析' },
    { key: 'convert', label: '转换' },
    { key: 'knowledge', label: '帮助中心' },
  ];

  const resultColumns = [
    { title: 'no', dataIndex: 'no', key: 'no', width: 60 },
    { title: 'meta', dataIndex: 'meta', key: 'meta', width: 120 },
    { title: 'name', dataIndex: 'name', key: 'name', width: 150 },
    { title: 'value', dataIndex: 'value', key: 'value', style: { wordWrap: 'break-word', wordBreak: 'break-all', maxWidth: 300 } },
  ];

  /**
   * 按“显示空值”开关过滤字段列表
   * showEmptyFlag=false 时，过滤掉 value 为空字符串/null/undefined 的行
   */
  const filterFieldsByShowEmpty = (fields, showEmptyFlag) => {
    const list = Array.isArray(fields) ? fields : [];
    if (showEmptyFlag) {
      return list;
    }
    return list.filter((fieldItem) => {
      if (!fieldItem || typeof fieldItem !== 'object') {
        return false;
      }
      const fieldValue = fieldItem.value;
      return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
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
        <h4 style={{ color: '#f5222d', marginBottom: '8px' }}>解析失败</h4>
        <p>{parseError.message || '执行解析失败，请稍后重试'}</p>
        {parseError.code && (
          <p style={{ color: '#f5222d', margin: '8px 0 0 0' }}>
            <span style={{ fontWeight: 'bold' }}>错误码：</span>
            {parseError.code}
          </p>
        )}
      </div>
    );
  };

  // 转换错误展示，仅保留错误标题与错误码
  const renderTransformError = () => {
    if (!transformError) return null;
    const errorMessage = transformError.message
      || transformError.responseData?.error?.message
      || transformError.data?.error?.message
      || '执行转换失败，请稍后重试';

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
        <h4 style={{ color: '#f5222d', marginBottom: '8px' }}>转换失败</h4>
        <p>{errorMessage}</p>
        {transformError.code && (
          <p style={{ color: '#f5222d', margin: '8px 0 0 0' }}>
            <span style={{ fontWeight: 'bold' }}>错误码：</span>
            {transformError.code}
          </p>
        )}
      </div>
    );
  };

  // 获取页面标题（与旧版本一致）
  const getPageTitle = () => {
    const titles = {
      parse: '解析',
      convert: '转换',
      knowledge: '帮助中心'
    };
    return titles[activeKey] || 'Wp Editor';
  };

  // 将 docToc（带 level 的扁平数组）转换为 antd Tree 所需的树形结构
  const buildDocTree = (items) => {
    const roots = [];
    const stack = [];

    items.forEach((item) => {
      const node = {
        title: item.title,
        key: item.id,
        path: item.path,
        level: item.level,
        children: [],
      };

      // 根据 level 维护父子关系
      while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        roots.push(node);
      } else {
        stack[stack.length - 1].children.push(node);
      }

      stack.push(node);
    });

    return roots;
  };

  // 解析 SUMMARY.md 为简单的文档目录
  const parseSummary = (markdownText) => {
    const lines = markdownText.split(/\r?\n/);
    const items = [];
    lines.forEach((line) => {
      const match = line.match(/^(\s*)- \[(.+?)\]\((.+?)\)/);
      if (match) {
        const indent = match[1] || '';
        const title = match[2];
        const path = match[3];
        const level = Math.floor(indent.length / 2);
        items.push({ id: `${title}-${path}`, title, path, level });
      }
    });
    return items;
  };

  const loadDocContent = async (docPath) => {
    if (!docPath) return;
    setDocLoading(true);
    try {
      const response = await fetch(`/doc/${docPath}`);
      if (!response.ok) {
        setDocContent(`无法加载文档：${docPath} (HTTP ${response.status})`);
        return;
      }
      const text = await response.text();
      setDocContent(text);
    } catch (error) {
      setDocContent(`加载文档失败：${String(error)}`);
    } finally {
      setDocLoading(false);
    }
  };

  // 当进入帮助中心时，加载 SUMMARY.md 并初始化文档目录
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch('/doc/SUMMARY.md');
        if (!response.ok) {
          return;
        }
        const text = await response.text();
        const items = parseSummary(text);
        setDocToc(items);
        if (!activeDoc && items.length > 0) {
          const firstDoc = items.find((item) => item.path && item.path.endsWith('.md')) || items[0];
          setActiveDoc(firstDoc);
          loadDocContent(firstDoc.path);
        }
      } catch (error) {
        // ignore, 在 UI 中通过内容区域提示
        setDocContent(`加载文档目录失败：${String(error)}`);
      }
    };

    if (activeKey === 'knowledge' && docToc.length === 0) {
      loadSummary();
    }
  }, [activeKey, docToc.length, activeDoc]);

  return (
    <>
      <aside className="side-nav" data-group="simulate-debug">
        <button
          type="button"
          className={`side-item ${activeKey === 'parse' ? 'is-active' : ''}`}
          onClick={() => setActiveKey('parse')}
        >
        <h2>解析</h2>
        </button>
        <button
          type="button"
          className={`side-item ${activeKey === 'convert' ? 'is-active' : ''}`}
          onClick={() => setActiveKey('convert')}
        >
          <h2>转换</h2>
        </button>
        <button
          type="button"
          className={`side-item ${activeKey === 'knowledge' ? 'is-active' : ''}`}
          onClick={() => setActiveKey('knowledge')}
        >
          <h2>帮助中心</h2>
        </button>
      </aside>

      <section className="page-panels">
        <article className="panel is-visible">
          <header className="panel-header">
            <h2>{getPageTitle()}</h2>
          </header>
          <section className="panel-body simulate-body">
            {/* 解析页面 */}
            {activeKey === 'parse' && (
              <>
                <div className="panel-block">
                  <div className="block-header">
                    <div>
                      <h3>日志数据</h3>
                      <p className="block-desc">粘贴实时采集的原始日志，支持文本与文件导入。</p>
                    </div>
                    <div className="block-actions">
                      <button type="button" className="btn tertiary" onClick={handleExample}>
                        一键示例
                      </button>
                      <button type="button" className="btn ghost" onClick={handleClear}>
                        一键清空
                      </button>
                    </div>
                  </div>
                  <MonacoEditor
                    className="code-area"
                    value={inputValue}
                    onChange={(value) => setInputValue(value)}
                    language="text"
                    options={{
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbers: 'off',
                      wordWrap: 'on',
                      fontSize: 14,
                    }}
                  />
                </div>

                <div className="split-layout">
                  <div className="split-col">
                  <div className="panel-block panel-block--stretch">
                    <div className="block-header">
                      <h3>解析规则</h3>
                      <div className="block-actions">
                        <button
                          type="button"
                          className="btn primary"
                          onClick={handleTest}
                          disabled={loading}
                        >
                          {loading ? '解析中...' : '解析'}
                        </button>
                      </div>
                    </div>
                    <MonacoEditor
                      className="code-area code-area--large"
                      value={ruleValue}
                      onChange={(value) => setRuleValue(value)}
                      language="text"
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'off',
                        wordWrap: 'on',
                        fontSize: 14,
                      }}
                    />
                  </div>
                </div>

                  <div className="split-col">
                    <div className="panel-block panel-block--stretch panel-block--scrollable">
                      <div className="block-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <h3>解析结果</h3>
                          <div className="mode-toggle">
                            <button
                              type="button"
                              className={`toggle-btn ${viewMode === 'table' ? 'is-active' : ''}`}
                              onClick={() => setViewMode('table')}
                            >
                              表格模式
                            </button>
                            <button
                              type="button"
                              className={`toggle-btn ${viewMode === 'json' ? 'is-active' : ''}`}
                              onClick={() => setViewMode('json')}
                            >
                              JSON 模式
                            </button>
                          </div>
                        </div>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={showEmpty}
                            onChange={(e) => setShowEmpty(e.target.checked)}
                          />
                          <span className="switch-slider"></span>
                          <span className="switch-label">显示空值</span>
                        </label>
                      </div>
                      <div className={`mode-content ${viewMode === 'table' ? 'is-active' : ''}`}>
                        {parseError ? (
                          renderParseError()
                        ) : result ? (
                          <Table
                              size="small"
                              columns={resultColumns}
                              dataSource={filterFieldsByShowEmpty(result.fields, showEmpty)}
                              pagination={false}
                              rowKey="no"
                              className="data-table compact"
                              scroll={{ y: 400 }}
                            />
                        ) : (
                          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                            点击"解析"按钮查看结果
                          </div>
                        )}
                      </div>
                      <div className={`mode-content ${viewMode === 'json' ? 'is-active' : ''}`}>
                        {parseError ? (
                          renderParseError()
                        ) : result ? (
                          <pre className="code-block" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                            {(() => {
                            if (result.formatJson) {
                              try {
                                const parsed = JSON.parse(result.formatJson);
                                return JSON.stringify(parsed, null, 2);
                              } catch (_e) {
                                // 如果不是严格 JSON 字符串，则按原样输出
                                return result.formatJson;
                              }
                            }
                            return JSON.stringify(
                              {
                                ...result,
                                fields: filterFieldsByShowEmpty(
                                  result.fields,
                                  showEmpty,
                                ),
                              },
                              null,
                              2,
                            );
                          })()}
                          </pre>
                        ) : (
                          <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                            点击"解析"按钮查看结果
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
                    <div className="block-header">
                      <div>
                        <h3>OML 输入</h3>
                        <p className="block-desc">根据解析结果补齐转换逻辑。</p>
                      </div>
                      <div className="block-actions">
                        <button
                          type="button"
                          className="btn primary"
                          onClick={handleTransform}
                          disabled={loading}
                        >
                          {loading ? '转换中...' : '转换'}
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setTransformOml('')}
                        >
                          清空
                        </button>
                      </div>
                    </div>
                    <MonacoEditor
                      className="code-area code-area--large"
                      value={transformOml}
                      onChange={(value) => setTransformOml(value)}
                      language="text"
                      options={{
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        lineNumbers: 'off',
                        wordWrap: 'on',
                        fontSize: 14,
                      }}
                    />
                  </div>
                </div>
                <div className="split-col transform-col">
                  <div className="panel-block panel-block--scrollable">
                    <div className="block-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h3>解析结果</h3>
                        <div className="mode-toggle">
                          <button
                            type="button"
                            className={`toggle-btn ${transformParseViewMode === 'table' ? 'is-active' : ''}`}
                            onClick={() => setTransformParseViewMode('table')}
                          >
                            表格模式
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${transformParseViewMode === 'json' ? 'is-active' : ''}`}
                            onClick={() => setTransformParseViewMode('json')}
                          >
                            JSON 模式
                          </button>
                        </div>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={transformParseShowEmpty}
                          onChange={(e) => setTransformParseShowEmpty(e.target.checked)}
                        />
                        <span className="switch-slider"></span>
                        <span className="switch-label">显示空值</span>
                      </label>
                    </div>
                    <div className={`mode-content ${transformParseViewMode === 'table' ? 'is-active' : ''}`}>
                      {transformParseResult ? (
                        <Table
                          size="small"
                          columns={resultColumns}
                          dataSource={filterFieldsByShowEmpty(
                            transformParseResult.fields,
                            transformParseShowEmpty,
                          )}
                          pagination={false}
                          rowKey="no"
                          className="data-table compact"
                          scroll={{ y: 300 }}
                        />
                      ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          解析结果将显示在这里
                        </div>
                      )}
                    </div>
                    <div className={`mode-content ${transformParseViewMode === 'json' ? 'is-active' : ''}`}>
                      {transformParseResult ? (
                        <pre className="code-block" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                          {JSON.stringify(
                            {
                              ...transformParseResult,
                              fields: filterFieldsByShowEmpty(
                                transformParseResult.fields,
                                transformParseShowEmpty,
                              ),
                            },
                            null,
                            2,
                          )}
                        </pre>
                      ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          解析结果将显示在这里
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="panel-block panel-block--scrollable">
                    <div className="block-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <h3>转换结果</h3>
                        <div className="mode-toggle">
                          <button
                            type="button"
                            className={`toggle-btn ${transformResultViewMode === 'table' ? 'is-active' : ''}`}
                            onClick={() => setTransformResultViewMode('table')}
                          >
                            表格模式
                          </button>
                          <button
                            type="button"
                            className={`toggle-btn ${transformResultViewMode === 'json' ? 'is-active' : ''}`}
                            onClick={() => setTransformResultViewMode('json')}
                          >
                            JSON 模式
                          </button>
                        </div>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={transformResultShowEmpty}
                          onChange={(e) => setTransformResultShowEmpty(e.target.checked)}
                        />
                        <span className="switch-slider"></span>
                        <span className="switch-label">显示空值</span>
                      </label>
                    </div>
                    <div className={`mode-content ${transformResultViewMode === 'table' ? 'is-active' : ''}`}>
                      {transformError ? (
                        renderTransformError()
                      ) : transformResult ? (
                        <Table
                          size="small"
                          columns={resultColumns}
                          dataSource={filterFieldsByShowEmpty(
                            transformResult.fields,
                            transformResultShowEmpty,
                          )}
                          pagination={false}
                          rowKey="no"
                          className="data-table compact"
                          scroll={{ y: 300 }}
                        />
                      ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          转换结果将显示在这里
                        </div>
                      )}
                    </div>
                    <div className={`mode-content ${transformResultViewMode === 'json' ? 'is-active' : ''}`}>
                      {transformError ? (
                        renderTransformError()
                      ) : transformResult ? (
                        <pre className="code-block" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                          {(() => {
                            if (transformResult.formatJson) {
                              try {
                                const parsed = JSON.parse(transformResult.formatJson);
                                if (transformResultShowEmpty) {
                                  return JSON.stringify(parsed, null, 2);
                                }
                                return JSON.stringify(
                                  filterEmptyFields(parsed),
                                  null,
                                  2
                                );
                              } catch (_e) {
                                return transformResult.formatJson;
                              }
                            }
                            return JSON.stringify(
                              {
                                ...transformResult,
                                fields: filterFieldsByShowEmpty(
                                  transformResult.fields,
                                  transformResultShowEmpty,
                                ),
                              },
                              null,
                              2,
                            );
                          })()}
                        </pre>
                      ) : (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                          转换结果将显示在这里
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 帮助中心页面 */}
            {activeKey === 'knowledge' && (
              <div
                className="docs-layout"
                style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'stretch',
                }}
              >
                <aside
                  className="docs-sidenav"
                  style={{
                    width: '260px',
                    padding: '16px 12px',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    overflow: 'hidden',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      marginBottom: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: '#6b7280',
                    }}
                  >
                    文档目录
                  </div>
                  {docToc.length > 0 ? (
                    <Tree
                      treeData={buildDocTree(docToc)}
                      selectedKeys={activeDoc ? [activeDoc.id] : []}
                      blockNode
                      titleRender={(node) => (
                        <span
                          style={{
                            display: 'block',
                            padding: '4px 8px',
                            borderRadius: 8,
                            color: '#1b2533',
                            fontWeight: node.level === 0 ? 600 : 400,
                            fontSize: 14,
                          }}
                        >
                          {node.title}
                        </span>
                      )}
                      onSelect={(keys, info) => {
                        const { node } = info;
                        if (!node || !node.path) return;
                        const selected = {
                          id: node.key,
                          title: node.title,
                          path: node.path,
                          level: typeof node.level === 'number' ? node.level : 0,
                        };
                        setActiveDoc(selected);
                        loadDocContent(node.path);
                      }}
                      style={{
                        height: '100%',
                        overflowY: 'auto',
                        fontSize: '14px',
                        fontFamily:
                          '"PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif',
                        background: '#f9fafb',
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                      暂无文档目录或 SUMMARY.md 加载失败
                    </div>
                  )}
                </aside>

                <main
                  className="docs-content"
                  style={{
                    flex: 1,
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    background: '#ffffff',
                    padding: '20px 24px',
                    maxHeight: 'calc(100vh - 220px)',
                    overflowY: 'auto',
                  }}
                >
                  {docLoading ? (
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>文档加载中...</p>
                  ) : docContent && docContent.trim().length > 0 ? (
                    <div className="markdown-body">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1
                              style={{
                                fontSize: '26px',
                                fontWeight: 700,
                                margin: '0 0 18px',
                                color: '#111827',
                              }}
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              style={{
                                fontSize: '22px',
                                fontWeight: 600,
                                margin: '28px 0 14px',
                                borderBottom: '1px solid #e5e7eb',
                                paddingBottom: '6px',
                                color: '#111827',
                              }}
                              {...props}
                            />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3
                              style={{
                                fontSize: '18px',
                                fontWeight: 600,
                                margin: '22px 0 10px',
                                color: '#111827',
                              }}
                              {...props}
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p
                              style={{
                                margin: '8px 0',
                                fontSize: '14px',
                                lineHeight: 1.7,
                                color: '#374151',
                              }}
                              {...props}
                            />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul
                              style={{
                                paddingLeft: '1.5em',
                                margin: '8px 0',
                                fontSize: '14px',
                                color: '#374151',
                              }}
                              {...props}
                            />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol
                              style={{
                                paddingLeft: '1.5em',
                                margin: '8px 0',
                                fontSize: '14px',
                                color: '#374151',
                              }}
                              {...props}
                            />
                          ),
                          li: ({ node, ...props }) => (
                            <li
                              style={{
                                margin: '4px 0',
                              }}
                              {...props}
                            />
                          ),
                          code: ({ inline, node, ...props }) => (
                            inline ? (
                              <code
                                style={{
                                  background: 'rgba(15,23,42,0.04)',
                                  padding: '1px 4px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                }}
                                {...props}
                              />
                            ) : (
                              <code
                                style={{
                                  display: 'block',
                                  background: '#0b1020',
                                  color: '#e5e7eb',
                                  padding: '12px 14px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  whiteSpace: 'pre-wrap',
                                  wordWrap: 'break-word',
                                  fontFamily:
                                    'Menlo, Monaco, Consolas, "Courier New", monospace',
                                }}
                                {...props}
                              />
                            )
                          ),
                          a: ({ node, ...props }) => (
                            <a
                              style={{ color: '#2563eb', textDecoration: 'none' }}
                              {...props}
                            />
                          ),
                          table: ({ node, ...props }) => (
                            <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                              <table
                                style={{
                                  width: '100%',
                                  borderCollapse: 'collapse',
                                  fontSize: '13px',
                                  color: '#374151',
                                }}
                                {...props}
                              />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead
                              style={{
                                background: 'rgba(17,24,39,0.03)',
                              }}
                              {...props}
                            />
                          ),
                          th: ({ node, ...props }) => (
                            <th
                              style={{
                                border: '1px solid #e5e7eb',
                                padding: '6px 10px',
                                textAlign: 'left',
                                fontWeight: 600,
                              }}
                              {...props}
                            />
                          ),
                          td: ({ node, ...props }) => (
                            <td
                              style={{
                                border: '1px solid #e5e7eb',
                                padding: '6px 10px',
                                verticalAlign: 'top',
                              }}
                              {...props}
                            />
                          ),
                        }}
                      >
                        {docContent}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>请选择左侧目录中的文档进行查看。</p>
                  )}
                </main>
              </div>
            )}
          </section>
        </article>
      </section>
    </>
  );
}

export default SimulateDebugPage;
