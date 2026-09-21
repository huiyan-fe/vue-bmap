import { defineComponent, h } from 'vue';
import { Marker, ScaleControl, useBMapContext } from '@baidumap/vue-bmap';
import { MapContainer } from '../components/MapContainer';
import { registerDemo } from './index';

const CENTER = { lng: 116.402544, lat: 39.928216 };

const code = `<template>
  <Map :center="{ lng: 116.402544, lat: 39.928216 }" :zoom="11" @click="onClick">
    <Marker :position="{ lng: 116.402544, lat: 39.928216 }" />
    <ScaleControl />
  </Map>
</template>

<script setup>
import { Map, Marker, ScaleControl } from '@baidumap/vue-bmap';
const onClick = (e) => console.log('map click', e);
</script>`;

const MapDemo = defineComponent({
  name: 'MapDemo',
  setup() {
    return () => h(MapContainer, {
      center: CENTER,
      zoom: 11,
      onClick: (e: unknown) => console.log('map click', e),
    }, {
      default: () => [
        h(Marker, { position: CENTER }),
        h(ScaleControl),
      ],
    });
  },
});

registerDemo('map', { component: MapDemo, code });

// ─── BMapProvider ───
const providerCode = `<script setup>
import { BMapProvider, Map, Marker, useBMapContext } from '@baidumap/vue-bmap';
</script>
<template>
  <!-- 实际项目挂在应用根节点，整个应用只需一个 -->
  <BMapProvider ak="你的 ak" version="4.0">
    <template #fallback><div>加载 JSAPI 中…</div></template>
    <template #error="{ error }"><div>加载失败：{{ error?.message }}</div></template>
    <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="11">
      <Marker :position="{ lng: 116.404, lat: 39.915 }" />
    </Map>
  </BMapProvider>
</template>`;

const ProviderStatus = defineComponent({
  name: 'ProviderStatus',
  setup() {
    const bmap = useBMapContext();
    return () => h('div', { class: 'status-bar' }, [
      'status: ', h('b', bmap.value.status),
      '　version: ', h('b', bmap.value.version),
      bmap.value.error ? h('span', { style: { color: '#f5222d' } }, `　error: ${bmap.value.error.message}`) : null,
    ]);
  },
});

const ProviderDemo = defineComponent({
  name: 'ProviderDemo',
  setup() {
    // 本示例复用页面已有的 Provider（同一 ak/version，loadKey 相同 → 复用已加载的 SDK）
    return () => h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } }, [
      h(ProviderStatus),
      h('div', { style: { flex: 1 } }, [
        h(MapContainer, { center: CENTER, zoom: 11 }, { default: () => [h(Marker, { position: CENTER })] }),
      ]),
    ]);
  },
});

registerDemo('bmap-provider', { component: ProviderDemo, code: providerCode });
