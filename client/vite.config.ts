import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // SSE stream — needs special handling to prevent Vite buffering chunks
      '/api/stream': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Disable response buffering so SSE events flush to the browser instantly
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Tell any intermediate proxy/middleware not to buffer this response
            proxyRes.headers['x-accel-buffering']  = 'no';
            proxyRes.headers['cache-control']       = 'no-cache';
            proxyRes.headers['content-type']        = 'text/event-stream';
          });
        },
      },
      // All other API calls — standard proxy
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
