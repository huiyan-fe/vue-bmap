/**
 * Map 容器组件 —— 对应 react-bmap 的 components/Map/Map.tsx。
 *
 * - onMounted 创建地图；等 tilesloaded（GL 首帧）再 provide map，避免 GL 纹理未就绪报错。
 * - 受控 center/zoom/heading/tilt：独立 watch + internalUpdate 抑制回环 + pointEquals。
 * - 命令式句柄通过 expose 暴露（MapRefImpl）。
 */
import {
  defineComponent, h, onBeforeUnmount, onMounted, provide, shallowRef, watch, type PropType,
} from 'vue';
import { useBMapContext, MAP_KEY, type MapContextValue } from '../../context';
import type { MapHandle, Point, Bounds } from '../../types';
import type { DisplayOptions } from '../../types/core';
import { MapRefImpl } from './MapRef';
import { pointEquals } from '../../utils/pointEquals';

const EVENT_MAP: Record<string, string> = {
  onClick: 'click', onDblClick: 'dblclick', onRightClick: 'rightclick',
  onMouseMove: 'mousemove', onMouseDown: 'mousedown', onMouseUp: 'mouseup',
  onMouseOver: 'mouseover', onMouseOut: 'mouseout',
  onDragStart: 'dragstart', onDragging: 'dragging', onDragEnd: 'dragend',
  onMoveStart: 'movestart', onMoving: 'moving', onMoveEnd: 'moveend',
  onZoomStart: 'zoomstart', onZooming: 'zooming', onZoomEnd: 'zoomend',
  onResize: 'resize', onTilesLoaded: 'tilesloaded', onMapTypeChange: 'maptypechange',
  onTouchStart: 'touchstart', onTouchMove: 'touchmove', onTouchEnd: 'touchend',
  onLongPress: 'longpress',
};

const TOGGLES = [
  'enableDragging', 'enableInertialDragging', 'enableScrollWheelZoom', 'enableContinuousZoom',
  'enableResizeOnCenter', 'enableDoubleClickZoom', 'enableKeyboard', 'enablePinchToZoom',
  'enableRotate', 'enableRotateGestures', 'enableTilt', 'enableTiltGestures',
  'enableAutoResize', 'enableIconInfoWindow',
] as const;

export const Map = defineComponent({
  name: 'Map',
  inheritAttrs: false,
  props: {
    center: { type: Object as PropType<Point>, default: undefined },
    zoom: { type: Number, default: undefined },
    heading: { type: Number, default: undefined },
    tilt: { type: Number, default: undefined },
    defaultCenter: { type: Object as PropType<Point>, default: undefined },
    defaultZoom: { type: Number, default: undefined },
    defaultHeading: { type: Number, default: undefined },
    defaultTilt: { type: Number, default: undefined },
    options: { type: Object as PropType<Record<string, unknown>>, default: undefined },
    displayOptions: { type: Object as PropType<DisplayOptions>, default: undefined },
    mapStyle: { default: undefined },
    mapStyleV2: { default: undefined },
    minZoom: { type: Number, default: undefined },
    maxZoom: { type: Number, default: undefined },
    bounds: { type: Object as PropType<Bounds>, default: undefined },
    mapType: { type: [String, Number], default: undefined },
    defaultCursor: { type: String, default: undefined },
    draggingCursor: { type: String, default: undefined },
    theme: { type: String, default: undefined },
    enablePreferredLanguage: { type: [String, Boolean], default: undefined },
    enableDragging: { type: Boolean, default: undefined },
    enableInertialDragging: { type: Boolean, default: undefined },
    enableScrollWheelZoom: { type: Boolean, default: undefined },
    enableContinuousZoom: { type: Boolean, default: undefined },
    enableResizeOnCenter: { type: Boolean, default: undefined },
    enableDoubleClickZoom: { type: Boolean, default: undefined },
    enableKeyboard: { type: Boolean, default: undefined },
    enablePinchToZoom: { type: Boolean, default: undefined },
    enableRotate: { type: Boolean, default: undefined },
    enableRotateGestures: { type: Boolean, default: undefined },
    enableTilt: { type: Boolean, default: undefined },
    enableTiltGestures: { type: Boolean, default: undefined },
    enableAutoResize: { type: Boolean, default: undefined },
    enableIconInfoWindow: { type: Boolean, default: undefined },
    onReady: { type: Function as PropType<(map: MapHandle) => void>, default: undefined },
    onCenterChange: { type: Function as PropType<(p: Point) => void>, default: undefined },
    onZoomChange: { type: Function as PropType<(z: number) => void>, default: undefined },
  },
  setup(props: any, { slots, attrs, expose }) {
    const bmap = useBMapContext();
    const containerRef = shallowRef<HTMLElement | null>(null);
    const mapCtx = shallowRef<MapContextValue | null>(null);
    provide(MAP_KEY, mapCtx);

    let handle: MapHandle | null = null;
    let unsubs: Array<() => void> = [];
    let internalUpdate = false;

    const suppress = (fn: () => void) => {
      internalUpdate = true;
      try { fn(); } catch (e) { console.warn('[vue-bmap] map controlled sync failed', e); }
      requestAnimationFrame(() => { internalUpdate = false; });
    };

    const createMap = () => {
      const { driver, status } = bmap.value;
      if (status !== 'ready' || !driver || !containerRef.value || handle) return;

      const initial: Record<string, unknown> = { ...(props.options ?? {}) };
      Object.keys(initial).forEach((k) => initial[k] === undefined && delete initial[k]);
      const initialStyle = props.mapStyleV2 ?? props.mapStyle;
      if (initialStyle !== undefined) initial.style = initialStyle;

      handle = driver.createMap(containerRef.value, initial);

      const initCenter = props.defaultCenter ?? props.center;
      const initZoom = props.defaultZoom ?? props.zoom ?? 11;
      if (initCenter) {
        try { driver.centerAndZoom(handle, initCenter, initZoom, { noAnimation: true }); }
        catch (e) { console.warn('[vue-bmap] centerAndZoom failed', e); }
      }
      const initHeading = props.defaultHeading ?? props.heading;
      const initTilt = props.defaultTilt ?? props.tilt;
      if (initHeading != null) { try { driver.setHeading(handle, initHeading, { noAnimation: true }); } catch { /* ignore */ } }
      if (initTilt != null) { try { driver.setTilt(handle, initTilt, { noAnimation: true }); } catch { /* ignore */ } }
      if (props.mapType !== undefined) { try { driver.setMapType(handle, props.mapType); } catch { /* ignore */ } }
      if (props.displayOptions !== undefined) { try { driver.setDisplayOptions(handle, props.displayOptions); } catch { /* ignore */ } }

      let mapReady = false;
      const markReady = () => {
        if (mapReady || !handle) return;
        mapReady = true;
        mapCtx.value = { map: handle, driver };
        props.onReady?.(handle);
      };
      unsubs.push(driver.addEventListener(handle, 'tilesloaded', markReady));
      const fallbackId = setTimeout(markReady, 500);
      unsubs.push(() => clearTimeout(fallbackId));

      unsubs.push(driver.addEventListener(handle, 'moveend', () => {
        if (internalUpdate || !handle) return;
        props.onCenterChange?.(driver.getCenter(handle));
      }));
      unsubs.push(driver.addEventListener(handle, 'zoomend', () => {
        if (internalUpdate || !handle) return;
        props.onZoomChange?.(driver.getZoom(handle));
      }));

      // 用户事件回调（onClick 等）
      for (const [prop, evt] of Object.entries(EVENT_MAP)) {
        const fn = (props as any)[prop] ?? (attrs as any)[prop];
        if (typeof fn !== 'function') continue;
        unsubs.push(driver.addEventListener(handle, evt, (e: unknown) => {
          const live = (props as any)[prop] ?? (attrs as any)[prop];
          if (typeof live === 'function') live(e);
        }));
      }
    };

    const destroyMap = () => {
      unsubs.forEach((u) => u()); unsubs = [];
      const { driver } = bmap.value;
      if (handle && driver) { try { driver.destroyMap(handle); } catch { /* ignore */ } }
      handle = null;
      mapCtx.value = null;
    };

    onMounted(() => {
      createMap();
      watch(() => bmap.value.status, () => createMap());
    });
    onBeforeUnmount(destroyMap);

    const driverOf = () => bmap.value.driver;

    // 受控 center
    watch(() => [props.center?.lng, props.center?.lat], () => {
      const d = driverOf();
      if (!handle || !d || !props.center) return;
      if (!pointEquals(d.getCenter(handle), props.center)) suppress(() => d.setCenter(handle!, props.center));
    });
    // 受控 zoom
    watch(() => props.zoom, () => {
      const d = driverOf();
      if (!handle || !d || props.zoom == null) return;
      let cur: number | undefined;
      try { cur = d.getZoom(handle); } catch { /* ignore */ }
      if (cur !== undefined && cur !== props.zoom) suppress(() => d.setZoom(handle!, props.zoom));
    });
    // 受控 heading / tilt（v3 不支持时 driver 内部处理）
    watch(() => props.heading, () => {
      const d = driverOf();
      if (!handle || !d || props.heading == null) return;
      let cur: number | undefined;
      try { cur = d.getHeading(handle); } catch { return; }
      if (typeof cur === 'number' && !Number.isNaN(cur) && Math.abs(cur - props.heading) > 0.01) suppress(() => d.setHeading(handle!, props.heading));
    });
    watch(() => props.tilt, () => {
      const d = driverOf();
      if (!handle || !d || props.tilt == null) return;
      let cur: number | undefined;
      try { cur = d.getTilt(handle); } catch { return; }
      if (typeof cur === 'number' && !Number.isNaN(cur) && Math.abs(cur - props.tilt) > 0.01) suppress(() => d.setTilt(handle!, props.tilt));
    });

    // 交互开关
    for (const key of TOGGLES) {
      watch(() => props[key], (v) => {
        const d = driverOf();
        if (!handle || !d || v === undefined) return;
        const cap = key.slice(6); // 去掉 "enable"
        try { (d as any)[`${v ? 'enable' : 'disable'}${cap}`](handle); } catch { /* ignore */ }
      });
    }

    // 缩放范围 / 边界 / 类型 / 光标 / 主题 / 显示 / 样式
    watch(() => props.minZoom, (v) => { const d = driverOf(); if (handle && d && v !== undefined) try { d.setMinZoom(handle, v); } catch { /* ignore */ } });
    watch(() => props.maxZoom, (v) => { const d = driverOf(); if (handle && d && v !== undefined) try { d.setMaxZoom(handle, v); } catch { /* ignore */ } });
    watch(() => props.mapType, (v) => { const d = driverOf(); if (handle && d && v !== undefined) try { d.setMapType(handle, v); } catch { /* ignore */ } });
    watch(() => props.defaultCursor, (v) => { const d = driverOf(); if (handle && d && v !== undefined) try { d.setDefaultCursor(handle, v); } catch { /* ignore */ } });
    watch(() => props.draggingCursor, (v) => { const d = driverOf(); if (handle && d && v !== undefined) try { d.setDraggingCursor(handle, v); } catch { /* ignore */ } });
    watch(() => props.theme, (v) => { const d = driverOf(); if (handle && d && v !== undefined) try { d.setTheme(handle, v); } catch { /* ignore */ } });
    watch(() => props.displayOptions, (v) => { const d = driverOf(); if (handle && d && v !== undefined) try { d.setDisplayOptions(handle, v); } catch { /* ignore */ } }, { deep: true });
    watch(() => props.mapStyle, (v) => { const d = driverOf(); if (handle && d && v !== undefined) d.setMapStyle(handle, v); });
    watch(() => props.mapStyleV2, (v) => { const d = driverOf(); if (handle && d && v !== undefined) d.setMapStyleV2(handle, v); });

    expose({
      /** 命令式句柄：panTo/flyTo/setZoom/getBounds/pointToPixel/getScreenshot 等全量方法 */
      getMapRef: () => { const d = driverOf(); return handle && d ? new MapRefImpl(handle, d) : null; },
    });

    // 事件回调（onClick 等）已在 createMap 中绑定到地图实例，不能再作为原生监听器透传给容器 div
    const containerAttrs = () => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(attrs)) {
        if (k in EVENT_MAP) continue;
        out[k] = v;
      }
      return out;
    };

    return () => h('div', { ...containerAttrs(), ref: containerRef }, mapCtx.value ? (slots.default ? slots.default() : []) : []);
  },
});

export type MapProps = InstanceType<typeof Map>['$props'];



