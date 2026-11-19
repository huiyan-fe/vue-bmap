/**
 * TrackLine —— 轨迹线图层（4.0+ Visualization）。对应 JSAPI 4.0 的 BMap.TrackLine。
 *
 * 用法：
 * ```vue
 * <TrackLine ref="track" :data="line" :auto-start="true" :auto-follow="true"
 *   :duration="60" @progress="onProgress" />
 * ```
 *
 * - `data`：GeoJSON（LineString feature），播放时间线默认按 `properties.time` 数组
 *   （与 coordinates 等长）；可用 timestampKey 指定字段，speedMode 控制匀速/按时间戳变速。
 * - 播放控制走命令式句柄（`ref`）：play() / pause() / stop() / setFollowOptions(opts)。
 * - 事件：onProgress（value = {process, elapsed, trace, distance, point, angle}）、
 *   onStatusChange（播放状态变化），以及 click / mouseover / mouseout / mousemove。
 */
import { computed, defineComponent, inject, onUnmounted, watch, type PropType } from 'vue';
import { MAP_KEY } from '../../context';
import { stableStringify } from '../../utils/stableStringify';
import { debugWarn } from '../../utils/debugWarn';
import type { LayerHandle } from '../../types';

export interface TrackLineOptions {
  strokeColor?: string;
  strokeWeight?: number;
  strokeLineJoin?: 'miter' | 'bevel' | 'round';
  strokeLineCap?: 'butt' | 'round' | 'square';
  /** 已走过路段的颜色（走过变灰） */
  passedColor?: string;
  /** 未走过（车前方）路段的颜色，默认跟随主线色 */
  upcomingColor?: string;
  /** 整条线是否可见，false 时只留车辆图标 */
  lineVisible?: boolean;
  /** 纹理贴线（竖图，沿线自动横向铺开） */
  strokeTextureUrl?: string;
  strokeTextureWidth?: number;
  strokeTextureHeight?: number;
  /** true 按 strokeTextureGap 间隔平铺（箭头串）；false 沿线连续拉伸 */
  strokeTextureSpaced?: boolean;
  strokeTextureGap?: number;
  strokeTextureColor?: string;
  /** 播放总时长（秒），默认 60 */
  duration?: number;
  /** 1 按 properties 时间戳变速；0 匀速，默认 1 */
  speedMode?: number;
  /** 时间戳字段名，properties[timestampKey] 为与 coordinates 等长的数组，默认 'time' */
  timestampKey?: string;
  /**
   * 车辆图标：false 不创建；对象如 { type:'ground'|'marker', url, size:[w,h], anchor:[x,y],
   * offset, scale, level, adjustSize, tiltCorrect, rotationOffset }；也可传已构造好的
   * GroundPoint / Marker 实例（图层只负责驱动它）。
   */
  movePoint?: Record<string, unknown> | false;
  /** setData 后是否自动开始播放，默认 false */
  autoStart?: boolean;
  /** true 时地图视野自动跟随车辆，默认 false */
  autoFollow?: boolean;
  /** 跟随细节：{ tilt, heading, rotationDuration, rotationOffset, ... } */
  followOptions?: Record<string, unknown>;
  opacity?: number;
  visible?: boolean;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
  /** 数据可视化图层的中心参考点（渲染坐标基准），缺省用地图中心 */
  referCenter?: unknown;
}

export interface TrackLineProps extends TrackLineOptions {
  /** GeoJSON 数据（FeatureCollection / LineString feature），变化时调用 raw.setData() */
  data?: object;
}

/** 命令式句柄：播放控制（组件 expose 同名对象，`ref` 取用），方法名对齐 JSAPI TrackLine。 */
export interface TrackLineRef {
  /** 开始播放（JSAPI start） */
  start: () => void;
  /** 从暂停处继续播放（JSAPI resume；从头播放用 start） */
  resume: () => void;
  pause: () => void;
  stop: () => void;
  /** 开启/关闭地图视野跟随车辆（setAutoFollow）；跟随细节用 setFollowOptions 调整 */
  setAutoFollow: (enable: boolean) => void;
  setFollowOptions: (opts: Record<string, unknown>) => void;
}

const TRACK_EVENTS: Array<{ sdk: string; prop: string }> = [
  { sdk: 'click', prop: 'onClick' },
  { sdk: 'mouseover', prop: 'onMouseOver' },
  { sdk: 'mouseout', prop: 'onMouseOut' },
  { sdk: 'mousemove', prop: 'onMouseMove' },
  { sdk: 'progress', prop: 'onProgress' },
  { sdk: 'statuschange', prop: 'onStatusChange' },
];

export const TrackLine = defineComponent({
  name: 'TrackLine',
  props: {
    data: { type: Object as PropType<object>, default: undefined },
    strokeColor: { type: String, default: undefined },
    strokeWeight: { type: Number, default: undefined },
    strokeLineJoin: { type: String as PropType<'miter' | 'bevel' | 'round'>, default: undefined },
    strokeLineCap: { type: String as PropType<'butt' | 'round' | 'square'>, default: undefined },
    passedColor: { type: String, default: undefined },
    upcomingColor: { type: String, default: undefined },
    lineVisible: { type: Boolean, default: undefined },
    strokeTextureUrl: { type: String, default: undefined },
    strokeTextureWidth: { type: Number, default: undefined },
    strokeTextureHeight: { type: Number, default: undefined },
    strokeTextureSpaced: { type: Boolean, default: undefined },
    strokeTextureGap: { type: Number, default: undefined },
    strokeTextureColor: { type: String, default: undefined },
    duration: { type: Number, default: undefined },
    speedMode: { type: Number, default: undefined },
    timestampKey: { type: String, default: undefined },
    movePoint: { default: undefined },
    autoStart: { type: Boolean, default: undefined },
    autoFollow: { type: Boolean, default: undefined },
    followOptions: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    opacity: { type: Number, default: undefined },
    visible: { type: Boolean, default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    zIndex: { type: Number, default: undefined },
    referCenter: { default: undefined },
    onClick: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseOver: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseOut: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onMouseMove: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onProgress: { type: Function as PropType<(e: unknown) => void>, default: undefined },
    onStatusChange: { type: Function as PropType<(e: unknown) => void>, default: undefined },
  },
  setup(props: any, { expose }) {
    const mapCtx = inject(MAP_KEY, null);
    if (!mapCtx) throw new Error('[vue-bmap] <TrackLine> 必须用在 <Map> 内部');

    let handle: LayerHandle | null = null;
    let unsubs: Array<() => void> = [];

    const ctorKey = computed(() => stableStringify([
      props.strokeColor, props.strokeWeight, props.strokeLineJoin, props.strokeLineCap,
      props.passedColor, props.upcomingColor, props.lineVisible,
      props.strokeTextureUrl, props.strokeTextureWidth, props.strokeTextureHeight,
      props.strokeTextureSpaced, props.strokeTextureGap, props.strokeTextureColor,
      props.duration, props.speedMode, props.timestampKey,
      props.movePoint,
      props.autoStart, props.autoFollow, props.followOptions,
      props.opacity, props.visible, props.minZoom, props.maxZoom, props.zIndex,
      props.referCenter,
    ]));

    const create = () => {
      const ctx = mapCtx.value;
      if (!ctx || !ctx.map) return;
      const { map, driver } = ctx;
      const opts: Record<string, unknown> = {};
      const put = (k: string, v: unknown) => { if (v !== undefined) opts[k] = v; };
      put('strokeColor', props.strokeColor); put('strokeWeight', props.strokeWeight);
      put('strokeLineJoin', props.strokeLineJoin); put('strokeLineCap', props.strokeLineCap);
      put('passedColor', props.passedColor); put('upcomingColor', props.upcomingColor);
      put('lineVisible', props.lineVisible);
      put('strokeTextureUrl', props.strokeTextureUrl); put('strokeTextureWidth', props.strokeTextureWidth);
      put('strokeTextureHeight', props.strokeTextureHeight); put('strokeTextureSpaced', props.strokeTextureSpaced);
      put('strokeTextureGap', props.strokeTextureGap); put('strokeTextureColor', props.strokeTextureColor);
      put('duration', props.duration); put('speedMode', props.speedMode); put('timestampKey', props.timestampKey);
      put('movePoint', props.movePoint);
      put('autoStart', props.autoStart); put('autoFollow', props.autoFollow); put('followOptions', props.followOptions);
      put('opacity', props.opacity); put('visible', props.visible);
      put('minZoom', props.minZoom); put('maxZoom', props.maxZoom); put('zIndex', props.zIndex);
      put('referCenter', props.referCenter);

      const h = driver.createTrackLine(opts);
      if (!h) return;
      handle = h;
      driver.addLayer(map, h);

      if (h.raw) {
        for (const { sdk, prop } of TRACK_EVENTS) {
          unsubs.push(driver.addEventListener(h, sdk, (e: unknown) => {
            const fn = props[prop] as ((e: unknown) => void) | undefined;
            if (typeof fn === 'function') fn(e);
          }));
        }
      }
      if (props.data && h.raw) {
        try { (h.raw as any).setData?.(props.data); } catch (e) { debugWarn('TrackLine.setData', e); }
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

    // 播放控制命令式句柄，方法名与 JSAPI TrackLine 对齐（start/pause/stop/...）
    const rawOf = () => (handle ? (handle as { raw: unknown }).raw as any : null);
    expose({
      /** 开始播放（SDK start()） */
      start: () => { try { rawOf()?.start?.(); } catch { /* ignore */ } },
      /** 从暂停处继续（SDK resume()） */
      resume: () => { try { rawOf()?.resume?.(); } catch { /* ignore */ } },
      pause: () => { try { rawOf()?.pause?.(); } catch { /* ignore */ } },
      stop: () => { try { rawOf()?.stop?.(); } catch { /* ignore */ } },
      /** 开启/关闭跟随（SDK setAutoFollow）——只有开启后视野才会跟着车走 */
      setAutoFollow: (enable: boolean) => { try { rawOf()?.setAutoFollow?.(enable); } catch { /* ignore */ } },
      setFollowOptions: (o: Record<string, unknown>) => { try { rawOf()?.setFollowOptions?.(o); } catch { /* ignore */ } },
    } satisfies TrackLineRef);

    return () => null;
  },
});
