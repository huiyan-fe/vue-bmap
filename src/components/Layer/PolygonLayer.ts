/**
 * PolygonLayer —— 面图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.PolygonLayer。
 *
 * 用法：
 * ```vue
 * <PolygonLayer :data="polygons" fill-color="#3075FE" :fill-opacity="0.4" @click="onPolygonClick" />
 * ```
 *
 * - `data`：GeoJSON（FeatureCollection / Feature[]），变化时调用 raw.setData()。
 * - 构造项（fillColor / fillOpacity / strokeColor / strokeWeight / fillTexture* 等）变化 → 重建图层；
 *   `data` 变化 → 调 raw.setData()。
 * - 事件：click / mouseover / mouseout / mousemove（事件对象带 value / pixel / latLng）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface PolygonLayerOptions {
  /** 填充色，默认 '#3075FE' */
  fillColor?: string;
  /** 填充透明度，默认 1 */
  fillOpacity?: number;
  /** 描边色，默认 '#3075FE' */
  strokeColor?: string;
  /** 描边宽度（px），默认 2 */
  strokeWeight?: number;
  /** 描边透明度，默认 1 */
  strokeOpacity?: number;
  /** 填充纹理贴图 url */
  fillTextureUrl?: string;
  /** 填充纹理贴图尺寸（px） */
  fillTextureSize?: number;
  /** 纹理贴图是否仅保留 alpha 通道（配合 fillColor 染色），默认 false */
  fillTextureAlphaOnly?: boolean;
  visible?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
  opacity?: number;
  enablePicked?: boolean;
  /** 数据可视化图层的中心参考点（渲染坐标基准），缺省用地图中心 */
  referCenter?: unknown;
}

export interface PolygonLayerProps extends PolygonLayerOptions {
  /** GeoJSON 数据（FeatureCollection / Feature[]），变化时调用 raw.setData() */
  data?: object;
}

const POLYGON_LAYER_EVENTS: Array<{ sdk: string; prop: string }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'mouseover', prop: 'onMouseOver' },
  { sdk: 'mouseout', prop: 'onMouseOut' },
  { sdk: 'mousemove', prop: 'onMouseMove' },
];

export const PolygonLayer = defineComponent({
  name: 'PolygonLayer',
  props: {
    data: { type: Object as PropType<object>, default: undefined },
    fillColor: { type: String, default: undefined },
    fillOpacity: { type: Number, default: undefined },
    strokeColor: { type: String, default: undefined },
    strokeWeight: { type: Number, default: undefined },
    strokeOpacity: { type: Number, default: undefined },
    fillTextureUrl: { type: String, default: undefined },
    fillTextureSize: { type: Number, default: undefined },
    fillTextureAlphaOnly: { type: Boolean, default: undefined },
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
    if (!mapCtx) throw new Error('[vue-bmap] <PolygonLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    const ctorKey = computed(() => stableStringify([
      props.fillColor, props.fillOpacity,
      props.strokeColor, props.strokeWeight, props.strokeOpacity,
      props.fillTextureUrl, props.fillTextureSize, props.fillTextureAlphaOnly,
      props.visible, props.minZoom, props.maxZoom, props.zIndex, props.opacity,
      props.enablePicked, props.referCenter,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('fillColor', props.fillColor); put('fillOpacity', props.fillOpacity);
      put('strokeColor', props.strokeColor); put('strokeWeight', props.strokeWeight); put('strokeOpacity', props.strokeOpacity);
      put('fillTextureUrl', props.fillTextureUrl); put('fillTextureSize', props.fillTextureSize);
      put('fillTextureAlphaOnly', props.fillTextureAlphaOnly);
      put('visible', props.visible); put('minZoom', props.minZoom);
      put('maxZoom', props.maxZoom); put('zIndex', props.zIndex); put('opacity', props.opacity);
      put('enablePicked', props.enablePicked); put('referCenter', props.referCenter);

      const h = driver.createPolygonLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      if (h.raw) {
        for (const { sdk, prop } of POLYGON_LAYER_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: unknown) => void) | undefined;
            if (typeof fn === 'function') fn(e);
          }));
        }
      }
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('PolygonLayer.setData', e); }
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
