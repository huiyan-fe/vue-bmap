/**
 * Vue provide/inject 注入键 —— 替代 react-bmap 的 React Context。
 *
 * - BMAP_KEY：Provider 下发的加载状态（含 driver），响应式 shallowRef。
 * - MAP_KEY：Map 组件下发的 { map, driver }，响应式 shallowRef（map 就绪前为 null）。
 * - OVERLAY_TARGET_KEY：父级覆盖物（如 Marker）下发的挂载目标，供子级（如 InfoWindow/Label）识别。
 *
 * 关键约定：所有句柄（driver / map / overlay handle）都放在 shallowRef 里或普通对象里，
 * **绝不能进 reactive 深代理**，否则 Vue 的 Proxy 会破坏 SDK 内部状态。
 */
import { inject, type InjectionKey, type ShallowRef } from 'vue';
import type { BMapVersion, LoaderStatus, MapHandle, OverlayHandle } from '../types';
import type { BMapDriver } from '../drivers/types';

export interface BMapContextValue {
  status: LoaderStatus;
  driver: BMapDriver | null;
  version: BMapVersion;
  error: Error | null;
}

export interface MapContextValue {
  map: MapHandle | null;
  driver: BMapDriver;
}

export type OverlayTargetType = 'clusterer' | 'overlay' | 'marker' | 'map';

export interface OverlayTargetStore {
  type: OverlayTargetType;
  /** 父级 handle（父级尚未挂载时为 null）；响应式，子级 watch 即可感知就绪 */
  handle: ShallowRef<OverlayHandle | MapHandle | null>;
  addOverlay?: (overlay: OverlayHandle) => void;
  removeOverlay?: (overlay: OverlayHandle) => void;
}

export const BMAP_KEY: InjectionKey<ShallowRef<BMapContextValue>> = Symbol('vue-bmap:context');
export const MAP_KEY: InjectionKey<ShallowRef<MapContextValue | null>> = Symbol('vue-bmap:map');
export const OVERLAY_TARGET_KEY: InjectionKey<OverlayTargetStore> = Symbol('vue-bmap:overlay-target');

/** 读取 Provider 状态；不在 Provider 内时返回 loading 兜底。 */
export function useBMapContext(): ShallowRef<BMapContextValue> {
  const ctx = inject(BMAP_KEY, null);
  if (!ctx) {
    throw new Error('[vue-bmap] 组件必须用在 <BMapProvider> 内部');
  }
  return ctx;
}

/** 读取当前 <Map> 上下文；不在 <Map> 内时返回 null（供检索类 composable 安全回退）。 */
export function useMapContextOptional(): ShallowRef<MapContextValue | null> | null {
  return inject(MAP_KEY, null);
}

/** 读取当前 <Map> 上下文；不在 <Map> 内时抛错。 */
export function useMapContext(): ShallowRef<MapContextValue | null> {
  const ctx = inject(MAP_KEY, null);
  if (!ctx) {
    throw new Error('[vue-bmap] 组件必须用在 <Map> 内部');
  }
  return ctx;
}
