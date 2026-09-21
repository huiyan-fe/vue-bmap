import { computed, type ComputedRef } from 'vue';
import { useMapContext } from '../context';
import { MapRefImpl, type MapRef } from '../components/Map/MapRef';

/**
 * 命令式操作地图的句柄（已转发 driver 全量方法，是日常首选）。
 * 响应式：map/driver 就绪后自动可用，未就绪时为 null。
 */
export function useMapRef(): ComputedRef<MapRef | null> {
  const ctx = useMapContext();
  return computed(() => {
    const c = ctx.value;
    return c?.map ? new MapRefImpl(c.map, c.driver) : null;
  });
}
