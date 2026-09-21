<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  MapTypeControl,
  BMAP_ANCHOR_TOP_RIGHT,
  BMAP_MAPTYPE_CONTROL_HORIZONTAL,
  BMAP_MAPTYPE_CONTROL_DROPDOWN,
  BMAP_MAPTYPE_CONTROL_MAP,
} from '@baidumap/vue-bmap';
import type { ControlAnchor, MapTypeControlType, Size } from '@baidumap/vue-bmap';
import ControlPageLayout from './ControlPageLayout.vue';
import AnchorSelect from './AnchorSelect.vue';
import SizeInputs from './SizeInputs.vue';
import PropsView from './PropsView.vue';

const visible = ref(true);
const anchor = ref<ControlAnchor | undefined>(BMAP_ANCHOR_TOP_RIGHT);
const offset = ref<Size | undefined>({ width: 10, height: 10 });
const type = ref<MapTypeControlType | undefined>(BMAP_MAPTYPE_CONTROL_MAP);
const enableSwitch = ref(true);
const showStreetLayer = ref(false);

const controlProps = computed(() => ({
  visible: visible.value, anchor: anchor.value, offset: offset.value,
  type: type.value, enableSwitch: enableSwitch.value, showStreetLayer: showStreetLayer.value,
}));

const onType = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
  type.value = v === '' ? undefined : (Number(v) as MapTypeControlType);
};
</script>

<template>
  <ControlPageLayout title="MapTypeControl" capability="MapTypeControl">
    <MapTypeControl
      :visible="visible" :anchor="anchor" :offset="offset"
      :type="type" :enable-switch="enableSwitch" :show-street-layer="showStreetLayer" />
    <template #controls>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示控件</label>
      </section>
      <section><h3>anchor</h3><AnchorSelect v-model="anchor" /></section>
      <section><h3>offset</h3><SizeInputs v-model="offset" /></section>
      <section>
        <h3>type（重建）</h3>
        <select :value="type ?? ''" @change="onType">
          <option value="">默认</option>
          <option :value="BMAP_MAPTYPE_CONTROL_HORIZONTAL">HORIZONTAL</option>
          <option :value="BMAP_MAPTYPE_CONTROL_DROPDOWN">DROPDOWN</option>
          <option :value="BMAP_MAPTYPE_CONTROL_MAP">MAP</option>
        </select>
      </section>
      <section>
        <h3>enableSwitch（重建）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="enableSwitch" />enableSwitch</label>
      </section>
      <section>
        <h3>showStreetLayer</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="showStreetLayer" />showStreetLayer</label>
      </section>
      <PropsView :value="controlProps" />
    </template>
  </ControlPageLayout>
</template>
