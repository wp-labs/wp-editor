import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'antd': ['antd', '@ant-design/icons', '@ant-design/pro-components'],
          'vendor-react': ['react', 'react-dom', 'react-router', 'react-router-dom'],
          'markdown': ['react-markdown', 'remark-gfm', 'github-markdown-css'],
        },
      },
    },
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
