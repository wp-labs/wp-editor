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
          // node_modules 按包分割
          if (id.includes('node_modules')) {
            // React + Ant Design 合并为单 chunk，避免相互依赖导致初始化顺序问题
            if (id.includes('/node_modules/react/') ||
                id.includes('/node_modules/react-dom/') ||
                id.includes('/node_modules/scheduler/') ||
                id.includes('antd') ||
                id.includes('@ant-design') ||
                id.includes('rc-')) {
              return 'vendor-ui';
            }
            // CodeMirror
            if (id.includes('@codemirror') || id.includes('@lezer')) {
              return 'vendor-codemirror';
            }
            // 语法高亮（独立分组，避免循环依赖）
            if (id.includes('react-syntax-highlighter') || id.includes('refractor') || id.includes('prismjs')) {
              return 'vendor-highlighter';
            }
            // Markdown 相关（按需加载）
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype') ||
                id.includes('mdast') || id.includes('micromark') || id.includes('unist') || id.includes('hast')) {
              return 'vendor-markdown';
            }
            // 路由
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            // 其他工具库
            if (id.includes('dayjs') || id.includes('ahooks') || id.includes('diff') ||
                id.includes('i18next') || id.includes('axios') || id.includes('@seed-fe')) {
              return 'vendor-utils';
            }
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
