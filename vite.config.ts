import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      outDir: 'dist',
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**', 'examples/**'],
      beforeWriteFile(filePath, content) {
        const seen = new Set<string>();
        const deduped = content
          .split('\n')
          .filter((line) => {
            if (!line.startsWith('/// <reference')) return true;
            if (seen.has(line)) return false;
            seen.add(line);
            return true;
          })
          .join('\n');
        return { filePath, content: deduped };
      },
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueBMap',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['vue', '@baidumap/jsapi-loader'],
      output: {
        globals: { vue: 'Vue' },
      },
    },
    sourcemap: false,
    emptyOutDir: true,
  },
});
