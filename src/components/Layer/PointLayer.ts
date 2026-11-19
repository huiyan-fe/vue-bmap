/**
 * PointLayer —— 点图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.PointLayer。
 *
 * 用法：
 * ```vue
 * <PointLayer :data="points" :size="20" shape="circle" fill-color="#3075FE" @click="onPointClick" />
 * ```
 *
 * - `data`：GeoJSON（FeatureCollection / Feature[] / 含坐标的 plain object 数组），
 *   变化时调用 raw.setData()。
 * - 构造项（shape / size / icon / fillColor / strokeColor / anchor / isFlat 等）变化 → 重建图层；
 *   `data` 变化 → 调 raw.setData()。
 * - 事件：click / mouseover / mouseout / mousemove（事件对象带 value / pixel / latLng）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface PointLayerOptions {
  /** 点形状，默认 'circle' */
  shape?: 'circle' | 'square' | 'triangle' | 'diamond';
  /** 点尺寸（px），默认 12 */
  size?: number;
  /** 图标（url / canvas / BMap.Icon / function(properties)），设置后优先于 shape */
  icon?: unknown;
  /** 图标尺寸：[w, h] 或 number */
  iconSize?: unknown;
  /** 填充色，默认 '#3075FE' */
  fillColor?: string;
  /** 填充透明度，默认 1 */
  fillOpacity?: number;
  /** 描边色 */
  strokeColor?: string;
  /** 描边宽度 */
  strokeWeight?: number;
  /** 整体缩放比例 */
  scale?: number;
  /** 旋转角度（度） */
  rotation?: number;
  /** 像素偏移 [x, y] */
  offset?: number[];
  /** 锚点位置，默认 'center' */
  anchor?: 'center' | 'topLeft' | 'topCenter' | 'topRight' | 'rightCenter';
  /** 是否贴合地面（随地图倾斜/旋转），默认 false */
  isFlat?: boolean;
  visible?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
  opacity?: number;
  enablePicked?: boolean;
  /** 数据可视化图层的中心参考点（渲染坐标基准），缺省用地图中心 */
  referCenter?: unknown;
}

export interface PointLayerProps extends PointLayerOptions {
  /** GeoJSON 数据（FeatureCollection / Feature[]），变化时调用 raw.setData() */
  data?: object;
}

const POINT_LAYER_EVENTS: Array<{ sdk: string; prop: string }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'mouseover', prop: 'onMouseOver' },
  { sdk: 'mouseout', prop: 'onMouseOut' },
  { sdk: 'mousemove', prop: 'onMouseMove' },
];

export const PointLayer = defineComponent({
  name: 'PointLayer',
  props: {
    data: { type: Object as PropType<object>, default: undefined },
    shape: { type: String as PropType<'circle' | 'square' | 'triangle' | 'diamond'>, default: undefined },
    size: { type: Number, default: undefined },
    icon: { default: undefined },
    iconSize: { default: undefined },
    fillColor: { type: String, default: undefined },
    fillOpacity: { type: Number, default: undefined },
    strokeColor: { type: String, default: undefined },
    strokeWeight: { type: Number, default: undefined },
    scale: { type: Number, default: undefined },
    rotation: { type: Number, default: undefined },
    offset: { type: Array as PropType<number[]>, default: undefined },
    anchor: { type: String as PropType<'center' | 'topLeft' | 'topCenter' | 'topRight' | 'rightCenter'>, default: undefined },
    isFlat: { type: Boolean, default: undefined },
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
    if (!mapCtx) throw new Error('[vue-bmap] <PointLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    const ctorKey = computed(() => stableStringify([
      props.shape, props.size, props.icon, props.iconSize,
      props.fillColor, props.fillOpacity, props.strokeColor, props.strokeWeight,
      props.scale, props.rotation, props.offset, props.anchor, props.isFlat,
      props.visible, props.minZoom, props.maxZoom, props.zIndex, props.opacity,
      props.enablePicked, props.referCenter,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('shape', props.shape); put('size', props.size);
      put('icon', props.icon); put('iconSize', props.iconSize);
      put('fillColor', props.fillColor); put('fillOpacity', props.fillOpacity);
      put('strokeColor', props.strokeColor); put('strokeWeight', props.strokeWeight);
      put('scale', props.scale); put('rotation', props.rotation);
      put('offset', props.offset); put('anchor', props.anchor); put('isFlat', props.isFlat);
      put('visible', props.visible); put('minZoom', props.minZoom);
      put('maxZoom', props.maxZoom); put('zIndex', props.zIndex); put('opacity', props.opacity);
      put('enablePicked', props.enablePicked); put('referCenter', props.referCenter);

      const h = driver.createPointLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      if (h.raw) {
        for (const { sdk, prop } of POINT_LAYER_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: unknown) => void) | undefined;
            if (typeof fn === 'function') fn(e);
          }));
        }
      }
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('PointLayer.setData', e); }
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
