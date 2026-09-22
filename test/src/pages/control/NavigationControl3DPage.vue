<script setup lang="ts">
import { computed, ref } from 'vue';
import { NavigationControl3D, BMAP_ANCHOR_TOP_RIGHT } from '@baidumap/vue-bmap';
import type { ControlAnchor, Size } from '@baidumap/vue-bmap';
import ControlPageLayout from './ControlPageLayout.vue';
import AnchorSelect from './AnchorSelect.vue';
import SizeInputs from './SizeInputs.vue';
import PropsView from './PropsView.vue';

const visible = ref(true);
const anchor = ref<ControlAnchor | undefined>(BMAP_ANCHOR_TOP_RIGHT);
const offset = ref<Size | undefined>({ width: 2, height: 80 });

const controlProps = computed(() => ({
  visible: visible.value, anchor: anchor.value, offset: offset.value,
}));
</script>

<template>
  <ControlPageLayout title="NavigationControl3D" capability="NavigationControl3D" version-note="v4+ 控件，v3 不支持。">
    <NavigationControl3D :visible="visible" :anchor="anchor" :offset="offset" />
    <template #controls>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示控件</label>
      </section>
      <section><h3>anchor</h3><AnchorSelect v-model="anchor" /></section>
      <section><h3>offset</h3><SizeInputs v-model="offset" /></section>
      <PropsView :value="controlProps" />
    </template>
  </ControlPageLayout>
</template>
