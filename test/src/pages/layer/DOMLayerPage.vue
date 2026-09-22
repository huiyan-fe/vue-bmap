<script setup lang="ts">
/**
 * DOMLayer 测试页 — v4+。自定义 DOM 覆盖物图层。
 * 通过 createDOM 回调创建自定义 DOM 元素，setData 加载 GeoJSON 数据。
 *
 * 组件方式：
 * <DOMLayer :create-d-o-m="(props, point) => { ... return HTMLElement; }" :data="geojson" />
 */
import { computed, ref } from 'vue';
import { Map, DOMLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const DEMO_DATA = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { name: '天安门' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.415, 39.910] }, properties: { name: '故宫' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.397, 39.913] }, properties: { name: '中山公园' } },
    { type: 'Feature', geometry: { type: 'Point', coordinates: [116.417, 39.928] }, properties: { name: '北海公园' } },
  ],
};

const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1'];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('DOMLayer'));

const visible = ref(true);
const colorIdx = ref(0);
const enableDraggingMap = ref(true);
const fontSize = ref(12);

// createDOM 变化时通过 key 重建图层（对齐 react）
const createDOM = (properties: any, _point: any) => {
  const div = document.createElement('div');
  const color = COLORS[colorIdx.value];
  const fs = fontSize.value;
  div.style.cssText = `background:${color};color:#fff;padding:${fs / 3}px ${fs * 0.6}px;border-radius:4px;font-size:${fs}px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;`;
  div.textContent = properties?.name ?? '';
  return div;
};

const layerKey = computed(() => `${colorIdx.value}|${fontSize.value}|${enableDraggingMap.value}`);

const resetAll = () => {
  visible.value = true; colorIdx.value = 0; enableDraggingMap.value = true; fontSize.value = 12;
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <DOMLayer
          v-if="visible && supported"
          :key="layerKey"
          :create-d-o-m="createDOM"
          :data="DEMO_DATA"
          :enable-dragging-map="enableDraggingMap"
          :min-zoom="5"
          :max-zoom="20"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>DOMLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。自定义 DOM 覆盖物图层，批量管理 DOM 覆盖物。通过 createDOM 回调创建自定义 DOM 元素。v3 不支持。</p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>数据</h3>
        <p class="muted small">{{ DEMO_DATA.features.length }} 个点标注（天安门/故宫/中山公园/北海公园），data 变化时调用 setData()。</p>
      </section>

      <section>
        <h3>createDOM 回调（DOM 样式）</h3>
        <div style="font-size:11px;font-weight:600;margin-bottom:4px">背景色</div>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="(c, i) in COLORS" :key="c" :class="{ active: colorIdx === i }" :style="{ fontSize: '10px', background: c, color: '#fff' }" @click="colorIdx = i">{{ c }}</button>
        </div>
        <label class="checkbox-row">fontSize: {{ fontSize }}px
          <input type="range" min="8" max="24" :value="fontSize" @input="fontSize = +($event.target as HTMLInputElement).value" />
        </label>
        <p class="muted small">createDOM 变化时重建图层（通过 key）。</p>
      </section>

      <section>
        <h3>enableDraggingMap</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="enableDraggingMap" />允许在 DOM 覆盖物上拖拽地图（重建）</label>
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
  &lt;DOMLayer
    :create-d-o-m="(properties, point) =&gt; {
      const div = document.createElement('div');
      div.style.cssText = 'background:#1890ff;color:#fff;padding:4px 8px;border-radius:4px;';
      div.textContent = properties.name;
      return div;
    }"
    :data="{
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [116.404, 39.915] }, properties: { name: '天安门' } },
      ],
    }"
    enable-dragging-map
  /&gt;
&lt;/Map&gt;</pre>
      </section>

      <section>
        <h3>SDK 实例方法</h3>
        <p class="muted small">
          组件内部支持：createDOM → constructor, data → setData()<br />
          其他方法：show() / hide() / setStyleOptions() / removeAllOverlays() / removeOverlay()<br />
          事件：click / mouseover / mouseout
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
