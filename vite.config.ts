import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({
  base: './',
  build: { rollupOptions: { input: { main: resolve(__dirname, 'index.html'), app: resolve(__dirname, 'app/index.html'), library: resolve(__dirname, 'library/index.html') } } },
});
