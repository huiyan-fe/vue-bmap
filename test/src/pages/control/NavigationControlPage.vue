<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  NavigationControl,
  BMAP_ANCHOR_TOP_LEFT,
  BMAP_ANCHOR_TOP_RIGHT,
  BMAP_NAVIGATION_CONTROL_LARGE,
  BMAP_NAVIGATION_CONTROL_SMALL,
  BMAP_NAVIGATION_CONTROL_PAN,
  BMAP_NAVIGATION_CONTROL_ZOOM,
} from '@baidumap/vue-bmap';
import type { ControlAnchor, NavigationControlType, Size } from '@baidumap/vue-bmap';
import ControlPageLayout from './ControlPageLayout.vue';
import AnchorSelect from './AnchorSelect.vue';
import SizeInputs from './SizeInputs.vue';
import PropsView from './PropsView.vue';

const visible = ref(true);
const anchor = ref<ControlAnchor | undefined>(BMAP_ANCHOR_TOP_LEFT);
const offset = ref<Size | undefined>({ width: 10, height: 10 });
const type = ref<NavigationControlType | undefined>(BMAP_NAVIGATION_CONTROL_LARGE);
const showZoomInfo = ref(true);
const enableGeolocation = ref(false);

const controlProps = computed(() => ({
  visible: visible.value, anchor: anchor.value, offset: offset.value,
  type: type.value, showZoomInfo: showZoomInfo.value, enableGeolocation: enableGeolocation.value,
}));

const onType = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
  type.value = v === '' ? undefined : (Number(v) as NavigationControlType);
};
</script>

<template>
  <ControlPageLayout title="NavigationControl" capability="NavigationControl">
    <NavigationControl
      :visible="visible" :anchor="anchor" :offset="offset"
      :type="type" :show-zoom-info="showZoomInfo" :enable-geolocation="enableGeolocation" />
    <template #controls>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示控件</label>
      </section>
      <section><h3>anchor</h3><AnchorSelect v-model="anchor" /></section>
      <section><h3>offset</h3><SizeInputs v-model="offset" /></section>
      <section>
        <h3>type</h3>
        <select :value="type ?? ''" @change="onType">
          <option value="">默认</option>
          <option :value="BMAP_NAVIGATION_CONTROL_LARGE">LARGE</option>
          <option :value="BMAP_NAVIGATION_CONTROL_SMALL">SMALL</option>
          <option :value="BMAP_NAVIGATION_CONTROL_PAN">PAN</option>
          <option :value="BMAP_NAVIGATION_CONTROL_ZOOM">ZOOM</option>
        </select>
      </section>
      <section>
        <h3>showZoomInfo（重建）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="showZoomInfo" />showZoomInfo</label>
      </section>
      <section>
        <h3>enableGeolocation（重建）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="enableGeolocation" />enableGeolocation</label>
      </section>
      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button @click="type = BMAP_NAVIGATION_CONTROL_SMALL">小型缩放</button>
          <button @click="anchor = BMAP_ANCHOR_TOP_RIGHT; enableGeolocation = true">右上定位</button>
        </div>
      </section>
      <PropsView :value="controlProps" />
    </template>
  </ControlPageLayout>
</template>
