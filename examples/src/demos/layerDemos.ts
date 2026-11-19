import { defineComponent, h, ref, onMounted } from 'vue';
import {
  TrafficLayer, DistrictLayer, GeoJSONLayer,
  FillLayer, DOMLayer, LineLayer,
  PointIconLayer, PointShapeLayer, PanoramaCoverageLayer,
  ThreeLayer,
  HeatmapLayer, ClusterLayer,
} from '@baidumap/vue-bmap';
import type { ThreeLayerRef } from '@baidumap/vue-bmap';
import { MapContainer } from '../components/MapContainer';
import { registerDemo } from './index';
// PointLayer / PolylineLayer / PolygonLayer / TextLayer 由并行任务实现中（v1.0.6），
// 尚未从 src/index.ts 导出；先经命名空间取用，组件落地导出后自动生效
import * as BMapLib from '@baidumap/vue-bmap';
const { PointLayer, PolylineLayer, PolygonLayer, TextLayer } = BMapLib as any;

const C = { lng: 116.404, lat: 39.915 };

// ─── 共享 GeoJSON 数据（对齐 test/src/pages/layer 各页示例数据） ───
const POINT_DATA = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { id: 1, name: '天安门' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.415, 39.910] }, properties: { id: 2, name: '故宫' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.397, 39.913] }, properties: { id: 3, name: '中山公园' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.417, 39.928] }, properties: { id: 4, name: '北海公园' } },
  ],
};

const POLYGON_DATA = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[116.395, 39.910], [116.410, 39.910], [116.410, 39.920], [116.395, 39.920], [116.395, 39.910]]] }, properties: { id: 1, name: '区域A' } },
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[116.415, 39.915], [116.430, 39.915], [116.430, 39.925], [116.415, 39.925], [116.415, 39.915]]] }, properties: { id: 2, name: '区域B' } },
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[116.380, 39.900], [116.390, 39.900], [116.390, 39.910], [116.380, 39.910], [116.380, 39.900]]] }, properties: { id: 3, name: '区域C' } },
  ],
};

const LINE_DATA = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'LineString', coordinates: [[116.35, 39.90], [116.39, 39.94], [116.43, 39.905], [116.46, 39.95]] }, properties: { id: 1, name: '示例线' } },
  ],
};

// ─── TrafficLayer 交通路况 ───
registerDemo('traffic-layer', {
  component: defineComponent({
    name: 'TrafficLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 13 }, { default: () => [h(TrafficLayer)] }),
  }),
  code: `<script setup>
import { Map, TrafficLayer } from '@baidumap/vue-bmap';
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="13">
    <TrafficLayer />
  </Map>
</template>`,
});

// ─── DistrictLayer 行政区 ───
registerDemo('district-layer', {
  component: defineComponent({
    name: 'DistrictLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 10 }, {
      default: () => [h(DistrictLayer, {
        name: '北京市', kind: 1,
        strokeColor: '#3388ff', strokeWeight: 2, fillColor: '#3388ff', fillOpacity: 0.15,
      })],
    }),
  }),
  code: `<script setup>
import { Map, DistrictLayer } from '@baidumap/vue-bmap';
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="10">
    <DistrictLayer name="北京市" :kind="1"
      strokeColor="#3388ff" :strokeWeight="2"
      fillColor="#3388ff" :fillOpacity="0.15" />
  </Map>
</template>`,
});

// ─── GeoJSONLayer ───
const geojson = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[116.39, 39.9], [116.42, 39.9], [116.42, 39.93], [116.39, 39.93], [116.39, 39.9]]],
    },
  }],
};
registerDemo('geojson-layer', {
  component: defineComponent({
    name: 'GeoJSONLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 12 }, {
      default: () => [h(GeoJSONLayer as any, { dataSource: geojson })],
    }),
  }),
  code: `<script setup>
import { Map, GeoJSONLayer } from '@baidumap/vue-bmap';
const featureCollection = { type: 'FeatureCollection', features: [/* ... */] };
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="12">
    <GeoJSONLayer :dataSource="featureCollection" />
  </Map>
</template>`,
});

// ─── FillLayer 面填充图层（v1.0.2 新增） ───
registerDemo('fill-layer', {
  component: defineComponent({
    name: 'FillLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 13 }, {
      default: () => [h(FillLayer as any, {
        border: true,
        enablePicked: true,
        idKey: 'id',
        style: { fillColor: 'rgba(24, 144, 255, 0.4)', fillOpacity: 1, borderColor: '#1890ff', borderWeight: 2, strokeColor: '#1890ff', strokeWeight: 2, strokeStyle: 'solid' },
        data: POLYGON_DATA,
      })],
    }),
  }),
  code: `<!-- FillLayer（v1.0.2 新增）：面填充图层，支持纯色填充、描边，通过 data 加载 GeoJSON -->
<script setup>
import { Map, FillLayer } from '@baidumap/vue-bmap';
const data = { type: 'FeatureCollection', features: [
  { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[/* ... */]]] }, properties: { id: 1 } },
]};
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="13">
    <FillLayer border enable-picked id-key="id"
      :style="{ fillColor: 'rgba(24, 144, 255, 0.4)', strokeColor: '#1890ff', strokeWeight: 2, strokeStyle: 'solid' }"
      :data="data" />
  </Map>
</template>`,
});

// ─── DOMLayer 自定义 DOM 覆盖物图层（v1.0.2 新增） ───
function createDOMNode(properties: any) {
  const div = document.createElement('div');
  div.style.cssText = 'background:#1890ff;color:#fff;padding:4px 8px;border-radius:4px;font-size:13px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;';
  div.textContent = properties?.name ?? '';
  return div;
}
registerDemo('dom-layer', {
  component: defineComponent({
    name: 'DOMLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 14 }, {
      default: () => [h(DOMLayer as any, { createDOM: createDOMNode, data: POINT_DATA, minZoom: 5, maxZoom: 20 })],
    }),
  }),
  code: `<!-- DOMLayer（v1.0.2 新增）：自定义 DOM 覆盖物图层，createDOM 回调返回 HTMLElement -->
<script setup>
import { Map, DOMLayer } from '@baidumap/vue-bmap';
const data = { type: 'FeatureCollection', features: [
  { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { name: '天安门' } },
]};
function createDOM(properties, point) {
  const div = document.createElement('div');
  div.style.cssText = 'background:#1890ff;color:#fff;padding:4px 8px;border-radius:4px;';
  div.textContent = properties.name;
  return div;
}
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="14">
    <DOMLayer :create-d-o-m="createDOM" :data="data" :min-zoom="5" :max-zoom="20" />
  </Map>
</template>`,
});

// ─── PointIconLayer 图标点图层（v1.0.2 新增） ───
registerDemo('point-icon-layer', {
  component: defineComponent({
    name: 'PointIconLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 14 }, {
      default: () => [h(PointIconLayer as any, {
        isFlat: true,
        isFixed: true,
        idKey: 'id',
        style: { icon: 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_1.png', sizes: [40, 40], scale: 1, rotation: 0, opacity: 1 },
        data: POINT_DATA,
      })],
    }),
  }),
  code: `<!-- PointIconLayer（v1.0.2 新增）：图标点图层，支持贴地/非贴地图标渲染 -->
<script setup>
import { Map, PointIconLayer } from '@baidumap/vue-bmap';
const data = { type: 'FeatureCollection', features: [/* Point features */] };
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="14">
    <PointIconLayer is-flat is-fixed id-key="id"
      :style="{ icon: 'https://example.com/icon.png', sizes: [40, 40], scale: 1 }"
      :data="data" />
  </Map>
</template>`,
});

// ─── PointShapeLayer 点形状图层（v1.0.2 新增） ───
registerDemo('point-shape-layer', {
  component: defineComponent({
    name: 'PointShapeLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 14 }, {
      default: () => [h(PointShapeLayer as any, {
        idKey: 'id',
        style: { shapeType: 1, size: 40, color: '#1890ff', opacity: 1, strokeColor: '#fff', strokeWeight: 0, rotation: 0 },
        data: POINT_DATA,
      })],
    }),
  }),
  code: `<!-- PointShapeLayer（v1.0.2 新增）：点形状图层，用 2D 几何图形渲染点数据 -->
<script setup>
import { Map, PointShapeLayer } from '@baidumap/vue-bmap';
// shapeType: 1=圆形 2=三角形 3=方形 4=菱形 5=六边形 7=五角星
const data = { type: 'FeatureCollection', features: [/* Point features */] };
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="14">
    <PointShapeLayer id-key="id"
      :style="{ shapeType: 1, size: 40, color: '#1890ff', opacity: 1 }"
      :data="data" />
  </Map>
</template>`,
});

// ─── PanoramaCoverageLayer 全景覆盖区域图层（v1.0.2 新增） ───
registerDemo('panorama-coverage-layer', {
  component: defineComponent({
    name: 'PanoramaCoverageLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 12 }, {
      default: () => [h(PanoramaCoverageLayer)],
    }),
  }),
  code: `<!-- PanoramaCoverageLayer（v1.0.2 新增）：全景覆盖区域图层，展示全景街道覆盖范围，无参数构造 -->
<script setup>
import { Map, PanoramaCoverageLayer } from '@baidumap/vue-bmap';
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="12">
    <PanoramaCoverageLayer />
  </Map>
</template>`,
});

// ─── LineLayer 线图层（v1.0.2 新增） ───
registerDemo('line-layer', {
  component: defineComponent({
    name: 'LineLayerDemo',
    setup() {
      const dashed = ref(false);
      const weight = ref(6);
      const colorIdx = ref(0);
      const colors = ['#2a6cf6', '#e7515a', '#1aa179'];
      // 改 style 即声明式更新；LineLayer 内部对线样式走图层重建保证及时生效
      const btnStyle = 'padding:4px 10px;border:1px solid #d9d9d9;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;';
      return () => h(MapContainer, { center: { lng: 116.42, lat: 39.925 }, zoom: 12 }, {
        default: () => [
          h(LineLayer as any, {
            style: {
              strokeColor: colors[colorIdx.value],
              strokeWeight: weight.value,
              strokeStyle: dashed.value ? 'dashed' : 'solid',
              dashArray: [20, 14],
              strokeLineCap: 'round',
              strokeLineJoin: 'round',
            },
            data: LINE_DATA,
          }),
          h('div', {
            style: 'position:absolute;left:12px;top:12px;z-index:10;display:flex;gap:8px;background:rgba(255,255,255,0.9);padding:8px;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,0.2);',
          }, [
            h('button', { style: btnStyle, onClick: () => { dashed.value = !dashed.value; } }, dashed.value ? '实线' : '虚线'),
            h('button', { style: btnStyle, onClick: () => { weight.value = weight.value >= 12 ? 6 : weight.value + 2; } }, `加粗（${weight.value}）`),
            h('button', { style: btnStyle, onClick: () => { colorIdx.value = (colorIdx.value + 1) % colors.length; } }, '换色'),
          ]),
        ],
      });
    },
  }),
  code: `<!-- LineLayer（v1.0.2 新增）：线图层，改 style prop 即可动态更新样式 -->
<script setup>
import { ref, computed } from 'vue';
import { Map, LineLayer } from '@baidumap/vue-bmap';
const data = { type: 'FeatureCollection', features: [
  { type: 'Feature', geometry: { type: 'LineString', coordinates: [[116.35, 39.90], [116.39, 39.94], [116.43, 39.905]] }, properties: { id: 1 } },
]};
const dashed = ref(false);
const style = computed(() => ({ strokeColor: '#2a6cf6', strokeWeight: 6, strokeStyle: dashed.value ? 'dashed' : 'solid', dashArray: [20, 14] }));
<\/script>
<template>
  <Map :center="{ lng: 116.42, lat: 39.925 }" :zoom="12">
    <LineLayer :style="style" :data="data" />
    <button @click="dashed = !dashed">切换虚线</button>
  </Map>
</template>`,
});

// ─── ThreeLayer three.js 图层（v1.0.2 新增） ───
// SDK 的 ThreeLayer 构造函数第一行就是 `if (!window.THREE) throw`，异常被工厂吞掉后图层静默
// 变成 null，所以这里按需从 CDN 注入 three.js，就绪前不渲染 <ThreeLayer>。
// r150+ 已移除 build/three.min.js，固定用最后一个带 UMD 全局的版本。
const THREE_CDN = 'https://unpkg.com/three@0.137.5/build/three.min.js';

let threePromise: Promise<void> | null = null;

function loadThree(): Promise<void> {
  if ((window as any).THREE) return Promise.resolve();
  if (threePromise) return threePromise;
  threePromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = THREE_CDN;
    script.async = true;
    script.onload = () => ((window as any).THREE ? resolve() : reject(new Error('脚本已加载但 window.THREE 不存在')));
    script.onerror = () => reject(new Error(`three.js 加载失败：${THREE_CDN}`));
    document.head.appendChild(script);
  });
  threePromise = threePromise.catch((err) => { threePromise = null; throw err; });
  return threePromise;
}

function hint(text: string) {
  return h('div', { style: 'height:100%;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;' }, text);
}

registerDemo('three-layer', {
  component: defineComponent({
    name: 'ThreeLayerDemo',
    setup() {
      const ready = ref(!!(window as any).THREE);
      const error = ref('');

      onMounted(() => {
        if (ready.value) return;
        loadThree().then(() => { ready.value = true; }, (e: Error) => { error.value = e.message; });
      });

      // onInit 在 GL 就绪后触发，第 4 个参数即 ref 拿到的命令式句柄
      const onInit = (_r: any, _s: any, _c: any, layer: ThreeLayerRef) => {
        const THREE = (window as any).THREE;
        const world = layer.toWorld(C);
        if (!THREE || !world) return;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(500, 500, 500),
          new THREE.MeshBasicMaterial({ color: 0x1890ff }),
        );
        const [x, y] = world;
        mesh.position.set(x, y, 250); // z 轴朝天，底面贴地
        layer.add(mesh);
        // add 只 doOnceDraw 一次，animate() 在 needsUpdate 为假时直接 return，必须补一次重绘
        layer.triggerRepaint();
      };

      return () => {
        if (error.value) return hint(error.value);
        if (!ready.value) return hint('three.js 加载中…');
        // 世界坐标单位约等于米：500 米的盒子在 zoom 11 只有几个像素，这里用 16
        return h(MapContainer, { center: C, zoom: 16 }, {
          default: () => [h(ThreeLayer as any, { antialias: true, zIndex: 5, onInit })],
        });
      };
    },
  }),
  code: `<!-- ThreeLayer（v1.0.2 新增）：three.js 图层。three.js 由宿主工程自行引入并挂到 window.THREE -->
<script setup>
import { ref } from 'vue';
import { Map, ThreeLayer } from '@baidumap/vue-bmap';
import type { ThreeLayerRef } from '@baidumap/vue-bmap';

// SDK 直接读全局 window.THREE，必须先挂上
import * as THREE from 'three';
window.THREE = THREE;

const center = { lng: 116.404, lat: 39.915 };
const layerRef = ref<ThreeLayerRef>();

// onInit 第 4 个参数是命令式句柄（与 ref 拿到的是同一个对象）
function onInit(renderer, scene, camera, layer) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(500, 500, 500),
    new THREE.MeshBasicMaterial({ color: 0x1890ff }),
  );
  // toWorld 走 map.toFormatCoords（实例上的 convertLngLat 在 v4 里是坏的）
  const [x, y] = layer.toWorld(center);
  mesh.position.set(x, y, 250);
  layer.add(mesh);
  layer.triggerRepaint();  // 不调这一下 animate() 直接 return，画面不更新
}
<\/script>
<template>
  <Map :center="center" :zoom="16">
    <ThreeLayer ref="layerRef" antialias :z-index="5" :on-init="onInit" />
  </Map>
</template>`,
});

// ─── 数据可视化图层（v1.0.6 新增）：随机点 GeoJSON 生成 ───
function randomPointsData(count: number, withWeight: boolean) {
  const features = Array.from({ length: count }, (_, i) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [116.34 + Math.random() * 0.14, 39.88 + Math.random() * 0.09] },
    properties: withWeight ? { id: i, name: `点${i}`, count: 1 + Math.floor(Math.random() * 100) } : { id: i, name: `点${i}` },
  }));
  return { type: 'FeatureCollection' as const, features };
}

// ─── HeatmapLayer 热力图（v1.0.6 新增） ───
registerDemo('heatmap-layer', {
  component: defineComponent({
    name: 'HeatmapLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 12 }, {
      default: () => [h(HeatmapLayer as any, {
        data: randomPointsData(300, true),
        size: 30,
        opacity: 0.9,
        gradient: { 0: 'rgba(0, 90, 255, 1)', 0.5: 'rgba(0, 255, 120, 1)', 1: 'rgba(255, 0, 0, 1)' },
        weightField: 'count',
      })],
    }),
  }),
  code: `<!-- HeatmapLayer（v1.0.6 新增）：热力图，data 为 GeoJSON，权重取 properties[weightField]（默认 count） -->
<script setup>
import { Map, HeatmapLayer } from '@baidumap/vue-bmap';
const data = { type: 'FeatureCollection', features: Array.from({ length: 300 }, (_, i) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [116.34 + Math.random() * 0.14, 39.88 + Math.random() * 0.09] },
  properties: { id: i, count: 1 + Math.floor(Math.random() * 100) },
})) };
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="12">
    <HeatmapLayer :data="data" :size="30" :opacity="0.9"
      :gradient="{ 0: 'rgba(0, 90, 255, 1)', 0.5: 'rgba(0, 255, 120, 1)', 1: 'rgba(255, 0, 0, 1)' }"
      weight-field="count" />
  </Map>
</template>`,
});

// ─── ClusterLayer 点聚合（v1.0.6 新增） ───
registerDemo('cluster-layer', {
  component: defineComponent({
    name: 'ClusterLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 11 }, {
      default: () => [h(ClusterLayer as any, {
        data: randomPointsData(2000, false),
        clusterRadius: 60,
        clusterMinPoints: 2,
        onClick: (e: any) => { const v = e?.value; if (v?.isCluster) console.log(`聚合 ${v.pointCount} 个点`, v.latLng); },
      })],
    }),
  }),
  code: `<!-- ClusterLayer（v1.0.6 新增）：点聚合，data 为 GeoJSON；点击聚合点自动 fitView（fitViewOnClick 默认 true） -->
<script setup>
import { Map, ClusterLayer } from '@baidumap/vue-bmap';
const data = { type: 'FeatureCollection', features: Array.from({ length: 2000 }, (_, i) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [116.34 + Math.random() * 0.14, 39.88 + Math.random() * 0.09] },
  properties: { id: i, name: '点' + i },
})) };
const onClusterClick = (e) => {
  const v = e.value;
  if (v?.isCluster) console.log('聚合 ' + v.pointCount + ' 个点', v.latLng);
};
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="11">
    <ClusterLayer :data="data" :cluster-radius="60" :cluster-min-points="2" :on-click="onClusterClick" />
  </Map>
</template>`,
});

// ─── 随机线/面 GeoJSON 生成（v1.0.6 新增） ───
function randomLinesData(count: number) {
  const features = Array.from({ length: count }, (_, i) => {
    const lng0 = 116.34 + Math.random() * 0.14;
    const lat0 = 39.88 + Math.random() * 0.09;
    const coordinates = Array.from({ length: 4 }, () => [
      lng0 + (Math.random() - 0.5) * 0.05,
      lat0 + (Math.random() - 0.5) * 0.04,
    ]);
    return { type: 'Feature' as const, geometry: { type: 'LineString' as const, coordinates }, properties: { id: i, name: `线${i}` } };
  });
  return { type: 'FeatureCollection' as const, features };
}

function randomPolygonsData(count: number) {
  const features = Array.from({ length: count }, (_, i) => {
    const lng0 = 116.34 + Math.random() * 0.14;
    const lat0 = 39.88 + Math.random() * 0.09;
    const w = 0.015 + Math.random() * 0.025;
    const h = 0.012 + Math.random() * 0.02;
    const ring = [
      [lng0, lat0],
      [lng0 + w, lat0],
      [lng0 + w, lat0 + h],
      [lng0, lat0 + h],
      [lng0, lat0],
    ];
    return { type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [ring] }, properties: { id: i, name: `区域${i}` } };
  });
  return { type: 'FeatureCollection' as const, features };
}

// ─── PointLayer 点图层（v1.0.6 新增） ───
registerDemo('point-layer', {
  component: defineComponent({
    name: 'PointLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 12 }, {
      default: () => [h(PointLayer as any, {
        data: randomPointsData(200, false),
        shape: 'circle',
        size: 18,
        fillColor: '#1890ff',
        fillOpacity: 0.8,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        onClick: (e: any) => { const p = e?.value?.properties; if (p) console.log('点', p.id, p.name); },
      })],
    }),
  }),
  code: `<!-- PointLayer（v1.0.6 新增）：点图层，data 为 GeoJSON 点数据，支持形状/图标两种渲染方式 -->
<script setup>
import { Map, PointLayer } from '@baidumap/vue-bmap';
const data = { type: 'FeatureCollection', features: Array.from({ length: 200 }, (_, i) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [116.34 + Math.random() * 0.14, 39.88 + Math.random() * 0.09] },
  properties: { id: i, name: '点' + i },
})) };
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="12">
    <PointLayer :data="data" shape="circle" :size="18"
      fill-color="#1890ff" :fill-opacity="0.8"
      stroke-color="#ffffff" :stroke-weight="2" />
  </Map>
</template>`,
});

// ─── PolylineLayer 线图层（v1.0.6 新增） ───
registerDemo('polyline-layer', {
  component: defineComponent({
    name: 'PolylineLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 12 }, {
      default: () => [h(PolylineLayer as any, {
        data: randomLinesData(8),
        strokeColor: '#3388ff',
        strokeWeight: 4,
        strokeOpacity: 0.9,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      })],
    }),
  }),
  code: `<!-- PolylineLayer（v1.0.6 新增）：线图层，data 为 GeoJSON 线数据，支持纯色/虚线/纹理线 -->
<script setup>
import { Map, PolylineLayer } from '@baidumap/vue-bmap';
const data = { type: 'FeatureCollection', features: Array.from({ length: 8 }, (_, i) => ({
  type: 'Feature',
  geometry: { type: 'LineString', coordinates: [[116.34 + Math.random() * 0.14, 39.88 + Math.random() * 0.09], [116.35 + Math.random() * 0.14, 39.89 + Math.random() * 0.09]] },
  properties: { id: i, name: '线' + i },
})) };
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="12">
    <PolylineLayer :data="data" stroke-color="#3388ff" :stroke-weight="4"
      :stroke-opacity="0.9" stroke-line-cap="round" stroke-line-join="round" />
  </Map>
</template>`,
});

// ─── PolygonLayer 面图层（v1.0.6 新增） ───
registerDemo('polygon-layer', {
  component: defineComponent({
    name: 'PolygonLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 12 }, {
      default: () => [h(PolygonLayer as any, {
        data: randomPolygonsData(6),
        fillColor: '#1890ff',
        fillOpacity: 0.25,
        strokeColor: '#096dd9',
        strokeWeight: 2,
        strokeOpacity: 0.9,
      })],
    }),
  }),
  code: `<!-- PolygonLayer（v1.0.6 新增）：面图层，data 为 GeoJSON 面数据，支持纯色/纹理填充 -->
<script setup>
import { Map, PolygonLayer } from '@baidumap/vue-bmap';
const data = { type: 'FeatureCollection', features: Array.from({ length: 6 }, (_, i) => {
  const lng = 116.34 + Math.random() * 0.14;
  const lat = 39.88 + Math.random() * 0.09;
  const ring = [[lng, lat], [lng + 0.03, lat], [lng + 0.03, lat + 0.02], [lng, lat + 0.02], [lng, lat]];
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: { id: i, name: '区域' + i } };
}) };
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="12">
    <PolygonLayer :data="data" fill-color="#1890ff" :fill-opacity="0.25"
      stroke-color="#096dd9" :stroke-weight="2" :stroke-opacity="0.9" />
  </Map>
</template>`,
});

// ─── TextLayer 文本图层（v1.0.6 新增） ───
registerDemo('text-layer', {
  component: defineComponent({
    name: 'TextLayerDemo',
    setup: () => () => h(MapContainer, { center: C, zoom: 12 }, {
      default: () => [h(TextLayer as any, {
        data: randomPointsData(150, false),
        fontSize: 14,
        color: '#1890ff',
        strokeColor: '#ffffff',
        strokeWeight: 2,
        fontWeight: 'bold',
        collides: true,
        waitTime: 100,
      })],
    }),
  }),
  code: `<!-- TextLayer（v1.0.6 新增）：文本图层，文本内容取 data 中 feature 的 properties.name（或 text） -->
<script setup>
import { Map, TextLayer } from '@baidumap/vue-bmap';
const data = { type: 'FeatureCollection', features: Array.from({ length: 150 }, (_, i) => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [116.34 + Math.random() * 0.14, 39.88 + Math.random() * 0.09] },
  properties: { id: i, name: 'POI' + i },
})) };
<\/script>
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="12">
    <TextLayer :data="data" :font-size="14" color="#1890ff"
      stroke-color="#ffffff" :stroke-weight="2" font-weight="bold"
      :collides="true" :wait-time="100" />
  </Map>
</template>`,
});

