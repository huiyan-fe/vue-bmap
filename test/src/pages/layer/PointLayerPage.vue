<script setup lang="ts">
/**
 * PointLayer 测试页 — v4+ Visualization。点图层。
 * 支持 setData（GeoJSON 点数据）、样式（shape/size/fillColor/isFlat 等），data 变化时组件内部调用 setData()。
 *
 * 组件方式：
 * <PointLayer :data="geojson" shape="circle" :size="20" fill-color="#1890ff" :enable-picked="true" :on-click="onClick" />
 */
import { computed, ref } from 'vue';
import { Map, PointLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';
import { randomPoints } from './geoHelper';

const SHAPES = ['circle', 'square', 'triangle', 'diamond'] as const;
const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('PointLayer'));

const visible = ref(true);
const enablePicked = ref(true);

// ─── 数据生成：北京城区 300 个随机点（FeatureCollection + Point，properties 带 id/name） ───
const POINT_COUNT = 300;
const pointData = ref<any>({ type: 'FeatureCollection', features: [] });

const generateData = () => { pointData.value = randomPoints(POINT_COUNT); };
generateData();

const regenerate = () => { generateData(); log(`重新生成 ${POINT_COUNT} 个点`); };

// ─── 样式 ───
const shape = ref<(typeof SHAPES)[number]>('circle');
const size = ref(20);
const fillColor = ref(COLORS[0]);
const isFlat = ref(false);

// ─── 事件日志：事件对象带 value / pixel / latLng（需 enablePicked=true） ───
const { eventLog, log, fmt } = useLog();

const onPointClick = (e: any) => {
  const v = e?.value;
  log(`click id=${v?.id ?? '-'}（${v?.properties?.name ?? ''}）@ ${fmt(e?.latLng)} px=${e?.pixel?.x ?? '-'},${e?.pixel?.y ?? '-'}`);
};
const onPointMouseOver = (e: any) => {
  const v = e?.value;
  log(`mouseover id=${v?.id ?? '-'}（${v?.properties?.name ?? ''}）`);
};
const onPointMouseOut = (e: any) => {
  const v = e?.value;
  log(`mouseout id=${v?.id ?? '-'}（${v?.properties?.name ?? ''}）`);
};
const onPointMouseMove = (e: any) => {
  const v = e?.value;
  log(`mousemove id=${v?.id ?? '-'} @ ${fmt(e?.latLng)}`);
};

const resetAll = () => {
  visible.value = true; enablePicked.value = true;
  shape.value = 'circle'; size.value = 20; fillColor.value = COLORS[0]; isFlat.value = false;
  generateData();
};

const CODE_SAMPLE = `const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { id: 1, name: '点1' } },
    // ... N 个点
  ],
};

<Map :default-center="center" :default-zoom="12">
  <PointLayer
    :data="geojson"
    shape="circle"
    :size="20"
    fill-color="#1890ff"
    :is-flat="false"
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
        <PointLayer
          v-if="visible && supported"
          :data="pointData"
          :shape="shape"
          :size="size"
          :fill-color="fillColor"
          :is-flat="isFlat"
          :enable-picked="enablePicked"
          :on-click="onPointClick"
          :on-mouse-over="onPointMouseOver"
          :on-mouse-out="onPointMouseOut"
          :on-mouse-move="onPointMouseMove"
        />
      </Map>
      <EventLog :log="eventLog" hint="点击 / 悬停点触发事件（需开启 enablePicked）" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>PointLayer</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('PointLayer') ? 'ok' : 'no'}`">{{ caps.has('PointLayer') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0 Visualization。点图层，批量绘制 GeoJSON 点（Point / MultiPoint），支持形状 / 图标两种模式。通过 setData 加载数据。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="enablePicked" />enablePicked（鼠标拾取 + 事件派发，重建）</label>
        <p class="muted small">不开 enablePicked 时点击 / 悬停不会派发事件。</p>
      </section>

      <section>
        <h3>数据（北京城区随机点）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="regenerate">重新生成</button>
        </div>
        <p class="muted small">当前 {{ pointData.features.length }} 个点；lng 116.3~116.5 / lat 39.9~40.05，properties 带 id/name。data 变化时组件内部调用 setData()。</p>
      </section>

      <section>
        <h3>shape（形状）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="s in SHAPES" :key="s" :class="{ active: shape === s }" style="font-size:11px" @click="shape = s">{{ s }}</button>
        </div>
        <p class="muted small">circle / square / triangle / diamond 四种内置形状。</p>
      </section>

      <section>
        <h3>size（大小）: {{ size }}px</h3>
        <input type="range" min="5" max="100" :value="size" @input="size = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>fillColor（填充色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: fillColor === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="fillColor = c">{{ c }}</button>
        </div>
      </section>

      <section>
        <h3>isFlat（贴地）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="isFlat" />贴地（大小随缩放变化；关闭则屏幕固定像素）</label>
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
