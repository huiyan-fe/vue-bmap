import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// 示例站：把 `@baidumap/vue-bmap` 直接指向源码，改库即时生效（无需先 build）。
export default defineConfig({
  root: __dirname,
  envDir: __dirname,
  // 用相对路径引用资源：产物可部署到任意子路径（如 BOS 桶前缀），避免 /assets 指向域名根导致 404
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@baidumap/vue-bmap': resolve(__dirname, '../src/index.ts'),
    },
  },
  build: {
    // 构建产物输出到仓库根目录的 docs/（在 examples 根之外，需 emptyOutDir 允许清理）
    outDir: resolve(__dirname, '../docs'),
    emptyOutDir: true,
  },
  server: { host: true, port: 5273 },
});
