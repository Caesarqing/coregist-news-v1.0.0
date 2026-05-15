import { defineConfig } from 'vite';
// @ts-ignore: allow plugin import even if moduleResolution differs
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
      '@': path.resolve(__dirname, './'),
      '@coregist/contracts': path.resolve(__dirname, '../packages/contracts/src/index.ts'),
    },
  },
  // Remove custom css.preprocessorOptions.css to satisfy current TS types
  server: {
    open: true,
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
});
