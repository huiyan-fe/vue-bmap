<script setup lang="ts">
/**
 * ClusterLayer 测试页 — v4+。点聚合图层。
 * 支持 setData（GeoJSON 数据）、聚合参数（clusterRadius / clusterMinPoints / updateRealTime / waitTime 等）。
 *
 * 组件方式：
 * <ClusterLayer :data="points" :cluster-radius="60" :on-click="onClick" :on-change="onChange" />
 */
import { computed, ref } from 'vue';
import { Map, ClusterLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';

// ─── 数据生成：北京城区 lng 116.3~116.5 / lat 39.9~40.05 随机点（500 / 2000 / 5000） ───
const COUNT_OPTIONS = [500, 2000, 5000];
const count = ref(2000);
const clusterData = ref<any>({ type: 'FeatureCollection', features: [] });

const generateData = () => {
  const features = Array.from({ length: count.value }, (_, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [116.3 + Math.random() * 0.2, 39.9 + Math.random() * 0.15] },
    properties: { id: i, name: `点${i}` },
  }));
  clusterData.value = { type: 'FeatureCollection', features };
};
generateData();

const setCount = (n: number) => { count.value = n; generateData(); };
const regenerate = () => { generateData(); log(`重新生成 ${count.value} 个点`); };

const caps = useCapabilities();
const supported = computed(() => caps.value.has('ClusterLayer'));

const visible = ref(true);
const enablePicked = ref(true);
const clusterRadius = ref(60);
const clusterMinPoints = ref(2);
const updateRealTime = ref(false);
const waitTime = ref(300);
const fitViewOnClick = ref(true);

// ─── 事件日志：click/mouseover/mouseout 的 value 为 {isCluster, pointCount, ...} 或单点；change 的 value 为 {singles, clusters, zoom} ───
const { eventLog, log, fmt } = useLog();

const onClusterClick = (e: any) => {
  const v = e?.value;
  if (v?.isCluster) log(`click 聚合 ${v.pointCount} 个 @ ${fmt(v.latLng)}`);
  else log(`click 单点 id=${v?.properties?.id ?? '-'}（${v?.properties?.name ?? ''}）`);
};
const onClusterMouseOver = (e: any) => {
  const v = e?.value;
  if (v?.isCluster) log(`mouseover 聚合 ${v.pointCount} 个`);
  else log(`mouseover 单点 id=${v?.properties?.id ?? '-'}`);
};
const onClusterMouseOut = (e: any) => {
  const v = e?.value;
  if (v?.isCluster) log(`mouseout 聚合 ${v.pointCount} 个`);
  else log(`mouseout 单点 id=${v?.properties?.id ?? '-'}`);
};
const onClusterChange = (e: any) => {
  const v = e?.value;
  log(`change zoom=${v?.zoom} clusters=${v?.clusters} singles=${v?.singles}`);
};

const resetAll = () => {
  visible.value = true; enablePicked.value = true;
  clusterRadius.value = 60; clusterMinPoints.value = 2;
  updateRealTime.value = false; waitTime.value = 300; fitViewOnClick.value = true;
  count.value = 2000; generateData();
};

const CODE_SAMPLE = `const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { id: 1 } },
    // ... N 个点
  ],
};

<Map :default-center="center" :default-zoom="12">
  <ClusterLayer
    :data="geojson"
    :cluster-radius="60"
    :cluster-min-points="2"
    :fit-view-on-click="true"
    :update-real-time="true"
    :wait-time="300"
    :on-click="(e) => {
      const v = e.value;
      if (v.isCluster) console.log('聚合', v.pointCount);
      else console.log('单点');
    }"
    :on-change="(e) => console.log(e.value)"  // { singles, clusters, zoom }
  />
</Map>`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <ClusterLayer
          v-if="visible && supported"
          :data="clusterData"
          :cluster-radius="clusterRadius"
          :cluster-min-points="clusterMinPoints"
          :update-real-time="updateRealTime"
          :wait-time="waitTime"
          :fit-view-on-click="fitViewOnClick"
          :enable-picked="enablePicked"
          :on-click="onClusterClick"
          :on-mouse-over="onClusterMouseOver"
          :on-mouse-out="onClusterMouseOut"
          :on-change="onClusterChange"
        />
      </Map>
      <EventLog :log="eventLog" hint="点击 / 悬停聚合点或单点触发事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>ClusterLayer</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('ClusterLayer') ? 'ok' : 'no'}`">{{ caps.has('ClusterLayer') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0。点聚合图层，按屏幕像素半径逐级聚合，通过 setData 加载 GeoJSON 数据。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="enablePicked" />enablePicked（鼠标拾取，重建）</label>
      </section>

      <section>
        <h3>数据（北京城区随机点）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="n in COUNT_OPTIONS" :key="n" :class="{ active: count === n }" style="font-size:11px" @click="setCount(n)">{{ n }} 点</button>
          <button style="font-size:11px" @click="regenerate">重新生成</button>
        </div>
        <p class="muted small">当前 {{ clusterData.features.length }} 个点；lng 116.3~116.5 / lat 39.9~40.05。data 变化时组件内部调用 setData()。</p>
      </section>

      <section>
        <h3>clusterRadius（聚合半径）: {{ clusterRadius }}</h3>
        <input type="range" min="20" max="120" :value="clusterRadius" @input="clusterRadius = +($event.target as HTMLInputElement).value" class="full-width" />
        <p class="muted small">屏幕像素半径，越大越容易聚合；构造项变化 → 重建图层。</p>
      </section>

      <section>
        <h3>clusterMinPoints（成簇最小点数）: {{ clusterMinPoints }}</h3>
        <input type="range" min="2" max="10" :value="clusterMinPoints" @input="clusterMinPoints = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>updateRealTime（实时刷新）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="updateRealTime" />拖动 / 缩放过程中实时刷新聚合（重建）</label>
        <p class="muted small">false：停止操作后刷新；waitTime 为刷新节流间隔。</p>
      </section>

      <section>
        <h3>waitTime（节流间隔）: {{ waitTime }}ms</h3>
        <input type="range" min="100" max="1000" step="50" :value="waitTime" :disabled="!updateRealTime" @input="waitTime = +($event.target as HTMLInputElement).value" class="full-width" />
        <p class="muted small">仅在 updateRealTime 开启时生效。</p>
      </section>

      <section>
        <h3>fitViewOnClick（点击聚焦）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="fitViewOnClick" />点击聚合点自动调整视野（重建）</label>
      </section>

      <section>
        <h3>singleStyle（单点样式）</h3>
        <p class="muted small">透传给内部 PointLayer 的单点样式对象（如 shapeType / size / color / icon 等），控制未成簇点的渲染。本页不传，使用默认样式。</p>
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
