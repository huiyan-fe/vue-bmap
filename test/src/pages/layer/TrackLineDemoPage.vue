<script setup lang="ts">
/**
 * TrackLine 官方示例复刻（test 页）—— 对应 JSAPI 示例中心「轨迹动画」的 3 个案例：
 *   1. 基本用法（base）
 *   2. 调整速度（speed）
 *   3. 调整样式（style）
 * 不含「综合案例」。
 *
 * 参考：https://lbs.baidu.com/jsapi/demo/layer/track/base.html?version=4.0&type=js
 * 数据、纹理、车辆图标、播放/倍速/样式操作均与官方示例一致。
 */
import { computed, ref } from 'vue';
import { Map, TrackLine, useCapabilities } from '@baidumap/vue-bmap';
import type { TrackLineRef } from '@baidumap/vue-bmap';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';

type CaseId = 'base' | 'speed' | 'style';
const CASES: Array<{ id: CaseId; label: string }> = [
  { id: 'base', label: '基本用法' },
  { id: 'speed', label: '调整速度' },
  { id: 'style', label: '调整样式' },
];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('TrackLine'));

// ─── 官方示例坐标（[经度, 纬度]） ───
const COORDS: Array<[number, number]> = [
  [116.310823, 40.003418],
  [116.311538, 39.994606],
  [116.312181, 39.991014],
  [116.334538, 39.991369],
  [116.360841, 39.991777],
  [116.387144, 39.992185],
  [116.413447, 39.992593],
  [116.439750, 39.992990],
  [116.468679, 39.993441],
  [116.468894, 39.985586],
  [116.469144, 39.976160],
  [116.469394, 39.966734],
  [116.469679, 39.955737],
];
const DATA = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: COORDS },
};

// 官方示例的箭头纹理 + 车辆图标
const STROKE_TEXTURE_URL = 'https://mapopen-pub-jsapi.bj.bcebos.com/jsapiGlgeo/img/down.png';
const CAR_URL = 'https://jsapi-demo.bj.bcebos.com/images/markers/car.png';
const MOVE_POINT = { type: 'ground', url: CAR_URL, size: [22, 44], adjustSize: true };

const mapCenter = { lng: 116.39, lat: 39.99 };
const caseId = ref<CaseId>('base');
const trackRef = ref<TrackLineRef | null>(null);

const { eventLog, log } = useLog();

// ─── 播放控制 ───
const paused = ref(false);
const speed = ref(1);

const start = () => {
  if (paused.value) { trackRef.value?.resume(); paused.value = false; log('resume() 从暂停处继续'); }
  else { trackRef.value?.start(); log('start() 从头播放'); }
};
const pause = () => { trackRef.value?.pause(); paused.value = true; log('pause()'); };
const reset = () => {
  trackRef.value?.stop();
  paused.value = false;
  if (caseId.value === 'speed') { trackRef.value?.setSpeed(1); speed.value = 1; }
  log('stop() 停止并回到起点');
};

// ─── 调整速度 ───
const changeSpeed = (n: number) => {
  trackRef.value?.setSpeed(n);
  speed.value = trackRef.value?.getSpeed?.() ?? n;
  log(`setSpeed(${n}) → getSpeed() = ${speed.value}`);
};

// ─── 调整样式（setOptions 运行时修改，播放进度保留） ───
const applyLinear = (stops: Array<[number, string]> | null) => {
  if (stops) {
    trackRef.value?.setOptions({ isLinear: true, linearTexture: stops });
    log(`isLinear = true，linearTexture = ${JSON.stringify(stops)}`);
  } else {
    trackRef.value?.setOptions({ isLinear: false });
    log('isLinear = false（恢复 strokeColor）');
  }
};
const setPassedColor = (color: string) => {
  trackRef.value?.setOptions({ passedColor: color });
  log(`passedColor = ${color}`);
};
const setWeight = (w: number) => {
  trackRef.value?.setOptions({ strokeWeight: w });
  log(`strokeWeight = ${w}`);
};

// ─── 生命周期 / 播放事件 ───
const onProgress = (e: any) => {
  const v = e?.value ?? e;
  if (!v) return;
  log(`progress ${(v.process * 100).toFixed(1)}% elapsed=${Number(v.elapsed).toFixed(1)}s distance=${Math.round(v.distance)}m`);
};
const onStatusChange = (e: any) => {
  const v = e?.value ?? e;
  log(`statuschange ${v?.statusName ?? v?.status ?? ''}`);
};

const switchCase = (id: CaseId) => {
  caseId.value = id;
  paused.value = false;
  speed.value = 1;
  log(`切换到案例：${CASES.find((c) => c.id === id)?.label}`);
};

const CODE_SAMPLE = `<!-- 与官方示例一致的 TrackLine 用法 -->
<script setup>
import { ref } from 'vue';
import { Map, TrackLine } from '@baidumap/vue-bmap';

const trackRef = ref();
const data = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } };
const movePoint = { type: 'ground', url: '.../car.png', size: [22, 44], adjustSize: true };

// 播放：start / resume / pause / stop
// 速度：trackRef.value.setSpeed(2) / getSpeed()
// 样式：trackRef.value.setOptions({ isLinear: true, linearTexture: [...] })
//       trackRef.value.setOptions({ passedColor: 'none' })
//       trackRef.value.setOptions({ strokeWeight: 16 })
<\/script>
<template>
  <Map :center="{ lng: 116.39, lat: 39.99 }" :zoom="14">
    <TrackLine ref="trackRef" :data="data" :duration="10"
      :stroke-weight="10" :passed-color="'rgba(153,153,153,1)'"
      :stroke-texture-url="'.../down.png'" :stroke-texture-width="64"
      :stroke-texture-height="32" :stroke-texture-spaced="true" :stroke-texture-gap="32"
      :move-point="movePoint" :on-progress="onProgress" />
  </Map>
</template>`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="mapCenter" :default-zoom="14" :display-options="{ poi: false }" style="height:100%">
        <TrackLine
          v-if="supported"
          :key="caseId"
          ref="trackRef"
          :data="DATA"
          :duration="10"
          :stroke-weight="10"
          :passed-color="'rgba(153, 153, 153, 1)'"
          :stroke-texture-url="STROKE_TEXTURE_URL"
          :stroke-texture-width="64"
          :stroke-texture-height="32"
          :stroke-texture-spaced="true"
          :stroke-texture-gap="32"
          :move-point="MOVE_POINT"
          :render-stage="caseId === 'style' ? 'poi' : undefined"
          :on-progress="onProgress"
          :on-status-change="onStatusChange"
        />
      </Map>
      <EventLog :log="eventLog" hint="progress / statuschange 及操作日志" @clear="eventLog = []" />
    </div>

    <div class="test-controls">
      <h2>TrackLine 官方示例（3 案例）</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">复刻 JSAPI 示例中心「轨迹动画」的基本用法 / 调整速度 / 调整样式（不含综合案例）。</p>
      </section>

      <section>
        <h3>案例</h3>
        <div class="btn-group">
          <button v-for="c in CASES" :key="c.id" :class="{ active: caseId === c.id }" style="font-size:11px" @click="switchCase(c.id)">{{ c.label }}</button>
        </div>
      </section>

      <section>
        <h3>播放控制</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="start">{{ paused ? '继续播放' : '开始播放' }}</button>
          <button style="font-size:11px" @click="pause">暂停</button>
          <button style="font-size:11px" @click="reset">重置</button>
        </div>
        <p class="muted small">暂停后再点「开始播放」从暂停处继续（resume），否则从头播放（start）。</p>
      </section>

      <section v-if="caseId === 'speed'">
        <h3>调整速度（当前 {{ speed }} 倍速）</h3>
        <div class="btn-group">
          <button style="font-size:11px" :class="{ active: speed === 0.5 }" @click="changeSpeed(0.5)">0.5×</button>
          <button style="font-size:11px" :class="{ active: speed === 1 }" @click="changeSpeed(1)">1×</button>
          <button style="font-size:11px" :class="{ active: speed === 2 }" @click="changeSpeed(2)">2×</button>
        </div>
        <p class="muted small">setSpeed(n) 设为 n 倍速，播放过程中可随时切换；重置会恢复为 1 倍速。</p>
      </section>

      <section v-if="caseId === 'style'">
        <h3>线性渐变（isLinear / linearTexture）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="applyLinear([[0, '#00c853'], [0.5, '#ffd600'], [1, '#d50000']])">绿→黄→红</button>
          <button style="font-size:11px" @click="applyLinear([[0, 'purple'], [0.5, 'red'], [1, 'green']])">紫→红→绿</button>
          <button style="font-size:11px" @click="applyLinear(null)">关闭渐变</button>
        </div>
      </section>

      <section v-if="caseId === 'style'">
        <h3>已走过路段颜色（passedColor）</h3>
        <div class="btn-group">
          <button style="font-size:11px" @click="setPassedColor('rgba(153, 153, 153, 1)')">灰色</button>
          <button style="font-size:11px" @click="setPassedColor('rgba(230, 30, 30, 1)')">红色</button>
          <button style="font-size:11px" @click="setPassedColor('none')">隐藏（none）</button>
        </div>
      </section>

      <section v-if="caseId === 'style'">
        <h3>线宽（strokeWeight）</h3>
        <div class="btn-group">
          <button style="font-size:11px" @click="setWeight(6)">6</button>
          <button style="font-size:11px" @click="setWeight(10)">10</button>
          <button style="font-size:11px" @click="setWeight(16)">16</button>
        </div>
        <p class="muted small">样式修改走 setOptions，播放进度会保留。</p>
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
