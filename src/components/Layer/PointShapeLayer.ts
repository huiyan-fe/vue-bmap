/**
 * PointShapeLayer —— 点形状图层（手写组件）。@since 4.0
 * 对应 react-bmap 的 Layer/PointShapeLayer.tsx。
 * 使用 2D 几何图形（圆形、方形、三角形、五角星等）渲染点数据。
 *
 * 组件方式：
 * ```vue
 * <PointShapeLayer :style="{ shapeType: 2, size: 20, color: '#ff0000' }" :data="geojson" />
 * ```
 *
 * 实现要点（与 react 对齐）：style 进 ctorKey（变化即重建），data 变化 → raw.setData()。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface PointShapeStyle {
  visibility?: boolean;
  shapeType?: number;
  anchor?: number;
  size?: number;
  scale?: number;
  rotation?: number;
  offset?: [number, number];
  color?: string;
  opacity?: number;
  strokeColor?: string;
  strokeWeight?: number;
}

export interface PointShapeLayerOptions {
  isFlat?: boolean;
  style?: PointShapeStyle;
  idKey?: string;
  crs?: string;
  selectedIndex?: number;
  selectedColor?: string;
  visible?: boolean;
  opacity?: number;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
  enablePicked?: boolean;
  autoSelect?: boolean;
  popEvent?: boolean;
  pickWidth?: number;
  pickHeight?: number;
}

export interface PointShapeLayerProps extends PointShapeLayerOptions {
  data?: object;
}

export const PointShapeLayer = defineComponent({
  name: 'PointShapeLayer',
  props: {
    isFlat: { type: Boolean, default: undefined },
    style: { type: Object as PropType<PointShapeStyle>, default: undefined },
    idKey: { type: String, default: undefined },
    crs: { type: String, default: undefined },
    selectedIndex: { type: Number, default: undefined },
    selectedColor: { type: String, default: undefined },
    visible: { type: Boolean, default: undefined },
    opacity: { type: Number, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    enablePicked: { type: Boolean, default: undefined },
    autoSelect: { type: Boolean, default: undefined },
    popEvent: { type: Boolean, default: undefined },
    pickWidth: { type: Number, default: undefined },
    pickHeight: { type: Number, default: undefined },
    data: { type: Object as PropType<object>, default: undefined },
  },
  setup(props) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <PointShapeLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;

    const styleKey = computed(() => (props.style ? stableStringify(props.style) : ''));
    const ctorKey = computed(() => stableStringify([
      props.isFlat, props.idKey, props.crs, props.selectedIndex, props.selectedColor,
      props.visible, props.opacity, props.minZoom, props.maxZoom, props.zIndex,
      props.enablePicked, props.autoSelect, props.popEvent, props.pickWidth, props.pickHeight,
      styleKey.value,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('isFlat', props.isFlat); put('style', props.style);
      put('idKey', props.idKey); put('crs', props.crs);
      put('selectedIndex', props.selectedIndex); put('selectedColor', props.selectedColor);
      put('visible', props.visible); put('opacity', props.opacity);
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('zIndex', props.zIndex);
      put('enablePicked', props.enablePicked); put('autoSelect', props.autoSelect);
      put('popEvent', props.popEvent); put('pickWidth', props.pickWidth); put('pickHeight', props.pickHeight);

      const h = driver.createPointShapeLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('PointShapeLayer.setData', e); }
      }
    };

    const destroy = () => {
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
