import { defineComponent, h } from 'vue';
import { BMapProvider } from '@baidumap/vue-bmap';
import type { BMapVersion } from '@baidumap/vue-bmap';

// 测试用 ak：来源为仓库根目录 .env 的 VITE_BMAP_AK
export const TEST_AK = (import.meta as any).env?.VITE_BMAP_AK as string;
export const BEIJING = { lng: 116.402544, lat: 39.928216 };
export const DEFAULT_VERSION: BMapVersion = '4.0';

/** 从 URL query 读取版本（fallback localStorage，再 fallback default） */
export function readVersionFromLocation(): BMapVersion {
  if (typeof window === 'undefined') return DEFAULT_VERSION;
  const v = new URLSearchParams(window.location.search).get('version');
  if (v) return v as BMapVersion;
  const stored = localStorage.getItem('bmap-test-version');
  return (stored as BMapVersion) || DEFAULT_VERSION;
}

/** 切换版本：写入 URL 并刷新（JSAPI 全局单例，必须刷新重载脚本） */
export function switchVersion(version: BMapVersion): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('bmap-test-version', version);
  const url = new URL(window.location.href);
  url.searchParams.set('version', version);
  window.location.href = url.toString();
}

/** App 级 Provider：按当前 version 加载对应 JSAPI（对齐 react-bmap test 的 AppProvider）。 */
export const AppProvider = defineComponent({
  name: 'AppProvider',
  props: { version: { type: String, required: true } },
  setup(props, { slots }) {
    const isV4 = props.version !== '3.0';
    return () => h(
      BMapProvider as any,
      {
        ak: TEST_AK,
        version: props.version,
        unsupportedBehavior: 'warn',
        timeout: 15000,
        globalConfig: isV4 ? { apiVersion: '4.0', coordType: 'bd09ll' } : undefined,
        onError: (err: Error) => console.error('[test] BMapProvider onError:', err),
        onLoadConflict: (current: unknown, requested: unknown) => console.warn('[test] load conflict:', { current, requested }),
      },
      {
        fallback: () => h('div', { style: 'padding:24px;text-align:center' }, `加载地图 API（version=${props.version}）中...`),
        error: () => h('div', { style: 'padding:24px;color:red' }, `地图 API 加载失败（version=${props.version}）`),
        default: () => slots.default?.(),
      },
    );
  },
});
