<script setup lang="ts">
/**
 * FlyLineLayer 测试页 — v4+ Visualization。飞线图层。
 * 支持 setData（GeoJSON 线数据）、mode（arc 首末点弧线 / path 全点折线）、线样式与流动动画参数。
 * 注意：FlyLineLayer 不支持鼠标拾取（SDK 未实现 resolvePickIndex），无点击/悬停事件。
 *
 * 组件方式：
 * <FlyLineLayer :data="geojson" stroke-color="#ff471a" :stroke-weight="4" mode="arc" :arc-height="0.2" :curvature="0.15" :animation="true" :duration="2" />
 */
import { computed, ref } from 'vue';
import { Map, FlyLineLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const LINE_COUNT = 6;
const LINE_NAMES = ['长安街', '二环', '三环', '四环', '中轴线', '平安大街'];
const COLORS = ['#ff471a', '#1890ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('FlyLineLayer'));

const visible = ref(true);

// ─── 数据生成：北京城区 6 条随机线段（LineString features，properties.name） ───
const lineData = ref<any>({ type: 'FeatureCollection', features: [] });

const generateData = () => {
  const features = Array.from({ length: LINE_COUNT }, (_, i) => {
    const n = 2 + Math.floor(Math.random() * 3); // 2~4 个点（arc 取首末，path 用全部）
    const coordinates = Array.from({ length: n }, () => [116.3 + Math.random() * 0.2, 39.9 + Math.random() * 0.15]);
    return {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: { id: i, name: LINE_NAMES[i % LINE_NAMES.length] },
    };
  });
  lineData.value = { type: 'FeatureCollection', features };
};
generateData();

const regenerate = () => { generateData(); };

// ─── 样式 / 动画 ───
const strokeColor = ref(COLORS[0]);
const strokeWeight = ref(4);
const mode = ref<'arc' | 'path'>('arc');
const arcHeight = ref(0.2);
const curvature = ref(0.15);
const animation = ref(true);
const duration = ref(2);

const resetAll = () => {
  visible.value = true;
  strokeColor.value = COLORS[0]; strokeWeight.value = 4;
  mode.value = 'arc'; arcHeight.value = 0.2; curvature.value = 0.15;
  animation.value = true; duration.value = 2;
  generateData();
};

const CODE_SAMPLE = `const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'LineString', coordinates: [[116.35, 39.9], [116.45, 40.0]] }, properties: { id: 1, name: '线1' } },
    // ... N 条线
  ],
};

<Map :default-center="center" :default-zoom="12">
  <FlyLineLayer
    :data="geojson"
    stroke-color="#ff471a"
    :stroke-weight="4"
    mode="arc"
    :arc-height="0.2"
    :curvature="0.15"
    :animation="true"
    :duration="2"
  />
</Map>`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <FlyLineLayer
          v-if="visible && supported"
          :data="lineData"
          :stroke-color="strokeColor"
          :stroke-weight="strokeWeight"
          :mode="mode"
          :arc-height="arcHeight"
          :curvature="curvature"
          :animation="animation"
          :duration="duration"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>FlyLineLayer</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('FlyLineLayer') ? 'ok' : 'no'}`">{{ caps.has('FlyLineLayer') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0 Visualization。飞线图层，批量绘制 GeoJSON 线（LineString）为带流动粒子的弧线 / 折线。通过 setData 加载数据。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
        <p class="muted small">FlyLineLayer 不支持鼠标拾取与事件（SDK 未实现 resolvePickIndex），无 enablePicked。</p>
      </section>

      <section>
        <h3>数据（北京城区随机线段）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="regenerate">重新生成</button>
        </div>
        <p class="muted small">当前 {{ lineData.features.length }} 条线，每条 2~4 个点；lng 116.3~116.5 / lat 39.9~40.05，properties 带 id/name。data 变化时组件内部调用 setData()。</p>
      </section>

      <section>
        <h3>strokeColor（线颜色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: strokeColor === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="strokeColor = c">{{ c }}</button>
        </div>
      </section>

      <section>
        <h3>strokeWeight（线宽）: {{ strokeWeight }}px</h3>
        <input type="range" min="1" max="20" :value="strokeWeight" @input="strokeWeight = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>mode（轨迹形态）</h3>
        <div class="btn-group">
          <button v-for="m in (['arc', 'path'] as const)" :key="m" :class="{ active: mode === m }" style="font-size:11px" @click="mode = m">{{ m }}</button>
        </div>
        <p class="muted small">arc：取每条线首末两点生成弧线；path：原样使用所有点作为折线只叠加高度。</p>
      </section>

      <section>
        <h3>arcHeight（弧顶高度）: {{ arcHeight.toFixed(2) }}</h3>
        <input type="range" min="0" max="0.8" step="0.01" :value="arcHeight" @input="arcHeight = +($event.target as HTMLInputElement).value" class="full-width" />
        <p class="muted small">弧顶高度占首末点直线距离的比例；0 即贴地不抬升。</p>
      </section>

      <section>
        <h3>curvature（水平弯曲）: {{ curvature.toFixed(2) }}</h3>
        <input type="range" min="0" max="0.5" step="0.01" :value="curvature" @input="curvature = +($event.target as HTMLInputElement).value" class="full-width" />
        <p class="muted small">控制点沿垂线偏移占直线距离的比例；0 即不弯。</p>
      </section>

      <section>
        <h3>animation（流动动画）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="animation" />粒子沿线流动（关闭退化为静态弧线层）</label>
      </section>

      <section>
        <h3>duration（一圈秒数）: {{ duration }}s</h3>
        <input type="range" min="1" max="10" step="0.5" :value="duration" @input="duration = +($event.target as HTMLInputElement).value" class="full-width" />
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
