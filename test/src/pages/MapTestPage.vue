<script setup lang="ts">
/* ────────────────────────────────────────────────────────────
 * Map 综合测试页（全量）—— 忠实复刻 react-bmap test 的 MapTestPage.tsx
 *
 * React → Vue 映射：
 *  - useState        → ref
 *  - useEffect       → watch
 *  - 事件            → :onXxx 函数 prop / <Map> 内探针订阅
 *  - 命令式 ref      → <Map ref> 暴露的 getMapRef()（MapRefImpl 全量方法）
 *  - useMapStatus    → StateProbe（<Map> 内）实时状态
 *  - useCapabilities → caps.has(...) 能力门控
 *
 * 布局套用 .test-page/.test-map/.test-controls；右侧以 Tab 收纳 10 组功能。
 * ──────────────────────────────────────────────────────────── */
import { computed, defineComponent, onUnmounted, ref, shallowRef, watch } from 'vue';
import {
  Map, NavigationControl, ScaleControl,
  useCapabilities, useBMapContext, useMapStatus, useMapContext, tryOp,
  BMAP_ANCHOR_BOTTOM_LEFT, BMAP_ANCHOR_TOP_LEFT,
} from '@baidumap/vue-bmap';
import type { Point, MapRef, MapSnapshot } from '@baidumap/vue-bmap';
import { BEIJING } from '../TestProvider';
import { useLog } from './overlay/useLog';
import EventLog from '../components/EventLog.vue';

const CITIES: { name: string; lng: number; lat: number; zoom: number }[] = [
  { name: '北京', lng: 116.404, lat: 39.915, zoom: 11 },
  { name: '上海', lng: 121.474, lat: 31.230, zoom: 11 },
  { name: '广州', lng: 113.264, lat: 23.129, zoom: 11 },
  { name: '深圳', lng: 114.057, lat: 22.543, zoom: 11 },
  { name: '杭州', lng: 120.155, lat: 30.274, zoom: 11 },
  { name: '成都', lng: 104.066, lat: 30.572, zoom: 11 },
  { name: '西安', lng: 108.940, lat: 34.341, zoom: 11 },
  { name: '武汉', lng: 114.305, lat: 30.593, zoom: 11 },
];

const TABS = [
  { id: 'view', label: '视野', icon: '🌐' },
  { id: 'interact', label: '交互', icon: '⚙' },
  { id: 'style', label: '样式', icon: '🎨' },
  { id: 'command', label: '命令', icon: '⚡' },
  { id: 'query', label: '查询', icon: '🔍' },
  { id: 'coord', label: '坐标', icon: '📐' },
  { id: 'event', label: '事件', icon: '📡' },
  { id: 'v3', label: '3.0', icon: '📱' },
  { id: 'v4', label: '4.0+', icon: '🚀' },
  { id: 'misc', label: '杂项', icon: '📦' },
] as const;
type TabId = typeof TABS[number]['id'];
// ── styleJson 预设（参考百度地图个性化编辑器） ──
const STYLE_DARK = [
  { featureType: 'all', elementType: 'geometry', stylers: { color: '#242f3e' } },
  { featureType: 'all', elementType: 'labels.text.fill', stylers: { color: '#746855' } },
  { featureType: 'all', elementType: 'labels.text.stroke', stylers: { color: '#192028' } },
  { featureType: 'road', elementType: 'geometry', stylers: { color: '#38414e' } },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: { color: '#212a37' } },
  { featureType: 'water', elementType: 'geometry', stylers: { color: '#17263c' } },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: { color: '#515c6d' } },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: { color: '#7a8694' } },
  { featureType: 'landscape', elementType: 'geometry', stylers: { color: '#1f2a35' } },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: { color: '#7a8b99' } },
];
const STYLE_MIDNIGHT = [
  { featureType: 'all', elementType: 'geometry', stylers: { color: '#0b1a2a' } },
  { featureType: 'all', elementType: 'labels.text.fill', stylers: { color: '#677585' } },
  { featureType: 'all', elementType: 'labels.text.stroke', stylers: { color: '#020c14' } },
  { featureType: 'road', elementType: 'geometry', stylers: { color: '#152a3e' } },
  { featureType: 'water', elementType: 'geometry', stylers: { color: '#06101a' } },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: { color: '#3a4a5a' } },
  { featureType: 'landscape', elementType: 'geometry', stylers: { color: '#0e1e2c' } },
  { featureType: 'poi', elementType: 'all', stylers: { visibility: 'off' } },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: { color: '#4a5a6a' } },
];
const STYLE_GRAYSCALE = [
  { featureType: 'all', elementType: 'geometry', stylers: { color: '#e0e0e0' } },
  { featureType: 'all', elementType: 'labels.text.fill', stylers: { color: '#666666' } },
  { featureType: 'all', elementType: 'labels.text.stroke', stylers: { color: '#ffffff' } },
  { featureType: 'road', elementType: 'geometry', stylers: { color: '#cccccc' } },
  { featureType: 'water', elementType: 'geometry', stylers: { color: '#d4d4d4' } },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: { color: '#999999' } },
  { featureType: 'landscape', elementType: 'geometry', stylers: { color: '#dadada' } },
  { featureType: 'poi', elementType: 'geometry', stylers: { color: '#d8d8d8' } },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: { color: '#777777' } },
];
const STYLE_BLUE = [
  { featureType: 'all', elementType: 'geometry', stylers: { color: '#1e5a8a' } },
  { featureType: 'all', elementType: 'labels.text.fill', stylers: { color: '#a0d0ff' } },
  { featureType: 'all', elementType: 'labels.text.stroke', stylers: { color: '#0a3a5a' } },
  { featureType: 'road', elementType: 'geometry', stylers: { color: '#2a7ab5' } },
  { featureType: 'water', elementType: 'geometry', stylers: { color: '#0a2540' } },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: { color: '#5a9ad0' } },
  { featureType: 'landscape', elementType: 'geometry', stylers: { color: '#1a4a7a' } },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: { color: '#80b8e0' } },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: { color: '#90c8f0' } },
];
const STYLE_RED = [
  { featureType: 'all', elementType: 'geometry', stylers: { color: '#3a1a1a' } },
  { featureType: 'all', elementType: 'labels.text.fill', stylers: { color: '#e0a0a0' } },
  { featureType: 'all', elementType: 'labels.text.stroke', stylers: { color: '#2a0a0a' } },
  { featureType: 'road', elementType: 'geometry', stylers: { color: '#5a2a2a' } },
  { featureType: 'water', elementType: 'geometry', stylers: { color: '#1a0505' } },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: { color: '#a05050' } },
  { featureType: 'landscape', elementType: 'geometry', stylers: { color: '#3a1515' } },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: { color: '#c07070' } },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: { color: '#d08080' } },
];
const caps = useCapabilities();
const bmap = useBMapContext();
const version = computed(() => bmap.value.version);

// 事件日志（useLog：最多 20 条，最新在前）
const { eventLog, log, fmt } = useLog();

// ── 面板/状态（useState → ref） ──
const status = shallowRef<MapSnapshot | null>(null);
const result = ref('');
const activeTab = ref<TabId>('view');
const logOpen = ref(false);

// ── 受控视野 ──
const center = ref<Point>({ ...BEIJING });
const zoom = ref(11);
const heading = ref(0);
const tilt = ref(0);

// ── 受控交互开关（undefined 表示不主动控制） ──
const dragging = ref<boolean | undefined>(true);
const inertialDragging = ref<boolean | undefined>(undefined);
const scrollWheelZoom = ref<boolean | undefined>(true);
const continuousZoom = ref<boolean | undefined>(undefined);
const resizeOnCenter = ref<boolean | undefined>(undefined);
const doubleClickZoom = ref<boolean | undefined>(undefined);
const keyboard = ref<boolean | undefined>(undefined);
const pinchToZoom = ref<boolean | undefined>(undefined);
const rotate = ref<boolean | undefined>(undefined);
const rotateGestures = ref<boolean | undefined>(undefined);
const tiltEnable = ref<boolean | undefined>(undefined);
const tiltGestures = ref<boolean | undefined>(undefined);
const autoResize = ref<boolean | undefined>(undefined);
const iconInfoWindow = ref<boolean | undefined>(undefined);

// ── 其它受控 ──
const minZoom = ref<number | undefined>(undefined);
const maxZoom = ref<number | undefined>(undefined);
const mapType = ref<number | undefined>(undefined);
const defaultCursor = ref<string | undefined>(undefined);
const draggingCursor = ref<string | undefined>(undefined);
const theme = ref<string | undefined>(undefined);
const mapStyleV2 = ref<Record<string, unknown> | undefined>(undefined);

// ── 命令输入 ──
const panToLng = ref('121.474');
const panToLat = ref('31.230');
const panByX = ref('100');
const panByY = ref('100');
const czZoom = ref('12');
const cityInput = ref('北京');
const animate = ref(true);

// ── 事件订阅开关 ──
const subscribedEvents = ref<string[]>([]);

// 视角动画实例（cancel 需要传回动画对象）
let animRef: any = null;

// 运行时地图类型常量（v3 为全局 window.BMAP_*，v4 在 BMap 命名空间下）
const w = window as any;
const RT_NORMAL = w.BMap?.BMAP_NORMAL_MAP ?? w.BMAP_NORMAL_MAP ?? 1;
const RT_SATELLITE = w.BMap?.BMAP_SATELLITE_MAP ?? w.BMAP_SATELLITE_MAP ?? 2;
const RT_HYBRID = w.BMap?.BMAP_HYBRID_MAP ?? w.BMAP_HYBRID_MAP ?? 3;
const RT_EARTH = w.BMap?.BMAP_EARTH_MAP ?? w.BMAP_EARTH_MAP ?? 4;

// <Map> 命令式句柄：通过模板 ref 暴露的 getMapRef()
const mapCmp = ref<any>(null);
const getMap = (): MapRef | null => mapCmp.value?.getMapRef?.() ?? null;

// 统一调用出口（对齐 react 的 call + tryOp）
const call = (name: string, fn: () => unknown) => {
  try {
    const r = tryOp(fn);
    if (r.ok) {
      const v = r.value;
      let display: string;
      if (v === undefined) display = 'ok';
      else if (typeof v === 'object' && v !== null) {
        try { display = JSON.stringify(v).slice(0, 300); }
        catch { display = `[${(v as any).constructor?.name || 'Object'}] (无法序列化)`; }
      } else display = String(v).slice(0, 300);
      result.value = `${name}: ${display}`;
    } else {
      result.value = `${name}: ❌ unsupported (${r.capability})`;
    }
  } catch (e) {
    result.value = `${name}: ❌ error (${e instanceof Error ? e.message : String(e)})`;
  }
};
// 受控交互开关表（key + getter/setter，供模板遍历 + 三态复选框）
const interactionSwitches: Array<{ key: string; get: () => boolean | undefined; set: (v: boolean | undefined) => void }> = [
  { key: 'enableDragging', get: () => dragging.value, set: (v) => (dragging.value = v) },
  { key: 'enableInertialDragging', get: () => inertialDragging.value, set: (v) => (inertialDragging.value = v) },
  { key: 'enableScrollWheelZoom', get: () => scrollWheelZoom.value, set: (v) => (scrollWheelZoom.value = v) },
  { key: 'enableContinuousZoom', get: () => continuousZoom.value, set: (v) => (continuousZoom.value = v) },
  { key: 'enableResizeOnCenter', get: () => resizeOnCenter.value, set: (v) => (resizeOnCenter.value = v) },
  { key: 'enableDoubleClickZoom', get: () => doubleClickZoom.value, set: (v) => (doubleClickZoom.value = v) },
  { key: 'enableKeyboard', get: () => keyboard.value, set: (v) => (keyboard.value = v) },
  { key: 'enablePinchToZoom', get: () => pinchToZoom.value, set: (v) => (pinchToZoom.value = v) },
  { key: 'enableRotate', get: () => rotate.value, set: (v) => (rotate.value = v) },
  { key: 'enableRotateGestures', get: () => rotateGestures.value, set: (v) => (rotateGestures.value = v) },
  { key: 'enableTilt', get: () => tiltEnable.value, set: (v) => (tiltEnable.value = v) },
  { key: 'enableTiltGestures', get: () => tiltGestures.value, set: (v) => (tiltGestures.value = v) },
  { key: 'enableAutoResize', get: () => autoResize.value, set: (v) => (autoResize.value = v) },
  { key: 'enableIconInfoWindow', get: () => iconInfoWindow.value, set: (v) => (iconInfoWindow.value = v) },
];
const resetAllInteractions = () => interactionSwitches.forEach((s) => s.set(undefined));

const eventList = [
  'click', 'dblclick', 'rightclick', 'mousemove', 'mousedown', 'mouseup', 'mouseover', 'mouseout',
  'dragstart', 'dragging', 'dragend', 'movestart', 'moving', 'moveend',
  'zoomstart', 'zooming', 'zoomend', 'resize', 'tilesloaded', 'maptypechange',
  'touchstart', 'touchmove', 'touchend', 'longpress',
];
const toggleEvent = (evt: string) => {
  subscribedEvents.value = subscribedEvents.value.includes(evt)
    ? subscribedEvents.value.filter((e) => e !== evt)
    : [...subscribedEvents.value, evt];
};

const queryMethods = [
  'getCenter', 'getZoom', 'getBounds', 'getSize', 'getMinZoom', 'getMaxZoom',
  'getHeading', 'getTilt', 'isLoaded', 'getCoordType', 'getMapType', 'getMapTypeId',
  'getMapStyleId', 'getRenderType', 'isCanvasMap', 'getDefaultCursor', 'getDraggingCursor',
];
const coordMethods: Array<[string, () => unknown]> = [
  ['pointToPixel', () => getMap()?.pointToPixel({ lng: 116.404, lat: 39.915 })],
  ['pixelToPoint', () => getMap()?.pixelToPoint({ x: 400, y: 300 })],
  ['pointToOverlayPixel', () => getMap()?.pointToOverlayPixel({ lng: 116.404, lat: 39.915 })],
  ['overlayPixelToPoint', () => getMap()?.overlayPixelToPoint({ x: 400, y: 300 })],
  ['getDistance', () => getMap()?.getDistance({ lng: 116.404, lat: 39.915 }, { lng: 116.504, lat: 39.955 })],
  ['lnglatToMercator', () => getMap()?.lnglatToMercator(116.404, 39.915)],
  ['mercatorToLnglat', () => getMap()?.mercatorToLnglat(12958190, 4825923)],
];
const v4Methods = [
  'getScreenshot', 'getContainerSize', 'getZoomUnits', 'getMapCoordType', 'getAreaStyleId',
  'getSolarInfo', 'getPoiByUid', 'getEarth', 'showEarthBoundary', 'hideEarthBoundary',
  'setEarthMaxZoom', 'setEarthMinZoom', 'showStreetLayer', 'hideStreetLayer',
  'showVectorStreetLayer', 'hideVectorStreetLayer', 'setNormalMapDisplay', 'getVectorContainer',
  'changeLanguage', 'enablePreferredLanguage', 'addAreaSpot',
  'clearAreaSpots', 'addMapLabels', 'clearLabels', 'setLock', 'getPrivateRegions',
  'setPrivateStatus', 'addFocusMask', 'clearFocusMasks',
];
const miscMethods = [
  'setCopyrightOffset', 'setOverlayMoveCursor', 'setBounds', 'restrictBounds',
  'showOverlayContainer', 'hideOverlayContainer', 'checkResize', 'resize',
  'resetSpotStatus', 'addParkingSpot', 'setOptions', 'setDisplayOptions',
];

// 视角动画（v4+）：构造 ViewAnimation 关键帧
const startLongAnim = () => {
  const sdk: any = (window as any).BMap;
  if (!sdk?.ViewAnimation) { result.value = 'startViewAnimation: ❌ ViewAnimation 未定义（v3 不支持）'; return; }
  const c = center.value;
  const keyframes = [
    { center: new sdk.Point(c.lng, c.lat), zoom: zoom.value, heading: 0, tilt: 0, percentage: 0 },
    { center: new sdk.Point(c.lng, c.lat), zoom: zoom.value, heading: 180, tilt: 60, percentage: 1 },
  ];
  const anim = new sdk.ViewAnimation(keyframes, { duration: 8000, delay: 0, interation: 1 });
  animRef = anim;
  call('startViewAnimation(8s)', () => getMap()?.startViewAnimation(anim));
};

const callV4 = (m: string) => {
  const r = getMap();
  if (m === 'getSolarInfo') return call(m, () => r?.getSolarInfo(new Date()));
  if (m === 'getPoiByUid') return call(m, () => r?.getPoiByUid('test', () => {}));
  if (m === 'setEarthMaxZoom') return call(m, () => r?.setEarthMaxZoom(10));
  if (m === 'setEarthMinZoom') return call(m, () => r?.setEarthMinZoom(3));
  if (m === 'showStreetLayer') return call(m, () => r?.showStreetLayer(true));
  if (m === 'setNormalMapDisplay') return call(m, () => r?.setNormalMapDisplay(true));
  if (m === 'getVectorContainer') return call(m, () => !!r?.getVectorContainer());
  if (m === 'changeLanguage') return call(m, () => r?.changeLanguage((w.BMap?.BMAP_LANGUAGE_ZH ?? w.BMAP_LANGUAGE_ZH ?? 0) as any));
  if (m === 'enablePreferredLanguage') return call(m, () => r?.enablePreferredLanguage((w.BMap?.BMAP_LANGUAGE_ZH ?? w.BMAP_LANGUAGE_ZH ?? 0) as any));
  if (m === 'addAreaSpot') return call(m, () => r?.addAreaSpot([116.4, 39.9, 116.5, 39.95]));
  if (m === 'addMapLabels') return call(m, () => r?.addMapLabels([]));
  if (m === 'setLock') return call(m, () => r?.setLock(true));
  if (m === 'setPrivateStatus') return call(m, () => r?.setPrivateStatus(true));
  if (m === 'addFocusMask') return call(m, () => r?.addFocusMask({}));
  return call(m, () => (r as any)?.[m]());
};
const callMisc = (m: string) => {
  const r = getMap();
  if (m === 'setCopyrightOffset') return call(m, () => r?.setCopyrightOffset({}, {}));
  if (m === 'setOverlayMoveCursor') return call(m, () => r?.setOverlayMoveCursor('move'));
  if (m === 'setBounds') return call(m, () => r?.setBounds({ sw: { lng: 116, lat: 39 }, ne: { lng: 117, lat: 40 } }));
  if (m === 'restrictBounds') return call(m, () => r?.restrictBounds({ sw: { lng: 116, lat: 39 }, ne: { lng: 117, lat: 40 } }));
  return call(m, () => (r as any)?.[m]());
};

// 三态复选框：undefined → indeterminate（对齐 react 的 el.indeterminate）
const vIndeterminate = {
  mounted(el: HTMLInputElement, binding: { value: boolean }) { el.indeterminate = binding.value; },
  updated(el: HTMLInputElement, binding: { value: boolean }) { el.indeterminate = binding.value; },
};

// 鼠标交互改变 heading/tilt 时同步回受控状态（滑块跟随地图，useEffect → watch）
watch(() => status.value?.heading, (h) => { if (h != null) heading.value = h; });
watch(() => status.value?.tilt, (t) => { if (t != null) tilt.value = t; });

// ── <Map> 内探针：状态快照（useMapStatus → StateProbe） ──
const StateProbe = defineComponent({
  name: 'StateProbe',
  setup() {
    const s = useMapStatus();
    watch(s, (v) => { status.value = v; }, { immediate: true });
    return () => null;
  },
});

// ── <Map> 内探针：动态订阅地图事件（subscribedEvents 变化即重绑） ──
const MapEventProbe = defineComponent({
  name: 'MapEventProbe',
  setup() {
    const ctx = useMapContext();
    let unsubs: Array<() => void> = [];
    const rebind = () => {
      unsubs.forEach((u) => u()); unsubs = [];
      const c = ctx.value; if (!c?.map) return;
      for (const evt of subscribedEvents.value) {
        unsubs.push(c.driver.addEventListener(c.map, evt, (raw: any) => {
          const pt = raw?.point ? fmt(raw.point) : '';
          log(`${evt}${pt ? ' @ ' + pt : ''}`);
        }));
      }
    };
    watch([() => ctx.value?.map, () => subscribedEvents.value.join(',')], rebind, { immediate: true });
    onUnmounted(() => unsubs.forEach((u) => u()));
    return () => null;
  },
});
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map
        ref="mapCmp"
        :center="center"
        :zoom="zoom"
        :heading="heading || undefined"
        :tilt="tilt || undefined"
        :enable-dragging="dragging"
        :enable-inertial-dragging="inertialDragging"
        :enable-scroll-wheel-zoom="scrollWheelZoom"
        :enable-continuous-zoom="continuousZoom"
        :enable-resize-on-center="resizeOnCenter"
        :enable-double-click-zoom="doubleClickZoom"
        :enable-keyboard="keyboard"
        :enable-pinch-to-zoom="pinchToZoom"
        :enable-rotate="rotate"
        :enable-rotate-gestures="rotateGestures"
        :enable-tilt="tiltEnable"
        :enable-tilt-gestures="tiltGestures"
        :enable-auto-resize="autoResize"
        :enable-icon-info-window="iconInfoWindow"
        :min-zoom="minZoom"
        :max-zoom="maxZoom"
        :map-type="mapType"
        :default-cursor="defaultCursor"
        :dragging-cursor="draggingCursor"
        :theme="theme"
        :map-style-v2="mapStyleV2"
        :onCenterChange="(p: any) => (center = p)"
        :onZoomChange="(z: any) => (zoom = z)"
        style="height:100%"
      >
        <NavigationControl :anchor="BMAP_ANCHOR_BOTTOM_LEFT" />
        <ScaleControl />
        <StateProbe />
        <MapEventProbe />
      </Map>

      <!-- 状态 HUD（useMapStatus） -->
      <div class="hud">
        <div class="hud-title">useMapStatus</div>
        <div>zoom: {{ status?.zoom ?? '—' }}</div>
        <div>center: {{ status?.center ? `${status.center.lng.toFixed(4)}, ${status.center.lat.toFixed(4)}` : '—' }}</div>
        <div>heading: {{ status?.heading ?? '—' }}</div>
        <div>tilt: {{ status?.tilt ?? '—' }}</div>
        <div>size: {{ status?.size ? `${status.size.width}×${status.size.height}` : '—' }}</div>
        <div>bounds: {{ status?.bounds ? `${status.bounds.sw.lng.toFixed(2)},${status.bounds.sw.lat.toFixed(2)} → ${status.bounds.ne.lng.toFixed(2)},${status.bounds.ne.lat.toFixed(2)}` : '—' }}</div>
      </div>

      <!-- 方法结果 -->
      <div v-if="result" class="result-box">{{ result }}</div>

      <!-- 事件日志（可折叠） -->
      <EventLog v-if="logOpen" :log="eventLog" hint="订阅事件后在此查看日志" @clear="eventLog = []" />
    </div>

    <div class="test-controls">
      <h2>Map（全量）</h2>

      <!-- Tab 栏 -->
      <div class="btn-group tab-bar">
        <button v-for="t in TABS" :key="t.id" :class="{ active: activeTab === t.id }" @click="activeTab = t.id">
          {{ t.icon }} {{ t.label }}
        </button>
      </div>

      <!-- 能力（常驻） -->
      <section>
        <h3>能力</h3>
        <div class="cap-grid">
          <div :class="`cap-cell ${caps.has('Map.setHeading') ? 'ok' : 'no'}`">{{ caps.has('Map.setHeading') ? 'v4 (WebGL)' : 'v3 (2D)' }}</div>
          <div :class="`cap-cell ${caps.has('Map.flyTo') ? 'ok' : 'no'}`">flyTo</div>
          <div :class="`cap-cell ${caps.has('Map.startViewAnimation') ? 'ok' : 'no'}`">viewAnimation</div>
          <div :class="`cap-cell ${caps.has('Map.enableMapClick') ? 'ok' : 'no'}`">mapClick(3.0)</div>
        </div>
      </section>
      <!-- ════════ 视野 ════════ -->
      <template v-if="activeTab === 'view'">
        <section>
          <h3>中心点（受控 props）</h3>
          <p class="muted small">{{ center.lng.toFixed(4) }}, {{ center.lat.toFixed(4) }}</p>
        </section>
        <section>
          <h3>缩放级别</h3>
          <div class="input-row">
            <button @click="zoom = Math.max(3, zoom - 1)">−</button>
            <input type="number" min="3" max="21" step="1" :value="zoom" @input="(e) => { const v = Number((e.target as HTMLInputElement).value); if (v >= 3 && v <= 21) zoom = v; }" style="text-align:center;max-width:80px" />
            <button @click="zoom = Math.min(21, zoom + 1)">+</button>
          </div>
        </section>
        <section>
          <h3>视角控制 <span :class="`cap-tag ${caps.has('Map.setHeading') ? 'ok' : 'no'}`">{{ caps.has('Map.setHeading') ? 'v4+' : 'v3 ✗' }}</span></h3>
          <div class="slider-row">
            <span class="slider-label">heading</span>
            <input class="full-width" type="range" min="0" max="360" :value="heading" @input="heading = Number(($event.target as HTMLInputElement).value)" />
            <span class="slider-val">{{ heading }}°</span>
          </div>
          <div class="slider-row">
            <span class="slider-label">tilt</span>
            <input class="full-width" type="range" min="0" max="73" :value="tilt" @input="tilt = Number(($event.target as HTMLInputElement).value)" />
            <span class="slider-val">{{ tilt }}°</span>
          </div>
        </section>
        <section>
          <h3>视角动画（v4+） <span :class="`cap-tag ${caps.has('Map.startViewAnimation') ? 'ok' : 'no'}`">{{ caps.has('Map.startViewAnimation') ? 'v4+' : 'v3 ✗' }}</span></h3>
          <p class="muted small">点击「长动画」启动 8 秒动画，进行中可 cancel 终止。⚠ pause/continue 为 SDK 未公开方法，4.0 下无效。</p>
          <div class="btn-group">
            <button @click="startLongAnim">▶ 长动画(8s)</button>
            <button @click="call('setHeading(90)', () => getMap()?.setHeading(90))">heading→90°</button>
            <button @click="call('setTilt(45)', () => getMap()?.setTilt(45))">tilt→45°</button>
            <button @click="call('getCurrentMaxTilt', () => getMap()?.getCurrentMaxTilt())">maxTilt</button>
            <button class="danger" @click="call('cancelViewAnimation', () => getMap()?.cancelViewAnimation(animRef ?? undefined))">✕ cancel</button>
          </div>
        </section>
      </template>
      <!-- ════════ 交互 ════════ -->
      <template v-if="activeTab === 'interact'">
        <section>
          <h3>交互开关（受控 enable*）</h3>
          <div class="btn-group">
            <label v-for="s in interactionSwitches" :key="s.key" class="checkbox-row" style="margin-bottom:0">
              <input
                type="checkbox"
                v-indeterminate="s.get() === undefined"
                :checked="s.get() === true"
                @change="s.set(($event.target as HTMLInputElement).checked)"
              />
              {{ s.key.replace(/^enable/, '') }}
            </label>
          </div>
          <button class="danger" style="margin-top:8px" @click="resetAllInteractions">全部交还默认</button>
        </section>
        <section>
          <h3>缩放范围</h3>
          <div class="input-row">
            <label>minZoom</label>
            <input type="number" placeholder="未设置" :value="minZoom ?? ''" @input="minZoom = ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value)" />
            <label>maxZoom</label>
            <input type="number" placeholder="未设置" :value="maxZoom ?? ''" @input="maxZoom = ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value)" />
          </div>
        </section>
        <section>
          <h3>光标</h3>
          <input class="full-width" type="text" placeholder="defaultCursor" :value="defaultCursor ?? ''" @input="defaultCursor = ($event.target as HTMLInputElement).value || undefined" />
          <input class="full-width" type="text" placeholder="draggingCursor" :value="draggingCursor ?? ''" @input="draggingCursor = ($event.target as HTMLInputElement).value || undefined" />
        </section>
      </template>

      <!-- ════════ 样式 ════════ -->
      <template v-if="activeTab === 'style'">
        <section>
          <h3>地图类型</h3>
          <div class="btn-group">
            <button :class="{ active: mapType === RT_NORMAL }" @click="mapType = RT_NORMAL">普通</button>
            <button :class="{ active: mapType === RT_SATELLITE }" @click="mapType = RT_SATELLITE">卫星</button>
            <button :class="{ active: mapType === RT_HYBRID }" @click="mapType = RT_HYBRID">混合</button>
            <button :class="{ active: mapType === RT_EARTH, danger: version === '3.0' }" :disabled="version === '3.0'" @click="mapType = RT_EARTH">地球 {{ version === '3.0' ? '✗' : '' }}</button>
          </div>
        </section>
        <section>
          <h3>主题 <span :class="`cap-tag ${version !== '3.0' ? 'ok' : 'no'}`">{{ version !== '3.0' ? 'v4+' : 'v3 ✗' }}</span></h3>
          <div class="btn-group">
            <button :class="{ active: theme === 'light' }" :disabled="version === '3.0'" @click="theme = 'light'">Light</button>
            <button :class="{ active: theme === 'dark' }" :disabled="version === '3.0'" @click="theme = 'dark'">Dark</button>
            <button :disabled="version === '3.0'" @click="theme = undefined">清除</button>
          </div>
        </section>
        <section>
          <h3>个性化样式（mapStyleV2 受控 prop）</h3>
          <p class="muted small">通过 styleJson 自定义底图样式</p>
          <div class="btn-group">
            <button @click="mapStyleV2 = { styleJson: [] }">清除</button>
            <button @click="mapStyleV2 = { styleJson: STYLE_DARK }">暗色</button>
            <button @click="mapStyleV2 = { styleJson: STYLE_MIDNIGHT }">午夜</button>
            <button @click="mapStyleV2 = { styleJson: STYLE_GRAYSCALE }">灰度</button>
            <button @click="mapStyleV2 = { styleJson: STYLE_BLUE }">清新蓝</button>
            <button @click="mapStyleV2 = { styleJson: STYLE_RED }">红色</button>
          </div>
        </section>
        <section>
          <h3>常量验证</h3>
          <div class="btn-group">
            <button @click="result = `BMAP_ANCHOR_TOP_LEFT = ${BMAP_ANCHOR_TOP_LEFT}`">ANCHOR_TOP_LEFT</button>
            <button @click="result = `BMAP_NORMAL_MAP = ${RT_NORMAL}`">NORMAL_MAP</button>
            <button @click="result = `BMAP_SATELLITE_MAP = ${RT_SATELLITE}`">SATELLITE_MAP</button>
            <button @click="result = `BMAP_EARTH_MAP = ${RT_EARTH}`">EARTH_MAP</button>
          </div>
        </section>
      </template>
      <!-- ════════ 命令 ════════ -->
      <template v-if="activeTab === 'command'">
        <section>
          <h3>动画开关</h3>
          <label class="checkbox-row"><input type="checkbox" v-model="animate" />animate（取消则传 noAnimation: true）</label>
        </section>
        <section>
          <h3>centerAndZoom</h3>
          <div class="input-row">
            <input type="number" v-model="panToLng" placeholder="lng" />
            <input type="number" v-model="panToLat" placeholder="lat" />
            <input type="number" v-model="czZoom" placeholder="zoom" style="max-width:60px" />
            <button @click="call('centerAndZoom', () => getMap()?.centerAndZoom({ lng: Number(panToLng), lat: Number(panToLat) }, Number(czZoom)))">执行</button>
          </div>
          <div class="input-row">
            <input type="text" v-model="cityInput" placeholder="城市名" />
            <button @click="call('centerAndZoom(city)', () => getMap()?.centerAndZoom(cityInput || '北京', Number(czZoom)))">centerAndZoom(city)</button>
          </div>
        </section>
        <section>
          <h3>setCenter / setZoom</h3>
          <div class="input-row">
            <input type="number" v-model="panToLng" placeholder="lng" />
            <input type="number" v-model="panToLat" placeholder="lat" />
            <button @click="call('setCenter', () => getMap()?.setCenter({ lng: Number(panToLng), lat: Number(panToLat) }, animate ? undefined : { noAnimation: true }))">setCenter</button>
            <button @click="call('setCenter(city)', () => getMap()?.setCenter(cityInput || '北京'))">setCenter(city)</button>
          </div>
          <div class="input-row">
            <input type="number" v-model="czZoom" placeholder="zoom" style="max-width:60px" />
            <button @click="call('setZoom', () => getMap()?.setZoom(Number(czZoom), animate ? undefined : { noAnimation: true }))">setZoom</button>
          </div>
        </section>
        <section>
          <h3>panTo / panBy</h3>
          <div class="input-row">
            <input type="number" v-model="panToLng" placeholder="lng" />
            <input type="number" v-model="panToLat" placeholder="lat" />
            <button @click="call('panTo', () => getMap()?.panTo({ lng: Number(panToLng), lat: Number(panToLat) }, animate ? undefined : { noAnimation: true }))">panTo</button>
          </div>
          <div class="input-row">
            <input type="number" v-model="panByX" placeholder="dx" />
            <input type="number" v-model="panByY" placeholder="dy" />
            <button @click="call('panBy', () => getMap()?.panBy(Number(panByX), Number(panByY), animate ? undefined : { noAnimation: true }))">panBy</button>
          </div>
        </section>
        <section>
          <h3>zoomIn / zoomOut</h3>
          <div class="btn-group">
            <button @click="call('zoomIn', () => getMap()?.zoomIn())">zoomIn</button>
            <button @click="call('zoomOut', () => getMap()?.zoomOut())">zoomOut</button>
          </div>
        </section>
        <section>
          <h3>flyTo <span :class="`cap-tag ${caps.has('Map.flyTo') ? 'ok' : 'no'}`">{{ caps.has('Map.flyTo') ? 'v4+' : 'v3 ✗' }}</span></h3>
          <div class="btn-group">
            <button @click="call('flyTo(上海,14)', () => getMap()?.flyTo({ lng: 121.474, lat: 31.230 }, 14, animate ? undefined : { noAnimation: true }))">flyTo 上海</button>
            <button @click="call('flyTo(北京,11)', () => getMap()?.flyTo({ lng: 116.404, lat: 39.915 }, 11, animate ? undefined : { noAnimation: true }))">flyTo 北京</button>
          </div>
        </section>
        <section>
          <h3>setViewport / reset</h3>
          <div class="btn-group">
            <button @click="call('setViewport(北京)', () => getMap()?.setViewport([{ lng: 116.3, lat: 39.85 }, { lng: 116.5, lat: 40.0 }]))">setViewport 北京</button>
            <button @click="call('setViewport(上海)', () => getMap()?.setViewport([{ lng: 121.3, lat: 31.1 }, { lng: 121.6, lat: 31.4 }]))">setViewport 上海</button>
            <button @click="call('getViewport(广州)', () => getMap()?.getViewport([{ lng: 113.2, lat: 23.0 }, { lng: 113.5, lat: 23.2 }]))">getViewport 广州</button>
            <button class="danger" @click="call('reset', () => getMap()?.reset())">reset</button>
          </div>
        </section>
      </template>
      <!-- ════════ 查询 ════════ -->
      <template v-if="activeTab === 'query'">
        <section>
          <h3>查询方法（getXxx）</h3>
          <div class="btn-group">
            <button v-for="m in queryMethods" :key="m" @click="call(m, () => (getMap() as any)?.[m]())">{{ m }}</button>
            <button @click="call('getOverlays', () => getMap()?.getOverlays().length)">getOverlays</button>
            <button @click="call('getPanes', () => !!getMap()?.getPanes())">getPanes</button>
            <button @click="call('getInfoWindow', () => !!getMap()?.getInfoWindow())">getInfoWindow</button>
            <button @click="call('getIndoorInfo', () => getMap()?.getIndoorInfo())">getIndoorInfo</button>
            <button @click="call('isStreetLayerShow', () => getMap()?.isStreetLayerShow())">isStreetLayerShow</button>
            <button @click="call('isSupportEarth', () => getMap()?.isSupportEarth())">isSupportEarth</button>
            <button @click="call('getLanguage', () => getMap()?.getLanguage())">getLanguage</button>
            <button @click="call('getPrivateStatus', () => getMap()?.getPrivateStatus())">getPrivateStatus</button>
            <button @click="call('highResolutionEnabled', () => getMap()?.highResolutionEnabled())">highResolutionEnabled</button>
            <button @click="call('getContainer', () => !!getMap()?.getContainer())">getContainer</button>
            <button @click="call('getProjection', () => !!getMap()?.getProjection())">getProjection</button>
          </div>
        </section>
      </template>

      <!-- ════════ 坐标 ════════ -->
      <template v-if="activeTab === 'coord'">
        <section>
          <h3>坐标转换</h3>
          <div class="btn-group">
            <button v-for="[name, fn] in coordMethods" :key="name" @click="call(name, fn)">{{ name }}</button>
          </div>
        </section>
      </template>

      <!-- ════════ 事件 ════════ -->
      <template v-if="activeTab === 'event'">
        <section>
          <h3>订阅事件（点击切换）</h3>
          <div class="btn-group">
            <button v-for="evt in eventList" :key="evt" :class="{ active: subscribedEvents.includes(evt) }" @click="toggleEvent(evt)" style="font-size:12px">{{ evt }}</button>
          </div>
        </section>
        <section>
          <h3>事件日志</h3>
          <div class="btn-group">
            <button @click="logOpen = !logOpen">{{ logOpen ? '隐藏日志面板' : '显示日志面板' }}</button>
            <button class="danger" @click="eventLog = []">清空日志</button>
          </div>
          <div style="margin-top:8px;max-height:200px;overflow-y:auto">
            <p v-if="!eventLog.length" class="muted small">订阅事件后在此查看日志</p>
            <p v-for="(line, i) in eventLog.slice(0, 10)" :key="i" class="small" style="font-family:monospace;margin:2px 0">{{ line }}</p>
          </div>
        </section>
      </template>

      <!-- ════════ 3.0-only ════════ -->
      <template v-if="activeTab === 'v3'">
        <section>
          <h3>3.0-only 命令 <span :class="`cap-tag ${caps.has('Map.enableMapClick') ? 'ok' : 'no'}`">{{ caps.has('Map.enableMapClick') ? '3.0' : 'v4 ✗' }}</span></h3>
          <div class="btn-group">
            <button @click="call('enableMapClick', () => getMap()?.enableMapClick())">enableMapClick</button>
            <button @click="call('disableMapClick', () => getMap()?.disableMapClick())">disableMapClick</button>
            <button @click="call('enable3DBuilding', () => getMap()?.enable3DBuilding())">enable3DBuilding</button>
            <button @click="call('disable3DBuilding', () => getMap()?.disable3DBuilding())">disable3DBuilding</button>
            <button @click="call('setCurrentCity', () => getMap()?.setCurrentCity('北京'))">setCurrentCity</button>
            <button @click="call('setPanorama', () => getMap()?.setPanorama(null))">setPanorama(null)</button>
            <button @click="call('getPanorama', () => getMap()?.getPanorama())">getPanorama</button>
            <button @click="call('addHotspot', () => getMap()?.addHotspot({ __brand: 'OverlayHandle', raw: null, type: 'hotspot' } as any))">addHotspot</button>
            <button @click="call('clearHotspots', () => getMap()?.clearHotspots())">clearHotspots</button>
          </div>
        </section>
      </template>

      <!-- ════════ 4.0+ ════════ -->
      <template v-if="activeTab === 'v4'">
        <section>
          <h3>4.0+ 实用方法</h3>
          <div class="btn-group">
            <button v-for="m in v4Methods" :key="m" @click="callV4(m)">{{ m }}</button>
          </div>
        </section>
      </template>

      <!-- ════════ 杂项 ════════ -->
      <template v-if="activeTab === 'misc'">
        <section>
          <h3>杂项方法</h3>
          <div class="btn-group">
            <button v-for="m in miscMethods" :key="m" @click="callMisc(m)">{{ m }}</button>
          </div>
        </section>
      </template>

      <!-- 底部城市快捷切换（常驻） -->
      <section>
        <h3>快捷城市</h3>
        <div class="btn-group">
          <button
            v-for="c in CITIES"
            :key="c.name"
            :class="{ active: center.lng === c.lng && center.lat === c.lat }"
            @click="center = { lng: c.lng, lat: c.lat }; zoom = c.zoom"
          >{{ c.name }}</button>
        </div>
      </section>




    </div>
  </div>
</template>

<style scoped>
.tab-bar { margin-bottom: 16px; }
.tab-bar button { padding: 4px 8px; font-size: 12px; }
.danger { background: #ff4d4f !important; border-color: #ff4d4f !important; }
.danger:hover { background: #ff7875 !important; border-color: #ff7875 !important; }
button:disabled { opacity: 0.5; cursor: not-allowed; }
.result-box {
  position: absolute; left: 8px; top: 150px; z-index: 10; max-width: 340px;
  background: rgba(0,0,0,0.78); color: #7CFC7C; border-left: 3px solid #34a853;
  border-radius: 6px; padding: 8px 12px; font-size: 12px; font-family: monospace;
  word-break: break-all;
}
.hud .hud-title { color: #34a853; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
.slider-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.slider-label { font-size: 12px; color: #666; min-width: 54px; }
.slider-val { font-family: monospace; font-size: 12px; color: #1890ff; min-width: 34px; text-align: right; }
</style>
