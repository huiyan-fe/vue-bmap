/**
 * BarLayer —— 柱状图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.BarLayer。
 *
 * 用法：
 * ```vue
 * <BarLayer :data="bars" :color="'rgba(0,180,0,1)'" :height="100000" :unit="'m'" />
 * ```
 *
 * - `data`：GeoJSON（Point features），柱体的量值/高度/尺寸/颜色可写在 properties
 *   （value / height / size / color，支持 number[] 多段堆叠与 function 逐要素求值）。
 * - 构造项变化 → 重建；`data` 变化 → 调 raw.setData()。
 * - 事件：click / mouseover / mouseout / mousemove（事件对象带 value / pixel / latLng）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface BarLayerOptions {
  /** 柱体颜色，默认 'rgba(0, 180, 0, 1)'；支持 css | css[] | function */
  color?: unknown;
  /** 柱体半径基准，默认 50000，单位由 unit 决定 */
  size?: number;
  /** 柱体高度，默认 100000；支持 number | number[] | function */
  height?: unknown;
  /** 棱数，默认 4；调大（如 50）趋近圆柱 */
  edgeCount?: number;
  /** 'm' | 'px'，默认 'm'（m 为墨卡托米，随缩放物理尺寸不变） */
  unit?: 'm' | 'px';
  opacity?: number;
  visible?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
  enablePicked?: boolean;
  /** 数据可视化图层的中心参考点（渲染坐标基准），缺省用地图中心 */
  referCenter?: unknown;
}

export interface BarLayerProps extends BarLayerOptions {
  /** GeoJSON 数据（FeatureCollection / Feature[]），变化时调用 raw.setData() */
  data?: object;
}

const BAR_EVENTS: Array<{ sdk: string; prop: string }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'mouseover', prop: 'onMouseOver' },
  { sdk: 'mouseout', prop: 'onMouseOut' },
  { sdk: 'mousemove', prop: 'onMouseMove' },
];

export const BarLayer = defineComponent({
  name: 'BarLayer',
  props: {
    data: { type: Object as PropType<object>, default: undefined },
    color: { default: undefined },
    size: { type: Number, default: undefined },
    height: { default: undefined },
    edgeCount: { type: Number, default: undefined },
    unit: { type: String as PropType<'m' | 'px'>, default: undefined },
    opacity: { type: Number, default: undefined },
    visible: { type: Boolean, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    enablePicked: { type: Boolean, default: undefined },
    referCenter: { default: undefined },
    onClick: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseOver: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseOut: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseMove: { type: Function as PropType<(e: unknown) => void>, default: undefined },
  },
  setup(props: any) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <BarLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    const ctorKey = computed(() => stableStringify([
      props.color, props.size, props.height, props.edgeCount, props.unit,
      props.opacity, props.visible, props.minZoom, props.maxZoom, props.zIndex,
      props.enablePicked, props.referCenter,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('color', props.color); put('size', props.size); put('height', props.height);
      put('edgeCount', props.edgeCount); put('unit', props.unit);
      put('opacity', props.opacity); put('visible', props.visible);
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('zIndex', props.zIndex);
      put('enablePicked', props.enablePicked); put('referCenter', props.referCenter);

      const h = driver.createBarLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      if (h.raw) {
        for (const { sdk, prop } of BAR_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: unknown) => void) | undefined;
            if (typeof fn === 'function') fn(e);
          }));
        }
      }
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('BarLayer.setData', e); }
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
