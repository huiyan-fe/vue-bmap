/** 示例站的地图版本 / ak 管理（对应 react-bmap examples 的 MapModeContext）。 */
import type { BMapVersion } from '@baidumap/vue-bmap';

export const EXAMPLE_AK = (import.meta as any).env?.VITE_BMAP_AK as string;

/** 当前版本：从 URL 的 ?v= 读取，reload 后不丢失。 */
export function getMapVersion(): BMapVersion {
  const params = new URLSearchParams(window.location.search);
  return (params.get('v') as BMapVersion) || '4.0';
}

/** 切换版本：改 URL 并 reload，加载新版本 SDK。 */
export function setMapVersion(v: BMapVersion): void {
  const url = new URL(window.location.href);
  url.searchParams.set('v', v);
  window.location.href = url.toString();
}
