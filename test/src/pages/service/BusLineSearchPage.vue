<script setup lang="ts">
/**
 * useBusLineSearch 测试页 —— 由 react-bmap 的 BusLineSearchPage.tsx 忠实复刻。
 * 公交线路搜索。getBusList 搜索线路列表，getBusLine 获取具体线路。
 * hook 在 <Map> 内部子组件里调用。
 */
import { computed, defineComponent, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import { Map, useBusLineSearch, useCapabilities } from '@baidumap/vue-bmap';
import type { BusLineSearchHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { safeStringifySdkResult } from '../../utils/sdkResult';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('BusLineSearch'));

const keyword = ref('1路');
const panelEl = ref<HTMLElement | null>(null);

const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
let hook: BusLineSearchHookResult | null = null;

const options = reactive({
  location: '北京' as unknown,
  renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true },
  onGetBusListComplete: (r: unknown) => console.log('[BusLineSearch] onGetBusListComplete:', r),
  onGetBusLineComplete: (r: unknown) => console.log('[BusLineSearch] onGetBusLineComplete:', r),
});

watch(panelEl, (el) => { options.renderOptions.panel = el ?? undefined; });

const BusLineSearchInner = defineComponent({
  name: 'BusLineSearchInner',
  setup() {
    const r = useBusLineSearch(options as any);
    hook = r;
    watchEffect(() => {
      data.value = r.data.value;
      loading.value = r.loading.value;
      error.value = r.error.value;
    });
    return () => null;
  },
});

const getBusList = () => hook?.getBusList(keyword.value);
const getBusLine0 = () => {
  if (!hook || !data.value) return;
  const item = (data.value as any)?.getBusListItem?.(0) ?? data.value;
  hook.getBusLine(item);
};
const clearResults = () => hook?.clearResults();
const cancel = () => hook?.cancel();

const CODE_EXAMPLE = `const { getBusList, getBusLine, clearResults, data, cancel } = useBusLineSearch({
  location: '北京',
  renderOptions: { map, panel: domEl, autoViewport: true },
});
getBusList('1路'); // 搜索线路列表
getBusLine(item);  // 获取具体线路`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <BusLineSearchInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>useBusLineSearch</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">全版本共有。公交线路搜索。getBusList 搜索线路列表，getBusLine 获取具体线路。</p>
      </section>
      <section>
        <h3>关键词</h3>
        <input class="full-width" v-model="keyword" @keydown.enter="getBusList" />
      </section>
      <section>
        <h3>操作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button @click="getBusList" :disabled="!supported || loading">{{ loading ? 'searching...' : 'getBusList' }}</button>
          <button @click="getBusLine0" :disabled="!supported || loading">getBusLine(0)</button>
          <button @click="clearResults">clear</button>
          <button @click="cancel">cancel</button>
        </div>
      </section>
      <section>
        <h3>状态</h3>
        <ul class="state-list">
          <li>loading: <code>{{ String(loading) }}</code></li>
          <li>error: <code>{{ error?.message ?? 'null' }}</code></li>
          <li>data: <code>{{ data ? '有结果' : 'null' }}</code></li>
        </ul>
      </section>
      <section>
        <h3>结果面板</h3>
        <div ref="panelEl" style="min-height:60px;background:#f5f5f5;border-radius:4px;padding:4px;font-size:12px;border:1px solid #ddd">
          <span class="muted small">搜索后显示线路列表</span>
        </div>
      </section>
      <section v-if="data">
        <h3>结果（JSON）</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto;max-height:200px">{{ safeStringifySdkResult(data) }}</pre>
      </section>
      <section>
        <h3>代码示例</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ CODE_EXAMPLE }}</pre>
      </section>
    </div>
  </div>
</template>

