<script setup lang="ts">
/**
 * HeatmapLayer 测试页 — v4+。热力图图层。
 * 支持 setData（GeoJSON 数据，权重取 properties[weightField]）、
 * 构造项（size/unit/opacity/gradient 等）变化时重建图层。
 *
 * 组件方式：
 * <HeatmapLayer :data="geojson" :size="30" :gradient="{ 0.25: 'rgba(0,0,255,1)', 1: 'rgba(255,0,0,1)' }" />
 */
import { computed, ref } from 'vue';
import { Map, HeatmapLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';

// ─── 数据生成：北京城区 lng 116.3~116.5 / lat 39.9~40.05 随机点，properties.count 为热力权重 ───
const COUNT_OPTIONS = [200, 300, 500];
const count = ref(300);
const heatmapData = ref<any>({ type: 'FeatureCollection', features: [] });

const generateData = () => {
  const features = Array.from({ length: count.value }, (_, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [116.3 + Math.random() * 0.2, 39.9 + Math.random() * 0.15] },
    properties: { id: i, count: Math.floor(Math.random() * 100) + 1 },
  }));
  heatmapData.value = { type: 'FeatureCollection', features };
};
generateData();

const setCount = (n: number) => { count.value = n; generateData(); };
const regenerate = () => { generateData(); log(`重新生成 ${count.value} 个点`); };

// ─── gradient 预设 ───
const GRADIENT_PRESETS: Array<{ label: string; value: Record<number, string> }> = [
  { label: '蓝绿黄红', value: { 0: 'rgba(0, 90, 255, 1)', 0.25: 'rgba(0, 200, 255, 1)', 0.5: 'rgba(0, 255, 120, 1)', 0.75: 'rgba(255, 255, 0, 1)', 1: 'rgba(255, 0, 0, 1)' } },
  { label: '红黄渐变', value: { 0: 'rgba(255, 255, 0, 1)', 1: 'rgba(255, 0, 0, 1)' } },
  { label: '黑白', value: { 0: 'rgba(0, 0, 0, 1)', 1: 'rgba(255, 255, 255, 1)' } },
];
const gradientIdx = ref(0);
const gradient = computed<Record<number, string>>(() => GRADIENT_PRESETS[gradientIdx.value].value);

const caps = useCapabilities();
const supported = computed(() => caps.value.has('Heatmap'));

const visible = ref(true);
const size = ref(30);
const unit = ref<'px' | 'm'>('px');
const opacity = ref(1);
const weightField = 'count';

// ─── 事件日志：事件对象带 value / pixel / latLng ───
const { eventLog, log, fmt } = useLog();
const onHeatmapClick = (e: any) => log(`click value=${e?.value} @ ${fmt(e?.latLng)}`);
const onHeatmapMouseOver = (e: any) => log(`mouseover value=${e?.value} @ ${fmt(e?.latLng)}`);
const onHeatmapMouseOut = (e: any) => log(`mouseout value=${e?.value} @ ${fmt(e?.latLng)}`);

const resetAll = () => {
  visible.value = true;
  size.value = 30; unit.value = 'px'; opacity.value = 1;
  gradientIdx.value = 0; count.value = 300; generateData();
};

const CODE_SAMPLE = `const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { count: 80 } },
    // ... N 个点（properties 里带 count 权重）
  ],
};

<Map :default-center="center" :default-zoom="12">
  <HeatmapLayer
    :data="geojson"
    :size="30"
    unit="px"
    :opacity="1"
    :gradient="{ 0: 'rgba(0, 90, 255, 1)', 0.5: 'rgba(0, 255, 120, 1)', 1: 'rgba(255, 0, 0, 1)' }"
    weight-field="count"
    :on-click="(e) => console.log(e.value, e.latLng)"
    :on-mouse-over="(e) => console.log(e.value)"
    :on-mouse-out="(e) => console.log(e.value)"
  />
</Map>`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <HeatmapLayer
          v-if="visible && supported"
          :data="heatmapData"
          :size="size"
          :unit="unit"
          :opacity="opacity"
          :gradient="gradient"
          :weight-field="weightField"
          :on-click="onHeatmapClick"
          :on-mouse-over="onHeatmapMouseOver"
          :on-mouse-out="onHeatmapMouseOut"
        />
      </Map>
      <EventLog :log="eventLog" hint="点击 / 悬停热力图触发事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>HeatmapLayer</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('Heatmap') ? 'ok' : 'no'}`">{{ caps.has('Heatmap') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0。热力图图层，通过 setData 加载 GeoJSON 数据，权重取 properties[weightField]（默认 count）。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>数据（北京城区随机点）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="n in COUNT_OPTIONS" :key="n" :class="{ active: count === n }" style="font-size:11px" @click="setCount(n)">{{ n }} 点</button>
          <button style="font-size:11px" @click="regenerate">重新生成</button>
        </div>
        <p class="muted small">当前 {{ heatmapData.features.length }} 个点；lng 116.3~116.5 / lat 39.9~40.05，properties.count 权重 1~100。data 变化时组件内部调用 setData()。</p>
      </section>

      <section>
        <h3>size（热力核半径）: {{ size }}</h3>
        <input type="range" min="5" max="100" :value="size" @input="size = +($event.target as HTMLInputElement).value" class="full-width" />
        <p class="muted small">构造项变化 → 重建图层</p>
      </section>

      <section>
        <h3>gradient（渐变色带）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="(g, i) in GRADIENT_PRESETS" :key="g.label" :class="{ active: gradientIdx === i }" style="font-size:11px" @click="gradientIdx = i">{{ g.label }}</button>
        </div>
        <p class="muted small">如 { 0: 'rgba(0, 90, 255, 1)', 0.5: 'rgba(0, 255, 120, 1)', 1: 'rgba(255, 0, 0, 1)' }</p>
      </section>

      <section>
        <h3>weightField（权重字段）</h3>
        <p class="muted small">默认 'count'，取 feature.properties[weightField] 作为热力权重，参与 min/max 归一化。本页数据每个点均带 count 字段。</p>
      </section>

      <section>
        <h3>opacity（整体透明度）: {{ opacity }}</h3>
        <input type="range" min="0" max="1" step="0.05" :value="opacity" @input="opacity = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>unit（半径单位）</h3>
        <div class="btn-group">
          <button v-for="u in (['px', 'm'] as const)" :key="u" :class="{ active: unit === u }" style="font-size:11px" @click="unit = u">{{ u }}</button>
        </div>
        <p class="muted small">px：屏幕像素；m：按实际米数换算，随缩放变化。</p>
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
