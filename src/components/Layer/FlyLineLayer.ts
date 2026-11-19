/**
 * FlyLineLayer —— 飞线图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.FlyLineLayer。
 *
 * 用法：
 * ```vue
 * <FlyLineLayer :data="lines" :stroke-color="'rgba(255,71,26,0.9)'" :mode="'arc'" :duration="2" />
 * ```
 *
 * - `data`：GeoJSON（LineString features）。mode 'arc' 取每条线串首末两点生成弧线；
 *   mode 'path' 原样使用所有点作为 XY 折线只叠加高度。
 * - 构造项变化 → 重建；`data` 变化 → 调 raw.setData()。
 * - 事件：click / mouseover / mouseout / mousemove（事件对象带 value / pixel / latLng）。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface FlyLineLayerOptions {
  /** 线颜色，默认 'rgba(255, 71, 26, 0.9)' */
  strokeColor?: string;
  /** 线宽（屏幕 px，全宽），默认 4 */
  strokeWeight?: number;
  /** 线透明度 [0,1]，默认 1 */
  strokeOpacity?: number;
  /** 'miter' | 'bevel' | 'round'，默认 'round' */
  strokeLineJoin?: 'miter' | 'bevel' | 'round';
  /** 'butt' | 'round' | 'square'，默认 'round' */
  strokeLineCap?: 'butt' | 'round' | 'square';
  /** 'arc' | 'path'，默认 'arc' */
  mode?: 'arc' | 'path';
  /** 弧顶高度占首末点直线距离的比例，默认 0.2；0 即贴地不抬升 */
  arcHeight?: number;
  /** 水平弯曲程度，控制点沿垂线偏移占直线距离的比例，默认 0.15；0 即不弯 */
  curvature?: number;
  /** 每条弧的采样段数，默认 32，仅 mode 'arc' 生效 */
  segments?: number;
  /** 是否流动，默认 true；false 退化成静态弧线层 */
  animation?: boolean;
  /** 一圈秒数，默认 2 */
  duration?: number;
  /** 粒子间距占全线比例，默认 0.25，粒子数 = 1 / interval */
  interval?: number;
  /** 拖尾长度占间隔的比例，默认 0.6 */
  trailLength?: number;
  /** 底线常显透明度，默认 0.25；0 则只见流动的亮点 */
  baseOpacity?: number;
  /** 每条线是否随机相位，默认 true；false 则所有线齐步走 */
  randomPhase?: boolean;
  /** 'default' | 'lighter'，默认 'default'（lighter 为加性混合） */
  blend?: 'default' | 'lighter';
  opacity?: number;
  visible?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
  enablePicked?: boolean;
  /** 数据可视化图层的中心参考点（渲染坐标基准），缺省用地图中心 */
  referCenter?: unknown;
}

export interface FlyLineLayerProps extends FlyLineLayerOptions {
  /** GeoJSON 数据（FeatureCollection / Feature[]），变化时调用 raw.setData() */
  data?: object;
}

const FLYLINE_EVENTS: Array<{ sdk: string; prop: string }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'mouseover', prop: 'onMouseOver' },
  { sdk: 'mouseout', prop: 'onMouseOut' },
  { sdk: 'mousemove', prop: 'onMouseMove' },
];

export const FlyLineLayer = defineComponent({
  name: 'FlyLineLayer',
  props: {
    data: { type: Object as PropType<object>, default: undefined },
    strokeColor: { type: String, default: undefined },
    strokeWeight: { type: Number, default: undefined },
    strokeOpacity: { type: Number, default: undefined },
    strokeLineJoin: { type: String as PropType<'miter' | 'bevel' | 'round'>, default: undefined },
    strokeLineCap: { type: String as PropType<'butt' | 'round' | 'square'>, default: undefined },
    mode: { type: String as PropType<'arc' | 'path'>, default: undefined },
    arcHeight: { type: Number, default: undefined },
    curvature: { type: Number, default: undefined },
    segments: { type: Number, default: undefined },
    animation: { type: Boolean, default: undefined },
    duration: { type: Number, default: undefined },
    interval: { type: Number, default: undefined },
    trailLength: { type: Number, default: undefined },
    baseOpacity: { type: Number, default: undefined },
    randomPhase: { type: Boolean, default: undefined },
    blend: { type: String as PropType<'default' | 'lighter'>, default: undefined },
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
    if (!mapCtx) throw new Error('[vue-bmap] <FlyLineLayer> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    const ctorKey = computed(() => stableStringify([
      props.strokeColor, props.strokeWeight, props.strokeOpacity,
      props.strokeLineJoin, props.strokeLineCap, props.mode,
      props.arcHeight, props.curvature, props.segments,
      props.animation, props.duration, props.interval, props.trailLength,
      props.baseOpacity, props.randomPhase, props.blend,
      props.opacity, props.visible, props.minZoom, props.maxZoom, props.zIndex,
      props.enablePicked, props.referCenter,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('strokeColor', props.strokeColor); put('strokeWeight', props.strokeWeight);
      put('strokeOpacity', props.strokeOpacity); put('strokeLineJoin', props.strokeLineJoin);
      put('strokeLineCap', props.strokeLineCap); put('mode', props.mode);
      put('arcHeight', props.arcHeight); put('curvature', props.curvature); put('segments', props.segments);
      put('animation', props.animation); put('duration', props.duration);
      put('interval', props.interval); put('trailLength', props.trailLength);
      put('baseOpacity', props.baseOpacity); put('randomPhase', props.randomPhase); put('blend', props.blend);
      put('opacity', props.opacity); put('visible', props.visible);
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('zIndex', props.zIndex);
      put('enablePicked', props.enablePicked); put('referCenter', props.referCenter);

      const h = driver.createFlyLineLayer(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      if (h.raw) {
        for (const { sdk, prop } of FLYLINE_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: unknown) => void) | undefined;
            if (typeof fn === 'function') fn(e);
          }));
        }
      }
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('FlyLineLayer.setData', e); }
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
