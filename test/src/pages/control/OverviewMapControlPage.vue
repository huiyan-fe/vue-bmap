<script setup lang="ts">
import { computed, ref } from 'vue';
import { OverviewMapControl, BMAP_ANCHOR_BOTTOM_RIGHT } from '@baidumap/vue-bmap';
import type { ControlAnchor, Size } from '@baidumap/vue-bmap';
import ControlPageLayout from './ControlPageLayout.vue';
import AnchorSelect from './AnchorSelect.vue';
import SizeInputs from './SizeInputs.vue';
import PropsView from './PropsView.vue';

const visible = ref(true);
const anchor = ref<ControlAnchor | undefined>(BMAP_ANCHOR_BOTTOM_RIGHT);
const offset = ref<Size | undefined>({ width: 10, height: 10 });
const size = ref<Size | undefined>({ width: 150, height: 150 });
const isOpen = ref(true);
const zoomInterval = ref(4);
const padding = ref(4);
const logs = ref<string[]>([]);

const controlProps = computed(() => ({
  visible: visible.value, anchor: anchor.value, offset: offset.value,
  size: size.value, isOpen: isOpen.value, zoomInterval: zoomInterval.value, padding: padding.value,
}));
</script>

<template>
  <ControlPageLayout title="OverviewMapControl" capability="OverviewMapControl">
    <OverviewMapControl
      :visible="visible" :anchor="anchor" :offset="offset"
      :size="size" :is-open="isOpen" :zoom-interval="zoomInterval" :padding="padding" />
    <template #controls>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示控件</label>
      </section>
      <section><h3>anchor</h3><AnchorSelect v-model="anchor" /></section>
      <section><h3>offset</h3><SizeInputs v-model="offset" /></section>
      <section><h3>size</h3><SizeInputs v-model="size" /></section>
      <section>
        <h3>isOpen（重建）</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="isOpen" />isOpen</label>
      </section>
      <section>
        <h3>zoomInterval（重建）</h3>
        <input type="number" class="full-width" v-model.number="zoomInterval" />
        <p class="muted small">v3 可能不支持</p>
      </section>
      <section>
        <h3>padding（重建）</h3>
        <input type="number" class="full-width" v-model.number="padding" />
        <p class="muted small">v3 可能不支持；频繁切换会导致 WebGL 上下文耗尽</p>
      </section>
      <section>
        <h3>回调日志</h3>
        <p v-if="logs.length === 0" class="muted small">触发控件回调后显示日志</p>
        <pre v-else style="font-size:11px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ logs.join('\n') }}</pre>
      </section>
      <PropsView :value="controlProps" />
    </template>
  </ControlPageLayout>
</template>
