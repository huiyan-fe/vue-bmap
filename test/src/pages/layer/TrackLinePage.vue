<script setup lang="ts">
/**
 * TrackLine 测试页 — v4+ Visualization。轨迹线图层。
 * 支持 setData（GeoJSON 线数据，播放时间线取 properties.time 数组）、播放控制（命令式 ref 句柄）、
 * duration / autoStart / autoFollow 与 onProgress / onStatusChange 事件。
 *
 * 组件方式：
 * <TrackLine ref="track" :data="geojson" :duration="60" :auto-start="true" :auto-follow="true"
 *   :on-progress="onProgress" :on-status-change="onStatusChange" />
 */
import { computed, ref, watch } from 'vue';
import { Map, TrackLine, useCapabilities, type TrackLineRef } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';

const TRACK_POINTS = 45;
const TRACK_START: [number, number] = [116.35, 39.9];
const TRACK_END: [number, number] = [116.46, 40.03];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('TrackLine'));

const visible = ref(true);

// ─── 数据生成：一条轨迹 LineString（坐标沿直线加抖动），properties.time 0~duration 递增 ───
const duration = ref(60);
const trackData = ref<any>({ type: 'FeatureCollection', features: [] });

const generateData = () => {
  const n = TRACK_POINTS;
  const coords: number[][] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const lng = TRACK_START[0] + (TRACK_END[0] - TRACK_START[0]) * t;
    const lat = TRACK_START[1] + (TRACK_END[1] - TRACK_START[1]) * t;
    // 垂直于行进方向加抖动（首末点保持端点）
    const jitter = i === 0 || i === n - 1 ? 0 : (Math.random() - 0.5) * 0.03;
    coords.push([lng - (TRACK_END[1] - TRACK_START[1]) * jitter, lat + (TRACK_END[0] - TRACK_START[0]) * jitter]);
  }
  const time = Array.from({ length: n }, (_, i) => Math.round((i / (n - 1)) * duration.value));
  trackData.value = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: { id: 0, name: '模拟行驶路线', time },
    }],
  };
};
generateData();

// duration 变化时重建播放时间线，保持 time 数组与总时长一致
watch(duration, generateData);

const regenerate = () => { generateData(); log(`重新生成轨迹（${TRACK_POINTS} 点，${duration.value}s）`); };

// ─── 播放控制（expose 返回 TrackLineRef 对象，经 ref 调命令式句柄） ───
const autoStart = ref(false);
const autoFollow = ref(false);
const trackRef = ref<TrackLineRef | null>(null);
const start = () => trackRef.value?.start();
const resume = () => trackRef.value?.resume();
const pause = () => trackRef.value?.pause();
const stop = () => trackRef.value?.stop();
// setFollowOptions 只是跟随细节配置；必须 setAutoFollow(true) 视野才会跟着车走
const applyFollowPreset = () => {
  trackRef.value?.setAutoFollow(true);
  trackRef.value?.setFollowOptions({ tilt: 60, heading: 0, rotationDuration: 1000, rotationOffset: 0 });
  autoFollow.value = true;
  log('开启跟随（autoFollow=true）+ 跟随预设 tilt=60');
};

// ─── 事件日志：click / mouseover / mouseout / mousemove + progress / statuschange ───
const { eventLog, log, fmt } = useLog();

const onTrackClick = (e: any) => {
  const v = e?.value;
  log(`click ${v?.properties?.name ?? v?.name ?? '轨迹'} @ ${fmt(e?.latLng)} px=${e?.pixel?.x ?? '-'},${e?.pixel?.y ?? '-'}`);
};
const onTrackMouseOver = (e: any) => {
  const v = e?.value;
  log(`mouseover ${v?.properties?.name ?? v?.name ?? '轨迹'}`);
};
const onTrackMouseOut = (e: any) => {
  const v = e?.value;
  log(`mouseout ${v?.properties?.name ?? v?.name ?? '轨迹'}`);
};
const onTrackMouseMove = (e: any) => {
  const v = e?.value;
  log(`mousemove ${v?.properties?.name ?? v?.name ?? '轨迹'} @ ${fmt(e?.latLng)}`);
};
// onProgress：value = { process, elapsed, trace, distance, point, angle }，记录进度摘要
const onTrackProgress = (e: any) => {
  const v = e?.value;
  const pct = typeof v?.process === 'number' ? `${(v.process * 100).toFixed(1)}%` : `${v?.process ?? '-'}`;
  const elapsed = typeof v?.elapsed === 'number' ? `${v.elapsed.toFixed(1)}s` : `${v?.elapsed ?? '-'}`;
  const dist = typeof v?.distance === 'number' ? `${Math.round(v.distance)}m` : `${v?.distance ?? '-'}`;
  log(`progress ${pct} elapsed=${elapsed} distance=${dist}`);
};
// onStatusChange：播放状态变化
const onTrackStatusChange = (e: any) => {
  const v = e?.value;
  const s = typeof v === 'string' ? v : (v?.status ?? JSON.stringify(v ?? ''));
  log(`statuschange → ${s}`);
};

const resetAll = () => {
  visible.value = true; autoStart.value = false; autoFollow.value = false;
  duration.value = 60; generateData();
};

const CODE_SAMPLE = `const geojson = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[116.35, 39.9], ..., [116.46, 40.03]] },
    properties: { time: [0, 15, 30, 45, 60] },  // 与 coordinates 等长，0~duration 递增
  }],
};

<Map :default-center="center" :default-zoom="12">
  <TrackLine
    ref="track"
    :data="geojson"
    :duration="60"
    :auto-start="true"
    :auto-follow="true"
    :on-progress="(e) => console.log(e.value.process, e.value.elapsed, e.value.distance)"
    :on-status-change="(e) => console.log(e.value)"
    :on-click="(e) => console.log(e.value, e.pixel, e.latLng)"
  />
</Map>

// 播放控制命令式句柄（expose 返回 TrackLineRef 对象）
track.value?.start();
track.value?.pause();
track.value?.stop();
track.value?.setAutoFollow(true); // 先开启跟随，视野才会跟着车走
track.value?.setFollowOptions({ tilt: 60, heading: 0, rotationDuration: 1000 });`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <TrackLine
          v-if="visible && supported"
          ref="trackRef"
          :data="trackData"
          :duration="duration"
          :auto-start="autoStart"
          :auto-follow="autoFollow"
          :on-click="onTrackClick"
          :on-mouse-over="onTrackMouseOver"
          :on-mouse-out="onTrackMouseOut"
          :on-mouse-move="onTrackMouseMove"
          :on-progress="onTrackProgress"
          :on-status-change="onTrackStatusChange"
        />
      </Map>
      <EventLog :log="eventLog" hint="播放时输出 progress / statuschange；点击 / 悬停轨迹触发鼠标事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>TrackLine</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('TrackLine') ? 'ok' : 'no'}`">{{ caps.has('TrackLine') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0 Visualization。轨迹线图层，车辆图标沿 LineString 行驶，播放时间线取 properties.time 数组（与 coordinates 等长）。通过 setData 加载数据。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>数据（单条模拟行驶轨迹）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="regenerate">重新生成</button>
        </div>
        <p class="muted small">当前 {{ trackData.features[0]?.geometry?.coordinates?.length ?? 0 }} 个点；坐标沿直线加抖动，properties.time 0~{{ duration }}s 递增（与坐标等长）。data 变化时组件内部调用 setData()。</p>
      </section>

      <section>
        <h3>duration（播放总时长）: {{ duration }}s</h3>
        <input type="range" min="10" max="120" step="5" :value="duration" @input="duration = +($event.target as HTMLInputElement).value" class="full-width" />
        <p class="muted small">构造项变化 → 重建图层；同时重建 time 时间线，保持与总时长一致。</p>
      </section>

      <section>
        <h3>播放模式</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="autoStart" />autoStart（setData 后自动开始播放）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="autoFollow" />autoFollow（地图视野自动跟随车辆）</label>
      </section>

      <section>
        <h3>播放控制（命令式 ref 句柄）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="start">start</button>
          <button style="font-size:11px" @click="resume">resume（暂停后继续）</button>
          <button style="font-size:11px" @click="pause">pause</button>
          <button style="font-size:11px" @click="stop">stop</button>
          <button style="font-size:11px" @click="applyFollowPreset">开启跟随（autoFollow + 预设）</button>
        </div>
        <p class="muted small">通过 &lt;TrackLine ref="trackRef"&gt; 取组件 expose 的 TrackLineRef 对象，调用 start() / resume() / pause() / stop() / setFollowOptions()（方法名对齐 JSAPI）。</p>
      </section>

      <section>
        <h3>事件</h3>
        <p class="muted small">onProgress：value = { process, elapsed, trace, distance, point, angle }，每帧派发；onStatusChange：播放状态变化（开始 / 暂停 / 停止等）。</p>
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
