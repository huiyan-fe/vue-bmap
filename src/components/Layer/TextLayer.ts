/**
 * TextLayer —— 文本图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.TextLayer。
 *
 * 用法：
 * ```vue
 * <TextLayer :data="labels" text="properties.name" :font-size="14" color="#333" @click="onTextClick" />
 * ```
 *
 * - `data`：GeoJSON（FeatureCollection / Feature[]），变化时调用 raw.setData()。
 * - `text`：静态字符串，或 function(properties) -> string，用于按要素属性取文本。
 * - 构造项（fontSize / fontFamily / color / padding / textAlign / offset 等）变化 → 重建图层；
 *   `data` 变化 → 调 raw.setData()。
 * - 事件：click / mouseover / mouseout / mousemove（事件对象带 value / pixel / latLng）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface TextLayerOptions {
  /** 文本内容：静态字符串，或 function(properties) -> string */
  text?: string | ((properties: unknown) => string);
  /** 字号（px），默认 12 */
  fontSize?: number;
  /** 字体族，默认 'sans-serif' */
  fontFamily?: string;
  /** 字重：'normal' | 'bold' | 数字 */
  fontWeight?: string | number;
  /** 文字颜色，默认 '#333333'；也可传 function(properties) -> color 按要素动态取色 */
  color?: string | ((properties: unknown) => string);
  /** 描边色 */
  strokeColor?: string;
  /** 描边宽度（px） */
  strokeWeight?: number;
  /** 内边距 [上, 右, 下, 左] */
  padding?: number[];
  /** 外边距 [上, 右, 下, 左] */
  margin?: number[];
  /** 是否参与碰撞避让，默认 false */
  collides?: boolean;
  /** 碰撞检测间隔（ms），默认 300 */
  waitTime?: number;
  /** 文本最大宽度（px），超出换行 */
  textMaxWidth?: number;
  /** 行高（px） */
  lineHeight?: number;
  /** 对齐方式，默认 'center' */
  textAlign?: 'center' | 'left' | 'right';
  /** 像素偏移 [x, y] */
  offset?: number[];
  /** 锚点位置 */
  anchor?: unknown;
  /** 旋转角度（度） */
  rotation?: number;
  /** 缩放比例 */
  scale?: number;
  /** 填充透明度 */
  fillOpacity?: number;
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

export interface TextLayerProps extends TextLayerOptions {
  /** GeoJSON 数据（FeatureCollection / Feature[]），变化时调用 raw.setData() */
  data?: object;
}

const TEXT_LAYER_EVENTS: Array<{ sdk: string; prop: string }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'mouseover', prop: 'onMouseOver' },
  { sdk: 'mouseout', prop: 'onMouseOut' },
  { sdk: 'mousemove', prop: 'onMouseMove' },
];

export const TextLayer = defineComponent({
  name: 'TextLayer',
  props: {
    data: { type: Object as PropType<object>, default: undefined },
    text: { type: [String, Function] as PropType<string | ((properties: unknown) => string)>, default: undefined },
    fontSize: { type: Number, default: undefined },
    fontFamily: { type: String, default: undefined },
    fontWeight: { type: [String, Number] as PropType<string | number>, default: undefined },
    color: { type: [String, Function] as PropType<string | ((properties: unknown) => string)>, default: undefined },
    strokeColor: { type: String, default: undefined },
    strokeWeight: { type: Number, default: undefined },
    padding: { type: Array as PropType<number[]>, default: undefined },
    margin: { type: Array as PropType<number[]>, default: undefined },
    collides: { type: Boolean, default: undefined },
    waitTime: { type: Number, default: undefined },
    textMaxWidth: { type: Number, default: undefined },
    lineHeight: { type: Number, default: undefined },
    textAlign: { type: String as PropType<'center' | 'left' | 'right'>, default: undefined },
    offset: { type: Array as PropType<number[]>, default: undefined },
    anchor: { default: undefined },
    rotation: { type: Number, default: undefined },
    scale: { type: Number, default: undefined },
    fillOpacity: { type: Number, default: undefined },
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
    if (!mapCtx) throw new Error('[vue-bmap] <TextLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    const ctorKey = computed(() => stableStringify([
      props.text, props.fontSize, props.fontFamily, props.fontWeight,
      props.color, props.strokeColor, props.strokeWeight,
      props.padding, props.margin, props.collides, props.waitTime,
      props.textMaxWidth, props.lineHeight, props.textAlign,
      props.offset, props.anchor, props.rotation, props.scale,
      props.fillOpacity, props.isFlat,
      props.visible, props.minZoom, props.maxZoom, props.zIndex, props.opacity,
      props.enablePicked, props.referCenter,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('text', props.text); put('fontSize', props.fontSize);
      put('fontFamily', props.fontFamily); put('fontWeight', props.fontWeight);
      put('color', props.color); put('strokeColor', props.strokeColor); put('strokeWeight', props.strokeWeight);
      put('padding', props.padding); put('margin', props.margin);
      put('collides', props.collides); put('waitTime', props.waitTime);
      put('textMaxWidth', props.textMaxWidth); put('lineHeight', props.lineHeight);
      put('textAlign', props.textAlign); put('offset', props.offset);
      put('anchor', props.anchor); put('rotation', props.rotation); put('scale', props.scale);
      put('fillOpacity', props.fillOpacity); put('isFlat', props.isFlat);
      put('visible', props.visible); put('minZoom', props.minZoom);
      put('maxZoom', props.maxZoom); put('zIndex', props.zIndex); put('opacity', props.opacity);
      put('enablePicked', props.enablePicked); put('referCenter', props.referCenter);

      const h = driver.createTextLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      if (h.raw) {
        for (const { sdk, prop } of TEXT_LAYER_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: unknown) => void) | undefined;
            if (typeof fn === 'function') fn(e);
          }));
        }
      }
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('TextLayer.setData', e); }
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
