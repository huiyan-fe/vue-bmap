<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  ScaleControl,
  BMAP_ANCHOR_BOTTOM_LEFT,
  BMAP_UNIT_METRIC,
  BMAP_UNIT_IMPERIAL,
} from '@baidumap/vue-bmap';
import type { ControlAnchor, LengthUnit, Size } from '@baidumap/vue-bmap';
import ControlPageLayout from './ControlPageLayout.vue';
import AnchorSelect from './AnchorSelect.vue';
import SizeInputs from './SizeInputs.vue';
import PropsView from './PropsView.vue';

const visible = ref(true);
const anchor = ref<ControlAnchor | undefined>(BMAP_ANCHOR_BOTTOM_LEFT);
const offset = ref<Size | undefined>({ width: 10, height: 10 });
const unit = ref<LengthUnit | undefined>(BMAP_UNIT_METRIC);

const controlProps = computed(() => ({
  visible: visible.value, anchor: anchor.value, offset: offset.value, unit: unit.value,
}));

const onUnit = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value;
  unit.value = v === '' ? undefined : (v as LengthUnit);
};
</script>

<template>
  <ControlPageLayout title="ScaleControl" capability="ScaleControl">
    <ScaleControl :visible="visible" :anchor="anchor" :offset="offset" :unit="unit" />
    <template #controls>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示控件</label>
      </section>
      <section><h3>anchor</h3><AnchorSelect v-model="anchor" /></section>
      <section><h3>offset</h3><SizeInputs v-model="offset" /></section>
      <section>
        <h3>unit</h3>
        <select :value="unit ?? ''" @change="onUnit">
          <option value="">默认</option>
          <option :value="BMAP_UNIT_METRIC">metric</option>
          <option :value="BMAP_UNIT_IMPERIAL">imperial</option>
        </select>
      </section>
      <PropsView :value="controlProps" />
    </template>
  </ControlPageLayout>
</template>
