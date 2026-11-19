/**
 * PolylineLayer —— 折线图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.PolylineLayer。
 *
 * 用法：
 * ```vue
 * <PolylineLayer :data="lines" stroke-color="#3075FE" :stroke-weight="4" @click="onLineClick" />
 * ```
 *
 * - `data`：GeoJSON（FeatureCollection / Feature[]），变化时调用 raw.setData()。
 * - 构造项（strokeColor / strokeWeight / strokeStyle / dashArray / strokeTexture* 等）变化 → 重建图层；
 *   `data` 变化 → 调 raw.setData()。
 * - 事件：click / mouseover / mouseout / mousemove（事件对象带 value / pixel / latLng）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface PolylineLayerOptions {
  /** 描边色，默认 '#3075FE' */
  strokeColor?: string;
  /** 描边宽度（px），默认 2 */
  strokeWeight?: number;
  /** 描边透明度，默认 1 */
  strokeOpacity?: number;
  /** 折线连接方式 */
  strokeLineJoin?: 'miter' | 'bevel' | 'round';
  /** 线帽样式 */
  strokeLineCap?: 'butt' | 'round' | 'square';
  /** 线型：实线 / 虚线 / 点线 */
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  /** 虚线线段数组，如 [10, 5]（strokeStyle = 'dashed' 时生效） */
  dashArray?: number[];
  /** 纹理贴图 url（设置后以贴图绘制折线） */
  strokeTextureUrl?: string;
  /** 纹理贴图宽度 */
  strokeTextureWidth?: number;
  /** 纹理贴图高度 */
  strokeTextureHeight?: number;
  /** 贴图是否随线段长度重复铺满（true）或按固定间距平铺（false），默认 true */
  strokeTextureSpaced?: boolean;
  /** 贴图间距（strokeTextureSpaced = false 时生效） */
  strokeTextureGap?: number;
  /** 贴图颜色 */
  strokeTextureColor?: string;
  visible?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
  opacity?: number;
  enablePicked?: boolean;
  /** 数据可视化图层的中心参考点（渲染坐标基准），缺省用地图中心 */
  referCenter?: unknown;
}

export interface PolylineLayerProps extends PolylineLayerOptions {
  /** GeoJSON 数据（FeatureCollection / Feature[]），变化时调用 raw.setData() */
  data?: object;
}

const POLYLINE_LAYER_EVENTS: Array<{ sdk: string; prop: string }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'mouseover', prop: 'onMouseOver' },
  { sdk: 'mouseout', prop: 'onMouseOut' },
  { sdk: 'mousemove', prop: 'onMouseMove' },
];

export const PolylineLayer = defineComponent({
  name: 'PolylineLayer',
  props: {
    data: { type: Object as PropType<object>, default: undefined },
    strokeColor: { type: String, default: undefined },
    strokeWeight: { type: Number, default: undefined },
    strokeOpacity: { type: Number, default: undefined },
    strokeLineJoin: { type: String as PropType<'miter' | 'bevel' | 'round'>, default: undefined },
    strokeLineCap: { type: String as PropType<'butt' | 'round' | 'square'>, default: undefined },
    strokeStyle: { type: String as PropType<'solid' | 'dashed' | 'dotted'>, default: undefined },
    dashArray: { type: Array as PropType<number[]>, default: undefined },
    strokeTextureUrl: { type: String, default: undefined },
    strokeTextureWidth: { type: Number, default: undefined },
    strokeTextureHeight: { type: Number, default: undefined },
    strokeTextureSpaced: { type: Boolean, default: undefined },
    strokeTextureGap: { type: Number, default: undefined },
    strokeTextureColor: { type: String, default: undefined },
    visible: { type: Boolean, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    opacity: { type: Number, default: undefined },
    enablePicked: { type: Boolean, default: undefined },
    referCenter: { default: undefined },
    onClick: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseOver: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseOut: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseMove: { type: Function as PropType<(e: unknown) => void>, default: undefined },
  },
  setup(props: any) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <PolylineLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    const ctorKey = computed(() => stableStringify([
      props.strokeColor, props.strokeWeight, props.strokeOpacity,
      props.strokeLineJoin, props.strokeLineCap, props.strokeStyle, props.dashArray,
      props.strokeTextureUrl, props.strokeTextureWidth, props.strokeTextureHeight,
      props.strokeTextureSpaced, props.strokeTextureGap, props.strokeTextureColor,
      props.visible, props.minZoom, props.maxZoom, props.zIndex, props.opacity,
      props.enablePicked, props.referCenter,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('strokeColor', props.strokeColor); put('strokeWeight', props.strokeWeight); put('strokeOpacity', props.strokeOpacity);
      put('strokeLineJoin', props.strokeLineJoin); put('strokeLineCap', props.strokeLineCap);
      put('strokeStyle', props.strokeStyle); put('dashArray', props.dashArray);
      put('strokeTextureUrl', props.strokeTextureUrl); put('strokeTextureWidth', props.strokeTextureWidth);
      put('strokeTextureHeight', props.strokeTextureHeight); put('strokeTextureSpaced', props.strokeTextureSpaced);
      put('strokeTextureGap', props.strokeTextureGap); put('strokeTextureColor', props.strokeTextureColor);
      put('visible', props.visible); put('minZoom', props.minZoom);
      put('maxZoom', props.maxZoom); put('zIndex', props.zIndex); put('opacity', props.opacity);
      put('enablePicked', props.enablePicked); put('referCenter', props.referCenter);

      const h = driver.createPolylineLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      if (h.raw) {
        for (const { sdk, prop } of POLYLINE_LAYER_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: unknown) => void) | undefined;
            if (typeof fn === 'function') fn(e);
          }));
        }
      }
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('PolylineLayer.setData', e); }
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
