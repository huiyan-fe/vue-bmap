<script setup lang="ts">
import { ref, computed } from 'vue';
import { Map, Marker, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log } = useLog();
const URLS: Record<string, string> = {
  示例图标: 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_1.png',
  雪碧图: 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_all.png',
};
const which = ref('示例图标');
const w = ref(40);
const h = ref(40);
const sprite = ref(false);
const icon = computed(() => {
  const base: any = { url: URLS[which.value], size: { width: w.value, height: h.value } };
  if (sprite.value && which.value === '雪碧图') {
    base.imageOffset = { width: w.value, height: 0 };
    base.imageSize = { width: w.value * 3, height: h.value * 3 };
  }
  return base;
});
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <Marker :position="BEIJING" :icon="icon" :onClick="() => log('🖼️ marker(icon).click')" />
      </Map>
      <EventLog :log="eventLog" hint="Icon 作为 Marker 的 icon" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>Icon（图标值对象）</h2>
      <section><h3>能力</h3><div class="cap-grid"><div :class="`cap-cell ${caps.has('Icon') ? 'ok' : 'no'}`">Icon</div></div></section>
      <section><h3>图片</h3><div class="btn-group"><button v-for="(_, k) in URLS" :key="k" :class="{ active: which === k }" @click="which = k as string">{{ k }}</button></div></section>
      <section><h3>尺寸 W×H</h3><div class="input-row"><input type="number" v-model.number="w" /><input type="number" v-model.number="h" /></div></section>
      <section v-if="which === '雪碧图'"><label class="checkbox-row"><input type="checkbox" v-model="sprite" />CSS Sprites 切图（imageOffset + imageSize）</label></section>
      <p class="muted small">Icon 是值对象；用 plain `{ url, size }` 即可，框架自动转 SDK Icon 实例。</p>
    </div>
  </div>
</template>
