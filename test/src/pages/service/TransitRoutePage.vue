<script setup lang="ts">
/**
 * useTransitRoute 测试页 —— 由 react-bmap 的 TransitRoutePage.tsx 忠实复刻。
 * 公交路线规划。search 只接受坐标(Point)。额外支持 setPolicy / setPageCapacity。
 * hook 在 <Map> 内部子组件里调用。
 */
import { computed, defineComponent, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import { Map, useTransitRoute, useCapabilities } from '@baidumap/vue-bmap';
import type { TransitRouteHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { safeStringifySdkResult } from '../../utils/sdkResult';

function getPolicyValue(constantName: string, fallback: number): number {
  const SDK = (window as any).BMap;
  return SDK?.[constantName] ?? fallback;
}

const caps = useCapabilities();
const supported = computed(() => caps.value.has('TransitRoute'));

const start = ref('116.404,39.915');
const end = ref('116.326,39.989');
const panelEl = ref<HTMLElement | null>(null);

const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
const status = ref<number | undefined>(undefined);
let hook: TransitRouteHookResult | null = null;

const options = reactive({
  location: '北京' as unknown,
  policy: 0,
  renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true },
});

watch(panelEl, (el) => { options.renderOptions.panel = el ?? undefined; });

const TransitRouteInner = defineComponent({
  name: 'TransitRouteInner',
  setup() {
    const r = useTransitRoute(options as any);
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
const applyPolicy = (v: number) => { options.policy = v; hook?.setPolicy(v); };
const applyPolicyConst = (name: string, fallback: number) => applyPolicy(getPolicyValue(name, fallback));
const setAutoViewport = (on: boolean) => {
  options.renderOptions.autoViewport = on;
  if (on) hook?.enableAutoViewport(); else hook?.disableAutoViewport();
};
const clearResults = () => hook?.clearResults();
const cancel = () => hook?.cancel();
const hasData = computed(() => !!data.value && Object.keys(data.value as object).length > 0);

const CODE_EXAMPLE = `const { search, clearResults, setPolicy, setPageCapacity, getStatus, data, cancel } = useTransitRoute({
  location: '北京',
  policy: 0,
  renderOptions: { map, panel: domEl, autoViewport: true },
});
search({ lng: 116.404, lat: 39.915 }, { lng: 116.326, lat: 39.989 });
setPolicy(BMAP_TRANSIT_POLICY_LEAST_TRANSFER);
setPageCapacity(5);`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <TransitRouteInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>useTransitRoute</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">全版本共有。公交路线规划。search 只接受坐标(Point)。</p>
      </section>
      <section>
        <h3>起点 (lng,lat)</h3>
        <input class="full-width" v-model="start" @keydown.enter="handleSearch" />
        <p class="muted small">默认：天安门(116.404,39.915)</p>
      </section>
      <section>
        <h3>终点 (lng,lat)</h3>
        <input class="full-width" v-model="end" @keydown.enter="handleSearch" />
        <p class="muted small">默认：中关村(116.326,39.989)</p>
      </section>
      <section>
        <h3>策略 (policy)</h3>
        <div class="btn-group">
          <button style="font-size:11px" :class="{ active: options.policy === 0 }" @click="applyPolicy(0)">默认</button>
          <button style="font-size:11px" :class="{ active: options.policy === getPolicyValue('BMAP_TRANSIT_POLICY_LEAST_TIME', 0) }" @click="applyPolicyConst('BMAP_TRANSIT_POLICY_LEAST_TIME', 0)">最少时间</button>
          <button style="font-size:11px" :class="{ active: options.policy === getPolicyValue('BMAP_TRANSIT_POLICY_LEAST_TRANSFER', 1) }" @click="applyPolicyConst('BMAP_TRANSIT_POLICY_LEAST_TRANSFER', 1)">最少换乘</button>
          <button style="font-size:11px" :class="{ active: options.policy === getPolicyValue('BMAP_TRANSIT_POLICY_LEAST_WALKING', 2) }" @click="applyPolicyConst('BMAP_TRANSIT_POLICY_LEAST_WALKING', 2)">最少步行</button>
          <button style="font-size:11px" :class="{ active: options.policy === getPolicyValue('BMAP_TRANSIT_POLICY_NO_SUBWAY', 3) }" @click="applyPolicyConst('BMAP_TRANSIT_POLICY_NO_SUBWAY', 3)">不坐地铁</button>
        </div>
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
          <button style="font-size:11px" @click="hook?.setPageCapacity(5)">setPageCapacity(5)</button>
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

