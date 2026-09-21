<script setup lang="ts">
import { defineComponent, h, ref, shallowRef } from 'vue';
import { Map, NavigationControl, ScaleControl, useMapRef, useMapEvent } from '@baidumap/vue-bmap';
import { BEIJING } from '../TestProvider';

const CITIES = [
  { name: '北京', lng: 116.404, lat: 39.915 },
  { name: '上海', lng: 121.474, lat: 31.23 },
  { name: '广州', lng: 113.264, lat: 23.129 },
];

// 内嵌控制面板（必须在 <Map> 内才能拿到 useMapRef）
const MapControls = defineComponent({
  name: 'MapControls',
  setup() {
    const mapRef = useMapRef();
    const zoom = ref<number | null>(null);
    const center = shallowRef<{ lng: number; lat: number } | null>(null);
    const sync = () => {
      const m = mapRef.value; if (!m) return;
      try { zoom.value = m.getZoom(); center.value = m.getCenter(); } catch { /* ignore */ }
    };
    useMapEvent('zoomend', sync);
    useMapEvent('moveend', sync);
    useMapEvent('tilesloaded', sync);
    return () => [
      h('div', { class: 'hud' }, [
        h('div', `zoom: ${zoom.value ?? '—'}`),
        h('div', `center: ${center.value ? `${center.value.lng.toFixed(4)}, ${center.value.lat.toFixed(4)}` : '—'}`),
      ]),
      h('div', { class: 'test-panel' }, [
        h('h3', 'Map 命令式测试'),
        h('div', [
          h('button', { onClick: () => mapRef.value?.zoomIn() }, 'zoomIn'),
          h('button', { onClick: () => mapRef.value?.zoomOut() }, 'zoomOut'),
          h('button', { onClick: () => mapRef.value?.reset() }, 'reset'),
          h('button', { class: 'ghost', onClick: sync }, '读取状态'),
        ]),
        h('div', CITIES.map((c) => h('button', { class: 'ghost', onClick: () => mapRef.value?.flyTo({ lng: c.lng, lat: c.lat }, 12) }, c.name))),
      ]),
    ];
  },
});
</script>

<template>
  <Map class="test-map" :center="BEIJING" :zoom="11">
    <NavigationControl />
    <ScaleControl />
    <MapControls />
  </Map>
</template>
