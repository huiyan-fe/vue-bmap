/**
 * useLocalSearch —— 本地搜索 composable。对应 react-bmap 的 useLocalSearch。
 *
 * Vue 设计规范（对齐 useGeocoder）：
 * - 参数用 options 对象；driver / 依赖 key 变化触发 service 重建（watch immediate）
 * - action 方法为普通函数，稳定引用
 * - requestId 防过期请求 + useServiceTimeout 超时兜底
 * - 卸载清理走 onScopeDispose
 *
 * 用法：
 * ```ts
 * const {
 *   data, loading, error, supported,
 *   search, searchNearby, searchInBounds, gotoPage, clearResults, cancel,
 * } = useLocalSearch({
 *   location: '北京',
 *   pageCapacity: 10,
 *   renderOptions: { map, autoViewport: true },
 *   onSearchComplete: (results) => { ... },
 *   onMarkersSet: (pois) => { ... },
 * });
 * ```
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { useBMapContext } from '../context';
import { UnsupportedCapabilityError } from '../drivers/unsupported';
import { stableStringify } from '../utils/stableStringify';
import { isHandle, unwrapHandle } from '../utils/handle';
import { getSDK } from '../utils/sdk';
import { useRenderMap } from './useRenderMap';
import { useServiceTimeout, serviceTimeoutError } from './useServiceTimeout';
import type { ServiceHandle, Point, Bounds } from '../types';

// ─── 类型 ───

export interface LocalSearchRenderOptions {
  /**
   * 在地图上渲染结果用的 MapHandle。**非必传**：composable 在 `<Map>` 内部会自动取当前地图；
   * 在 `<Map>` 外层则需显式传**已就绪**的 handle（用 `useMap`/`useMapReady` 拿）。显式传入优先。
   */
  map?: { __brand: string; raw: unknown };
  panel?: string | HTMLElement;
  selectFirstResult?: boolean;
  autoViewport?: boolean;
  viewportOptions?: { noAnimation?: boolean; margins?: number[]; zoomFactor?: number };
}

export interface LocalSearchOptions {
  /** 搜索城市/区域，可为字符串、Point 或 Map。**非必传**：缺省时自动回退到当前 `<Map>`（或 `renderOptions.map`），与原生 `new BMap.LocalSearch(map, {...})` 一致 */
  location?: string | Point | { __brand: string; raw: unknown };
  /** 每页结果数（1-100） */
  pageCapacity?: number;
  /** 页码（v4+） */
  pageNum?: number;
  /**
   * 是否自动在地图上渲染检索结果（默认 true，与原生一致）。
   * 传 `false`＝**仅取数据**：不把地图注入 renderOptions.map，且缺省 location 时用地图中心点（而非 Map 实例）
   * 作检索区域——避免 SDK 因拿到 Map 引用而自动画默认标注。适合"取数据后自绘标注"（如门店选址）。
   */
  autoRender?: boolean;
  /** 渲染选项 */
  renderOptions?: LocalSearchRenderOptions;
  /** 搜索完成回调 */
  onSearchComplete?: (results: unknown) => void;
  /** 标注设置回调 */
  onMarkersSet?: (pois: unknown[]) => void;
  /** 信息窗回调 */
  onInfoHtmlSet?: (poi: unknown, html: HTMLElement) => void;
  /** 结果面板回调 */
  onResultsHtmlSet?: (container: HTMLElement) => void;
  /** 折线添加完成回调（对应 setPolylinesSetCallback） */
  onPolylinesSet?: (polylines: unknown[]) => void;
}

export interface LocalSearchHookResult<T = unknown> {
  data: Ref<T | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  supported: Ref<boolean>;
  /** 搜索（支持多关键词数组） */
  search: (keyword: string | string[], option?: { forceLocal?: boolean }) => void;
  /** 周边搜索 */
  searchNearby: (keyword: string | string[], center: string | Point, radius: number) => void;
  /** 范围搜索 */
  searchInBounds: (keyword: string | string[], bounds: Bounds) => void;
  /** 翻页 */
  gotoPage: (page: number) => void;
  /** 清空结果 */
  clearResults: () => void;
  /** 选中/高亮某条结果并打开其信息窗；index 为结果索引 */
  select: (index: number) => void;
  /** 取消选中：关掉信息窗 + 清结果列表选中态 */
  clearSelected: () => void;
  /** 运行时设置检索城市/区域（字符串 / Point / Map） */
  setLocation: (location: string | Point | { __brand: string; raw: unknown }) => void;
  /** 开启检索后自动调整视野 */
  enableAutoViewport: () => void;
  /** 关闭自动调整视野 */
  disableAutoViewport: () => void;
  /** 开启「自动选中第一个结果」 */
  enableFirstResultSelection: () => void;
  /** 关闭「自动选中第一个结果」 */
  disableFirstResultSelection: () => void;
  /** 运行时设置每页结果数（1-100） */
  setPageCapacity: (n: number) => void;
  /** 最近一次检索的状态码（BMAP_STATUS_*） */
  getStatus: () => number | undefined;
  /** 取消当前请求 */
  cancel: () => void;
}

// ─── Composable ───

export function useLocalSearch<T = unknown>(opts: LocalSearchOptions = {}): LocalSearchHookResult<T> {
  const bmap = useBMapContext();
  const renderMap = useRenderMap(opts.renderOptions?.map);
  let svc: ServiceHandle | null = null;
  let raw: any = null;
  let requestId = 0;
  const { arm, clear } = useServiceTimeout();

  const data = ref<T | undefined>(undefined) as Ref<T | undefined>;
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  // 构造参数 key（location/pageCapacity/pageNum/renderOptions 变化时重建）
  const locKey = () => stableStringify(opts.location);
  const optKey = () => stableStringify({ pc: opts.pageCapacity, pn: opts.pageNum, ro: opts.renderOptions, ar: opts.autoRender });

  const init = () => {
    const driver = bmap.value.driver;
    if (!driver) return;

    // 构造 renderOptions，把 MapHandle 解包成 raw（显式传入优先，否则回退到 <Map> 内的 context map）
    const dataOnly = opts.autoRender === false;
    const ro: Record<string, unknown> = {};
    if (opts.renderOptions) Object.assign(ro, opts.renderOptions);
    if (dataOnly) delete ro.map;                       // 仅取数据：不注入地图 → 不自动渲染
    else if (renderMap.value) ro.map = unwrapHandle(renderMap.value);

    const searchOpts: Record<string, unknown> = {};
    if (opts.pageCapacity !== undefined) searchOpts.pageCapacity = opts.pageCapacity;
    if (opts.pageNum !== undefined) searchOpts.pageNum = opts.pageNum;
    if (Object.keys(ro).length > 0) searchOpts.renderOptions = ro;

    // 解包 location；缺省时回退到当前 <Map>/renderOptions.map（与原生 new BMap.LocalSearch(map, ...) 一致）。
    // 但 dataOnly 时不能把 Map 当 location——SDK 拿到 Map 会自动把结果标注画上去；改用地图中心点作检索区域。
    let loc: unknown = '';
    if (opts.location !== undefined) {
      loc = unwrapHandle(opts.location);
    } else if (renderMap.value) {
      if (dataOnly) {
        try {
          const c = driver.getCenter(renderMap.value);
          const SDK = getSDK();
          loc = (c && SDK?.Point) ? new SDK.Point(c.lng, c.lat) : '';
        } catch { loc = ''; }
      } else {
        loc = unwrapHandle(renderMap.value);
      }
    }

    const handle = driver.createLocalSearch(loc, Object.keys(searchOpts).length > 0 ? searchOpts : undefined);
    svc = handle;
    raw = handle.raw;

    if (handle.isNull) {
      data.value = undefined;
      loading.value = false;
      error.value = new UnsupportedCapabilityError('LocalSearch', driver.version);
      supported.value = false;
      return;
    }

    // 注册回调
    const r = raw;
    if (typeof r.setSearchCompleteCallback === 'function') {
      r.setSearchCompleteCallback((results: unknown) => { opts.onSearchComplete?.(results); });
    }
    if (typeof r.setMarkersSetCallback === 'function' && opts.onMarkersSet) {
      r.setMarkersSetCallback((pois: unknown[]) => { opts.onMarkersSet?.(pois); });
    }
    if (typeof r.setInfoHtmlSetCallback === 'function' && opts.onInfoHtmlSet) {
      r.setInfoHtmlSetCallback((poi: unknown, html: HTMLElement) => { opts.onInfoHtmlSet?.(poi, html); });
    }
    if (typeof r.setResultsHtmlSetCallback === 'function' && opts.onResultsHtmlSet) {
      r.setResultsHtmlSetCallback((container: HTMLElement) => { opts.onResultsHtmlSet?.(container); });
    }
    if (typeof r.setPolylinesSetCallback === 'function' && opts.onPolylinesSet) {
      r.setPolylinesSetCallback((polylines: unknown[]) => { opts.onPolylinesSet?.(polylines); });
    }

    supported.value = true;
    error.value = null;
  };

  watch([() => bmap.value.driver, locKey, optKey, renderMap], init, { immediate: true });
  onScopeDispose(() => { svc = null; raw = null; });

  // 内部：执行搜索 + 请求保护
  const doSearch = (action: () => void) => {
    if (!raw) return;
    const my = ++requestId;
    loading.value = true;
    error.value = null;
    arm(() => {
      if (my !== requestId) return;
      loading.value = false;
      error.value = serviceTimeoutError();
    });
    // 先注册回调，再调搜索（SDK 要求回调在 search 之前注册）
    const r = raw;
    if (r && typeof r.setSearchCompleteCallback === 'function') {
      r.setSearchCompleteCallback((results: unknown) => {
        if (my !== requestId) return;
        clear();
        opts.onSearchComplete?.(results);
        data.value = results as T;
        loading.value = false;
        error.value = null;
        supported.value = true;
      });
    }
    try {
      action();
    } catch (e) {
      clear();
      if (my === requestId) {
        loading.value = false;
        error.value = e as Error;
      }
    }
  };

  const search = (keyword: string | string[], option?: { forceLocal?: boolean }) => {
    if (!raw) return;
    doSearch(() => {
      if (option?.forceLocal !== undefined) {
        raw.search?.(keyword, option);
      } else {
        raw.search?.(keyword);
      }
    });
  };

  const searchNearby = (keyword: string | string[], center: string | Point, radius: number) => {
    if (!raw) return;
    doSearch(() => {
      let c: unknown = center;
      if (isHandle(c)) {
        c = c.raw;
      } else if (c && typeof c === 'object' && 'lng' in c) {
        // 纯 { lng, lat } 对象 → SDK Point 实例
        const p = c as { lng: number; lat: number };
        const SDK = getSDK();
        c = new SDK.Point(p.lng, p.lat);
      }
      raw.searchNearby?.(keyword, c, radius);
    });
  };

  const searchInBounds = (keyword: string | string[], bounds: Bounds) => {
    if (!raw) return;
    doSearch(() => {
      let b: unknown = bounds;
      if (isHandle(b)) {
        b = b.raw;
      } else if (b && typeof b === 'object' && 'sw' in b) {
        // 纯 { sw: {lng,lat}, ne: {lng,lat} } → SDK Bounds 实例
        const bd = b as { sw: { lng: number; lat: number }; ne: { lng: number; lat: number } };
        const SDK = getSDK();
        b = new SDK.Bounds(new SDK.Point(bd.sw.lng, bd.sw.lat), new SDK.Point(bd.ne.lng, bd.ne.lat));
      }
      raw.searchInBounds?.(keyword, b);
    });
  };

  const gotoPage = (page: number) => {
    if (!raw) return;
    const my = ++requestId;
    loading.value = true;
    error.value = null;
    try {
      raw.gotoPage?.(page);
    } catch (e) {
      if (my === requestId) {
        loading.value = false;
        error.value = e as Error;
      }
    }
    const r = raw;
    if (r && typeof r.setSearchCompleteCallback === 'function') {
      r.setSearchCompleteCallback((results: unknown) => {
        if (my !== requestId) return;
        opts.onSearchComplete?.(results);
        data.value = results as T;
        loading.value = false;
        error.value = null;
        supported.value = true;
      });
    }
  };

  const clearResults = () => {
    if (!raw) return;
    try { raw.clearResults?.(); } catch { /* noop */ }
    data.value = undefined;
    loading.value = false;
  };

  const cancel = () => {
    requestId++;
    clear();
    loading.value = false;
  };

  const select = (index: number) => {
    try { raw?.select?.(index); } catch { /* noop */ }
  };

  const clearSelected = () => {
    try { raw?.clearSelected?.(); } catch { /* noop */ }
  };

  const setLocation = (location: string | Point | { __brand: string; raw: unknown }) => {
    if (!raw) return;
    let l: unknown = location;
    if (isHandle(l)) {
      l = l.raw;
    } else if (l && typeof l === 'object' && 'lng' in l) {
      const p = l as { lng: number; lat: number };
      const SDK = getSDK();
      l = new SDK.Point(p.lng, p.lat);
    }
    raw.setLocation?.(l);
  };

  const enableAutoViewport = () => { raw?.enableAutoViewport?.(); };
  const disableAutoViewport = () => { raw?.disableAutoViewport?.(); };
  const enableFirstResultSelection = () => { raw?.enableFirstResultSelection?.(); };
  const disableFirstResultSelection = () => { raw?.disableFirstResultSelection?.(); };
  const setPageCapacity = (n: number) => { raw?.setPageCapacity?.(n); };
  const getStatus = (): number | undefined => raw?.getStatus?.();

  return {
    data, loading, error, supported,
    search, searchNearby, searchInBounds, gotoPage, clearResults,
    select, clearSelected, setLocation,
    enableAutoViewport, disableAutoViewport,
    enableFirstResultSelection, disableFirstResultSelection,
    setPageCapacity, getStatus, cancel,
  };
}
