<script setup lang="ts">
import { computed, ref } from 'vue';
import { CopyrightControl, BMAP_ANCHOR_BOTTOM_LEFT, BMAP_ANCHOR_BOTTOM_RIGHT } from '@baidumap/vue-bmap';
import type { Bounds, ControlAnchor, Size } from '@baidumap/vue-bmap';
import ControlPageLayout from './ControlPageLayout.vue';
import AnchorSelect from './AnchorSelect.vue';
import SizeInputs from './SizeInputs.vue';
import PropsView from './PropsView.vue';

interface CopyrightItem {
  id: number;
  content?: string;
  bounds?: Bounds;
}

const DEFAULT_COPYRIGHTS: CopyrightItem[] = [
  { id: 1, content: '自定义版权 © react-bmap' },
];

const visible = ref(true);
const anchor = ref<ControlAnchor | undefined>(BMAP_ANCHOR_BOTTOM_RIGHT);
const offset = ref<Size | undefined>({ width: 10, height: 10 });
const copyrights = ref<CopyrightItem[]>(DEFAULT_COPYRIGHTS);

const controlProps = computed(() => ({
  visible: visible.value, anchor: anchor.value, offset: offset.value, copyrights: copyrights.value,
}));

const onContent = (e: Event) => {
  copyrights.value = [{ id: 1, content: (e.target as HTMLInputElement).value }];
};
</script>

<template>
  <ControlPageLayout title="CopyrightControl" capability="CopyrightControl">
    <CopyrightControl :visible="visible" :anchor="anchor" :offset="offset" :copyrights="copyrights" />
    <template #controls>
      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示控件</label>
      </section>
      <section><h3>anchor</h3><AnchorSelect v-model="anchor" /></section>
      <section><h3>offset</h3><SizeInputs v-model="offset" /></section>
      <section>
        <h3>copyrights</h3>
        <input class="full-width" :value="copyrights[0]?.content ?? ''" @input="onContent" />
      </section>
      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button @click="copyrights = DEFAULT_COPYRIGHTS">添加版权</button>
          <button @click="anchor = BMAP_ANCHOR_BOTTOM_LEFT">左下角</button>
        </div>
      </section>
      <PropsView :value="controlProps" />
    </template>
  </ControlPageLayout>
</template>
