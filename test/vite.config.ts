import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// 功能测试工程：把 `@baidumap/vue-bmap` 指向源码，改库即时生效。
// 从仓库根目录读取 .env（VITE_BMAP_AK），与 examples 共用同一份 ak。
export default defineConfig({
  root: __dirname,
  envDir: resolve(__dirname, '..'),
  plugins: [vue()],
  resolve: {
    alias: {
      '@baidumap/vue-bmap': resolve(__dirname, '../src/index.ts'),
    },
  },
  server: { host: true, port: 8091 },
});
