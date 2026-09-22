/**
 * useBusLineSearch —— 公交线路搜索 composable。对应 react-bmap 的 useBusLineSearch。
 * SDK：getBusList(keyword) / getBusLine(item) / enableAutoViewport / disableAutoViewport / setLocation / getStatus
 * 回调：setGetBusListCompleteCallback / setGetBusLineCompleteCallback
 * 注意：SDK 的 BusLineSearch 没有原生 clearResults，clearResults() 只清 hook 的 data 状态（地图渲染不受影响）。
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { useBMapContext } from '../context';
import { UnsupportedCapabilityError } from '../drivers/unsupported';
import { stableStringify } from '../utils/stableStringify';
import { unwrapHandle } from '../utils/handle';
import { useRenderMap } from './useRenderMap';
import { fallbackLocation } from './renderHelpers';
import { useServiceTimeout, serviceTimeoutError } from './useServiceTimeout';

export interface BusLineSearchOptions {
  location?: unknown;
  /** renderOptions.map 非必传：`<Map>` 内部自动取当前地图，外层需显式传已就绪 handle；见 `useMap`/`useMapReady`。 */
  renderOptions?: { map?: unknown; panel?: string | HTMLElement; autoViewport?: boolean };
  /** 是否自动在地图上渲染线路（默认 true）。传 false＝仅取数据：不注入地图、缺省 location 用中心点，避免自动画线路。 */
  autoRender?: boolean;
  onGetBusListComplete?: (results: unknown) => void;
  onGetBusLineComplete?: (results: unknown) => void;
}

export interface BusLineSearchHookResult {
  data: Ref<unknown>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  supported: Ref<boolean>;
  getBusList: (keyword: string) => void;
  getBusLine: (item: unknown) => void;
  /** 只清 hook 的 data 状态；SDK 无原生 clear，地图上已渲染的线路不受影响 */
  clearResults: () => void;
  /** 开启检索后自动调整视野 */
  enableAutoViewport: () => void;
  /** 关闭自动调整视野 */
  disableAutoViewport: () => void;
  /** 运行时设置检索城市/区域 */
  setLocation: (location: unknown) => void;
  /** 最近一次检索的状态码（BMAP_STATUS_*） */
  getStatus: () => number | undefined;
  cancel: () => void;
}

export function useBusLineSearch(opts: BusLineSearchOptions = {}): BusLineSearchHookResult {
  const bmap = useBMapContext();
  const renderMap = useRenderMap(opts.renderOptions?.map);
  let raw: any = null;
  let requestId = 0;
  const { arm, clear } = useServiceTimeout();
  let cb: ((results: unknown) => void) | null = null;

  const data = ref<unknown>(undefined);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  const locKey = () => stableStringify(opts.location);
  const optKey = () => stableStringify({ ar: opts.autoRender, ro: opts.renderOptions });

  const init = () => {
    const driver = bmap.value.driver;
    if (!driver) return;
    const dataOnly = opts.autoRender === false;
    const ro: Record<string, unknown> = {};
    if (opts.renderOptions) Object.assign(ro, opts.renderOptions);
    if (dataOnly) delete ro.map;
    else if (renderMap.value) ro.map = unwrapHandle(renderMap.value);
    const searchOpts: Record<string, unknown> = {};
    // location 缺省时回退到当前 <Map>（dataOnly 用中心点而非 Map，避免自动渲染）
    if (opts.location !== undefined) {
      searchOpts.location = unwrapHandle(opts.location);
    } else {
      const loc = fallbackLocation(driver, renderMap.value, dataOnly);
      if (loc !== '') searchOpts.location = loc;
    }
    if (Object.keys(ro).length > 0) searchOpts.renderOptions = ro;
    // 构造时注册回调 — 通过 cb 转发最新回调
    searchOpts.onGetBusListComplete = (results: unknown) => { cb?.(results); opts.onGetBusListComplete?.(results); };
    searchOpts.onGetBusLineComplete = (results: unknown) => { cb?.(results); opts.onGetBusLineComplete?.(results); };

    const handle = driver.createBusLineSearch(Object.keys(searchOpts).length > 0 ? searchOpts : undefined);
    if (handle.isNull) {
      data.value = undefined;
      loading.value = false;
      error.value = new UnsupportedCapabilityError('BusLineSearch', driver.version);
      supported.value = false;
      return;
    }
    raw = handle.raw;
    const r = raw;
    if (typeof r.setGetBusListCompleteCallback === 'function') {
      r.setGetBusListCompleteCallback((results: unknown) => { cb?.(results); opts.onGetBusListComplete?.(results); });
    }
    if (typeof r.setGetBusLineCompleteCallback === 'function') {
      r.setGetBusLineCompleteCallback((results: unknown) => { cb?.(results); opts.onGetBusLineComplete?.(results); });
    }
    supported.value = true;
    error.value = null;
  };

  watch([() => bmap.value.driver, locKey, optKey, renderMap], init, { immediate: true });
  onScopeDispose(() => { raw = null; cb = null; });

  const getBusList = (keyword: string) => {
    if (!raw) return;
    const my = ++requestId;
    loading.value = true;
    error.value = null;
    arm(() => {
      if (my !== requestId) return;
      loading.value = false;
      error.value = serviceTimeoutError();
    });
    const r = raw;
    cb = (results: unknown) => {
      if (my !== requestId) return;
      clear();
      data.value = results;
      loading.value = false;
      error.value = null;
      supported.value = true;
    };
    try { r.getBusList?.(keyword); }
    catch (e) { clear(); if (my === requestId) { loading.value = false; error.value = e as Error; } }
  };

  const getBusLine = (item: unknown) => {
    if (!raw) return;
    const my = ++requestId;
    loading.value = true;
    error.value = null;
    arm(() => {
      if (my !== requestId) return;
      loading.value = false;
      error.value = serviceTimeoutError();
    });
    const r = raw;
    cb = (results: unknown) => {
      if (my !== requestId) return;
      clear();
      data.value = results;
      loading.value = false;
      error.value = null;
      supported.value = true;
    };
    try { r.getBusLine?.(item); }
    catch (e) { clear(); if (my === requestId) { loading.value = false; error.value = e as Error; } }
  };

  const clearResults = () => {
    try { raw?.clearResults?.(); } catch { /* noop */ }
    data.value = undefined;
    loading.value = false;
  };
  const enableAutoViewport = () => { raw?.enableAutoViewport?.(); };
  const disableAutoViewport = () => { raw?.disableAutoViewport?.(); };
  const setLocation = (location: unknown) => { raw?.setLocation?.(unwrapHandle(location)); };
  const getStatus = () => raw?.getStatus?.();
  const cancel = () => { requestId++; clear(); loading.value = false; };

  return { data, loading, error, supported, getBusList, getBusLine, clearResults, enableAutoViewport, disableAutoViewport, setLocation, getStatus, cancel };
}
