import { defineComponent, h, ref } from 'vue';
import {
  Marker, ContextMenu, MenuItem, Panorama, PlaceDetailPanel,
} from '@baidumap/vue-bmap';
import { MapContainer } from '../components/MapContainer';
import { registerDemo } from './index';

const C = { lng: 116.404, lat: 39.915 };

// ─── ContextMenu ───（v1.0.2 新增）
registerDemo('context-menu', {
  component: defineComponent({
    name: 'ContextMenuDemo',
    setup() {
      const zoom = ref(11);
      const markers = ref<{ lng: number; lat: number }[]>([]);
      return () => h(MapContainer, { center: C, zoom: zoom.value }, {
        default: () => [
          h(ContextMenu, null, {
            default: () => [
              h(MenuItem, { text: '放大', callback: () => { zoom.value += 1; } }),
              h(MenuItem, { text: '缩小', callback: () => { zoom.value -= 1; } }),
              h(MenuItem, {
                text: '添加标注',
                callback: (pt?: { lng: number; lat: number }) => { if (pt) markers.value = [...markers.value, pt]; },
              }),
              ...(markers.value.length > 0
                ? [h(MenuItem, { text: '清除标注', callback: () => { markers.value = []; } })]
                : []),
            ],
          }),
          ...markers.value.map((pt, i) => h(Marker, { key: i, position: pt })),
        ],
      });
    },
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { ref } from 'vue';
import { Map, Marker, ContextMenu, MenuItem } from '@baidumap/vue-bmap';

const zoom = ref(11);
const markers = ref([]);
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="zoom">
    <ContextMenu>
      <MenuItem text="放大" :callback="() => zoom++" />
      <MenuItem text="缩小" :callback="() => zoom--" />
      <!-- callback 收到的第一个参数是右键点击处的经纬度 -->
      <MenuItem text="添加标注" :callback="(pt) => { if (pt) markers = [...markers, pt]; }" />
      <MenuItem v-if="markers.length > 0" text="清除标注" :callback="() => markers = []" />
    </ContextMenu>
    <Marker v-for="(pt, i) in markers" :key="i" :position="pt" />
  </Map>
</template>`,
});

// ─── Panorama ───（v1.0.2 新增；3.0/4.0/GL 均可用；point 需落在有街景覆盖的位置，否则 SDK 会隐藏画布）
const PANO_POINT = { lng: 116.316169, lat: 40.005567 };
registerDemo('panorama', {
  component: defineComponent({
    name: 'PanoramaDemo',
    setup: () => () => h('div', { style: { height: '100%', position: 'relative' } }, [
      h(Panorama, { point: PANO_POINT, style: { width: '100%', height: '100%' } }),
    ]),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { Panorama } from '@baidumap/vue-bmap';
<\/script>
<template>
  <Panorama
    :point="{ lng: 116.316169, lat: 40.005567 }"
    style="width: 100%; height: 100%"
  />
</template>`,
});

// ─── PlaceDetailPanel ───（v1.0.2 新增）
registerDemo('place-detail-panel', {
  component: defineComponent({
    name: 'PlaceDetailPanelDemo',
    setup: () => () => h('div', { style: { height: '100%', position: 'relative' } }, [
      h(MapContainer, { center: C, zoom: 11 }),
      h(PlaceDetailPanel, {
        uid: '06d2dffda107b0ef89f15db6',
        renderOptions: {
          displayCarousel: true,
          displayTag: true,
          displayRating: true,
          displayAddress: true,
          displayComment: true,
          displayCommentTotalCount: true,
        },
        style: {
          position: 'absolute', top: '10px', left: '10px', zIndex: 10,
          width: '440px', background: '#fff', borderRadius: '8px', padding: '4px',
          fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          overflow: 'auto', maxHeight: 'calc(100% - 20px)',
        },
      }),
    ]),
  }),
  code: `<script setup>
// （v1.0.2 新增）
import { Map, PlaceDetailPanel } from '@baidumap/vue-bmap';
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="11" />
  <PlaceDetailPanel
    uid="06d2dffda107b0ef89f15db6"
    :render-options="{ displayCarousel: true, displayAddress: true }"
    :style="{ position: 'absolute', top: '10px', left: '10px', width: '440px' }"
  />
</template>`,
});
