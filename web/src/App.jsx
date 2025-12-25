import React, { useState, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import SimulateDebugPage from '@/views/pages/simulate-debug';
import httpRequest from '@/services/request';

// Ant Design 自定义主题配置
const theme = {
  token: {
    colorPrimary: '#275efe',
    colorSuccess: '#17b26a',
    colorWarning: '#f79009',
    colorError: '#f1554c',
    colorInfo: '#12a6e8',
    colorTextBase: '#1b2533',
    colorBgBase: '#ffffff',
    borderRadius: 12,
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif',
  },
};

// 简化版导航栏组件，只包含logo展示
function SimpleHeader() {
  const [versionInfo, setVersionInfo] = useState({ wpEditer: '', warpParse: '', warpEngine: '' });

  // 获取版本信息：wp-editer 与 warp-parse/warp-engine
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await httpRequest.get('/version');
        setVersionInfo({
          wpEditer: response?.wp_editer || '',
          warpParse: response?.warp_parse || '',
          warpEngine: response?.warp_engine || '',
        });
      } catch (error) {
        // 忽略版本获取失败，不影响主流程
      }
    };

    fetchVersion();
  }, []);

  return (
    <header className="main-header">
      <div className="brand" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <img src="/assets/images/index.png" alt="WpEditer" className="logo" style={{ height: '70px' }} />
        <span className="divider">|</span>
        {/* 确保显示subtitle */}
        <span className="subtitle" style={{ marginRight: 10, color: '#fff', fontSize: '20px', fontWeight: '600' }}>Wp Editor</span>
        {/* 确保版本信息始终显示 */}
        <span
          className="version-info"
          style={{ marginLeft: 8, fontSize: 12, color: '#fff', display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.1)', padding: '5px 10px', borderRadius: '4px' }}
        >
          {versionInfo.wpEditer && (
            <span style={{ marginRight: 8 }}>wp-editer: {versionInfo.wpEditer}</span>
          )}<br/>
          {/* 显示warp-engine，如果没有则显示warp-parse */}
          {(versionInfo.warpEngine || versionInfo.warpParse) ? (
            <span>{versionInfo.warpEngine ? 'warp-engine' : 'warp-parse'}: {versionInfo.warpEngine || versionInfo.warpParse}</span>
          ) : (
            <span style={{ opacity: 0.7 }}>warp-engine: -</span>
          )}
        </span>
      </div>
    </header>
  );
}

function App() {
  return (
    <ConfigProvider locale={zhCN} theme={theme}>
      <div className="app-shell">
        <SimpleHeader />
        <div className="app-shell-body">
          <div className="main-content">
            <Routes>
              <Route path="/" element={<SimulateDebugPage />} />
              <Route path="/simulate-debug" element={<SimulateDebugPage />} />
              <Route path="*" element={<SimulateDebugPage />} />
            </Routes>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}

export default App;
