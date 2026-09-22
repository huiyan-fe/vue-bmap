/**
 * useConvertor —— 坐标转换 composable。对应 react-bmap 的 useConvertor。
 * SDK 方法：translate(points, from?, to?, callback?)
 *
 * 与原生 SDK 的差异（2.0.3 起）：
 *   原生 translate 把所有点拼进一个 URL 发一个请求，不做分批——coords 服务端上限约 100 点、
 *   且点数多了会撞 URL 长度限制，>100 点会静默失败。本 composable 在其之上按 100 自动分批、
 *   并发请求再按 index 顺序合并，对外仍是一次 translate(points) 调用，让 >100 点也能用。
 *   并发是安全的：SDK 每个请求用随机 JSONP 回调名，不会串扰；JSONP 走 script 标签，
 *   浏览器对同域并发连接本就有上限（约 6），等于自动限流，不必自己做串行/信号量。
 */
import { onScopeDispose, ref, watch, type Ref } from 'vue';
import { useBMapContext } from '../context';
import { UnsupportedCapabilityError } from '../drivers/unsupported';
import { getSDK } from '../utils/sdk';
import { useServiceTimeout, serviceTimeoutError } from './useServiceTimeout';
import type { Point } from '../types';
import type { TranslateResults } from '../types/results';

/** 百度 coords 服务单次请求的点数上限（服务端约束 + URL 长度）。 */
const TRANSLATE_MAX_POINTS = 100;

export interface ConvertorHookResult {
  data: Ref<TranslateResults | undefined>;
  loading: Ref<boolean>;
  error: Ref<Error | null>;
  supported: Ref<boolean>;
  translate: (points: Point[], from?: number, to?: number) => void;
  cancel: () => void;
}

export function useConvertor(): ConvertorHookResult {
  const bmap = useBMapContext();
  let raw: any = null;
  let requestId = 0;
  const { arm, clear } = useServiceTimeout();

  const data = ref<TranslateResults | undefined>(undefined);
  const loading = ref(false);
  const error = ref<Error | null>(null);
  const supported = ref(true);

  const init = () => {
    const driver = bmap.value.driver;
    if (!driver) return;
    const handle = driver.createConvertor();
    if (handle.isNull) {
      data.value = undefined;
      loading.value = false;
      error.value = new UnsupportedCapabilityError('Convertor', driver.version);
      supported.value = false;
      return;
    }
    raw = handle.raw;
    supported.value = true;
    error.value = null;
  };
  watch(() => bmap.value.driver, init, { immediate: true });
  onScopeDispose(() => { raw = null; });

  const translate = (points: Point[], from?: number, to?: number) => {
    if (!raw) return;
    const my = ++requestId;
    loading.value = true; error.value = null;
    try {
      const SDK = getSDK();
      // 按 100 个点分批（translate 单次上限）
      const chunks: Point[][] = [];
      for (let i = 0; i < points.length; i += TRANSLATE_MAX_POINTS) {
        chunks.push(points.slice(i, i + TRANSLATE_MAX_POINTS));
      }
      if (chunks.length === 0) {
        clear();
        data.value = { status: 0, points: [] }; loading.value = false; error.value = null; supported.value = true;
        return;
      }
      // 整体挂一个超时兜底：任一批卡住导致迟迟不齐时，把 loading 收回并抛错
      arm(() => { if (my !== requestId) return; loading.value = false; error.value = serviceTimeoutError(); });
      // 并发发起所有批次（JSONP 回调名随机，不会串扰；script 标签受浏览器同域连接数天然限流）；
      // 结果按 index 落位保序，全部到齐后合并
      const results: any[] = new Array(chunks.length);
      let remaining = chunks.length;
      chunks.forEach((chunk, idx) => {
        const pts = chunk.map((p) => new SDK.Point(p.lng, p.lat));
        const cb = (result: any) => {
          if (my !== requestId) return;
          results[idx] = result;
          if (--remaining > 0) return;
          clear();
          if (chunks.length === 1) {
            // 单批：原样回填 SDK 结果（保留 size() 等原生字段）
            data.value = results[0]; loading.value = false; error.value = null; supported.value = true;
            return;
          }
          // 多批：按顺序合并为 { status, points }；任一批非 0 status 带出
          const mergedPoints: Point[] = [];
          let badStatus: number | undefined;
          for (const r of results) {
            if (r && r.status !== 0 && r.status !== undefined) badStatus = r.status;
            if (r?.points) mergedPoints.push(...r.points);
          }
          data.value = { status: badStatus ?? 0, points: mergedPoints }; loading.value = false; error.value = null; supported.value = true;
        };
        raw.translate?.(pts, from, to, cb);
      });
    } catch (e) {
      clear();
      if (my === requestId) { loading.value = false; error.value = e as Error; }
    }
  };

  const cancel = () => { requestId++; clear(); loading.value = false; };

  return { data, loading, error, supported, translate, cancel };
}
