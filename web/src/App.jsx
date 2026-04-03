import { useState, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { App as AntdApp, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import SimulateDebugPage from '@/views/pages/simulate-debug';
import { useGitHubStarReminder } from '@/hooks/useGitHubStarReminder';
import Header from '@/views/components/Header';
import WechatModal from '@/views/components/WechatModal';
import GitHubStarModal from '@/views/components/GitHubStarModal';

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

function App() {
  const [wechatModalOpen, setWechatModalOpen] = useState(false);
  const [antdLocale, setAntdLocale] = useState(enUS);
  const { showReminder, closeReminder, goToGitHub } = useGitHubStarReminder();

  // 初始化时根据保存的语言设置 Ant Design locale
  useEffect(() => {
    const savedLang = localStorage.getItem('language') || 'en-US';
    setAntdLocale(savedLang === 'zh-CN' ? zhCN : enUS);
  }, []);

  return (
    <ConfigProvider locale={antdLocale} theme={theme}>
      <AntdApp>
        <div className="app-shell">
          <Header onWechatClick={() => setWechatModalOpen(true)} onLocaleChange={setAntdLocale} />
          <div className="app-shell-body">
            <div className="main-content">
              <Routes>
                <Route path="/" element={<SimulateDebugPage />} />
                <Route path="/simulate-debug" element={<SimulateDebugPage />} />
                <Route path="*" element={<SimulateDebugPage />} />
              </Routes>
            </div>
          </div>

          <WechatModal open={wechatModalOpen} onCancel={() => setWechatModalOpen(false)} />
          <GitHubStarModal open={showReminder} onCancel={closeReminder} onGoToGitHub={goToGitHub} />
        </div>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
