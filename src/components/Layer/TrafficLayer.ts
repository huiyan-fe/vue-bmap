/**
 * TrafficLayer —— 路况图层（手写组件，继承 TileLayer）。
 * 对应 react-bmap 的 Layer/TrafficLayer.tsx。
 *
 * 组件方式：
 * ```vue
 * <TrafficLayer auto-refresh :refresh-interval="300000"
 *   :colors="['#00ff00', '#ffff00', '#ff8800', '#ff0000']" :edge="true" />
 * ```
 *
 * 为什么不用通用 createLayerComponent 工厂：
 * - SDK 的 BMap.TrafficLayer 构造函数只接受 {autoRefresh, refreshInterval}（v3 另有 predictDate）；
 *   colors / edge 不是构造参数，必须通过实例方法 setColors(string[]) / setEdge(boolean) 应用。
 * - 通用工厂会把所有 prop 塞进构造函数，colors / edge 会被 SDK 忽略 → 自定义颜色不生效。
 *
 * 实现要点（与 react 对齐）：
 * - constructor 选项（autoRefresh / refreshInterval / predictDate）变化 → 重建图层
 * - colors 变化 → raw.setColors()
 * - edge 变化 → raw.setEdge()
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface TrafficLayerOptions {
  /** v4: 是否自动刷新路况数据 */
  autoRefresh?: boolean;
  /** v4: 路况自动刷新间隔，单位毫秒 */
  refreshInterval?: number;
  /** v3: 预测日期 */
  predictDate?: { weekday: number; hour: number };
}

export interface TrafficLayerProps extends TrafficLayerOptions {
  /** v4+: 路况颜色 [畅通, 缓行, 拥堵, 严重拥堵]，变化时调用 raw.setColors() */
  colors?: string[];
  /** v4+: 是否显示白边，变化时调用 raw.setEdge() */
  edge?: boolean;
}

export const TrafficLayer = defineComponent({
  name: 'TrafficLayer',
  props: {
    autoRefresh: { type: Boolean, default: undefined },
    refreshInterval: { type: Number, default: undefined },
    predictDate: { type: Object as PropType<TrafficLayerProps['predictDate']>, default: undefined },
    colors: { type: Array as PropType<string[]>, default: undefined },
    edge: { type: Boolean, default: undefined },
  },
  setup(props) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <TrafficLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;

    // 构造期选项变化 → 重建；colors / edge 不进 ctorKey（走 setColors / setEdge）
    const ctorKey = computed(() => stableStringify([
      props.autoRefresh, props.refreshInterval, props.predictDate,
    ]));

    const applyColors = () => {
      if (!handle?.raw || !props.colors) return;
      try { (handle.raw as any).setColors?.(props.colors); } catch (e) { debugWarn('TrafficLayer.setColors', e); }
    };
    const applyEdge = () => {
      if (!handle?.raw || props.edge === undefined) return;
      try { (handle.raw as any).setEdge?.(props.edge); } catch (e) { debugWarn('TrafficLayer.setEdge', e); }
    };

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      if (props.autoRefresh !== undefined) opts.autoRefresh = props.autoRefresh;
      if (props.refreshInterval !== undefined) opts.refreshInterval = props.refreshInterval;
      if (props.predictDate !== undefined) opts.predictDate = props.predictDate;

      const h = driver.createTrafficLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);
      // 重建后把 colors / edge 重新喂一遍
      applyColors();
      applyEdge();
    };

    const destroy = () => {
      const ctx = mapCtx.value;
      if (handle && ctx?.map) { try { ctx.driver.removeLayer(ctx.map, handle); } catch { /* ignore */ } }
      handle = null;
    };

    watch([() => mapCtx.value?.map, ctorKey], () => { destroy(); create(); }, { immediate: true });

    // colors 变化 → setColors
    watch(() => (props.colors ? props.colors.join(',') : ''), applyColors);
    // edge 变化 → setEdge
    watch(() => props.edge, applyEdge);

    onUnmounted(destroy);
    return () => null;
  },
});
