<script setup lang="ts">
import { ref } from 'vue';
import { Map, Polyline, useCapabilities } from '@baidumap/vue-bmap';
import type { Point } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log, fmt } = useLog();
const DEFAULT: Point[] = [{ lng: 116.399, lat: 39.91 }, { lng: 116.405, lat: 39.92 }, { lng: 116.415, lat: 39.915 }, { lng: 116.422, lat: 39.925 }];
const path = ref<Point[]>(DEFAULT.map((p) => ({ ...p })));
const strokeColor = ref('#1890ff');
const strokeWeight = ref(4);
const strokeOpacity = ref(1);
const strokeStyle = ref<'solid' | 'dashed' | 'dotted'>('solid');
const enableEditing = ref(false);
const visible = ref(true);
const on = (name: string) => (pt: any) => log(`🟣 polyline.${name}${pt ? ' @ ' + fmt(pt) : ''}`);
const addPt = () => { const last = path.value[path.value.length - 1]; path.value = [...path.value, { lng: last.lng + 0.005, lat: last.lat + 0.003 }]; };
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <Polyline
          :path="path" :stroke-color="strokeColor" :stroke-weight="strokeWeight" :stroke-opacity="strokeOpacity"
          :stroke-style="strokeStyle" :enable-editing="enableEditing" :visible="visible"
          :onClick="on('click')" :onDoubleClick="on('dblclick')" :onRightClick="on('rightclick')"
          :onMouseOver="on('mouseover')" :onMouseOut="on('mouseout')" :onLineUpdate="() => log('🟣 polyline.lineupdate')"
        />
      </Map>
      <EventLog :log="eventLog" hint="与折线交互触发事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>Polyline（全量）</h2>
      <section><h3>能力</h3><div class="cap-grid"><div :class="`cap-cell ${caps.has('Polyline') ? 'ok' : 'no'}`">Polyline</div></div></section>
      <section><h3>strokeColor</h3><input type="color" :value="strokeColor" @input="strokeColor = ($event.target as HTMLInputElement).value" /> <span style="font-family:monospace">{{ strokeColor }}</span></section>
      <section><h3>strokeWeight: {{ strokeWeight }}px</h3><input class="full-width" type="range" min="1" max="20" :value="strokeWeight" @input="strokeWeight = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>strokeOpacity: {{ strokeOpacity.toFixed(2) }}</h3><input class="full-width" type="range" min="0" max="1" step="0.05" :value="strokeOpacity" @input="strokeOpacity = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>strokeStyle</h3><div class="btn-group"><button v-for="s in ['solid','dashed','dotted']" :key="s" :class="{ active: strokeStyle === s }" @click="strokeStyle = s as any">{{ s }}</button></div><p class="muted small">dotted 仅 v4+</p></section>
      <section><h3>行为开关</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="enableEditing" />enableEditing（拖拽顶点）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />visible</label>
      </section>
      <section><h3>动作</h3><div class="btn-group">
        <button @click="path = DEFAULT.map((p) => ({ ...p }))">reset path</button>
        <button @click="addPt">添加点</button>
      </div></section>
      <section><h3>预设样式</h3><div class="btn-group">
        <button @click="strokeColor = '#ff0000'; strokeWeight = 6; strokeStyle = 'solid'">红色实线</button>
        <button @click="strokeColor = '#00aa00'; strokeWeight = 3; strokeStyle = 'dashed'">绿色虚线</button>
        <button @click="strokeColor = '#1890ff'; strokeWeight = 8; strokeOpacity = 0.5">半透明粗线</button>
      </div></section>
    </div>
  </div>
</template>
