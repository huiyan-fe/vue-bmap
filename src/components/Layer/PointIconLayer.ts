/**
 * PointIconLayer —— 点图标图层（手写组件）。@since 4.0
 * 对应 react-bmap 的 Layer/PointIconLayer.tsx。
 *
 * 组件方式：
 * ```vue
 * <PointIconLayer is-flat :style="{ icon: 'https://...', width: 25, height: 25 }"
 *   :data="geojson" enable-picked @click="..." />
 * ```
 *
 * 实现要点（与 react 对齐）：
 * - style + 构造期选项变化（ctorKey）→ 重建；data 变化 → raw.setData()。
 * - 事件（click/dblclick/rightclick/mousemove）随图层重建重绑；回调引用变化不重建，
 *   调用时现读最新 props（Vue props 响应式，闭包天然读到最新）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

/** 图层拾取事件对象（enablePicked=true 时点击/悬停命中要素） */
export interface PointIconLayerEvent {
  /** 命中的要素：value.dataItem.properties 为该点的属性 */
  value?: { dataItem?: { properties?: Record<string, unknown>; [k: string]: unknown }; [k: string]: unknown };
  [k: string]: unknown;
}

export interface PointIconStyle {
  icon?: string;
  iconObj?: (style: object, properties: object) => { id?: number; canvas: HTMLCanvasElement };
  visibility?: boolean;
  sizes?: [number, number];
  width?: number;
  height?: number;
  userSizes?: boolean;
  anchors?: [number, number];
  offset?: [number, number];
  scale?: number;
  rotation?: number;
  opacity?: number;
}

export interface PointIconLayerOptions {
  isFlat?: boolean;
  isFixed?: boolean;
  style?: PointIconStyle;
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

export interface PointIconLayerProps extends PointIconLayerOptions {
  /** GeoJSON 数据源，变化时调用 raw.setData() */
  data?: object;
  /** 点击要素（需 enablePicked）。e.value.dataItem.properties 为选中要素属性 */
  onClick?: (e: PointIconLayerEvent) => void;
  /** 双击要素（需 enablePicked） */
  onDblClick?: (e: PointIconLayerEvent) => void;
  onRightClick?: (e: PointIconLayerEvent) => void;
  /** 鼠标在要素上移动（需 enablePicked）。SDK 不派发 mouseover/mouseout */
  onMouseMove?: (e: PointIconLayerEvent) => void;
}

// SDK LayerNormalMgr 只派发 click/dblclick/rightclick/mousemove 四种
const LAYER_EVENTS: Array<{ sdk: string; prop: keyof PointIconLayerProps }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'dblclick', prop: 'onDblClick' },
  { sdk: 'rightclick', prop: 'onRightClick' },
  { sdk: 'mousemove', prop: 'onMouseMove' },
];

export const PointIconLayer = defineComponent({
  name: 'PointIconLayer',
  props: {
    isFlat: { type: Boolean, default: undefined },
    isFixed: { type: Boolean, default: undefined },
    style: { type: Object as PropType<PointIconStyle>, default: undefined },
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
    onClick: { type: Function as PropType<(e: PointIconLayerEvent) => void>, default: undefined },
    onDblClick: { type: Function as PropType<(e: PointIconLayerEvent) => void>, default: undefined },
    onRightClick: { type: Function as PropType<(e: PointIconLayerEvent) => void>, default: undefined },
    onMouseMove: { type: Function as PropType<(e: PointIconLayerEvent) => void>, default: undefined },
  },
  setup(props) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <PointIconLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    const styleKey = computed(() => (props.style ? stableStringify(props.style) : ''));
    const ctorKey = computed(() => stableStringify([
      props.isFlat, props.isFixed, props.idKey, props.crs, props.selectedIndex, props.selectedColor,
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
      put('isFlat', props.isFlat); put('isFixed', props.isFixed); put('style', props.style);
      put('idKey', props.idKey); put('crs', props.crs);
      put('selectedIndex', props.selectedIndex); put('selectedColor', props.selectedColor);
      put('visible', props.visible); put('opacity', props.opacity);
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('zIndex', props.zIndex);
      put('enablePicked', props.enablePicked); put('autoSelect', props.autoSelect);
      put('popEvent', props.popEvent); put('pickWidth', props.pickWidth); put('pickHeight', props.pickHeight);

      const h = driver.createPointIconLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      // 绑定图层事件：调用时现读最新回调
      if (h.raw) {
        for (const { sdk, prop } of LAYER_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: PointIconLayerEvent) => void) | undefined;
            if (typeof fn === 'function') fn(e as PointIconLayerEvent);
          }));
        }
      }

      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('PointIconLayer.setData', e); }
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
