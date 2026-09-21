<script setup lang="ts">
import { ref } from 'vue';
import { Map, Circle, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log, fmt } = useLog();
const radius = ref(800);
const strokeColor = ref('#1890ff');
const fillColor = ref('#1890ff');
const fillOpacity = ref(0.3);
const strokeWeight = ref(3);
const enableEditing = ref(false);
const visible = ref(true);
const on = (n: string) => (pt: any) => log(`⭕ circle.${n}${pt ? ' @ ' + fmt(pt) : ''}`);
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="13" style="height:100%">
        <Circle
          :center="BEIJING" :radius="radius" :stroke-color="strokeColor" :fill-color="fillColor"
          :fill-opacity="fillOpacity" :stroke-weight="strokeWeight" :enable-editing="enableEditing" :visible="visible"
          :onClick="on('click')" :onMouseOver="on('mouseover')" :onMouseOut="on('mouseout')" :onLineUpdate="() => log('⭕ circle.lineupdate')"
        />
      </Map>
      <EventLog :log="eventLog" hint="与圆交互触发事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>Circle（全量）</h2>
      <section><h3>能力</h3><div class="cap-grid"><div :class="`cap-cell ${caps.has('Circle') ? 'ok' : 'no'}`">Circle</div></div></section>
      <section><h3>radius: {{ radius }} 米</h3><input class="full-width" type="range" min="100" max="5000" step="50" :value="radius" @input="radius = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>strokeColor</h3><input type="color" :value="strokeColor" @input="strokeColor = ($event.target as HTMLInputElement).value" /></section>
      <section><h3>fillColor</h3><input type="color" :value="fillColor" @input="fillColor = ($event.target as HTMLInputElement).value" /></section>
      <section><h3>fillOpacity: {{ fillOpacity.toFixed(2) }}</h3><input class="full-width" type="range" min="0" max="1" step="0.05" :value="fillOpacity" @input="fillOpacity = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>strokeWeight: {{ strokeWeight }}px</h3><input class="full-width" type="range" min="1" max="12" :value="strokeWeight" @input="strokeWeight = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>行为开关</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="enableEditing" />enableEditing（半径可拖）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />visible</label>
      </section>
    </div>
  </div>
</template>
