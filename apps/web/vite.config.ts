import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
