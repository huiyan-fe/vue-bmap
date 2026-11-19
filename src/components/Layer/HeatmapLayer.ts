/**
 * HeatmapLayer —— 热力图图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.Heatmap。
 *
 * 用法：
 * ```vue
 * <HeatmapLayer :data="geojson" :gradient="{0.25:'rgba(0,0,255,1)',1:'rgba(255,0,0,1)'}" :size="30" />
 * ```
 *
 * - `data`：GeoJSON（FeatureCollection / Feature[] / 含坐标的 plain object 数组），
 *   权重取每个 feature properties 的 `weightField` 字段（默认 `count`）。
 * - 构造项（size/unit/max/min/minOpacity/maxOpacity/gradient/weightField 等）变化 → 重建图层；
 *   `data` 变化 → 调 raw.setData()。
 * - 事件：click / mouseover / mouseout（事件对象带 value / pixel / latLng）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface HeatmapLayerOptions {
  /** 热力核半径（px），默认 20 */
  size?: number;
  /** 'px' | 'm'，默认 'px' */
  unit?: 'px' | 'm';
  /** 权重归一化上界，默认 100 */
  max?: number;
  /** 权重归一化下界，默认 0 */
  min?: number;
  /** 整体透明度 */
  opacity?: number;
  /** 透明度范围下界，默认 0 */
  minOpacity?: number;
  /** 透明度范围上界，默认 1 */
  maxOpacity?: number;
  /** 渐变色带，如 {0.25: 'rgba(0,0,255,1)', 1: 'rgba(255,0,0,1)'} */
  gradient?: Record<number, string>;
  /** 权重字段名（取 feature.properties[weightField]），默认 'count' */
  weightField?: string;
  visible?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
  enablePicked?: boolean;
  /** 数据可视化图层的中心参考点（渲染坐标基准），缺省用地图中心 */
  referCenter?: unknown;
}

export interface HeatmapLayerProps extends HeatmapLayerOptions {
  /** GeoJSON 数据（FeatureCollection / Feature[] / 数组对象），变化时调用 raw.setData() */
  data?: object;
}

const HEATMAP_EVENTS: Array<{ sdk: string; prop: string }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'mouseover', prop: 'onMouseOver' },
  { sdk: 'mouseout', prop: 'onMouseOut' },
];

export const HeatmapLayer = defineComponent({
  name: 'HeatmapLayer',
  props: {
    data: { type: Object as PropType<object>, default: undefined },
    size: { type: Number, default: undefined },
    unit: { type: String as PropType<'px' | 'm'>, default: undefined },
    max: { type: Number, default: undefined },
    min: { type: Number, default: undefined },
    opacity: { type: Number, default: undefined },
    minOpacity: { type: Number, default: undefined },
    maxOpacity: { type: Number, default: undefined },
    gradient: { type: Object as PropType<Record<number, string>>, default: undefined },
    weightField: { type: String, default: undefined },
    visible: { type: Boolean, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    enablePicked: { type: Boolean, default: undefined },
    referCenter: { default: undefined },
    onClick: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseOver: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseOut: { type: Function as PropType<(e: unknown) => void>, default: undefined },
  },
  setup(props: any) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <HeatmapLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    const ctorKey = computed(() => stableStringify([
      props.size, props.unit, props.max, props.min,
      props.opacity, props.minOpacity, props.maxOpacity,
      props.gradient, props.weightField,
      props.visible, props.minZoom, props.maxZoom, props.zIndex,
      props.enablePicked, props.referCenter,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('size', props.size); put('unit', props.unit);
      put('max', props.max); put('min', props.min);
      put('opacity', props.opacity); put('minOpacity', props.minOpacity); put('maxOpacity', props.maxOpacity);
      put('gradient', props.gradient); put('weightField', props.weightField);
      put('visible', props.visible); put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('zIndex', props.zIndex);
      put('enablePicked', props.enablePicked); put('referCenter', props.referCenter);

      const h = driver.createHeatmap(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      if (h.raw) {
        for (const { sdk, prop } of HEATMAP_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: unknown) => void) | undefined;
            if (typeof fn === 'function') fn(e);
          }));
        }
      }
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('HeatmapLayer.setData', e); }
      }
    };

    const destroy = () => {
      unsubs.forEach((u) => u()); unsubs = [];
      const ctx = mapCtx.value;
      if (handle && ctx?.map) { try { ctx.driver.removeLayer(ctx.map, handle); } catch { /* ignore */ } }
      handle = null;
    };

    watch([() => mapCtx.value?.map, ctorKey], () => { destroy(); create(); }, { immediate: true });

    watch(() => stableStringify(props.data), () => {
      if (!handle?.raw || !props.data) return;
      try { (handle.raw as any).setData?.(props.data); } catch { /* noop */ }
    });

    onUnmounted(destroy);
    return () => null;
  },
});
