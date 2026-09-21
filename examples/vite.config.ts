import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// 示例站：把 `@baidumap/vue-bmap` 直接指向源码，改库即时生效（无需先 build）。
export default defineConfig({
  root: __dirname,
  envDir: __dirname,
  plugins: [vue()],
  resolve: {
    alias: {
      '@baidumap/vue-bmap': resolve(__dirname, '../src/index.ts'),
    },
  },
  server: { host: true, port: 5273 },
});
