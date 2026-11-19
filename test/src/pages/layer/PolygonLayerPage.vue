<script setup lang="ts">
/**
 * PolygonLayer 测试页 — v4+ Visualization。面图层。
 * 支持 setData（GeoJSON 面数据）、填充 / 描边样式（fillColor / fillOpacity / strokeColor / strokeWeight 等）。
 *
 * 组件方式：
 * <PolygonLayer :data="geojson" fill-color="#1890ff" :fill-opacity="0.5" stroke-color="#1890ff" :stroke-weight="2" :enable-picked="true" :on-click="onClick" />
 */
import { computed, ref } from 'vue';
import { Map, PolygonLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';
import { randomPolygons } from './geoHelper';

const POLYGON_COUNT = 6;
const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('PolygonLayer'));

const visible = ref(true);
const enablePicked = ref(true);

// ─── 数据生成：北京城区 6 个随机多边形（中心点 + 半径生成方 / 三角） ───
const polyShape = ref<'square' | 'triangle'>('square');
const polygonData = ref<any>({ type: 'FeatureCollection', features: [] });

const generateData = () => { polygonData.value = randomPolygons(POLYGON_COUNT, polyShape.value); };
generateData();

const regenerate = () => {
  generateData();
  log(`重新生成 ${POLYGON_COUNT} 个多边形（${polyShape.value === 'square' ? '方形' : '三角形'}）`);
};
const setPolyShape = (s: 'square' | 'triangle') => { polyShape.value = s; generateData(); };

// ─── 样式 ───
const fillColor = ref(COLORS[0]);
const fillOpacity = ref(0.5);
const strokeColor = ref(COLORS[0]);
const strokeWeight = ref(2);

// ─── 事件日志：事件对象带 value / pixel / latLng（需 enablePicked=true） ───
const { eventLog, log, fmt } = useLog();

const onPolygonClick = (e: any) => {
  const v = e?.value;
  log(`click id=${v?.id ?? '-'}（${v?.properties?.name ?? ''}）环数=${v?.rings?.length ?? '-'} @ ${fmt(e?.latLng)}`);
};
const onPolygonMouseOver = (e: any) => {
  const v = e?.value;
  log(`mouseover id=${v?.id ?? '-'}（${v?.properties?.name ?? ''}）`);
};
const onPolygonMouseOut = (e: any) => {
  const v = e?.value;
  log(`mouseout id=${v?.id ?? '-'}（${v?.properties?.name ?? ''}）`);
};
const onPolygonMouseMove = (e: any) => {
  const v = e?.value;
  log(`mousemove id=${v?.id ?? '-'} @ ${fmt(e?.latLng)}`);
};

const resetAll = () => {
  visible.value = true; enablePicked.value = true;
  polyShape.value = 'square';
  fillColor.value = COLORS[0]; fillOpacity.value = 0.5; strokeColor.value = COLORS[0]; strokeWeight.value = 2;
  generateData();
};

const CODE_SAMPLE = `const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[116.395, 39.910], [116.410, 39.910], [116.410, 39.920], [116.395, 39.920], [116.395, 39.910]]] }, properties: { id: 1, name: '区域1' } },
    // ... N 个面
  ],
};

<Map :default-center="center" :default-zoom="12">
  <PolygonLayer
    :data="geojson"
    fill-color="#1890ff"
    :fill-opacity="0.5"
    stroke-color="#1890ff"
    :stroke-weight="2"
    :enable-picked="true"
    :on-click="(e) => console.log(e.value, e.pixel, e.latLng)"
    :on-mouse-over="(e) => console.log(e.value)"
    :on-mouse-out="(e) => console.log(e.value)"
    :on-mouse-move="(e) => console.log(e.value)"
  />
</Map>`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <PolygonLayer
          v-if="visible && supported"
          :data="polygonData"
          :fill-color="fillColor"
          :fill-opacity="fillOpacity"
          :stroke-color="strokeColor"
          :stroke-weight="strokeWeight"
          :enable-picked="enablePicked"
          :on-click="onPolygonClick"
          :on-mouse-over="onPolygonMouseOver"
          :on-mouse-out="onPolygonMouseOut"
          :on-mouse-move="onPolygonMouseMove"
        />
      </Map>
      <EventLog :log="eventLog" hint="点击 / 悬停多边形触发事件（需开启 enablePicked）" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>PolygonLayer</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('PolygonLayer') ? 'ok' : 'no'}`">{{ caps.has('PolygonLayer') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0 Visualization。面图层，批量绘制 GeoJSON 面（Polygon / MultiPolygon，含洞），支持填充与描边。通过 setData 加载数据。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="enablePicked" />enablePicked（鼠标拾取 + 事件派发，重建）</label>
        <p class="muted small">不开 enablePicked 时点击 / 悬停不会派发事件。</p>
      </section>

      <section>
        <h3>数据（北京城区随机多边形）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="s in (['square', 'triangle'] as const)" :key="s" :class="{ active: polyShape === s }" style="font-size:11px" @click="setPolyShape(s)">{{ s === 'square' ? '方形' : '三角形' }}</button>
          <button style="font-size:11px" @click="regenerate">重新生成</button>
        </div>
        <p class="muted small">当前 {{ polygonData.features.length }} 个面；中心点 + 半径生成（方形 / 三角形），properties 带 id/name。data 变化时组件内部调用 setData()。</p>
      </section>

      <section>
        <h3>fillColor（填充色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: fillColor === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="fillColor = c">{{ c }}</button>
        </div>
      </section>

      <section>
        <h3>fillOpacity（填充透明度）: {{ fillOpacity }}</h3>
        <input type="range" min="0" max="1" step="0.05" :value="fillOpacity" @input="fillOpacity = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>strokeColor（描边色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: strokeColor === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="strokeColor = c">{{ c }}</button>
        </div>
      </section>

      <section>
        <h3>strokeWeight（描边宽）: {{ strokeWeight }}px</h3>
        <input type="range" min="0" max="10" :value="strokeWeight" @input="strokeWeight = +($event.target as HTMLInputElement).value" class="full-width" />
        <p class="muted small">0 表示不描边。</p>
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
