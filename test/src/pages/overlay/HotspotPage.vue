<script setup lang="ts">
/**
 * Hotspot 全量测试页 — 覆盖 Hotspot.d.ts + HotspotOptions.d.ts 全部功能。
 * Hotspot 整体 @removed 4.0，仅 v3 可用。
 * 无事件（SDK 未定义 HotspotEventMap）。
 * Setter：setPosition / setText / setUserData。
 * 无 setter：offsets / minZoom / maxZoom → ctorOnlyProps。
 */
import { computed, ref } from 'vue';
import { Map, Marker, Hotspot, useCapabilities } from '@baidumap/vue-bmap';
import type { Point } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const DEFAULT_POINT: Point = { lng: 116.380, lat: 39.930 };

const caps = useCapabilities();
const isV4 = computed(() => caps.value.has('Map.setHeading'));
const { eventLog, log } = useLog();

const position = ref<Point>({ ...DEFAULT_POINT });
const text = ref('text');
const offsets = ref<number[]>([50, 50, 50, 50]);
const userData = ref('自定义数据');
const minZoom = ref<number | undefined>(undefined);
const maxZoom = ref<number | undefined>(undefined);

const OFFSET_LABELS = ['top', 'right', 'bottom', 'left'];

const setOffset = (i: number, v: number) => {
  const next = [...offsets.value];
  next[i] = v;
  offsets.value = next;
};

const resetAll = () => {
  position.value = { ...DEFAULT_POINT };
  text.value = '天安门';
  offsets.value = [50, 50, 50, 50];
  userData.value = '自定义数据';
  minZoom.value = undefined;
  maxZoom.value = undefined;
  log('🔄 reset all');
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <template v-if="!isV4">
          <Marker :position="position" />
          <Hotspot
            :position="position" :text="text" :offsets="offsets"
            :user-data="userData" :min-zoom="minZoom" :max-zoom="maxZoom"
          />
        </template>
      </Map>
      <EventLog :log="eventLog" hint="Hotspot 无事件；操作日志在此" @clear="eventLog = []" />
    </div>

    <div class="test-controls">
      <h2>Hotspot（全量）</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${isV4 ? 'no' : 'ok'}`">{{ isV4 ? 'v4 已移除' : 'v3 only' }}</span></h3>
        <p class="muted small">
          整体 @removed 4.0，仅 v3 可用。不走 addOverlay，
          通过 map.addHotspot/removeHotspot 管理。
          <strong>Hotspot 本身不可见</strong>——鼠标悬停到 Marker 附近时显示 text 提示。
          offsets 控制热区范围（像素），默认 30px 方便触发。
        </p>
      </section>

      <section>
        <h3>position（位置，positionProp）</h3>
        <label class="checkbox-row">
          lng
          <input type="number" step="0.001" :value="position.lng" @input="position = { ...position, lng: Number(($event.target as HTMLInputElement).value) }" />
        </label>
        <label class="checkbox-row">
          lat
          <input type="number" step="0.001" :value="position.lat" @input="position = { ...position, lat: Number(($event.target as HTMLInputElement).value) }" />
        </label>
        <p class="muted small">走 setPosition()</p>
      </section>

      <section>
        <h3>text（提示文本）</h3>
        <input type="text" class="full-width" :value="text" @input="text = ($event.target as HTMLInputElement).value" />
        <p class="muted small">走 setText()</p>
      </section>

      <section>
        <h3>offsets（扩展偏移 [top, right, bottom, left]）</h3>
        <label v-for="i in [0, 1, 2, 3]" :key="i" class="checkbox-row">
          {{ OFFSET_LABELS[i] }}
          <input type="number" :value="offsets[i] ?? 5" @input="setOffset(i, Number(($event.target as HTMLInputElement).value))" />
        </label>
        <p class="muted small">ctorOnlyProps（无 setter），改值重建 Hotspot @default [5,5,5,5]</p>
      </section>

      <section>
        <h3>userData（自定义数据）</h3>
        <input type="text" class="full-width" :value="userData" @input="userData = ($event.target as HTMLInputElement).value" />
        <p class="muted small">走 setUserData()；SDK 类型为 any</p>
      </section>

      <section>
        <h3>缩放级别范围</h3>
        <label class="checkbox-row">
          minZoom
          <input type="number" placeholder="未设置" :value="minZoom ?? ''" @input="minZoom = ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="checkbox-row">
          maxZoom
          <input type="number" placeholder="未设置" :value="maxZoom ?? ''" @input="maxZoom = ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value)" />
        </label>
        <p class="muted small">ctorOnlyProps（无 setter），改值重建 Hotspot</p>
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
      </section>

      <section>
        <h3>事件说明</h3>
        <p class="muted small">
          Hotspot 是值对象（非 Overlay），SDK 未定义 HotspotEventMap。
          无事件可测试。
        </p>
      </section>
    </div>
  </div>
</template>
