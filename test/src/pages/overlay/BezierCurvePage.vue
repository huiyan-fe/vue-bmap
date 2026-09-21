<script setup lang="ts">
import { ref } from 'vue';
import { Map, BezierCurve, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const caps = useCapabilities();
const { eventLog, log } = useLog();
const path = ref([{ lng: 116.39, lat: 39.91 }, { lng: 116.43, lat: 39.91 }]);
const cp = ref([[{ lng: 116.41, lat: 39.935 }]]);
const strokeColor = ref('#722ed1');
const strokeWeight = ref(6);
const strokeOpacity = ref(1);
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="13" style="height:100%">
        <BezierCurve
          :path="path" :control-points="cp" :stroke-color="strokeColor"
          :stroke-weight="strokeWeight" :stroke-opacity="strokeOpacity"
          :onClick="() => log('➰ bezier.click')" :onMouseOver="() => log('➰ bezier.mouseover')"
        />
      </Map>
      <EventLog :log="eventLog" hint="与贝塞尔曲线交互触发事件" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>BezierCurve（全量） <span :class="`cap-tag ${caps.has('BezierCurve') ? 'ok' : 'no'}`">{{ caps.has('BezierCurve') ? 'v4+' : 'v3 ✗' }}</span></h2>
      <section><h3>strokeColor</h3><input type="color" :value="strokeColor" @input="strokeColor = ($event.target as HTMLInputElement).value" /></section>
      <section><h3>strokeWeight: {{ strokeWeight }}px</h3><input class="full-width" type="range" min="1" max="16" :value="strokeWeight" @input="strokeWeight = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>strokeOpacity: {{ strokeOpacity.toFixed(2) }}</h3><input class="full-width" type="range" min="0" max="1" step="0.05" :value="strokeOpacity" @input="strokeOpacity = +($event.target as HTMLInputElement).value" /></section>
      <section><h3>控制点 Y 偏移</h3>
        <input class="full-width" type="range" min="39.9" max="39.97" step="0.002" :value="cp[0][0].lat" @input="cp = [[{ lng: 116.41, lat: +($event.target as HTMLInputElement).value }]]" />
        <p class="muted small">二阶贝塞尔：每段一个控制点，controlPoints 组数 = path.length - 1。整类 @since 4.0。</p>
      </section>
    </div>
  </div>
</template>
