import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        showcase: fileURLToPath(new URL('./index.html', import.meta.url)),
        integration: fileURLToPath(new URL('./integration/index.html', import.meta.url)),
      },
    },
  },
});
