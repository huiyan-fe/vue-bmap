/**
 * usePlaceDetail —— 地点详情 composable。对应 react-bmap 的 usePlaceDetail。
 * SDK：render(uid) / rerender() / setData(data) / dispose()
 * render() 是异步的（SDK 内部发请求获取详情），loading 在 render 后保持 true。
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { useBMapContext } from '../context';
import { UnsupportedCapabilityError } from '../drivers/unsupported';
import { stableStringify } from '../utils/stableStringify';

export interface PlaceDetailOptions {
  container?: HTMLElement;
  compact?: boolean;
  renderOptions?: unknown;
  /** 必须传**已就绪**的 MapHandle（非 null）；见 `useMap`/`useMapReady` 时序说明。 */
  map?: unknown;
}

export interface PlaceDetailHookResult {
  data: Ref<unknown>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  supported: Ref<boolean>;
  render: (uid: string) => void;
  rerender: () => void;
  dispose: () => void;
}

export function usePlaceDetail(opts: PlaceDetailOptions = {}): PlaceDetailHookResult {
  const bmap = useBMapContext();
  let raw: any = null;
  let requestId = 0;
  let renderTimer: ReturnType<typeof setTimeout> | null = null;

  const data = ref<unknown>(undefined);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  const optKey = () => stableStringify({ compact: opts.compact, ro: opts.renderOptions, container: opts.container });

  const clearTimer = () => {
    if (renderTimer !== null) { clearTimeout(renderTimer); renderTimer = null; }
  };
  /** 释放已有实例与待触发定时器（卸载或重建前调用）。 */
  const teardown = () => {
    clearTimer();
    try { raw?.dispose?.(); } catch { /* SDK dispose 失败忽略 */ }
    raw = null;
  };

  const init = () => {
    // 重建前先释放旧实例（driver/options 变化会重跑本函数），避免旧 PlaceDetail 泄漏
    teardown();
    const driver = bmap.value.driver;
    if (!driver) return;
    const container = opts.container ?? document.createElement('div');

    const searchOpts: Record<string, unknown> = { container };
    if (opts.compact !== undefined) searchOpts.compact = opts.compact;
    if (opts.renderOptions !== undefined) searchOpts.renderOptions = opts.renderOptions;

    const handle = driver.createPlaceDetail(searchOpts);
    if (handle.isNull) {
      data.value = undefined;
      loading.value = false;
      error.value = new UnsupportedCapabilityError('PlaceDetail', driver.version);
      supported.value = false;
      return;
    }
    raw = handle.raw;

    supported.value = true;
    error.value = null;
  };

  watch([() => bmap.value.driver, optKey], init, { immediate: true });
  onScopeDispose(() => { teardown(); });

  const render = (uid: string) => {
    if (!raw) return;
    const my = ++requestId;
    clearTimer();
    loading.value = true;
    error.value = null;
    try {
      const container = opts.container as HTMLElement | undefined;
      if (container) container.innerHTML = '';
      // render 接受字符串 uid，SDK 内部异步请求详情数据
      raw.render?.(uid);
      // SDK 异步渲染，延迟清除 loading；卸载/重建/再次 render 时该定时器会被 clearTimer 取消，
      // requestId 守卫再兜一层，避免过期回调写 ref
      renderTimer = setTimeout(() => {
        if (my !== requestId) return;
        renderTimer = null;
        data.value = { uid };
        loading.value = false;
      }, 500);
    } catch (e) {
      loading.value = false;
      error.value = e as Error;
    }
  };

  const rerender = () => { raw?.rerender?.(); };
  const dispose = () => { requestId++; clearTimer(); raw?.dispose?.(); data.value = undefined; };

  return { data, loading, error, supported, render, rerender, dispose };
}
