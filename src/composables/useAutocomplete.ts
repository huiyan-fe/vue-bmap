/**
 * useAutocomplete —— 输入提示 composable。对应 react-bmap 的 useAutocomplete。
 * SDK：search(keywords) / show / hide / setTypes / setLocation / getResults / setInputValue / dispose
 * 回调：onSearchComplete / onConfirm / onHighlight
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { useBMapContext } from '../context';
import { UnsupportedCapabilityError } from '../drivers/unsupported';
import { stableStringify } from '../utils/stableStringify';
import { unwrapHandle } from '../utils/handle';
import { useRenderMap } from './useRenderMap';
import { useServiceTimeout, serviceTimeoutError } from './useServiceTimeout';

export interface AutocompleteOptions {
  location?: unknown;
  types?: string[];
  input?: string | HTMLElement;
  /** renderOptions.map 非必传：`<Map>` 内部自动取当前地图，外层需显式传已就绪 handle；见 `useMap`/`useMapReady`。 */
  renderOptions?: { map?: unknown; panel?: string | HTMLElement };
  onSearchComplete?: (results: unknown) => void;
  /** 用户选中某条建议项时触发（对应 SDK 构造项 onConfirm / 原生 onconfirm 事件） */
  onConfirm?: (item: unknown) => void;
  /** 高亮项变化时触发（current, previous）（对应 SDK 构造项 onHighlight / 原生 onhighlight 事件） */
  onHighlight?: (current: unknown, previous?: unknown) => void;
}

export interface AutocompleteHookResult {
  data: Ref<unknown>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  supported: Ref<boolean>;
  search: (keywords: string) => void;
  show: () => void;
  hide: () => void;
  getResults: () => unknown;
  /** 设置绑定输入框的值 */
  setInputValue: (value: string) => void;
  /** 运行时设置返回结果类型限定 */
  setTypes: (types: string[]) => void;
  /** 运行时设置检索城市/区域 */
  setLocation: (location: unknown) => void;
  /** 最近一次的状态码 */
  getStatus: () => number | undefined;
  cancel: () => void;
}

export function useAutocomplete(opts: AutocompleteOptions = {}): AutocompleteHookResult {
  const bmap = useBMapContext();
  const renderMap = useRenderMap(opts.renderOptions?.map);
  let raw: any = null;
  let requestId = 0;
  const { arm, clear } = useServiceTimeout();
  // 默认回调转发器：输入框输入字符时自动触发 onSearchComplete；search() 时替换成带 requestId 的版本
  let cb: ((results: unknown) => void) | null = null;

  const data = ref<unknown>(undefined);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  const locKey = () => stableStringify(opts.location);
  const optKey = () => stableStringify({ types: opts.types, ro: opts.renderOptions, input: opts.input });

  /** 释放已有实例（卸载或重建前调用），避免下拉 DOM/监听泄漏。 */
  const teardown = () => {
    try { raw?.dispose?.(); } catch { /* SDK dispose 失败忽略 */ }
    raw = null;
  };

  const init = () => {
    // 重建前先释放旧实例（driver/location/options 变化会重跑本函数）
    teardown();
    const driver = bmap.value.driver;
    if (!driver) return;
    const searchOpts: Record<string, unknown> = {};
    // location 缺省时回退到当前 <Map>/renderOptions.map（与原生 new BMap.Autocomplete({location: map}) 一致）
    if (opts.location !== undefined) {
      searchOpts.location = unwrapHandle(opts.location);
    } else if (renderMap.value) {
      searchOpts.location = unwrapHandle(renderMap.value);
    }
    if (opts.types !== undefined) searchOpts.types = opts.types;
    if (opts.input !== undefined) searchOpts.input = opts.input;
    if (opts.renderOptions || renderMap.value) {
      const ro: Record<string, unknown> = {};
      if (opts.renderOptions) Object.assign(ro, opts.renderOptions);
      if (renderMap.value) ro.map = unwrapHandle(renderMap.value);
      searchOpts.renderOptions = ro;
    }
    searchOpts.onSearchComplete = (results: unknown) => { cb?.(results); opts.onSearchComplete?.(results); };
    // onConfirm / onHighlight 走 4.0 推荐的构造项（addEventListener('onconfirm') 已废弃）。
    searchOpts.onConfirm = (e: unknown) => {
      // 归一化确认事件：构造项 onConfirm 传的是选中项本身（含 value），
      // 而 addEventListener('onconfirm') 传的是 e.item.value。统一补齐成
      // { ...e, value, item: { value } }，让上层始终可用 e.item.value / e.value。
      const ev = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
      const value = (ev.item as { value?: unknown } | undefined)?.value ?? ev.value ?? e;
      opts.onConfirm?.({ ...ev, value, item: ev.item ?? { value } });
    };
    searchOpts.onHighlight = (current: unknown, previous?: unknown) => opts.onHighlight?.(current, previous);

    const handle = driver.createAutocomplete(searchOpts);
    if (handle.isNull) {
      data.value = undefined;
      loading.value = false;
      error.value = new UnsupportedCapabilityError('Autocomplete', driver.version);
      supported.value = false;
      return;
    }
    raw = handle.raw;
    // 设置默认回调 — 输入框输入字符时自动触发 onSearchComplete
    cb = (results: unknown) => {
      data.value = results;
      loading.value = false;
      error.value = null;
      supported.value = true;
    };
    supported.value = true;
    error.value = null;
  };

  watch([() => bmap.value.driver, locKey, optKey, renderMap], init, { immediate: true });
  onScopeDispose(() => { clear(); teardown(); cb = null; });

  const search = (keywords: string) => {
    if (!raw) return;
    const my = ++requestId;
    loading.value = true;
    error.value = null;
    // 超时兜底：SDK 不回调 onSearchComplete 时不至于 loading 永久卡死（对齐其它 service composable）
    arm(() => { if (my === requestId) { loading.value = false; error.value = serviceTimeoutError(); } });
    const r = raw;
    cb = (results: unknown) => {
      if (my !== requestId) return;
      clear();
      data.value = results;
      loading.value = false;
      error.value = null;
      supported.value = true;
    };
    if (typeof r.setSearchCompleteCallback === 'function') r.setSearchCompleteCallback(cb);
    try { r.search?.(keywords); }
    catch (e) { clear(); if (my === requestId) { loading.value = false; error.value = e as Error; } }
  };

  const show = () => { raw?.show?.(); };
  const hide = () => { raw?.hide?.(); };
  const getResults = () => raw?.getResults?.();
  const setInputValue = (value: string) => { raw?.setInputValue?.(value); };
  const setTypes = (types: string[]) => { raw?.setTypes?.(types); };
  const setLocation = (location: unknown) => { raw?.setLocation?.(unwrapHandle(location)); };
  const getStatus = () => raw?.getStatus?.();
  const cancel = () => { requestId++; clear(); loading.value = false; };

  return { data, loading, error, supported, search, show, hide, getResults, setInputValue, setTypes, setLocation, getStatus, cancel };
}
