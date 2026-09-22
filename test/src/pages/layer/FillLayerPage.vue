<script setup lang="ts">
/**
 * FillLayer 测试页 — v4+。面填充图层。
 * 支持 setData（GeoJSON 数据）、setStyleOptions（运行时样式更新）。
 *
 * 组件方式：
 * <FillLayer border :style="{ fillColor, strokeColor }" :data="geojson" enable-picked />
 */
import { computed, ref } from 'vue';
import { Map, FillLayer, useCapabilities } from '@baidumap/vue-bmap';
import type { FillLayerStyle } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

// demo GeoJSON — 多边形
const POLYGON_DATA = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[116.395, 39.910], [116.410, 39.910], [116.410, 39.920], [116.395, 39.920], [116.395, 39.910]]] },
      properties: { id: 1, name: '区域A' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[116.415, 39.915], [116.430, 39.915], [116.430, 39.925], [116.415, 39.925], [116.415, 39.915]]] },
      properties: { id: 2, name: '区域B' },
    },
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[116.380, 39.900], [116.390, 39.900], [116.390, 39.910], [116.380, 39.910], [116.380, 39.900]]] },
      properties: { id: 3, name: '区域C' },
    },
  ],
};

const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('FillLayer'));

const visible = ref(true);
const border = ref(true);
const enablePicked = ref(true);
const fillColor = ref('rgba(24, 144, 255, 0.4)');
const borderWeight = ref(2);
const borderColor = ref('#1890ff');
const strokeColor = ref('#1890ff');
const strokeWeight = ref(2);
const strokeStyle = ref<'solid' | 'dashed' | 'dotted'>('solid');
const opacity = ref(1);

const style = computed<FillLayerStyle>(() => ({
  fillColor: fillColor.value,
  fillOpacity: opacity.value,
  borderWeight: borderWeight.value,
  borderColor: borderColor.value,
  strokeColor: strokeColor.value,
  strokeWeight: strokeWeight.value,
  strokeStyle: strokeStyle.value,
}));

const resetAll = () => {
  visible.value = true; border.value = true; enablePicked.value = true;
  fillColor.value = 'rgba(24, 144, 255, 0.4)'; borderWeight.value = 2; borderColor.value = '#1890ff';
  strokeColor.value = '#1890ff'; strokeWeight.value = 2; strokeStyle.value = 'solid'; opacity.value = 1;
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="13" style="height:100%">
        <FillLayer
          v-if="visible && supported"
          :border="border"
          :enable-picked="enablePicked"
          id-key="id"
          :style="style"
          :data="POLYGON_DATA"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>FillLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。面填充图层，支持纯色填充、描边、纹理填充。通过 setData 加载 GeoJSON 数据。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>数据</h3>
        <p class="muted small">{{ POLYGON_DATA.features.length }} 个多边形（区域 A/B/C），data 变化时组件内部调用 setData()。</p>
      </section>

      <section>
        <h3>border</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="border" />显示描边（重建）</label>
      </section>

      <section>
        <h3>enablePicked</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="enablePicked" />允许鼠标点击拾取（重建）</label>
      </section>

      <section>
        <h3>fillColor（填充色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: fillColor.includes(c) }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="fillColor = `${c}66`">{{ c }}</button>
        </div>
        <p class="muted small">style 变化时调用 setStyleOptions() + doOnceDraw()，实时更新。</p>
      </section>

      <section>
        <h3>borderWeight: {{ borderWeight }}（填充区描边宽度）</h3>
        <input type="range" min="0" max="10" :value="borderWeight" @input="borderWeight = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>borderColor（填充区描边色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: borderColor === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="borderColor = c">{{ c }}</button>
        </div>
        <p class="muted small">dotted 仅 v4+ 支持，v3 无效</p>
      </section>

      <section>
        <h3>strokeColor（轮廓线色）</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="c in COLORS" :key="c" :class="{ active: strokeColor === c }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="strokeColor = c">{{ c }}</button>
        </div>
        <p class="muted small">dotted 仅 v4+ 支持，v3 无效</p>
      </section>

      <section>
        <h3>strokeWeight: {{ strokeWeight }}</h3>
        <input type="range" min="0" max="10" :value="strokeWeight" @input="strokeWeight = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>strokeStyle</h3>
        <div class="btn-group">
          <button v-for="s in (['solid', 'dashed', 'dotted'] as const)" :key="s" :class="{ active: strokeStyle === s }" style="font-size:11px" @click="strokeStyle = s">{{ s }}</button>
        </div>
        <p class="muted small">dotted 仅 v4+ 支持，v3 无效</p>
      </section>

      <section>
        <h3>fillOpacity: {{ opacity }}</h3>
        <input type="range" min="0" max="1" step="0.1" :value="opacity" @input="opacity = +($event.target as HTMLInputElement).value" class="full-width" />
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
        <p class="muted small">dotted 仅 v4+ 支持，v3 无效</p>
      </section>

      <section>
        <h3>代码示例</h3>
        <pre class="code-sample">const geojson = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[...]]] }, properties: { id: 1 } },
  ],
};

&lt;Map :default-center="center" :default-zoom="13"&gt;
  &lt;FillLayer
    border
    enable-picked
    id-key="id"
    :style="{
      fillColor: 'rgba(24, 144, 255, 0.4)',
      strokeColor: '#1890ff',
      strokeWeight: 2,
      strokeStyle: 'solid',
    }"
    :data="geojson"
  /&gt;
&lt;/Map&gt;</pre>
      </section>

      <section>
        <h3>SDK 实例方法</h3>
        <p class="muted small">
          组件内部支持：data → setData()、style → setStyleOptions() + doOnceDraw()<br />
          其他方法（需通过 driver 获取 raw 实例）：<br />
          • updateState(keys, params) — 更新要素状态<br />
          • removeState(keys) / clearState() — 移除/清空状态<br />
          • setBaseOptions(opts) — 更新基础配置<br />
          • setVisible(v) / setOpacity(v) / setZIndex(z)<br />
          • addDelIndex(i) / removeDelIndex(i) — 隐藏/显示指定索引<br />
          • 事件：click / dblclick / mousemove / mouseout / dataparsed
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
