<script setup lang="ts">
/**
 * PolylineLayer 测试页 — v4+ Visualization。线图层。
 * 支持 setData（GeoJSON 线数据）、线样式（strokeColor / strokeWeight / strokeStyle / strokeLineJoin / strokeLineCap 等）。
 *
 * 组件方式：
 * <PolylineLayer :data="geojson" stroke-color="#1890ff" :stroke-weight="4" stroke-style="dashed" :enable-picked="true" :on-click="onClick" />
 */
import { computed, ref } from 'vue';
import { Map, PolylineLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';
import { randomPolylines } from './geoHelper';

const LINE_COUNT = 8;
const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];
const STROKE_STYLES = ['solid', 'dashed', 'dotted'] as const;
const LINE_JOINS = ['miter', 'bevel', 'round'] as const;
const LINE_CAPS = ['butt', 'round', 'square'] as const;

const caps = useCapabilities();
const supported = computed(() => caps.value.has('PolylineLayer'));

const visible = ref(true);
const enablePicked = ref(true);

// ─── 数据生成：北京城区 8 条随机折线（LineString features） ───
const lineData = ref<any>({ type: 'FeatureCollection', features: [] });

const generateData = () => { lineData.value = randomPolylines(LINE_COUNT); };
generateData();

const regenerate = () => { generateData(); log(`重新生成 ${LINE_COUNT} 条折线`); };

// ─── 样式 ───
const strokeColor = ref(COLORS[0]);
const strokeWeight = ref(4);
const strokeStyle = ref<(typeof STROKE_STYLES)[number]>('solid');
const strokeLineJoin = ref<(typeof LINE_JOINS)[number]>('round');
const strokeLineCap = ref<(typeof LINE_CAPS)[number]>('round');

// ─── 事件日志：事件对象带 value / pixel / latLng（需 enablePicked=true） ───
const { eventLog, log, fmt } = useLog();

const onLineClick = (e: any) => {
  const v = e?.value;
  log(`click id=${v?.id ?? '-'}（${v?.properties?.name ?? ''}）点数=${v?.paths?.[0]?.length ?? '-'} @ ${fmt(e?.latLng)}`);
};
const onLineMouseOver = (e: any) => {
  const v = e?.value;
  log(`mouseover id=${v?.id ?? '-'}（${v?.properties?.name ?? ''}）`);
};
const onLineMouseOut = (e: any) => {
  const v = e?.value;
  log(`mouseout id=${v?.id ?? '-'}（${v?.properties?.name ?? ''}）`);
};
const onLineMouseMove = (e: any) => {
  const v = e?.value;
  log(`mousemove id=${v?.id ?? '-'} @ ${fmt(e?.latLng)}`);
};

const resetAll = () => {
  visible.value = true; enablePicked.value = true;
  strokeColor.value = COLORS[0]; strokeWeight.value = 4; strokeStyle.value = 'solid';
  strokeLineJoin.value = 'round'; strokeLineCap.value = 'round';
  generateData();
};

const CODE_SAMPLE = `const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'LineString', coordinates: [[116.35, 39.90], [116.39, 39.94], [116.43, 39.905]] }, properties: { id: 1, name: '线1' } },
    // ... N 条线
  ],
};

<Map :default-center="center" :default-zoom="12">
  <PolylineLayer
    :data="geojson"
    stroke-color="#1890ff"
    :stroke-weight="4"
    stroke-style="dashed"
    stroke-line-join="round"
    stroke-line-cap="round"
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
        <PolylineLayer
          v-if="visible && supported"
          :data="lineData"
          :stroke-color="strokeColor"
          :stroke-weight="strokeWeight"
          :stroke-style="strokeStyle"
          :stroke-line-join="strokeLineJoin"
          :stroke-line-cap="strokeLineCap"
          :enable-picked="enablePicked"
          :on-click="onLineClick"
          :on-mouse-over="onLineMouseOver"
          :on-mouse-out="onLineMouseOut"
          :on-mouse-move="onLineMouseMove"
        />
      </Map>
      <EventLog :log="eventLog" hint="点击 / 悬停折线触发事件（需开启 enablePicked）" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>PolylineLayer</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('PolylineLayer') ? 'ok' : 'no'}`">{{ caps.has('PolylineLayer') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0 Visualization。线图层，批量绘制 GeoJSON 线（LineString / MultiLineString），支持实线 / 虚线 / 点线。通过 setData 加载数据。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="enablePicked" />enablePicked（鼠标拾取 + 事件派发，重建）</label>
        <p class="muted small">不开 enablePicked 时点击 / 悬停不会派发事件。</p>
      </section>

      <section>
        <h3>数据（北京城区随机折线）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="regenerate">重新生成</button>
        </div>
        <p class="muted small">当前 {{ lineData.features.length }} 条折线，每条 5~8 个点；lng 116.3~116.5 / lat 39.9~40.05，properties 带 id/name。data 变化时组件内部调用 setData()。</p>
      </section>

      <section>
        <h3>strokeColor（线颜色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: strokeColor === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="strokeColor = c">{{ c }}</button>
        </div>
        <p class="muted small">虚线 / 点线模式下走 uniform 染色，颜色仍生效。</p>
      </section>

      <section>
        <h3>strokeWeight（线宽）: {{ strokeWeight }}px</h3>
        <input type="range" min="1" max="20" :value="strokeWeight" @input="strokeWeight = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>strokeStyle（线型）</h3>
        <div class="btn-group">
          <button v-for="s in STROKE_STYLES" :key="s" :class="{ active: strokeStyle === s }" style="font-size:11px" @click="strokeStyle = s">{{ s }}</button>
        </div>
        <p class="muted small">solid 实线 / dashed 虚线 / dotted 点线。</p>
      </section>

      <section>
        <h3>strokeLineJoin（拐角连接）</h3>
        <div class="btn-group">
          <button v-for="s in LINE_JOINS" :key="s" :class="{ active: strokeLineJoin === s }" style="font-size:11px" @click="strokeLineJoin = s">{{ s }}</button>
        </div>
        <p class="muted small">miter 尖角 / bevel 倒角 / round 圆角。纹理 / 虚线线不建议用 miter。</p>
      </section>

      <section>
        <h3>strokeLineCap（端点形状）</h3>
        <div class="btn-group">
          <button v-for="s in LINE_CAPS" :key="s" :class="{ active: strokeLineCap === s }" style="font-size:11px" @click="strokeLineCap = s">{{ s }}</button>
        </div>
        <p class="muted small">butt 平头 / round 圆头 / square 方头。</p>
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
