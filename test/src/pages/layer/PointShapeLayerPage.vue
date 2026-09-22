<script setup lang="ts">
/**
 * PointShapeLayer 测试页 — v4+。点形状图层。
 * 使用 2D 几何图形（圆形、方形、三角形、五角星等）渲染点数据。
 *
 * 组件方式：
 * <PointShapeLayer :style="{ shapeType: 2, size: 20, color: '#ff0000' }" :data="geojson" />
 */
import { computed, ref } from 'vue';
import { Map, PointShapeLayer, useCapabilities } from '@baidumap/vue-bmap';
import type { PointShapeStyle } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

// shapeType: 1=圆形 2=三角形 3=方形 4=菱形 5=六边形 7=五角星
const SHAPES = [
  { label: '1', type: 1 },
  { label: '2', type: 2 },
  { label: '3', type: 3 },
  { label: '4', type: 4 },
  { label: '5', type: 5 },
  { label: '7', type: 7 },
];

const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];

const DEMO_DATA = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { id: 1, name: '天安门' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.415, 39.910] }, properties: { id: 2, name: '故宫' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.397, 39.913] }, properties: { id: 3, name: '中山公园' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.417, 39.928] }, properties: { id: 4, name: '北海公园' } },
  ],
};

const caps = useCapabilities();
const supported = computed(() => caps.value.has('PointShapeLayer'));

const visible = ref(true);
const shapeIdx = ref(0);
const size = ref(20);
const color = ref(COLORS[0]);
const opacity = ref(1);
const strokeColor = ref('#ffffff');
const strokeWeight = ref(0);
const rotation = ref(0);

const style = computed<PointShapeStyle>(() => ({
  shapeType: SHAPES[shapeIdx.value].type,
  size: size.value,
  color: color.value,
  opacity: opacity.value,
  strokeColor: strokeColor.value,
  strokeWeight: strokeWeight.value,
  rotation: rotation.value,
}));

const STROKE_COLORS = ['#ffffff', '#000000', ...COLORS];

const resetAll = () => {
  visible.value = true; shapeIdx.value = 0; size.value = 20; color.value = COLORS[0];
  opacity.value = 1; strokeColor.value = '#ffffff'; strokeWeight.value = 0; rotation.value = 0;
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <PointShapeLayer
          v-if="visible && supported"
          id-key="id"
          :style="style"
          :data="DEMO_DATA"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>PointShapeLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。点形状图层，使用 2D 几何图形（圆形/方形/三角形/五角星等）渲染点数据。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>数据</h3>
        <p class="muted small">{{ DEMO_DATA.features.length }} 个点标注（天安门/故宫/中山公园/北海公园）。</p>
      </section>

      <section>
        <h3>shapeType（形状）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="(s, i) in SHAPES" :key="s.label" :class="{ active: shapeIdx === i }" style="font-size:11px" @click="shapeIdx = i">{{ s.label }}（{{ s.type }}）</button>
        </div>
      </section>

      <section>
        <h3>size: {{ size }}px</h3>
        <input type="range" min="5" max="100" :value="size" @input="size = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>color（填充色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: color === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="color = c">{{ c }}</button>
        </div>
      </section>

      <section>
        <h3>opacity: {{ opacity }}</h3>
        <input type="range" min="0" max="1" step="0.1" :value="opacity" @input="opacity = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>strokeColor（描边色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in STROKE_COLORS" :key="c" :class="{ active: strokeColor === c }" :style="{ fontSize: '10px', background: c, color: c === '#ffffff' ? '#333' : '#fff' }" @click="strokeColor = c">{{ c }}</button>
        </div>
      </section>

      <section>
        <h3>strokeWeight: {{ strokeWeight }}px</h3>
        <input type="range" min="0" max="10" :value="strokeWeight" @input="strokeWeight = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>rotation: {{ rotation }}°</h3>
        <input type="range" min="0" max="360" :value="rotation" @input="rotation = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
      </section>

      <section>
        <h3>代码示例</h3>
        <pre class="code-sample">&lt;Map :default-center="center" :default-zoom="14"&gt;
  &lt;PointShapeLayer
    id-key="id"
    :style="{
      shapeType: 2,  // 圆形
      size: 20,
      color: '#1890ff',
      opacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 2,
      rotation: 0,
    }"
    :data="{
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { id: 1 } },
      ],
    }"
  /&gt;
&lt;/Map&gt;</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
