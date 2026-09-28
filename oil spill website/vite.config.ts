import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Proxy API and simulation output requests to your backend server (e.g. FastAPI / Flask / Express on localhost:8000)
      proxy: {
        '/api': {
          target: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/pipeline_runs': {
          target: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/static_outputs': {
          target: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
        '/outputs': {
          target: process.env.BACKEND_URL || 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
