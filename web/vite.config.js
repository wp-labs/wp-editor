import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
  ],
  esbuild: {
    target: 'es2020',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // 开发态依赖预构建：减少 node_modules 碎片化请求数量
  optimizeDeps: {
    // 强制重新预构建，避免沿用旧缓存导致碎片请求
    force: true,
    // 关闭预构建 sourcemap，减少开发态 *.map 请求
    esbuildOptions: {
      sourcemap: false,
    },
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-router-dom',
      'antd',
      '@ant-design/icons',
      'i18next',
      'react-i18next',
      'axios',
      '@seed-fe/request',
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/language',
      '@codemirror/autocomplete',
      'react-syntax-highlighter',
      'web-tree-sitter',
    ],
  },
  build: {
    // 使用 esbuild 压缩，比 terser 快很多
    minify: 'esbuild',
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 设置 chunk 大小警告限制
    chunkSizeWarningLimit: 600,
    // 优化输出
    rollupOptions: {
      output: {
        // 更细粒度的代码分割
        manualChunks(id) {
          // 将 Rollup/Vite 注入的公共运行时 helper 固定到 React 基础包，避免与 UI 包形成循环依赖
          if (
            id.includes('commonjsHelpers.js') ||
            id.includes('vite/preload-helper') ||
            id.includes('vite/modulepreload-polyfill')
          ) {
            return 'vendor-react';
          }

          // node_modules 按包分割
          if (id.includes('node_modules')) {
            // React 核心运行时单独分组，减小首屏阻塞与回源体积
            if (id.includes('/node_modules/react/') ||
                id.includes('/node_modules/react-dom/') ||
                id.includes('/node_modules/scheduler/')) {
              return 'vendor-react';
            }
            // Ant Design 生态独立分组，便于与 React 运行时分离加载
            if (
                id.includes('antd') ||
                id.includes('@ant-design') ||
                id.includes('rc-')) {
              return 'vendor-antd';
            }
            // 其余三方依赖统一合并，降低刷新时并发请求数量
            return 'vendor-app';
          }
        },
        // 优化文件命名
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // 关闭源码映射以减小体积
    sourcemap: false,
    // 设置目标浏览器，启用 BigInt 等现代特性
    target: 'es2020',
    // 启用 CSS 压缩
    cssMinify: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
