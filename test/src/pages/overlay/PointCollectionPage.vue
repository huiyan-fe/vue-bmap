<script setup lang="ts">
import { ref, computed } from 'vue';
import { Map, PointCollection, useCapabilities, BMAP_POINT_SHAPE_CIRCLE } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log, fmt } = useLog();
const count = ref(100);
const color = ref('#fa937e');
const size = ref(8);
const points = computed(() => Array.from({ length: count.value }, () => ({
  lng: 116.35 + Math.random() * 0.12, lat: 39.86 + Math.random() * 0.1,
})));
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <PointCollection
          :points="points" :shape="BMAP_POINT_SHAPE_CIRCLE" :color="color" :size="size"
          :onClick="(pt: any) => log(`🔵 pointCollection.click @ ${fmt(pt)}`)"
          :onMouseOver="() => log('🔵 pointCollection.mouseover')"
        />
      </Map>
      <EventLog :log="eventLog" hint="海量点：点击 / 悬停触发事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>PointCollection（全量）</h2>
      <section><h3>能力 <span :class="`cap-tag ${caps.has('PointCollection') ? 'ok' : 'no'}`">{{ caps.has('PointCollection') ? '3.0' : 'v4 移除' }}</span></h3><p class="muted small">海量点，@removed 4.0（仅 3.0 可用）。</p></section>
      <section><h3>点数: {{ count }}</h3><input class="full-width" type="range" min="10" max="1000" step="10" :value="count" @input="count = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>color</h3><input type="color" :value="color" @input="color = ($event.target as HTMLInputElement).value" /></section>
      <section><h3>size: {{ size }}</h3><input class="full-width" type="range" min="2" max="30" :value="size" @input="size = +($event.target as HTMLInputElement).value" /></section>
    </div>
  </div>
</template>
