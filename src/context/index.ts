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
import { hasInjectionContext, inject, type InjectionKey, type ShallowRef } from 'vue';
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
/**
 * 「早期」地图上下文：地图实例一创建就下发（tilesloaded 之前），用于需要在首帧瓦片绘制前
 * 就挂到地图上的「地图配置型」覆盖物（如 MapMask），避免首帧未加掩膜再加掩膜的闪烁。
 * ⚠️ 仅限非 GL 敏感的配置型覆盖物使用；Marker 等 GL 覆盖物仍须走 MAP_KEY（tilesloaded 之后），
 * 否则会命中 SDK 首帧纹理未就绪的崩溃。
 */
export const EARLY_MAP_KEY: InjectionKey<ShallowRef<MapContextValue | null>> = Symbol('vue-bmap:map-early');
export const OVERLAY_TARGET_KEY: InjectionKey<OverlayTargetStore> = Symbol('vue-bmap:overlay-target');

/**
 * 在 inject 之前区分两类失败，给出可定位的提示：
 * - 不在任何组件注入上下文中（onMounted 的 await 之后 / 定时器 / 事件回调 / 异步请求）→ 提示调用时机
 * - 在组件内但没找到 provide → 由调用方提示必须放在 <BMapProvider>/<Map> 内
 * 提前判断也能避免 Vue 自身 "inject() can only be used inside setup()" 的告警干扰。
 */
function assertInjectionContext(api: string): void {
  if (!hasInjectionContext()) {
    throw new Error(
      `[vue-bmap] ${api} 必须在 setup() 中同步调用：` +
        '不能在 onMounted 的 await 之后、定时器、事件回调或异步请求回调中调用（此时注入上下文已丢失）。',
    );
  }
}

/** 读取 Provider 状态；不在 Provider 内（或不在 setup 上下文中）时抛错。 */
export function useBMapContext(): ShallowRef<BMapContextValue> {
  assertInjectionContext('useBMapContext');
  const ctx = inject(BMAP_KEY, null);
  if (!ctx) {
    throw new Error('[vue-bmap] 组件必须用在 <BMapProvider> 内部');
  }
  return ctx;
}

/** 读取当前 <Map> 上下文；不在 <Map> 内或不在注入上下文中时返回 null（供检索类 composable 安全回退）。 */
export function useMapContextOptional(): ShallowRef<MapContextValue | null> | null {
  if (!hasInjectionContext()) return null;
  return inject(MAP_KEY, null);
}

/** 读取当前 <Map> 上下文；不在 <Map> 内时抛错。 */
export function useMapContext(): ShallowRef<MapContextValue | null> {
  assertInjectionContext('useMapContext');
  const ctx = inject(MAP_KEY, null);
  if (!ctx) {
    throw new Error('[vue-bmap] 组件必须用在 <Map> 内部');
  }
  return ctx;
}
