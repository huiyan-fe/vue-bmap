import { defineComponent, h, ref } from 'vue';
import {
  Marker, useMap, useMapEvent, useMapReady, useDriver, useMapRef,
  useCapabilities, useSymbol, useIcon, useBMapContext, useMapStatus,
  BMap_Symbol_SHAPE_STAR,
} from '@baidumap/vue-bmap';
import { MapContainer } from '../components/MapContainer';
import { registerDemo } from './index';

const C = { lng: 116.404, lat: 39.915 };
const GUOMAO = { lng: 116.461, lat: 39.914 };
const panel = {
  position: 'absolute', top: '10px', left: '10px', zIndex: 10, background: '#fff',
  padding: '12px', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  maxWidth: '320px', fontSize: '13px', lineHeight: 1.7,
} as const;
const btn = { marginTop: '6px', padding: '3px 8px', fontSize: '12px', cursor: 'pointer' } as const;

// ─── useMap：逃生口，取原生地图实例 ───
const RawEscapePanel = defineComponent({
  name: 'RawEscapePanel',
  setup() {
    const map = useMap();
    const bmap = useBMapContext();
    const native = () => (map.value as any)?.raw;
    return () => h('div', { style: panel }, [
      h('div', { style: { color: '#666', marginBottom: '8px' } }, '日常操作地图请用 useMapRef；只有封装没覆盖的原生能力才走 useMap().raw。'),
      h('div', `map 句柄：${map.value ? '已就绪' : '未就绪（首帧为 null）'}`),
      h('div', `原生实例：${native() ? (native().constructor?.name ?? '(匿名类)') : '—'}`),
      h('div', `rawSDK.Map：${typeof (bmap.value.driver as any)?.rawSDK?.Map === 'function' ? '可用' : '—'}`),
      h('button', { style: btn, disabled: !native(), onClick: () => { const n = native(); if (n) n.setZoom(n.getZoom() + 1); } }, '用原生实例 setZoom(+1)'),
    ]);
  },
});
registerDemo('use-map', {
  title: '逃生口：取原生地图实例',
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(RawEscapePanel)] }) }),
  code: `<script setup>
import { Map, useMap, useBMapContext } from '@baidumap/vue-bmap';
// useMap() -> ComputedRef<MapHandle | null>；MapHandle = { __brand, raw }
// raw 才是原生 BMap.Map / BMapGL.Map 实例
const map = useMap();
const { driver } = useBMapContext().value;  // driver.rawSDK 是全局命名空间
const zoomIn = () => { const n = map.value?.raw; if (n) n.setZoom(n.getZoom() + 1); };
<\/script>
<template>
  <Map :center="center" :zoom="11">
    <button :disabled="!map" @click="zoomIn">用原生实例 setZoom(+1)</button>
  </Map>
</template>`,
});

// ─── useMapEvent：订阅地图原生事件 ───
const ClickWatcher = defineComponent({
  name: 'ClickWatcher',
  setup() {
    const last = ref<{ lng: number; lat: number } | null>(null);
    const count = ref(0);
    useMapEvent('click', (raw: any) => {
      count.value += 1;
      last.value = raw?.point ?? raw?.latlng ?? null;
    });
    return () => h('div', { style: panel }, [
      h('div', '在地图上点一下'),
      h('div', `click 次数：${count.value}`),
      h('div', `最后一次：${last.value ? `${last.value.lng.toFixed(5)}, ${last.value.lat.toFixed(5)}` : '—'}`),
    ]);
  },
});
registerDemo('use-map-event', {
  title: '订阅地图原生事件',
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(ClickWatcher)] }) }),
  code: `<script setup>
import { ref } from 'vue';
import { Map, useMapEvent } from '@baidumap/vue-bmap';
const last = ref(null);
// raw 是未归一化的 SDK 原生事件：3.0 带 point，4.0 部分事件带 latlng
useMapEvent('click', (raw) => { last.value = raw.point ?? raw.latlng ?? null; });
<\/script>
<template>
  <Map :center="center" :zoom="11" />
</template>`,
});

// ─── useDriver ───
const DriverPanel = defineComponent({
  name: 'DriverPanel',
  setup() {
    const driver = useDriver();
    return () => {
      const d = driver.value;
      return h('div', { style: panel }, d ? [
        h('div', `version：${d.version}`),
        h('div', `capabilities 数量：${d.capabilities.size}`),
        h('div', `unsupportedBehavior：${d.unsupportedBehavior}`),
        h('div', { style: { color: '#888' } }, `rawSDK：${d.rawSDK ? '可用' : '不可用'}`),
      ] : 'driver 未就绪');
    };
  },
});
registerDemo('use-driver', {
  title: '读取当前 driver 信息',
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(DriverPanel)] }) }),
  code: `<script setup>
import { Map, useDriver } from '@baidumap/vue-bmap';
const driver = useDriver();  // ComputedRef<BMapDriver | null>
// driver.value.version / capabilities / rawSDK（全局 BMap / BMapGL 命名空间）
<\/script>`,
});

// ─── useMapRef ───
const MapRefPanel = defineComponent({
  name: 'MapRefPanel',
  setup() {
    const mapRef = useMapRef();
    const zoom = ref<number | null>(null);
    return () => h('div', { style: panel }, [
      h('div', '命令式操作地图：'),
      h('button', { style: btn, disabled: !mapRef.value, onClick: () => mapRef.value?.zoomIn() }, 'zoomIn'),
      h('button', { style: btn, disabled: !mapRef.value, onClick: () => mapRef.value?.zoomOut() }, 'zoomOut'),
      h('button', { style: btn, disabled: !mapRef.value, onClick: () => mapRef.value?.flyTo(GUOMAO, 14) }, 'flyTo 国贸'),
      h('button', { style: btn, disabled: !mapRef.value, onClick: () => mapRef.value?.reset() }, 'reset'),
      h('div', [
        h('button', { style: btn, disabled: !mapRef.value, onClick: () => { zoom.value = mapRef.value?.getZoom() ?? null; } }, '读取 zoom'),
        zoom.value != null ? h('span', ` zoom = ${zoom.value}`) : null,
      ]),
    ]);
  },
});
registerDemo('use-map-ref', {
  title: '命令式操作地图',
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(MapRefPanel)] }) }),
  code: `<script setup>
import { Map, useMapRef } from '@baidumap/vue-bmap';
const mapRef = useMapRef();  // 已转发 driver 全量方法
// mapRef.value.zoomIn() / flyTo(pt, 14) / getZoom() / reset()
<\/script>`,
});

// ─── useCapabilities ───
const PROBES = ['Marker', 'Prism', 'Map.flyTo', 'Map.enableMapClick', 'MVTLayer'];
const CapabilitiesPanel = defineComponent({
  name: 'CapabilitiesPanel',
  setup() {
    const caps = useCapabilities();
    return () => h('div', { style: panel }, [
      h('div', { style: { marginBottom: '4px' } }, `共 ${caps.value.size} 项能力（切右上角版本对比）`),
      ...PROBES.map((cap) => h('div', `${caps.value.has(cap) ? '✓' : '✗'} ${cap}`)),
    ]);
  },
});
registerDemo('use-capabilities', {
  title: '按能力名做分支',
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(CapabilitiesPanel)] }) }),
  code: `<script setup>
import { Map, useCapabilities } from '@baidumap/vue-bmap';
const caps = useCapabilities();
// 3.0 没有 Prism：caps.value.has('Prism') 为 false 时降级用 Polygon
<\/script>`,
});

// ─── useMapReady ───
const MapReadySentinel = defineComponent({
  name: 'MapReadySentinel',
  props: { onReady: { type: Function, required: true } },
  setup(props) { useMapReady(props.onReady as any); return () => null; },
});
registerDemo('use-map-ready', {
  title: '哨兵：把就绪 handle 上提到外层',
  component: defineComponent({
    setup() {
      const ready = ref(false);
      return () => h('div', { style: { height: '100%', position: 'relative' } }, [
        h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(MapReadySentinel, { onReady: () => { ready.value = true; } })] }),
        h('div', { style: panel }, `map handle：${ready.value ? '已就绪（哨兵已上提）' : '未就绪'}`),
      ]);
    },
  }),
  code: `<script setup>
import { ref } from 'vue';
import { Map, useMapReady } from '@baidumap/vue-bmap';
// 在 <Map> 内的子组件里调用；就绪后把 handle 上提给外层 service composable
const MapReady = { setup: () => { useMapReady((m) => emitToParent(m)); return () => null; } };
<\/script>`,
});

// ─── useSymbol ───
const SymbolMarker = defineComponent({
  name: 'SymbolMarker',
  setup() {
    const symbol = useSymbol({ path: BMap_Symbol_SHAPE_STAR as any, fillColor: '#f5222d', fillOpacity: 0.9, scale: 7, strokeColor: '#fff', strokeWeight: 2 });
    return () => (symbol.value ? h(Marker, { position: C, icon: symbol.value as any }) : null);
  },
});
registerDemo('use-symbol', {
  title: '把 Symbol 值对象交给 Marker',
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(SymbolMarker)] }) }),
  code: `<script setup>
import { Map, Marker, useSymbol, BMap_Symbol_SHAPE_STAR } from '@baidumap/vue-bmap';
const symbol = useSymbol({ path: BMap_Symbol_SHAPE_STAR, fillColor: '#f5222d', scale: 7 });
<\/script>
<template>
  <Map :center="center" :zoom="11">
    <Marker v-if="symbol" :position="center" :icon="symbol" />
  </Map>
</template>`,
});

// ─── useIcon ───
const IconMarker = defineComponent({
  name: 'IconMarker',
  setup() {
    const icon = useIcon({ url: 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_1.png', size: { width: 48, height: 48 } });
    return () => (icon.value ? h(Marker, { position: C, icon: icon.value as any }) : null);
  },
});
registerDemo('use-icon', {
  title: '把 Icon 值对象交给 Marker',
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(IconMarker)] }) }),
  code: `<script setup>
import { Map, Marker, useIcon } from '@baidumap/vue-bmap';
// useIcon 的价值是把同一个 Icon 实例复用给多个 Marker
const icon = useIcon({ url: '/marker_demo_1.png', size: { width: 48, height: 48 } });
<\/script>
<template>
  <Map :center="center" :zoom="11">
    <Marker v-if="icon" :position="center" :icon="icon" />
  </Map>
</template>`,
});

// ─── useMapStatus（v1.0.2 新增）：订阅地图状态快照 ───
const StatusPanel = defineComponent({
  name: 'StatusPanel',
  setup() {
    const status = useMapStatus();
    return () => {
      const s = status.value;
      if (!s) return h('div', { style: panel }, '地图未就绪');
      const { center, zoom, bounds, size, heading, tilt } = s;
      return h('div', { style: panel }, [
        h('div', `center：${center ? `${center.lng.toFixed(5)}, ${center.lat.toFixed(5)}` : '—'}`),
        h('div', `zoom：${zoom ?? '—'}`),
        h('div', `size：${size ? `${size.width} × ${size.height}` : '—'}`),
        h('div', `heading / tilt：${heading ?? '—'} / ${tilt ?? '—'}`),
        h('div', { style: { marginTop: '4px', color: '#888' } }, `bounds：${bounds ? `${bounds.sw.lng.toFixed(3)},${bounds.sw.lat.toFixed(3)} ~ ${bounds.ne.lng.toFixed(3)},${bounds.ne.lat.toFixed(3)}` : '—'}`),
      ]);
    };
  },
});
registerDemo('use-map-status', {
  title: '订阅地图状态',
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(StatusPanel)] }) }),
  code: `<script setup>
import { Map, useMapStatus } from '@baidumap/vue-bmap';
// useMapStatus（v1.0.2 新增）：返回响应式快照 ShallowRef<MapSnapshot | null>；
// 拖动/缩放/resize 时自动更新，值没变就不会写入 ref（不触发多余渲染）。
// 单项能力不支持时该字段降级为 null（比如 3.0 没有 tilt）。
const status = useMapStatus();
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="11">
    <div v-if="status">
      {{ status.center?.lng }}, {{ status.center?.lat }} @ zoom {{ status.zoom }}
      / heading {{ status.heading ?? '—' }} / tilt {{ status.tilt ?? '—' }}
    </div>
  </Map>
</template>`,
});
