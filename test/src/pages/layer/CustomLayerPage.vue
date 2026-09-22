<script setup lang="ts">
/**
 * CustomLayer 测试页 — LBS 云数据图层。
 * dts 标记 @removed 4.0（v3-only），v4 下可能不可用。
 *
 * Options: databoxId, geotableId, q, tags, filter, pointDensity
 */
import { computed, ref } from 'vue';
import { Map, CustomLayer, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('CustomLayer'));
const visible = ref(true);
const databoxId = ref('');
const geotableId = ref('');
const q = ref('');
const tags = ref('');
const filter = ref('');
const pointDensity = ref<number | undefined>(undefined);

const rebuildKey = computed(() => `${databoxId.value}|${geotableId.value}|${q.value}|${tags.value}|${filter.value}|${pointDensity.value ?? ''}`);

const numOrUndef = (v: string) => (v === '' ? undefined : Number(v));

const CODE_SAMPLE = `<Map :default-center="center" :default-zoom="11">
  <CustomLayer
    databox-id="your_databox_id"
    geotable-id="your_geotable_id"
    q="餐厅"
    tags="美食,中餐"
    filter="price>100"
    :point-density="1"
  />
</Map>`;

const resetAll = () => {
  visible.value = true; databoxId.value = ''; geotableId.value = ''; q.value = '';
  tags.value = ''; filter.value = ''; pointDensity.value = undefined;
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="11" style="height:100%">
        <CustomLayer
          v-if="visible && supported"
          :key="rebuildKey"
          :databox-id="databoxId || undefined"
          :geotable-id="geotableId || undefined"
          :q="q || undefined"
          :tags="tags || undefined"
          :filter="filter || undefined"
          :point-density="pointDensity"
        />
      </Map>
    </div>
    <div class="test-controls">
      <h2>CustomLayer</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">
          LBS 云数据图层。dts 标记 @removed 4.0（v3-only），v4 下可能不可用。
          通过 map.addLayer / map.removeLayer 管理。
        </p>
      </section>

      <section>
        <h3>显示</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="visible" />显示图层（挂载 / 卸载）</label>
      </section>

      <section>
        <h3>databoxId</h3>
        <input type="text" class="full-width" placeholder="LBS 云数据表 ID" v-model="databoxId" />
      </section>

      <section>
        <h3>geotableId</h3>
        <input type="text" class="full-width" placeholder="geotable ID" v-model="geotableId" />
      </section>

      <section>
        <h3>q（检索关键词）</h3>
        <input type="text" class="full-width" placeholder="搜索关键词" v-model="q" />
      </section>

      <section>
        <h3>tags（标签过滤）</h3>
        <input type="text" class="full-width" placeholder="标签，逗号分隔" v-model="tags" />
      </section>

      <section>
        <h3>filter（条件过滤）</h3>
        <input type="text" class="full-width" placeholder="如: price>100" v-model="filter" />
      </section>

      <section>
        <h3>pointDensity</h3>
        <input type="number" placeholder="未设置" :value="pointDensity ?? ''" @input="pointDensity = numOrUndef(($event.target as HTMLInputElement).value)" />
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
        </div>
      </section>

      <section>
        <h3>代码示例</h3>
        <pre class="code-sample">{{ CODE_SAMPLE }}</pre>
      </section>
    </div>
  </div>
</template>

<style scoped>
.code-sample { font-size: 10px; background: #f5f5f5; padding: 8px; border-radius: 4px; overflow: auto; }
</style>
