import { defineComponent, h, ref, watch } from 'vue';
import {
  Marker, Label, Polyline, Polygon, Circle, Rectangle, BezierCurve, Prism,
  GroundOverlay, GroundPoint, PointCollection, Marker3D, InfoWindow,
  useBMapContext,
  BMAP_POINT_SHAPE_CIRCLE, BMap_Symbol_SHAPE_FORWARD_OPEN_ARROW,
} from '@baidumap/vue-bmap';
import { MapContainer } from '../components/MapContainer';
import { registerDemo } from './index';

const C = { lng: 116.404, lat: 39.915 };
const labelBase: Record<string, string | number> = {
  padding: '6px 12px', fontSize: 16, borderRadius: 4,
  backgroundColor: '#fff', borderColor: '#ccc', color: '#333',
};

// ─── Marker ───
registerDemo('marker', {
  title: '基础用法',
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(Marker, { position: C })] }) }),
  code: `<script setup>
import { Map, Marker } from '@baidumap/vue-bmap';
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="11">
    <Marker :position="{ lng: 116.404, lat: 39.915 }" />
  </Map>
</template>`,
});

registerDemo('marker', {
  title: '自定义图标',
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(Marker, { position: C, icon: { url: 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_1.png', size: { width: 48, height: 48 } } })] }) }),
  code: `<template>
  <Map :center="center" :zoom="11">
    <Marker :position="center"
      :icon="{ url: '/marker_demo_1.png', size: { width: 48, height: 48 } }" />
  </Map>
</template>`,
});

// ─── Label ───
registerDemo('label', {
  title: '基础用法',
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(Label, { position: C, content: '天安门', styles: labelBase })] }) }),
  code: `<template>
  <Map :center="center" :zoom="11">
    <Label :position="center" content="天安门"
      :styles="{ padding: '6px 12px', fontSize: 16, borderRadius: 4,
        backgroundColor: '#fff', borderColor: '#ccc', color: '#333' }" />
  </Map>
</template>`,
});

registerDemo('label', {
  title: '多个标注与自定义样式',
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [
        h(Label, { position: C, content: '天安门', offset: { width: 8, height: -8 }, styles: { ...labelBase, color: '#1890ff', borderColor: '#1890ff' } }),
        h(Label, { position: { lng: 116.44, lat: 39.915 }, content: '王府井', offset: { width: 8, height: -8 }, styles: { ...labelBase, color: '#52c41a', borderColor: '#52c41a' } }),
        h(Label, { position: { lng: 116.38, lat: 39.885 }, content: '前门', offset: { width: 8, height: -8 }, styles: { ...labelBase, color: '#fff', backgroundColor: '#1890ff', borderColor: '#1890ff' } }),
      ],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11">
    <Label :position="center" content="天安门" :offset="{ width: 8, height: -8 }"
      :styles="{ ...base, color: '#1890ff', borderColor: '#1890ff' }" />
    <Label :position="{ lng: 116.44, lat: 39.915 }" content="王府井" :offset="off"
      :styles="{ ...base, color: '#52c41a', borderColor: '#52c41a' }" />
    <Label :position="{ lng: 116.38, lat: 39.885 }" content="前门" :offset="off"
      :styles="{ ...base, color: '#fff', backgroundColor: '#1890ff' }" />
  </Map>
</template>`,
});

// ─── Polyline ───
registerDemo('polyline', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(Polyline, { path: [C, { lng: 116.485, lat: 39.996 }, { lng: 116.566, lat: 39.915 }], strokeColor: '#1890ff', strokeWeight: 9, strokeOpacity: 0.8 })],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11">
    <Polyline
      :path="[{ lng: 116.404, lat: 39.915 }, { lng: 116.485, lat: 39.996 }, { lng: 116.566, lat: 39.915 }]"
      strokeColor="#1890ff" :strokeWeight="9" :strokeOpacity="0.8" />
  </Map>
</template>`,
});

// ─── Polygon ───
registerDemo('polygon', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(Polygon, { path: [C, { lng: 116.485, lat: 39.996 }, { lng: 116.566, lat: 39.915 }], strokeColor: '#ff6600', fillColor: '#ff660033', strokeWeight: 6 })],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11">
    <Polygon
      :path="[{ lng: 116.404, lat: 39.915 }, { lng: 116.485, lat: 39.996 }, { lng: 116.566, lat: 39.915 }]"
      strokeColor="#ff6600" fillColor="#ff660033" :strokeWeight="6" />
  </Map>
</template>`,
});

// ─── Circle ───
registerDemo('circle', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(Circle, { center: C, radius: 5400, strokeColor: '#1890ff', fillColor: '#1890ff22', strokeWeight: 4 })],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11">
    <Circle :center="center" :radius="5400"
      strokeColor="#1890ff" fillColor="#1890ff22" :strokeWeight="4" />
  </Map>
</template>`,
});

// ─── Rectangle ───
registerDemo('rectangle', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(Rectangle, { bounds: { sw: { lng: 116.262, lat: 39.785 }, ne: { lng: 116.55, lat: 40.045 } }, strokeColor: '#52c41a', fillColor: '#52c41a22', strokeWeight: 4 })],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11">
    <Rectangle
      :bounds="{ sw: { lng: 116.262, lat: 39.785 }, ne: { lng: 116.55, lat: 40.045 } }"
      strokeColor="#52c41a" fillColor="#52c41a22" :strokeWeight="4" />
  </Map>
</template>`,
});

// ─── BezierCurve（二阶贝塞尔：每段一个控制点，controlPoints 组数 = path.length - 1） ───
registerDemo('bezier-curve', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(BezierCurve, { path: [C, { lng: 116.55, lat: 40.045 }], controlPoints: [[{ lng: 116.391, lat: 40.061 }]], strokeColor: '#722ed1', strokeWeight: 8 })],
    }),
  }),
  code: `<template>
  <!-- 二阶贝塞尔：controlPoints 有 path.length - 1 组 -->
  <Map :center="center" :zoom="11">
    <BezierCurve
      :path="[{ lng: 116.404, lat: 39.915 }, { lng: 116.55, lat: 40.045 }]"
      :controlPoints="[[{ lng: 116.391, lat: 40.061 }]]"
      strokeColor="#722ed1" :strokeWeight="8" />
  </Map>
</template>`,
});

// ─── Prism ───
registerDemo('prism', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11, tilt: 60 }, {
      default: () => [h(Prism, { path: [C, { lng: 116.489, lat: 39.98 }, { lng: 116.359, lat: 39.98 }], altitude: 2000, topFillColor: '#ff6600', topFillOpacity: 0.9, sideFillColor: '#ff9955', sideFillOpacity: 0.7 })],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11" :tilt="60">
    <Prism
      :path="[{ lng: 116.404, lat: 39.915 }, { lng: 116.489, lat: 39.98 }, { lng: 116.359, lat: 39.98 }]"
      :altitude="2000" topFillColor="#ff6600" :topFillOpacity="0.9"
      sideFillColor="#ff9955" :sideFillOpacity="0.7" />
  </Map>
</template>`,
});

// ─── GroundOverlay ───
registerDemo('ground-overlay', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(GroundOverlay, { bounds: { sw: { lng: 116.229, lat: 39.802 }, ne: { lng: 116.586, lat: 40.028 } }, url: 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_all.png', opacity: 0.8 })],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11">
    <GroundOverlay
      :bounds="{ sw: { lng: 116.229, lat: 39.802 }, ne: { lng: 116.586, lat: 40.028 } }"
      url="/marker_demo_all.png" :opacity="0.8" />
  </Map>
</template>`,
});

// ─── GroundPoint ───
registerDemo('ground-point', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11, tilt: 75, heading: 30 }, {
      default: () => [
        h(GroundPoint, { point: C, url: 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_all.png', size: { width: 96, height: 96 }, level: 11 }),
        h(GroundPoint, { point: { lng: 116.489, lat: 39.98 }, url: 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_all.png', size: { width: 96, height: 96 }, level: 11, scale: 1.5, rotation: 45 }),
      ],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11" :tilt="75" :heading="30">
    <GroundPoint :point="center" url="/marker_demo_all.png"
      :size="{ width: 96, height: 96 }" :level="11" />
    <GroundPoint :point="{ lng: 116.489, lat: 39.98 }" url="/marker_demo_all.png"
      :size="{ width: 96, height: 96 }" :level="11" :scale="1.5" :rotation="45" />
  </Map>
</template>`,
});

// ─── PointCollection ───
registerDemo('point-collection', {
  component: defineComponent({
    setup() {
      const pts = Array.from({ length: 50 }, () => ({ lng: 116.21 + Math.random() * 0.388, lat: 39.785 + Math.random() * 0.26 }));
      return () => h(MapContainer, { center: C, zoom: 11 }, {
        default: () => [h(PointCollection, { points: pts, shape: BMAP_POINT_SHAPE_CIRCLE, color: '#ff6600', size: 8 })],
      });
    },
  }),
  code: `<script setup>
import { Map, PointCollection, BMAP_POINT_SHAPE_CIRCLE } from '@baidumap/vue-bmap';
const pts = Array.from({ length: 50 }, () => ({
  lng: 116.21 + Math.random() * 0.388, lat: 39.785 + Math.random() * 0.26,
}));
<\/script>
<template>
  <Map :center="center" :zoom="11">
    <PointCollection :points="pts" :shape="BMAP_POINT_SHAPE_CIRCLE" color="#ff6600" :size="8" />
  </Map>
</template>`,
});

// ─── InfoWindow ───
registerDemo('info-window', {
  title: '自动打开',
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(InfoWindow, { position: C, title: '天安门', content: '北京市东城区东长安街' })],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11">
    <InfoWindow :position="center" title="天安门" content="北京市东城区东长安街" />
  </Map>
</template>`,
});

registerDemo('info-window', {
  title: '点击 Marker 控制开关',
  component: defineComponent({
    setup() {
      const open = ref(false);
      return () => h(MapContainer, { center: C, zoom: 11 }, {
        default: () => [
          h(Marker, { position: C, onClick: () => { open.value = !open.value; } }),
          h(InfoWindow, { position: C, title: '天安门', content: '<b>天安门</b><br/>北京市东城区', open: open.value }),
        ],
      });
    },
  }),
  code: `<script setup>
import { ref } from 'vue';
import { Map, Marker, InfoWindow } from '@baidumap/vue-bmap';
const open = ref(false);
<\/script>
<template>
  <Map :center="center" :zoom="11">
    <Marker :position="center" @click="open = !open" />
    <InfoWindow :position="center" title="天安门"
      content="<b>天安门</b><br/>北京市东城区" :open="open" />
  </Map>
</template>`,
});

// ─── Symbol（作为 Marker 的 icon 值对象） ───
const STAR = 'M10 0 C10 5.52 5.52 10 0 10 C5.52 10 10 14.48 10 20 C10 14.48 14.48 10 20 10 C14.48 10 10 5.52 10 0 Z';
registerDemo('symbol', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(Marker, { position: C, icon: { symbol: { path: STAR, fillColor: '#1890ff', fillOpacity: 0.8, strokeColor: '#fff', strokeWeight: 3, scale: 2.5 } } })],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11">
    <Marker :position="center" :icon="{ symbol: {
      path: 'M10 0 C10 5.52 ... Z',  // SVG path 或 BMap_Symbol_SHAPE_* 常量
      fillColor: '#1890ff', fillOpacity: 0.8,
      strokeColor: '#fff', strokeWeight: 3, scale: 2.5,
    } }" />
  </Map>
</template>`,
});

// ─── Icon ───
registerDemo('icon', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(Marker, { position: C, icon: { url: 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_1.png', size: { width: 48, height: 48 } } })],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11">
    <Marker :position="center"
      :icon="{ url: '/marker_demo_1.png', size: { width: 48, height: 48 } }" />
  </Map>
</template>`,
});

// ─── IconSequence（值对象：用 driver 创建后传给 Polyline 的 icons；4.0 起废弃） ───
const SEQ_PATH = Array.from({ length: 25 }, (_, i) => {
  const t = i / 24;
  return { lng: 116.19 + t * 0.43, lat: 39.9 + Math.sin(t * Math.PI) * 0.075 };
});
const ArrowLine = defineComponent({
  name: 'ArrowLine',
  setup() {
    const bmap = useBMapContext();
    const icons = ref<unknown[]>([]);
    watch(() => bmap.value.driver, (d) => {
      if (!d) return;
      const symbol = d.createSymbol(BMap_Symbol_SHAPE_FORWARD_OPEN_ARROW, { scale: 0.55, strokeColor: '#fff', strokeWeight: 2 });
      if (!symbol) return;
      const seq = d.createIconSequence(symbol, '0%', '8%', true);
      if (seq) icons.value = [seq];
    }, { immediate: true });
    return () => h(Polyline, { path: SEQ_PATH, icons: icons.value, strokeColor: '#1890ff', strokeWeight: 8, strokeOpacity: 0.9 });
  },
});
registerDemo('icon-sequence', {
  component: defineComponent({ setup: () => () => h(MapContainer, { center: C, zoom: 11 }, { default: () => [h(ArrowLine)] }) }),
  code: `<script setup>
import { ref, watch } from 'vue';
import { Map, Polyline, useBMapContext, BMap_Symbol_SHAPE_FORWARD_OPEN_ARROW } from '@baidumap/vue-bmap';
const { driver } = useBMapContext().value;  // 或 watch 其响应式就绪
const icons = ref([]);
// driver 就绪后：createSymbol → createIconSequence，传给 Polyline 的 icons
<\/script>
<template>
  <Map :center="center" :zoom="11">
    <Polyline :path="path" :icons="icons" strokeColor="#1890ff" :strokeWeight="8" />
  </Map>
</template>`,
});

// ─── Marker3D ───
registerDemo('marker-3d', {
  component: defineComponent({
    setup: () => () => h(MapContainer, { center: C, zoom: 11, tilt: 60 }, {
      default: () => [
        h(Marker3D, { position: C, height: 300, shape: 1, size: 120, fillColor: '#1890ff', fillOpacity: 0.8 }),
        h(Marker3D, { position: { lng: 116.489, lat: 39.98 }, height: 450, shape: 1, size: 120, fillColor: '#ff6600', fillOpacity: 0.8 }),
      ],
    }),
  }),
  code: `<template>
  <Map :center="center" :zoom="11" :tilt="60">
    <Marker3D :position="center" :height="300" :shape="1" :size="120" fillColor="#1890ff" :fillOpacity="0.8" />
    <Marker3D :position="{ lng: 116.489, lat: 39.98 }" :height="450" :shape="1" :size="120" fillColor="#ff6600" :fillOpacity="0.8" />
  </Map>
</template>`,
});
