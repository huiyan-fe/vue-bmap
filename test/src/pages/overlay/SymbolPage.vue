<script setup lang="ts">
import { ref, computed } from 'vue';
import { Map, Marker, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log } = useLog();
const PATHS: Record<string, string> = {
  五角星: 'M 0,-10 L 2.9,-3.1 L 10,-3.1 L 4,1.6 L 6.5,9.5 L 0,4.5 L -6.5,9.5 L -4,1.6 L -10,-3.1 L -2.9,-3.1 Z',
  三角形: 'M 0,-10 L 10,10 L -10,10 Z',
  菱形: 'M 0,-10 L 10,0 L 0,10 L -10,0 Z',
};
const shape = ref('五角星');
const fillColor = ref('#f5222d');
const scale = ref(2);
const rotation = ref(0);
const icon = computed(() => ({ symbol: { path: PATHS[shape.value], fillColor: fillColor.value, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: scale.value, rotation: rotation.value } }));
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <Marker :position="BEIJING" :icon="icon" :onClick="() => log('★ marker(symbol).click')" />
      </Map>
      <EventLog :log="eventLog" hint="Symbol 作为 Marker 的 icon" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>Symbol（矢量图标值对象）</h2>
      <section><h3>能力</h3><div class="cap-grid"><div :class="`cap-cell ${caps.has('Symbol') ? 'ok' : 'no'}`">Symbol</div></div></section>
      <section><h3>形状</h3><div class="btn-group"><button v-for="(_, k) in PATHS" :key="k" :class="{ active: shape === k }" @click="shape = k as string">{{ k }}</button></div></section>
      <section><h3>fillColor</h3><input type="color" :value="fillColor" @input="fillColor = ($event.target as HTMLInputElement).value" /></section>
      <section><h3>scale: {{ scale.toFixed(1) }}</h3><input class="full-width" type="range" min="0.5" max="5" step="0.1" :value="scale" @input="scale = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>rotation: {{ rotation }}°</h3><input class="full-width" type="range" min="0" max="360" :value="rotation" @input="rotation = +($event.target as HTMLInputElement).value" /></section>
      <p class="muted small">Symbol 是值对象（非 Overlay），传给 Marker 的 icon（`{ symbol: {...} }`）。</p>
    </div>
  </div>
</template>
