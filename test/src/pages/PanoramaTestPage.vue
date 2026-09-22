<script setup lang="ts">
import { computed, ref } from 'vue';
import { Panorama, PanoramaLabel, useCapabilities } from '@baidumap/vue-bmap';
import type { PanoramaRef } from '@baidumap/vue-bmap';
import { BEIJING } from '../TestProvider';
import { useLog } from './overlay/useLog';

const PRESET_POINTS = [
  { label: '北京天安门', lng: 116.404, lat: 39.915 },
  { label: '上海外滩', lng: 121.490, lat: 31.236 },
  { label: '杭州西湖', lng: 120.155, lat: 30.274 },
  { label: '成都春熙路', lng: 104.083, lat: 30.658 },
];

const caps = useCapabilities();
const supported = computed(() => caps.value.has('Panorama'));
const point = ref({ ...BEIJING });
const altitude = ref(5);
const labelText = ref('天安门');
const heading = ref(0);
const pitch = ref(0);
const zoom = ref(1);
const navigationControl = ref(true);
const linksControl = ref(true);
const displayDistance = ref(true);
const labelColor = ref('#ff4d4f');
const visible = ref(true);
const scrollZoom = ref(true);
const posInfo = ref('');
const { eventLog, log: addLog } = useLog();

// <Panorama> 模板 ref：通过 expose 的 getPanoramaRef() 拿命令式句柄
const panoRef = ref<{ getPanoramaRef: () => PanoramaRef | null } | null>(null);

const readState = () => {
  const r = panoRef.value?.getPanoramaRef?.();
  if (!r) { addLog('⚠️ ref 未就绪'); return; }
  const pos = r.getPosition();
  const pv = r.getPov();
  addLog(`📖 id=${r.getId()} pos=${pos ? `${pos.lng.toFixed(4)},${pos.lat.toFixed(4)}` : '—'} pov=${pv ? `${Math.round(pv.heading)}/${Math.round(pv.pitch ?? 0)}` : '—'} zoom=${r.getZoom()} scene=${r.getSceneType()}`);
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Panorama
        ref="panoRef"
        :point="point"
        :pov="{ heading, pitch }"
        :zoom="zoom"
        :visible="visible"
        :enable-scroll-wheel-zoom="scrollZoom"
        :options="{ navigationControl, linksControl }"
        style="height:100%;width:100%"
        :onPositionChange="(pt: any) => { posInfo = `${pt.lng.toFixed(4)}, ${pt.lat.toFixed(4)}`; addLog('📍 position_changed'); }"
        :onPovChange="() => addLog('🔄 pov_changed')"
        :onLinksChange="() => addLog('🛣️ links_changed')"
        :onZoomChange="(z: number) => addLog(`🔍 zoom_changed: ${z}`)"
      >
        <PanoramaLabel
          :position="point"
          :altitude="altitude"
          :content="labelText"
          :display-distance="displayDistance"
          :custom-style="{ color: labelColor }"
          :onClick="() => addLog(`🏷️ label click: ${labelText}`)"
        />
      </Panorama>
    </div>
    <div class="test-controls">
      <h2>Panorama + PanoramaLabel</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? '支持' : '不支持' }}</span>
        <p class="muted small">全景视图独立于 &lt;Map&gt;，有自己的 DOM 容器。需要 AK 全景服务权限。</p>
      </section>

      <section>
        <h3>预设位置</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button
            v-for="p in PRESET_POINTS"
            :key="p.label"
            :class="point.lng === p.lng && point.lat === p.lat ? 'active' : ''"
            @click="point = { lng: p.lng, lat: p.lat }; labelText = p.label"
            :disabled="!supported"
          >
            {{ p.label }}
          </button>
        </div>
      </section>

      <section>
        <h3>坐标</h3>
        <div class="input-row">
          <input type="number" step="0.001" :value="point.lng" @input="point = { ...point, lng: Number(($event.target as HTMLInputElement).value) }" style="width:100px" />
          <input type="number" step="0.001" :value="point.lat" @input="point = { ...point, lat: Number(($event.target as HTMLInputElement).value) }" style="width:100px" />
        </div>
      </section>

      <section>
        <h3>标注</h3>
        <div class="input-row">
          <input type="text" v-model="labelText" placeholder="标注文字" />
        </div>
        <div class="input-row" style="margin-top:4px">
          <label style="font-size:12px">altitude: {{ altitude }}</label>
          <input type="range" min="0" max="50" :value="altitude" @input="altitude = Number(($event.target as HTMLInputElement).value)" />
        </div>
        <div class="input-row" style="margin-top:4px;gap:8px">
          <label style="font-size:12px"><input type="checkbox" v-model="displayDistance" /> displayDistance</label>
          <label style="font-size:12px">color <input type="color" v-model="labelColor" /></label>
        </div>
        <p class="muted small">点击全景内的标注会触发 onClick（见事件日志）</p>
      </section>

      <section>
        <h3>视角 / 缩放（pov / zoom）</h3>
        <div class="input-row" style="margin-top:4px">
          <label style="font-size:12px">heading: {{ heading }}</label>
          <input type="range" min="0" max="360" :value="heading" @input="heading = Number(($event.target as HTMLInputElement).value)" />
        </div>
        <div class="input-row" style="margin-top:4px">
          <label style="font-size:12px">pitch: {{ pitch }}</label>
          <input type="range" min="-90" max="90" :value="pitch" @input="pitch = Number(($event.target as HTMLInputElement).value)" />
        </div>
        <div class="input-row" style="margin-top:4px">
          <label style="font-size:12px">zoom: {{ zoom }}</label>
          <input type="range" min="0" max="5" step="0.5" :value="zoom" @input="zoom = Number(($event.target as HTMLInputElement).value)" />
        </div>
      </section>

      <section>
        <h3>控件配置（options）</h3>
        <div class="input-row" style="gap:8px">
          <label style="font-size:12px"><input type="checkbox" v-model="navigationControl" /> navigationControl</label>
          <label style="font-size:12px"><input type="checkbox" v-model="linksControl" /> linksControl</label>
        </div>
        <div class="input-row" style="gap:8px;margin-top:4px">
          <label style="font-size:12px"><input type="checkbox" v-model="visible" /> visible</label>
          <label style="font-size:12px"><input type="checkbox" v-model="scrollZoom" /> scrollWheelZoom</label>
        </div>
      </section>

      <section>
        <h3>命令式句柄（ref）</h3>
        <button @click="readState" :disabled="!supported">读取当前 id / 位置 / 视角 / zoom / 场景类型</button>
      </section>

      <section>
        <h3>状态</h3>
        <ul class="state-list">
          <li>当前位置: <code>{{ posInfo || '—' }}</code></li>
          <li>标注: <code>{{ labelText }}</code> (alt={{ altitude }})</li>
          <li>视角: <code>heading={{ heading }} pitch={{ pitch }}</code> zoom={{ zoom }}</li>
        </ul>
      </section>

      <section>
        <h3>事件日志</h3>
        <div style="max-height:150px;overflow:auto;font-size:12px">
          <p v-if="eventLog.length === 0" class="muted small">拖动/缩放全景后显示事件</p>
          <template v-else>
            <div v-for="(line, i) in eventLog" :key="i" class="code" style="margin-bottom:2px">{{ line }}</div>
          </template>
        </div>
        <button style="font-size:11px;margin-top:4px" @click="eventLog = []">清空</button>
      </section>
    </div>
  </div>
</template>
