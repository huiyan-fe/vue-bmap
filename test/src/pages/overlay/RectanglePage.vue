<script setup lang="ts">
import { ref } from 'vue';
import { Map, Rectangle, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log, fmt } = useLog();
const bounds = ref({ sw: { lng: 116.38, lat: 39.9 }, ne: { lng: 116.43, lat: 39.93 } });
const strokeColor = ref('#52c41a');
const fillColor = ref('#52c41a');
const fillOpacity = ref(0.25);
const strokeWeight = ref(3);
const enableEditing = ref(false);
const visible = ref(true);
const on = (n: string) => (pt: any) => log(`▭ rectangle.${n}${pt ? ' @ ' + fmt(pt) : ''}`);
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="13" style="height:100%">
        <Rectangle
          :bounds="bounds" :stroke-color="strokeColor" :fill-color="fillColor" :fill-opacity="fillOpacity"
          :stroke-weight="strokeWeight" :enable-editing="enableEditing" :visible="visible"
          :onClick="on('click')" :onMouseOver="on('mouseover')" :onLineUpdate="() => log('▭ rectangle.lineupdate')"
        />
      </Map>
      <EventLog :log="eventLog" hint="与矩形交互触发事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>Rectangle（全量） <span :class="`cap-tag ${caps.has('Rectangle') ? 'ok' : 'no'}`">{{ caps.has('Rectangle') ? 'v4+' : 'v3 ✗' }}</span></h2>
      <section><h3>strokeColor</h3><input type="color" :value="strokeColor" @input="strokeColor = ($event.target as HTMLInputElement).value" /></section>
      <section><h3>fillColor</h3><input type="color" :value="fillColor" @input="fillColor = ($event.target as HTMLInputElement).value" /></section>
      <section><h3>fillOpacity: {{ fillOpacity.toFixed(2) }}</h3><input class="full-width" type="range" min="0" max="1" step="0.05" :value="fillOpacity" @input="fillOpacity = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>strokeWeight: {{ strokeWeight }}px</h3><input class="full-width" type="range" min="1" max="12" :value="strokeWeight" @input="strokeWeight = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>行为开关</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="enableEditing" />enableEditing</label>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />visible</label>
      </section>
      <p class="muted small">Rectangle 整个类 @since 4.0，3.0 下不渲染。</p>
    </div>
  </div>
</template>
