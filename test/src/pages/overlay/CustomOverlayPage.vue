<script setup lang="ts">
/**
 * CustomOverlay 全量测试页 — 覆盖 CustomOverlay.d.ts + CustomOverlayOptions.d.ts 全部功能。
 * CustomOverlay @since 4.0，通过默认插槽控制 DOM 内容。
 * 事件：CustomOverlayEventMap（click / mouseover / mouseout）。
 * Setter：setPoint / setRotation / setRotationOrigin / setProperties。
 */
import { computed, ref } from 'vue';
import { Map, CustomOverlay, useCapabilities } from '@baidumap/vue-bmap';
import type { Point } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { useLog } from './useLog';
import EventLog from '../../components/EventLog.vue';

const DEFAULT_POINT: Point = { lng: 116.404, lat: 39.915 };
const COLOR_PRESETS = ['#1890ff', '#52c41a', '#fa937e', '#722ed1', '#ff4d4f'];

const caps = useCapabilities();
const isV4 = computed(() => caps.value.has('Map.setHeading'));
const { eventLog, log, fmt } = useLog();

const point = ref<Point>({ ...DEFAULT_POINT });
const rotation = ref(0);
const rotationInit = ref(0);
const color = ref(COLOR_PRESETS[0]);
const label = ref('自定义覆盖物');
const anchorsX = ref(0.5);
const anchorsY = ref(1);
const offsetX = ref(0);
const offsetY = ref(0);
const minZoom = ref<number | undefined>(undefined);
const maxZoom = ref<number | undefined>(undefined);
const fixBottom = ref(false);
const useTranslate = ref(false);
const autoFollow = ref(false);
const enableMassClear = ref(true);
const enableDraggingMap = ref(false);
const zIndex = ref<number | undefined>(undefined);
const visible = ref(true);
const properties = ref('{"id":1}');

const anchors = computed<[number, number]>(() => [anchorsX.value, anchorsY.value]);

const onEvt = (name: string) => (pt: any) =>
  log(`🎯 co.${name}${pt ? ` @ ${fmt(pt)}` : ''} props=${properties.value}`);

const resetAll = () => {
  point.value = { ...DEFAULT_POINT };
  rotation.value = 0;
  rotationInit.value = 0;
  color.value = COLOR_PRESETS[0];
  label.value = '自定义覆盖物';
  anchorsX.value = 0.5;
  anchorsY.value = 1;
  offsetX.value = 0;
  offsetY.value = 0;
  minZoom.value = undefined;
  maxZoom.value = undefined;
  fixBottom.value = false;
  useTranslate.value = false;
  autoFollow.value = false;
  enableMassClear.value = true;
  enableDraggingMap.value = false;
  zIndex.value = undefined;
  visible.value = true;
  properties.value = '{"id":1}';
  log('🔄 reset all');
};
const presetBlue = () => { color.value = '#1890ff'; label.value = '蓝色标签'; rotation.value = 0; log('🎯 蓝色标签'); };
const presetRotate = () => { color.value = '#52c41a'; label.value = '绿色标签'; rotation.value = -15; log('🎯 旋转绿色标签'); };
const presetZoom = () => { minZoom.value = 12; maxZoom.value = 16; log('🎯 仅 12~16 级显示'); };
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <CustomOverlay
          v-if="isV4"
          :point="point" :anchors="anchors" :offset-x="offsetX" :offset-y="offsetY"
          :rotation="rotation" :rotation-init="rotationInit" :min-zoom="minZoom" :max-zoom="maxZoom"
          :properties="properties" :fix-bottom="fixBottom" :use-translate="useTranslate"
          :auto-follow-heading-changed="autoFollow" :enable-mass-clear="enableMassClear"
          :enable-dragging-map="enableDraggingMap" :z-index="zIndex" :visible="visible"
          :onClick="onEvt('click')" :onMouseOver="onEvt('mouseover')" :onMouseOut="onEvt('mouseout')"
        >
          <div :style="{
            padding: '4px 12px', borderRadius: '4px', fontSize: '13px', color: '#fff',
            whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            transition: 'all 0.2s', cursor: 'pointer', background: color,
          }">
            {{ label }}
          </div>
        </CustomOverlay>
      </Map>
      <EventLog :log="eventLog" hint="点击/悬停自定义覆盖物触发事件" @clear="eventLog = []" />
    </div>

    <div class="test-controls">
      <h2>CustomOverlay（全量）</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${isV4 ? 'ok' : 'no'}`">{{ isV4 ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">
          @since 4.0。通过默认插槽完全控制 DOM 内容。v3 上不可用。
        </p>
      </section>

      <section>
        <h3>children（DOM 内容）</h3>
        <label class="checkbox-row">
          label
          <input type="text" :value="label" @input="label = ($event.target as HTMLInputElement).value" />
        </label>
        <div class="btn-group" style="flex-wrap:wrap;margin-top:4px">
          <button v-for="c in COLOR_PRESETS" :key="c" :style="{ fontSize: '10px', background: c, color: '#fff' }" :class="{ active: color === c }" @click="color = c">{{ c }}</button>
        </div>
        <p class="muted small">children 渲染进覆盖物 DOM；改 label/color 走响应式更新，不重建覆盖物</p>
      </section>

      <section>
        <h3>point（位置）</h3>
        <label class="checkbox-row">
          lng
          <input type="number" step="0.001" :value="point.lng" @input="point = { ...point, lng: Number(($event.target as HTMLInputElement).value) }" />
        </label>
        <label class="checkbox-row">
          lat
          <input type="number" step="0.001" :value="point.lat" @input="point = { ...point, lat: Number(($event.target as HTMLInputElement).value) }" />
        </label>
        <p class="muted small">走 setPoint()</p>
      </section>

      <section>
        <h3>rotation: {{ rotation }}°</h3>
        <input type="range" min="0" max="360" step="1" :value="rotation" @input="rotation = Number(($event.target as HTMLInputElement).value)" class="full-width" />
        <p class="muted small">走 setRotation()</p>
      </section>

      <section>
        <h3>rotationInit: {{ rotationInit }}°</h3>
        <input type="range" min="0" max="360" step="1" :value="rotationInit" @input="rotationInit = Number(($event.target as HTMLInputElement).value)" class="full-width" />
        <p class="muted small">走 setRotationOrigin()；最终角度 = rotationOrigin + 地图朝向</p>
      </section>

      <section>
        <h3>anchors [x, y]（0-1）</h3>
        <label class="checkbox-row">
          x
          <input type="number" min="0" max="1" step="0.1" :value="anchorsX" @input="anchorsX = Number(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="checkbox-row">
          y
          <input type="number" min="0" max="1" step="0.1" :value="anchorsY" @input="anchorsY = Number(($event.target as HTMLInputElement).value)" />
        </label>
        <p class="muted small">ctorOnlyProps；[0.5, 1] = 底边中心 @default [0.5, 1]</p>
      </section>

      <section>
        <h3>offset（像素偏移）</h3>
        <label class="checkbox-row">
          offsetX
          <input type="number" :value="offsetX" @input="offsetX = Number(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="checkbox-row">
          offsetY
          <input type="number" :value="offsetY" @input="offsetY = Number(($event.target as HTMLInputElement).value)" />
        </label>
        <p class="muted small">ctorOnlyProps @default 0</p>
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
        <p class="muted small">ctorOnlyProps；缩放地图越过范围时隐藏</p>
      </section>

      <section>
        <h3>properties（自定义属性）</h3>
        <input type="text" class="full-width" :value="properties" @input="properties = ($event.target as HTMLInputElement).value" />
        <p class="muted small">走 setProperties()；SDK 类型为 any</p>
      </section>

      <section>
        <h3>zIndex</h3>
        <input type="number" placeholder="未设置" :value="zIndex ?? ''" @input="zIndex = ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value)" />
      </section>

      <section>
        <h3>行为开关</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="fixBottom" />fixBottom（DOM 固定底部，重建）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="useTranslate" />useTranslate（translate3d 优化，重建）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="autoFollow" />autoFollowHeadingChanged（随地图旋转，重建）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="enableMassClear" />enableMassClear</label>
        <label class="checkbox-row"><input type="checkbox" v-model="enableDraggingMap" />enableDraggingMap（覆盖物上允许拖拽地图，重建）</label>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />visible（show/hide）</label>
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
      </section>

      <section>
        <h3>预设</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="presetBlue">蓝色标签</button>
          <button style="font-size:11px" @click="presetRotate">旋转标签</button>
          <button style="font-size:11px" @click="presetZoom">仅 12~16 级</button>
        </div>
      </section>

      <section>
        <h3>事件测试</h3>
        <p class="muted small">
          事件列表（CustomOverlayEventMap）：click, mouseover, mouseout
        </p>
      </section>
    </div>
  </div>
</template>
