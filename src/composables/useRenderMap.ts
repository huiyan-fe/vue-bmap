/**
 * 解析 service composable 在地图上渲染结果所用的 map handle（Vue 版）。
 *
 * 优先级：
 * 1. 显式传入的 `renderOptions.map`（最高，外层用法必须这样传）；
 * 2. 否则回退到当前所在 `<Map>` 子树的 context map —— 即 composable 被用在 `<Map>` **内部**时自动获取；
 * 3. 都没有则 `undefined`（composable 用在 `<Map>` 外层且未显式传）。
 *
 * 这里用 `useMapContextOptional()` 而不是 `useMapContext()`：后者在 `<Map>` 外会抛错，
 * 而 service composable 恰恰常用在 `<Map>` 外层，取不到 context 时安全回退到 null 即可。
 *
 * 返回的是 **computed**：map context 是响应式 shallowRef，地图从未就绪(null)变为就绪(handle)时
 * computed 重算，供调用方的 watch 依赖它、把 map 挂到服务上。
 */
import { computed, type ComputedRef } from 'vue';
import { useMapContextOptional } from '../context';
import { isHandle } from '../utils/handle';
import type { MapHandle } from '../types';

export function useRenderMap(explicit?: unknown): ComputedRef<MapHandle | undefined> {
  const mapCtx = useMapContextOptional();
  return computed(() => {
    const picked = explicit ?? mapCtx?.value?.map ?? undefined;
    return isHandle(picked) ? (picked as MapHandle) : undefined;
  });
}
