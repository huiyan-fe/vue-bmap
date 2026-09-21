import { watch } from 'vue';
import { useMapContext } from '../context';
import type { MapHandle } from '../types';

/**
 * 哨兵 composable：在 `<Map>` **内部**使用，地图就绪后回调，把 MapHandle 上提到外层。
 *
 * 典型用途：service composable 挂在 `<Map>` 外层时，其 renderOptions.map 需要一个已就绪的 handle。
 * 与 `<Map @ready="...">` 等价，区别是它写在子组件里而非挂在 `<Map>` 的事件上。
 *
 * @param onReady 地图就绪时回调（handle 非 null）。
 */
export function useMapReady(onReady: (map: MapHandle) => void): void {
  const ctx = useMapContext();
  watch(() => ctx.value?.map, (m) => { if (m) onReady(m); }, { immediate: true });
}
