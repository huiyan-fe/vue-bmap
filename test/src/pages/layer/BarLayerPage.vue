<script setup lang="ts">
/**
 * BarLayer 测试页 — v4+ Visualization。柱状图层。
 * 支持 setData（GeoJSON 点数据，柱体量值取 properties.value）、柱高 / 颜色 / 半径 / 棱数 / 单位等。
 * 注意：BarLayer 不支持鼠标拾取（SDK 未实现 resolvePickIndex），无点击/悬停事件。
 *
 * 组件方式：
 * <BarLayer :data="geojson" :color="'rgba(24,144,255,0.9)'" :height="100000" :size="50000" :edge-count="8" unit="m" />
 */
import { computed, ref } from 'vue';
import { Map, BarLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const BAR_COUNT = 80;
const COLORS = ['rgba(24,144,255,0.9)', 'rgba(82,196,26,0.9)', 'rgba(250,140,22,0.9)', 'rgba(255,77,79,0.9)', 'rgba(114,46,209,0.9)'];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('BarLayer'));

const visible = ref(true);

// ─── 数据生成：北京城区 80 个随机点，properties.value 0~1000 用于柱体量值 / 柱高 ───
const barData = ref<any>({ type: 'FeatureCollection', features: [] });

const generateData = () => {
  const features = Array.from({ length: BAR_COUNT }, (_, i) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [116.3 + Math.random() * 0.2, 39.9 + Math.random() * 0.15] },
    properties: { id: i, name: `柱${i + 1}`, value: Math.floor(Math.random() * 1000) },
  }));
  barData.value = { type: 'FeatureCollection', features };
};
generateData();

const regenerate = () => { generateData(); };

// ─── 样式 ───
const color = ref(COLORS[0]);
const height = ref(100000);
// size 单位随 unit 联动：m 时用墨卡托米（默认 50000），px 时用屏幕像素（默认 30）——
// 同一个数值在 px 单位下语义完全不同（50000 像素的柱体会被视锥裁掉看不见）
const size = ref(50000);
const edgeCount = ref(4);
const unit = ref<'m' | 'px'>('m');
const sizeRange = computed(() => unit.value === 'px'
  ? { min: 5, max: 200, step: 5, def: 30 }
  : { min: 10000, max: 100000, step: 5000, def: 50000 });
const switchUnit = (u: 'm' | 'px') => {
  if (unit.value === u) return;
  unit.value = u;
  size.value = sizeRange.value.def; // 切单位时把 size 重置为该量级的默认值
};

const resetAll = () => {
  visible.value = true;
  color.value = COLORS[0]; height.value = 100000; size.value = 50000; edgeCount.value = 4; unit.value = 'm';
  generateData();
};
const CODE_SAMPLE = `const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { id: 1, value: 500 } },
    // ... N 个点（properties.value 0~1000 用于柱体量值 / 柱高）
  ],
};

<Map :default-center="center" :default-zoom="12">
  <BarLayer
    :data="geojson"
    :color="'rgba(24,144,255,0.9)'"
    :height="100000"
    :size="50000"   <!-- unit='m' 时 size 单位是米 -->
    :edge-count="8"
    unit="m"        <!-- 切 unit='px' 时 size 应为像素量级（如 30），沿用 50000 会被视锥裁掉看不见 -->
  />
</Map>`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <BarLayer
          v-if="visible && supported"
          :data="barData"
          :color="color"
          :height="height"
          :size="size"
          :edge-count="edgeCount"
          :unit="unit"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>BarLayer</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('BarLayer') ? 'ok' : 'no'}`">{{ caps.has('BarLayer') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0 Visualization。柱状图层，批量绘制 GeoJSON 点（Point / MultiPoint）为 3D 柱体，properties.value 控制柱体量值 / 柱高。通过 setData 加载数据。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
        <p class="muted small">BarLayer 不支持鼠标拾取与事件（SDK 未实现 resolvePickIndex），无 enablePicked。</p>
      </section>

      <section>
        <h3>数据（北京城区随机点）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="regenerate">重新生成</button>
        </div>
        <p class="muted small">当前 {{ barData.features.length }} 个柱体；lng 116.3~116.5 / lat 39.9~40.05，properties.value 0~1000。data 变化时组件内部调用 setData()。</p>
      </section>

      <section>
        <h3>color（柱体颜色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: color === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="color = c">{{ c }}</button>
        </div>
      </section>

      <section>
        <h3>height（柱高基准）: {{ height }}</h3>
        <input type="range" min="20000" max="300000" step="10000" :value="height" @input="height = +($event.target as HTMLInputElement).value" class="full-width" />
        <p class="muted small">构造项变化 → 重建图层；柱体实际高度叠加 properties.value 量值。</p>
      </section>

      <section>
        <h3>size（柱体半径基准）: {{ size }} {{ unit }}</h3>
        <input type="range" :min="sizeRange.min" :max="sizeRange.max" :step="sizeRange.step" :value="size" @input="size = +($event.target as HTMLInputElement).value" class="full-width" />
        <p class="muted small">随 unit 联动：m 时 10000~100000（米），px 时 5~200（屏幕像素）。</p>
      </section>

      <section>
        <h3>edgeCount（棱数）: {{ edgeCount }}</h3>
        <input type="range" min="4" max="50" :value="edgeCount" @input="edgeCount = +($event.target as HTMLInputElement).value" class="full-width" />
        <p class="muted small">4 为四棱柱；调大（如 50）趋近圆柱。</p>
      </section>

      <section>
        <h3>unit（尺寸单位）</h3>
        <div class="btn-group">
          <button v-for="u in (['m', 'px'] as const)" :key="u" :class="{ active: unit === u }" style="font-size:11px" @click="switchUnit(u)">{{ u }}</button>
        </div>
        <p class="muted small">m：墨卡托米（物理尺寸随缩放基本不变）；px：屏幕像素（随缩放变化）。切到 px 时 size 会自动重置为像素量级（默认 30），避免沿用米单位的大数值被视锥裁掉看不见。</p>
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
