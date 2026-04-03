import '@ant-design/v5-patch-for-react-19';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/styles/theme.css';
import { configureRequest } from '@/services/request';
import 'github-markdown-css/github-markdown-light.css';
import '@/i18n';

// 禁用 React DevTools 下载提示（仅开发环境）
if (typeof window !== 'undefined') {
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.inject({ renderers: new Map() });
}

// 初始化全局请求配置，使 httpRequest 使用 /api 作为后端前缀
configureRequest();

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('未找到 id 为 root 的 DOM 元素，无法挂载应用。');
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <App />
    </BrowserRouter>
  </StrictMode>
);
