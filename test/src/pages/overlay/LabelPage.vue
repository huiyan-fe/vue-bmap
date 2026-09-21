<script setup lang="ts">
import { ref, computed } from 'vue';
import { Map, Label, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log } = useLog();
const content = ref('天安门');
const color = ref('#1890ff');
const bg = ref('#ffffff');
const fontSize = ref(16);
const opacity = ref(1);
const visible = ref(true);
// 与 react-bmap 一致的 styles 结构（border 简写 + whiteSpace）
const styles = computed<Record<string, string | number>>(() => ({
  color: color.value,
  fontSize: `${fontSize.value}px`,
  border: '1px solid #ccc',
  padding: '4px 10px',
  borderRadius: '4px',
  backgroundColor: bg.value,
  whiteSpace: 'nowrap',
}));
// BMapGL 的 Label 对 color/backgroundColor 基本只在构造期生效，运行时 setStyles 不重绘这些属性。
// 用 styles 的序列化做 key：样式变化时重建 Label，新实例在构造期吃到新颜色/背景 → 立即生效。
const stylesKey = computed(() => JSON.stringify(styles.value));
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="13" style="height:100%">
        <Label
          :key="stylesKey"
          :position="BEIJING" :content="content" :styles="styles" :opacity="opacity" :visible="visible"
          :offset="{ width: 0, height: -30 }"
          :onClick="() => log('🏷️ label.click')" :onMouseOver="() => log('🏷️ label.mouseover')"
        />
      </Map>
      <EventLog :log="eventLog" hint="与文本标注交互触发事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>Label（全量）</h2>
      <section><h3>能力</h3><div class="cap-grid"><div :class="`cap-cell ${caps.has('Label') ? 'ok' : 'no'}`">Label</div></div></section>
      <section><h3>content</h3><input class="full-width" type="text" v-model="content" /></section>
      <section><h3>字体颜色 / 背景</h3><div class="input-row"><input type="color" v-model="color" /><input type="color" v-model="bg" /></div></section>
      <section><h3>fontSize: {{ fontSize }}px</h3><input class="full-width" type="range" min="10" max="32" :value="fontSize" @input="fontSize = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>opacity: {{ opacity.toFixed(2) }}</h3><input class="full-width" type="range" min="0" max="1" step="0.05" :value="opacity" @input="opacity = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>行为</h3><label class="checkbox-row"><input type="checkbox" v-model="visible" />visible</label></section>
      <p class="muted small">styles 为 CSS 键值对，直接作用在 SDK 生成的 DOM 上。GL Label 的 color/backgroundColor 仅构造期生效，本页在样式变化时用 key 重建以即时预览。</p>
    </div>
  </div>
</template>
