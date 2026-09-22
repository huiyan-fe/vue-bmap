<script setup lang="ts">
/**
 * GeoJSONLayer 测试页 — v4+。GeoJSON 覆盖物组合图层。
 * 支持点（markerStyle）、线（polylineStyle）、面（polygonStyle）三种几何类型。
 *
 * 注意：markerStyle.icon 需要 SDK BMap.Icon 实例，plain object 会报错。
 * 组件方式不支持传入 SDK Icon 实例，因此 markerStyle 只设置 title 等基本属性。
 * 如需自定义图标，请用 driver.createIcon() 创建后通过 driver 方式调用。
 */
import { computed, ref } from 'vue';
import { Map, GeoJSONLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

// ─── 数据预设 ───
const POINTS_DATA = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { name: '天安门' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.415, 39.910] }, properties: { name: '故宫' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.397, 39.913] }, properties: { name: '中山公园' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.417, 39.928] }, properties: { name: '北海公园' } },
  ],
};

const LINES_DATA = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'LineString', coordinates: [[116.390, 39.910], [116.404, 39.915], [116.415, 39.910], [116.425, 39.920]] }, properties: { name: '路线1' } },
    { type: 'Feature', geometry: { type: 'LineString', coordinates: [[116.380, 39.925], [116.400, 39.925], [116.420, 39.925]] }, properties: { name: '路线2' } },
  ],
};

const POLYGONS_DATA = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[116.395, 39.910], [116.410, 39.910], [116.410, 39.920], [116.395, 39.920], [116.395, 39.910]]] }, properties: { name: '区域A' } },
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[116.415, 39.915], [116.430, 39.915], [116.430, 39.925], [116.415, 39.925], [116.415, 39.915]]] }, properties: { name: '区域B' } },
  ],
};

const ALL_DATA = {
  type: 'FeatureCollection',
  features: [...POINTS_DATA.features, ...LINES_DATA.features, ...POLYGONS_DATA.features],
};

const DATA_PRESETS = [
  { label: '点标注', data: POINTS_DATA },
  { label: '线路', data: LINES_DATA },
  { label: '区域', data: POLYGONS_DATA },
  { label: '全部', data: ALL_DATA },
] as const;

const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('GeoJSONLayer'));
const visible = ref(true);
const dataIdx = ref(0);
const lineColor = ref(COLORS[1]);
const lineWidth = ref(4);
const polygonStroke = ref(COLORS[2]);
const polygonFill = ref(COLORS[0]);
const polygonOpacity = ref(0.3);

const data = computed(() => DATA_PRESETS[dataIdx.value].data);

// 所有 props 变化时通过 key 重建
const rebuildKey = computed(() => `${dataIdx.value}|${lineColor.value}|${lineWidth.value}|${polygonStroke.value}|${polygonFill.value}|${polygonOpacity.value}`);

const CODE_SAMPLE = `const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: {} },
    { type: 'Feature', geometry: { type: 'LineString', coordinates: [[...], [...]] }, properties: {} },
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[...]]] }, properties: {} },
  ],
};

<Map :default-center="center" :default-zoom="13">
  <GeoJSONLayer
    :data-source="geojson"
    :marker-style="{ title: '标注' }"
    :polyline-style="{ strokeColor: '#52c41a', strokeWeight: 4 }"
    :polygon-style="{ strokeColor: '#fa8c16', fillColor: '#1890ff', fillOpacity: 0.3 }"
  />
</Map>`;

const resetAll = () => {
  visible.value = true; dataIdx.value = 0;
  lineColor.value = COLORS[1]; lineWidth.value = 4; polygonStroke.value = COLORS[2];
  polygonFill.value = COLORS[0]; polygonOpacity.value = 0.3;
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="13" style="height:100%">
        <GeoJSONLayer
          v-if="visible && supported"
          :key="rebuildKey"
          :data-source="data"
          :marker-style="{ title: 'GeoJSON 点标注' }"
          :polyline-style="{ strokeColor: lineColor, strokeWeight: lineWidth, strokeOpacity: 0.9 }"
          :polygon-style="{ strokeColor: polygonStroke, strokeWeight: 2, fillColor: polygonFill, fillOpacity: polygonOpacity }"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>GeoJSONLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。GeoJSON 覆盖物组合图层，通过 map.addLayer / map.removeLayer 管理。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>数据预设</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="(p, i) in DATA_PRESETS" :key="p.label" :class="{ active: dataIdx === i }" style="font-size:11px" @click="dataIdx = i">
            {{ p.label }}（{{ (p.data as any).features.length }}）
          </button>
        </div>
        <p class="muted small">dataSource 变化时通过 key 重建图层</p>
      </section>

      <section>
        <h3>markerStyle（点样式）</h3>
        <p class="muted small">
          点标注使用 SDK 默认图标。markerStyle.icon 需要 BMap.Icon 实例，
          组件方式无法传入 plain object（SDK 会报 getCurrentImageUrl is not a function）。
          如需自定义图标请用 driver.createIcon() 创建后通过 driver 方式调用。
        </p>
      </section>

      <section>
        <h3>polylineStyle（线样式）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: lineColor === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="lineColor = c">
            {{ c }}
          </button>
        </div>
        <label class="checkbox-row">strokeWeight: {{ lineWidth }}
          <input type="range" min="1" max="10" :value="lineWidth" @input="lineWidth = Number(($event.target as HTMLInputElement).value)" />
        </label>
      </section>

      <section>
        <h3>polygonStyle（面样式）</h3>
        <div style="font-size:11px;font-weight:600;margin-bottom:4px">strokeColor</div>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: polygonStroke === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="polygonStroke = c">
            {{ c }}
          </button>
        </div>
        <div style="font-size:11px;font-weight:600;margin-top:6px;margin-bottom:4px">fillColor</div>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: polygonFill === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="polygonFill = c">
            {{ c }}
          </button>
        </div>
        <label class="checkbox-row">fillOpacity: {{ polygonOpacity }}
          <input type="range" min="0" max="1" step="0.1" :value="polygonOpacity" @input="polygonOpacity = Number(($event.target as HTMLInputElement).value)" />
        </label>
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
      </section>

      <section>
        <h3>代码示例</h3>
        <pre class="code-sample">{{ CODE_SAMPLE }}</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
