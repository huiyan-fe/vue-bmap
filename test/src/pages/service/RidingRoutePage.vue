<script setup lang="ts">
/**
 * useRidingRoute 测试页 —— 由 react-bmap 的 RidingRoutePage.tsx 忠实复刻。
 * 骑行路线规划（@since 4.0，v3 不支持）。search 只接受坐标(Point)。
 * hook 在 <Map> 内部子组件里调用。
 */
import { computed, defineComponent, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import { Map, useRidingRoute, useCapabilities } from '@baidumap/vue-bmap';
import type { RidingRouteHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { safeStringifySdkResult } from '../../utils/sdkResult';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('RidingRoute'));

const start = ref('116.404,39.915');
const end = ref('116.397,39.908');
const panelEl = ref<HTMLElement | null>(null);

const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
const status = ref<number | undefined>(undefined);
let hook: RidingRouteHookResult | null = null;

const options = reactive({
  location: '北京' as unknown,
  renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true },
});

watch(panelEl, (el) => { options.renderOptions.panel = el ?? undefined; });

const RidingRouteInner = defineComponent({
  name: 'RidingRouteInner',
  setup() {
    const r = useRidingRoute(options as any);
    hook = r;
    watchEffect(() => {
      data.value = r.data.value;
      loading.value = r.loading.value;
      error.value = r.error.value;
      status.value = r.getStatus?.();
    });
    return () => null;
  },
});

const parsePoint = (s: string) => { const [lng, lat] = s.split(',').map(Number); return { lng, lat }; };
const handleSearch = () => hook?.search(parsePoint(start.value), parsePoint(end.value));
const setAutoViewport = (on: boolean) => {
  options.renderOptions.autoViewport = on;
  if (on) hook?.enableAutoViewport(); else hook?.disableAutoViewport();
};
const clearResults = () => hook?.clearResults();
const cancel = () => hook?.cancel();
const hasData = computed(() => !!data.value && Object.keys(data.value as object).length > 0);

const CODE_EXAMPLE = `const { search, clearResults, enableAutoViewport, getStatus, data, cancel } = useRidingRoute({
  location: '北京',
  renderOptions: { map, panel: domEl, autoViewport: true },
});
search({ lng: 116.404, lat: 39.915 }, { lng: 116.397, lat: 39.908 });`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <RidingRouteInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>useRidingRoute</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。骑行路线规划。search 只接受坐标(Point)。v3 不支持。</p>
      </section>
      <section>
        <h3>起点 (lng,lat)</h3>
        <input class="full-width" v-model="start" @keydown.enter="handleSearch" />
        <p class="muted small">默认：天安门(116.404,39.915)</p>
      </section>
      <section>
        <h3>终点 (lng,lat)</h3>
        <input class="full-width" v-model="end" @keydown.enter="handleSearch" />
        <p class="muted small">默认：西单(116.397,39.908)</p>
      </section>
      <section>
        <h3>操作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button @click="handleSearch" :disabled="!supported || loading">{{ loading ? 'searching...' : 'search' }}</button>
          <button @click="clearResults">clear</button>
          <button @click="cancel">cancel</button>
        </div>
        <div class="btn-group" style="flex-wrap:wrap;margin-top:4px">
          <button style="font-size:11px" :class="{ active: options.renderOptions.autoViewport }" @click="setAutoViewport(true)">enableAutoViewport</button>
          <button style="font-size:11px" :class="{ active: !options.renderOptions.autoViewport }" @click="setAutoViewport(false)">disableAutoViewport</button>
        </div>
      </section>
      <section>
        <h3>状态</h3>
        <ul class="state-list">
          <li>loading: <code>{{ String(loading) }}</code></li>
          <li>error: <code>{{ error?.message ?? 'null' }}</code></li>
          <li>status: <code>{{ String(status) }}</code></li>
          <li>data: <code>{{ hasData ? '有结果' : '空/无结果' }}</code></li>
        </ul>
      </section>
      <section>
        <h3>结果面板</h3>
        <div ref="panelEl" style="min-height:60px;background:#f5f5f5;border-radius:4px;padding:4px;font-size:12px;border:1px solid #ddd">
          <span class="muted small">搜索后显示路线结果</span>
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

