<script setup lang="ts">
/**
 * useTruckRoute 测试页 —— 由 react-bmap 的 TruckRoutePage.tsx 忠实复刻。
 * 覆盖：search（只接受坐标 Point）/ clearResults / enableAutoViewport / disableAutoViewport
 * / getStatus / cancel；结果渲染到 map + panel。
 *
 * Vue 组织方式：hook 在 <Map> 内部子组件里调用（因此 renderOptions.map 由地图上下文自动获取，
 * 无需像 react 那样用 MapHandleCapture 上提）；返回的 data/loading/error 是 Ref，用 watchEffect
 * 桥接到外层控制面板；panel DOM 就绪写入 reactive options 触发重建。
 */
import { computed, defineComponent, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import { Map, useTruckRoute, useCapabilities } from '@baidumap/vue-bmap';
import type { TruckRouteHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { safeStringifySdkResult } from '../../utils/sdkResult';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('TruckRoute'));

const start = ref('116.404,39.915');
const end = ref('116.397,39.908');
const autoViewport = ref(true);
const panelEl = ref<HTMLElement | null>(null);

// 响应式 options：panel / autoViewport 变化触发 hook 重建（map 由 <Map> 上下文自动解析）
const options = reactive({
  location: '北京' as unknown,
  renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true },
});
watch(panelEl, (el) => { options.renderOptions.panel = el ?? undefined; });
watch(autoViewport, (v) => { options.renderOptions.autoViewport = v; });

const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
let hook: TruckRouteHookResult | null = null;

const TruckRouteInner = defineComponent({
  name: 'TruckRouteInner',
  setup() {
    const r = useTruckRoute(options as any);
    hook = r;
    watchEffect(() => { data.value = r.data.value; loading.value = r.loading.value; error.value = r.error.value; });
    return () => null;
  },
});

const parsePoint = (s: string) => { const [lng, lat] = s.split(',').map(Number); return { lng, lat }; };
const handleSearch = () => { hook?.search(parsePoint(start.value), parsePoint(end.value)); };
const clearResults = () => { hook?.clearResults(); };
const cancel = () => { hook?.cancel(); };
const enableAV = () => { autoViewport.value = true; hook?.enableAutoViewport(); };
const disableAV = () => { autoViewport.value = false; hook?.disableAutoViewport(); };

// status 依赖 data 变化重算（getStatus 非响应式）
const status = computed(() => { void data.value; return hook?.getStatus?.(); });
const hasResult = computed(() => !!data.value && typeof data.value === 'object' && Object.keys(data.value as object).length > 0);

const CODE_EXAMPLE = `const { search, clearResults, getStatus, data, cancel } = useTruckRoute({
  location: '北京',
  renderOptions: { map, panel: domEl, autoViewport: true },
});
search({ lng: 116.404, lat: 39.915 }, { lng: 116.397, lat: 39.908 });`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <TruckRouteInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>useTruckRoute</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。货车路线规划。search 只接受坐标(Point)。</p>
      </section>
      <section>
        <h3>起点 (lng,lat)</h3>
        <input class="full-width" v-model="start" @keydown.enter="handleSearch" />
      </section>
      <section>
        <h3>终点 (lng,lat)</h3>
        <input class="full-width" v-model="end" @keydown.enter="handleSearch" />
      </section>
      <section>
        <h3>操作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button @click="handleSearch" :disabled="!supported || loading">{{ loading ? 'searching...' : 'search' }}</button>
          <button @click="clearResults">clear</button>
          <button @click="cancel">cancel</button>
        </div>
        <div class="btn-group" style="flex-wrap:wrap;margin-top:4px">
          <button style="font-size:11px" :class="{ active: autoViewport }" @click="enableAV">enableAutoViewport</button>
          <button style="font-size:11px" :class="{ active: !autoViewport }" @click="disableAV">disableAutoViewport</button>
        </div>
      </section>
      <section>
        <h3>状态</h3>
        <ul class="state-list">
          <li>loading: <code>{{ String(loading) }}</code></li>
          <li>error: <code>{{ error?.message ?? 'null' }}</code></li>
          <li>status: <code>{{ String(status) }}</code></li>
          <li>data: <code>{{ hasResult ? '有结果' : '空/无结果' }}</code></li>
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
