<script setup lang="ts">
import { computed } from 'vue';
import { useDriver, useCapabilities } from '@baidumap/vue-bmap';

const driver = useDriver();
const caps = useCapabilities();

const PROBES = ['Map', 'Marker', 'Label', 'Polyline', 'Polygon', 'Circle', 'Rectangle', 'BezierCurve', 'Prism', 'Marker3D', 'GroundOverlay', 'PointCollection', 'Map.flyTo', 'Map.enableMapClick', 'MVTLayer', 'TrafficLayer'];
const list = computed(() => PROBES.map((cap) => ({ cap, ok: caps.value.has(cap) })));
</script>

<template>
  <div style="padding: 24px; overflow: auto; height: 100%">
    <h2>Capabilities</h2>
    <p style="color:#666">version: <b>{{ driver?.version ?? '—' }}</b>　能力总数: <b>{{ caps.size }}</b>　unsupportedBehavior: <b>{{ driver?.unsupportedBehavior ?? '—' }}</b></p>
    <p style="color:#888;font-size:13px">切换右上角版本可对比 3.0 / 4.0 的能力差异。</p>
    <table style="border-collapse: collapse; font-size: 13px; margin-top: 12px">
      <tr v-for="row in list" :key="row.cap" style="border-bottom: 1px solid #eee">
        <td style="padding: 4px 16px 4px 0; font-family: monospace">{{ row.cap }}</td>
        <td :style="{ color: row.ok ? '#16a34a' : '#dc2626' }">{{ row.ok ? '✓ 支持' : '✗ 不支持' }}</td>
      </tr>
    </table>
  </div>
</template>
