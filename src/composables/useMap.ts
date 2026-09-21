import { computed, type ComputedRef } from 'vue';
import { useMapContext } from '../context';
import type { MapHandle } from '../types';

/**
 * 拿当前 <Map> 的 MapHandle（响应式，可能为 null）。
 * 地图首帧渲染完成前为 null；<Map> 内部子组件拿到时通常已就绪。
 */
export function useMap(): ComputedRef<MapHandle | null> {
  const ctx = useMapContext();
  return computed(() => ctx.value?.map ?? null);
}
