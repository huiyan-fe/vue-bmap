# Vue-BMap

[![npm version](https://img.shields.io/npm/v/@baidumap/vue-bmap.svg)](https://www.npmjs.com/package/@baidumap/vue-bmap)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

用 Vue 3 组件写百度地图。地图、标注、覆盖物、控件都是普通的 Vue 组件，跟着响应式数据走，无需手动操作 DOM 或记 SDK 的命令式 API。一套代码同时支持百度地图 **JSAPI 3.0（2D）** 与 **4.0（WebGL）**，选项式（Options API）和组合式（Composition API）都能用。

```vue
<script setup>
import { BMapProvider, Map, Marker } from '@baidumap/vue-bmap';
const center = { lng: 116.404, lat: 39.915 };
</script>

<template>
  <BMapProvider ak="您的密钥">
    <Map :center="center" :zoom="12" style="height: 500px">
      <Marker :position="center" />
    </Map>
  </BMapProvider>
</template>
```

> 仅支持 Vue 3（`vue` 为 peer 依赖，`>=3.3`），不兼容 Vue 2。

## 安装

```bash
npm install @baidumap/vue-bmap
```

在 [百度地图开放平台](https://lbsyun.baidu.com/apiconsole/key) 申请一个浏览器端 `ak` 密钥即可，**不用**在 `index.html` 里手动加 `<script>`，组件库会自动加载地图脚本。

## 上手

### 1. 顶层放一个 Provider

`BMapProvider` 负责加载地图并把密钥、版本传下去，通常放在应用最外层，只写一次。

```vue
<template>
  <BMapProvider ak="您的密钥" version="4.0">
    <App />
  </BMapProvider>
</template>
```

- `version="4.0"`（默认）：WebGL 三维地图，支持旋转、俯仰、3D。
- `version="3.0"`：传统 2D 地图，更轻量。

### 2. 放一张地图

`Map` 必须有确定的宽高，容器没高度会看不到地图。中心/缩放有两种写法：

- 非受控：`:default-center` / `:default-zoom`，只用作初始值，之后地图自己维护。
- 受控：`:center` / `:zoom`，跟随数据变化，改数据地图就动。

```vue
<template>
  <Map :center="{ lng: 116.404, lat: 39.915 }" :zoom="12" style="height: 500px" />
</template>
```

### 3. 往地图里塞东西

覆盖物、控件都作为 `Map` 的子元素：

```vue
<template>
  <Map :center="center" :zoom="12" style="height: 500px">
    <Marker :position="center" />
    <InfoWindow :position="center" content="天安门" />
    <NavigationControl />
    <ScaleControl />
  </Map>
</template>
```

## 常见用法

### 点击地图 / 标注

地图与覆盖物的事件用 `@` 监听（等价于 `:on-click` 函数 prop），点击回调会拿到经纬度：

```vue
<template>
  <Map :center="center" :zoom="12" style="height: 500px" @click="e => console.log('点了地图', e.point)">
    <Marker :position="center" @click="point => console.log('点了标注', point)" />
  </Map>
</template>
```

### 用数据驱动标注

标注就是数据的映射，增删改直接改响应式数据：

```vue
<script setup>
import { ref } from 'vue';
import { Map, Marker } from '@baidumap/vue-bmap';

const center = { lng: 116.404, lat: 39.915 };
const points = ref([center]);
const addPoint = e => points.value.push(e.point);
</script>

<template>
  <Map :center="center" :zoom="12" style="height: 500px" @click="addPoint">
    <Marker v-for="(p, i) in points" :key="i" :position="p" />
  </Map>
</template>
```

### 画线、画圆

```vue
<template>
  <Map :center="center" :zoom="12" style="height: 500px">
    <Polyline
      :path="[{ lng: 116.399, lat: 39.910 }, { lng: 116.405, lat: 39.920 }]"
      stroke-color="#3388ff" :stroke-weight="4"
    />
    <Circle :center="center" :radius="800" fill-color="#3388ff" :fill-opacity="0.3" />
  </Map>
</template>
```

### 自定义标注图标

```vue
<template>
  <Marker :position="center" :icon="{ url: '/pin.png', size: { width: 32, height: 32 } }" />
</template>
```

### 地址转坐标（地理编码）

检索类功能以组合式函数（composable）提供，返回强类型结果：

```vue
<script setup>
import { useGeocoder } from '@baidumap/vue-bmap';

const { getPoint, getLocation, data } = useGeocoder();
getPoint('北京市海淀区上地十街10号'); // 地址转坐标，data.value.point 即坐标
// getLocation({ lng: 116.404, lat: 39.915 }); // 反向：坐标转地址
</script>
```

> `useGeocoder` 必须在 `<Map>` 内部的组件中调用（依赖地图上下文）。

## 命令式操作地图

需要主动控制地图（飞到某点、缩放、坐标转换等）时，用 `useMapRef()` 拿到命令式句柄——它是响应式的，地图就绪后自动可用：

```vue
<script setup>
import { Map, useMapRef } from '@baidumap/vue-bmap';

const center = { lng: 116.404, lat: 39.915 };
</script>

<template>
  <Map :center="center" :zoom="12" style="height: 500px">
    <Toolbar />
  </Map>
</template>
```

```vue
<!-- Toolbar.vue：作为 <Map> 的子组件，才能读到地图上下文 -->
<script setup>
import { useMapRef } from '@baidumap/vue-bmap';
const map = useMapRef();
</script>

<template>
  <div class="toolbar">
    <button @click="map?.panTo({ lng: 116.404, lat: 39.915 })">回到中心</button>
    <button @click="map?.setZoom(15)">放大</button>
  </div>
</template>
```

也可以给 `<Map>` 一个模板 ref，通过 `getMapRef()` 取句柄：`mapEl.value.getMapRef()?.panTo(...)`。

句柄提供了地图的全量方法：`panTo` / `setZoom` / `setViewport` / `getBounds` / `pointToPixel` 等。

## 组合式函数（Composables）

从顶层直接 import，均需在 `<Map>` 内部使用：

- `useMap`、`useMapEvent`、`useMapReady`、`useDriver`、`useMapRef`、`useCapabilities`、`useSymbol`、`useIcon`、`useGeocoder`

`useCapabilities()` 返回当前地图版本支持的能力集合（响应式），可用于提前分支：

```vue
<script setup>
import { useCapabilities } from '@baidumap/vue-bmap';
const caps = useCapabilities();
// caps.value.has('Marker3D')
</script>
```

## 能用哪些组件

从 `@baidumap/vue-bmap` 顶层直接 import，每个组件都带 TypeScript 类型。

- **覆盖物**：`Marker`、`Label`、`Polyline`、`Polygon`、`Circle`、`Rectangle`、`BezierCurve`、`Prism`、`GroundOverlay`、`GroundPoint`、`PointCollection`、`InfoWindow`、`Symbol`、`Icon`、`IconSequence`、`Hotspot`、`Marker3D`
- **控件**：`NavigationControl`、`NavigationControl3D`、`ScaleControl`、`OverviewMapControl`、`MapTypeControl`、`CopyrightControl`、`GeolocationControl`、`PanoramaControl`、`ZoomControl`、`CityListControl`、`LocationControl`、`LogoControl`
- **图层**：`TileLayer`、`NormalLayer`、`GeoJSONLayer`、`DistrictLayer`、`TrafficLayer`、`CustomLayer`、`CanvasLayer`、`RasterTileLayer`、`WMSLayer`、`WMTSLayer`、`XYZLayer`、`MVTLayer`

> 部分组件只在 4.0（WebGL）下可用（如 `Prism`、`Marker3D`、`DistrictLayer`）。在不支持的版本使用时，默认会打印一条警告并跳过，不会让页面崩溃。

## 常见问题

**地图不显示？** 检查 `Map` 的容器是否有明确的宽高，`ak` 是否有效、是否配置了域名白名单。

**报错「只能加载一个版本」？** 同一个页面只能加载一个 JSAPI 版本，确保只有一个 `BMapProvider`，且 `version` 保持一致。

## 本地开发

```bash
npm install
npm run examples     # 组件交互示例 + API 表格
npm run test:manual  # 逐组件的手动测试页
npm run build        # 打包（ESM + CJS + d.ts）
```

## 许可证

[MIT](./LICENSE)

