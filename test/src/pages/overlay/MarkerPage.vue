<script setup lang="ts">
import { computed, defineComponent, h, inject, onUnmounted, ref, watch } from 'vue';
import {
  Map, Marker, Label, InfoWindow, useMapContext, useCapabilities,
  OVERLAY_TARGET_KEY,
  BMAP_ANCHOR_TOP_LEFT, BMAP_ANCHOR_TOP_RIGHT, BMAP_ANCHOR_BOTTOM_LEFT,
  BMAP_ANCHOR_BOTTOM_RIGHT, BMAP_ANCHOR_TOP_CENTER, BMAP_ANCHOR_BOTTOM_CENTER, BMAP_ANCHOR_CENTER,
  BMAP_ANIMATION_DROP, BMAP_ANIMATION_BOUNCE,
} from '@baidumap/vue-bmap';
import type { Point } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const ICON_URL = 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_1.png';
const ICON_SPRITE = 'https://jsapi-demo.bj.bcebos.com/images/markers/marker_demo_all.png';
const SPRITE_CELL = 40;
const SVG_CIRCLE = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#2563eb" stroke="#fff" stroke-width="2"/></svg>',
);
const ANCHORS = [
  { val: undefined, label: '默认' },
  { val: BMAP_ANCHOR_TOP_LEFT, label: 'TOP_LEFT' },
  { val: BMAP_ANCHOR_TOP_RIGHT, label: 'TOP_RIGHT' },
  { val: BMAP_ANCHOR_TOP_CENTER, label: 'TOP_CENTER (v4)' },
  { val: BMAP_ANCHOR_BOTTOM_LEFT, label: 'BOTTOM_LEFT' },
  { val: BMAP_ANCHOR_BOTTOM_RIGHT, label: 'BOTTOM_RIGHT' },
  { val: BMAP_ANCHOR_BOTTOM_CENTER, label: 'BOTTOM_CENTER (v4)' },
  { val: BMAP_ANCHOR_CENTER, label: 'CENTER (v4)' },
];
const ICON_MODES = ['默认', '自定义URL', 'SVG', 'CSS Sprites'] as const;
const ALL_MAP_EVENTS = [
  { name: 'click', label: 'click' }, { name: 'dblclick', label: 'dblclick' },
  { name: 'rightclick', label: 'rightclick' }, { name: 'mousedown', label: 'mousedown' },
  { name: 'addoverlay', label: 'addoverlay' }, { name: 'removeoverlay', label: 'removeoverlay' },
];

const caps = useCapabilities();
const isV4 = computed(() => caps.value.has('Map.setHeading'));

const position = ref<Point>({ ...BEIJING });
const rotation = ref(0);
const title = ref('天安门');
const draggable = ref(true);
const massClear = ref(true);
const clicking = ref(true);
const visible = ref(true);
const raiseOnDrag = ref(false);
const enableCollisionDetection = ref(false);
const collisionTest = ref(false);
const zIndex = ref<number | undefined>(undefined);
const anchor = ref<number | undefined>(undefined);
const color = ref<string | undefined>(undefined);
const rank = ref<number | undefined>(undefined);
const iconMode = ref<typeof ICON_MODES[number]>('默认');
const showLabel = ref(false);
const labelText = ref('标注文字');
const offsetX = ref(0);
const offsetY = ref(0);
const showInfoWindow = ref(false);
const markerCount = ref(0);
const mapEvents = ref<Record<string, boolean>>({ click: true, addoverlay: true, removeoverlay: true });
const eventLog = ref<string[]>([]);

const log = (msg: string) => {
  eventLog.value = [`${new Date().toLocaleTimeString()} ${msg}`, ...eventLog.value].slice(0, 20);
};
const fmt = (pt: any) => (pt ? `${pt.lng?.toFixed(4)},${pt.lat?.toFixed(4)}` : '');
const enabledMapEvents = computed(() => Object.entries(mapEvents.value).filter(([, v]) => v).map(([k]) => k));
const toggleMapEvent = (e: string) => { mapEvents.value = { ...mapEvents.value, [e]: !mapEvents.value[e] }; };

const offset = computed(() => (offsetX.value || offsetY.value ? { width: offsetX.value, height: offsetY.value } : undefined));
const iconProps = computed<{ icon?: any }>(() => {
  switch (iconMode.value) {
    case '自定义URL': return { icon: { url: ICON_URL, size: { width: 30, height: 30 }, imageSize: { width: 30, height: 30 } } };
    case 'SVG': return { icon: { url: SVG_CIRCLE, size: { width: 32, height: 32 }, imageSize: { width: 32, height: 32 } } };
    case 'CSS Sprites': return { icon: { url: ICON_SPRITE, size: { width: SPRITE_CELL, height: SPRITE_CELL }, imageOffset: { width: SPRITE_CELL, height: 0 }, imageSize: { width: SPRITE_CELL * 3, height: SPRITE_CELL * 3 }, anchor: { width: SPRITE_CELL / 2, height: SPRITE_CELL } } };
    default: return {};
  }
});

// Map 命令式句柄：通过 <Map ref> 暴露的 getMapRef()
const mapCmp = ref<any>(null);
const withMapRef = (fn: (m: any) => void) => { const m = mapCmp.value?.getMapRef?.(); if (m) fn(m); };

// 原生 marker 实例（供 v3-only setAnimation/setShadow/setTop）
let rawMarker: any = null;
const MarkerActionProbe = defineComponent({
  name: 'MarkerActionProbe',
  setup() {
    const target = inject(OVERLAY_TARGET_KEY, null);
    watch(() => target?.handle.value, (h) => { rawMarker = (h as any)?.raw ?? null; }, { immediate: true });
    return () => null;
  },
});

// Map 级事件探针（在 <Map> 内订阅原生事件）
const MapMarkerEventProbe = defineComponent({
  name: 'MapMarkerEventProbe',
  setup() {
    const ctx = useMapContext();
    let unsubs: Array<() => void> = [];
    const rebind = () => {
      unsubs.forEach((u) => u()); unsubs = [];
      const c = ctx.value; if (!c?.map) return;
      for (const evt of enabledMapEvents.value) {
        unsubs.push(c.driver.addEventListener(c.map, evt, (raw: any) => {
          const pt = raw?.point ?? raw?.latlng;
          log(`🗺️ map.${evt}${raw?.overlay ? ' (on overlay)' : ''} ${pt ? '@ ' + fmt(pt) : ''}`);
        }));
      }
    };
    watch([() => ctx.value?.map, () => enabledMapEvents.value.join(',')], rebind, { immediate: true });
    onUnmounted(() => unsubs.forEach((u) => u()));
    return () => null;
  },
});

const resetAll = () => {
  position.value = { ...BEIJING }; rotation.value = 0; title.value = '天安门';
  zIndex.value = undefined; anchor.value = undefined; iconMode.value = '默认';
  offsetX.value = 0; offsetY.value = 0; raiseOnDrag.value = false; color.value = undefined;
  rank.value = undefined; enableCollisionDetection.value = false; collisionTest.value = false;
  log('🔄 reset all');
};

const COLLISION = [
  { rank: 0, color: '#ff0000', label: 'rank=0(红)', offset: 0.0005 },
  { rank: 1, color: '#00bb00', label: 'rank=1(绿)', offset: 0.0007 },
  { rank: 2, color: '#0066ff', label: 'rank=2(蓝)', offset: 0.0009 },
];
const iwContent = computed(() => `<div style="padding:8px"><b>${title.value}</b><br/>${position.value.lng.toFixed(4)}, ${position.value.lat.toFixed(4)}</div>`);
const setAnimation = (anim: number | null, name: string) => {
  if (typeof rawMarker?.setAnimation === 'function') { rawMarker.setAnimation(anim); log(`🎬 setAnimation(${name})`); }
  else log('❌ setAnimation 不支持（v4 已移除）');
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map ref="mapCmp" :default-center="BEIJING" :default-zoom="13" style="height:100%">
        <MapMarkerEventProbe />
        <Marker
          :position="position" :rotation="rotation" :title="title"
          :enable-dragging="draggable" :enable-mass-clear="massClear" :enable-clicking="clicking"
          :visible="visible" :raise-on-drag="raiseOnDrag" :enable-collision-detection="enableCollisionDetection"
          :z-index="zIndex" :anchor="anchor" :color="color" :rank="rank" :offset="offset"
          v-bind="iconProps"
          :onClick="(pt: any) => log(`🟢 marker.click @ ${fmt(pt)}`)"
          :onDoubleClick="() => log('🟢 marker.dblclick')"
          :onRightClick="(pt: any) => log(`🟢 marker.rightclick @ ${fmt(pt)}`)"
          :onDragStart="(pt: any) => log(`🟢 marker.dragstart @ ${fmt(pt)}`)"
          :onDragging="(pt: any) => log(`🟢 marker.dragging @ ${fmt(pt)}`)"
          :onDragEnd="(pt: any) => { if (pt) position = { lng: pt.lng, lat: pt.lat }; log(`🟢 marker.dragend @ ${fmt(pt)}`); }"
          :onMouseOver="() => log('🟢 marker.mouseover')"
          :onMouseOut="() => log('🟢 marker.mouseout')"
          :onRemove="() => log('🟢 marker.remove')"
        >
          <MarkerActionProbe />
          <Label v-if="showLabel" :content="labelText" :position="position" :offset="{ width: 20, height: -10 }" />
          <InfoWindow v-if="showInfoWindow" :open="true" :content="iwContent" :title="title" enable-auto-pan enable-close-on-click :onClose="() => { showInfoWindow = false; log('🪟 InfoWindow closed'); }" />
        </Marker>
        <template v-if="collisionTest">
          <Marker
            v-for="m in COLLISION" :key="`c-${m.rank}`"
            :position="{ lng: BEIJING.lng + m.offset, lat: BEIJING.lat + m.offset }"
            enable-collision-detection :rank="m.rank" :color="m.color" :title="m.label"
          />
        </template>
        <Marker
          v-for="i in markerCount" :key="`temp-${i}`"
          :position="{ lng: position.lng + i * 0.005, lat: position.lat + i * 0.003 }" :title="`临时 #${i}`"
        />
      </Map>
      <div class="event-log-float">
        <div class="log-head">
          <span>事件日志（{{ eventLog.length }}）</span>
          <button @click="eventLog = []">清空</button>
        </div>
        <div v-if="!eventLog.length" style="color:#666">与 marker 交互触发事件</div>
        <div v-for="(line, i) in eventLog" :key="i" style="line-height:1.6">{{ line }}</div>
      </div>
    </div>

    <div class="test-controls">
      <h2>Marker（全量）</h2>

      <section>
        <h3>能力</h3>
        <div class="cap-grid">
          <div :class="`cap-cell ${caps.has('Marker') ? 'ok' : 'no'}`">Marker</div>
          <div :class="`cap-cell ${isV4 ? 'ok' : 'no'}`">{{ isV4 ? 'v4 (WebGL)' : 'v3 (2D)' }}</div>
        </div>
      </section>

      <section>
        <h3>position</h3>
        <div class="input-row">
          <label>lng</label>
          <input type="number" step="0.001" :value="position.lng" @input="position = { ...position, lng: Number(($event.target as HTMLInputElement).value) }" />
          <label>lat</label>
          <input type="number" step="0.001" :value="position.lat" @input="position = { ...position, lat: Number(($event.target as HTMLInputElement).value) }" />
        </div>
        <div class="btn-group">
          <button @click="position = { lng: 116.404, lat: 39.915 }">天安门</button>
          <button @click="position = { lng: 116.415, lat: 39.910 }">故宫</button>
          <button @click="position = { lng: 116.397, lat: 39.913 }">中山公园</button>
        </div>
      </section>

      <section>
        <h3>rotation: {{ rotation }}°</h3>
        <input class="full-width" type="range" min="0" max="360" :value="rotation" @input="rotation = Number(($event.target as HTMLInputElement).value)" />
      </section>

      <section>
        <h3>title（悬停显示）</h3>
        <input class="full-width" type="text" :value="title" @input="title = ($event.target as HTMLInputElement).value" />
      </section>

      <section>
        <h3>行为开关</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="draggable" />enableDragging（拖拽看 position 变化）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="massClear" />enableMassClear</label>
        <label class="checkbox-row"><input type="checkbox" v-model="clicking" />enableClicking</label>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />visible（show/hide）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="raiseOnDrag" />raiseOnDrag（仅 3.0）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="enableCollisionDetection" />enableCollisionDetection</label>
      </section>

      <section>
        <h3>zIndex</h3>
        <input type="number" placeholder="未设置" :value="zIndex ?? ''" @input="zIndex = ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value)" />
      </section>

      <section>
        <h3>v4+ 视觉属性 <span :class="`cap-tag ${isV4 ? 'ok' : 'no'}`">{{ isV4 ? 'v4+' : 'v3 ✗' }}</span></h3>
        <div class="input-row">
          <label>color</label>
          <input type="text" placeholder="如 #ff0000" :value="color ?? ''" @input="color = ($event.target as HTMLInputElement).value || undefined" />
          <label>rank</label>
          <input type="number" placeholder="未设置" :value="rank ?? ''" @input="rank = ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value)" style="width:70px" />
        </div>
        <label class="checkbox-row"><input type="checkbox" v-model="collisionTest" @change="collisionTest && (enableCollisionDetection = true)" />碰撞检测测试（rank 0红/1绿/2蓝，缩小地图看优先级）</label>
      </section>

      <section>
        <h3>offset（像素偏移）</h3>
        <div class="input-row">
          <label>X</label><input type="number" v-model.number="offsetX" />
          <label>Y</label><input type="number" v-model.number="offsetY" />
        </div>
      </section>

      <section>
        <h3>anchor <span :class="`cap-tag ${isV4 ? 'ok' : 'no'}`">{{ isV4 ? 'v4+' : 'v3 ✗' }}</span></h3>
        <div class="btn-group">
          <button v-for="a in ANCHORS" :key="a.label" :class="{ active: anchor === a.val }" @click="anchor = a.val" style="font-size:11px">{{ a.label }}</button>
        </div>
      </section>

      <section>
        <h3>Icon 模式</h3>
        <div class="btn-group">
          <button v-for="m in ICON_MODES" :key="m" :class="{ active: iconMode === m }" @click="iconMode = m">{{ m }}</button>
        </div>
        <p class="muted small">默认水滴 / 自定义URL / SVG dataURL / CSS Sprites（imageOffset+imageSize+anchor 九宫格切图）</p>
      </section>

      <section>
        <h3>Label（附加文本标注）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="showLabel" />显示 Label</label>
        <input v-if="showLabel" class="full-width" type="text" v-model="labelText" placeholder="Label 文字" />
      </section>

      <section>
        <h3>🗺️ Map 级事件订阅</h3>
        <div class="btn-group">
          <button v-for="e in ALL_MAP_EVENTS" :key="e.name" :class="{ active: mapEvents[e.name] }" @click="toggleMapEvent(e.name)" style="font-size:11px">{{ e.label }}</button>
        </div>
      </section>

      <section>
        <h3>Marker 操作</h3>
        <div class="btn-group">
          <button style="font-size:11px" @click="resetAll">reset all</button>
          <button style="font-size:11px" @click="rotation = (rotation + 45) % 360">rotate +45°</button>
          <button style="font-size:11px" @click="draggable = !draggable">toggle drag</button>
          <button style="font-size:11px" @click="clicking = !clicking; log('toggle clicking（重建 marker）')">toggle clicking</button>
          <button style="font-size:11px" @click="showInfoWindow = !showInfoWindow">{{ showInfoWindow ? 'close' : 'open' }}InfoWindow</button>
        </div>
      </section>

      <section>
        <h3>3.0-only 方法 <span :class="`cap-tag ${!isV4 ? 'ok' : 'no'}`">{{ !isV4 ? '3.0' : 'v4 移除' }}</span></h3>
        <div class="btn-group">
          <button style="font-size:11px" @click="setAnimation(BMAP_ANIMATION_DROP, 'DROP')">setAnimation(DROP)</button>
          <button style="font-size:11px" @click="setAnimation(BMAP_ANIMATION_BOUNCE, 'BOUNCE')">setAnimation(BOUNCE)</button>
          <button style="font-size:11px" @click="setAnimation(null, 'null')">setAnimation(null)</button>
        </div>
        <p class="muted small">v4 已移除（@removed 4.0）：setAnimation 存在但 WebGL 不实现 DOM 动画。</p>
      </section>

      <section>
        <h3>🗺️ Map 级 Marker 操作</h3>
        <div class="btn-group">
          <button style="font-size:11px" @click="withMapRef((m) => { const l = m.getOverlays() ?? []; log(`📊 getOverlays: ${l.length} 个`); })">getOverlays</button>
          <button style="font-size:11px" @click="withMapRef((m) => { m.clearOverlays(); log('🧹 clearOverlays'); })">clearOverlays</button>
          <button style="font-size:11px" @click="markerCount++; log(`➕ 新增临时 marker #${markerCount}`)">addMarker</button>
          <button style="font-size:11px" @click="markerCount = 0; log('🔄 清除临时 markers')">clearTemp</button>
        </div>
      </section>
    </div>
  </div>
</template>



