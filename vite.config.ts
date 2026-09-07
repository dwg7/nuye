import { defineConfig } from 'vite';

export default defineConfig({
  base: '/nuye/',
  build: {
    outDir: 'docs'
  },
  optimizeDeps: {
    exclude: ['maplibre-gl']
  }
});
