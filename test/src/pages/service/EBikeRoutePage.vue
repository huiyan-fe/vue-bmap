<script setup lang="ts">
/**
 * useEBikeRoute 测试页 —— 由 RidingRoutePage.vue 忠实复刻（EBikeRoute 与 RidingRoute 同构：
 * SDK 请求 qt=drct_riding、riding_type=1 区分电动车，接口与结果结构均同骑行）。
 * 电动车路线规划（@since 4.0，v3 不支持）。search 只接受坐标(Point)。
 * hook 在 <Map> 内部子组件里调用。
 */
import { computed, defineComponent, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import { Map, useEBikeRoute, useCapabilities } from '@baidumap/vue-bmap';
import type { EBikeRouteHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { safeStringifySdkResult } from '../../utils/sdkResult';
import { useLog } from '../overlay/useLog';
import EventLog from '../../components/EventLog.vue';

const STATUS_MEANING: Record<number, string> = {
  0: '成功', 1: '无路线', 2: '结果无效', 3: '未找到', 4: '未知位置', 5: '搜索失败',
};

const caps = useCapabilities();
const supported = computed(() => caps.value.has('EBikeRoute'));

const start = ref('116.404,39.915');
const end = ref('116.397,39.908');
const panelEl = ref<HTMLElement | null>(null);

const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
const status = ref<number | undefined>(undefined);
let hook: EBikeRouteHookResult | null = null;

const { eventLog, log } = useLog();

const options = reactive({
  location: '北京' as unknown,
  renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true },
  onSearchComplete: (results: any) => {
    let num = '-';
    try { num = typeof results?.getNumRoutes === 'function' ? results.getNumRoutes() : '-'; } catch { /* noop */ }
    log(`onSearchComplete：${num} 条路线`);
  },
});

watch(panelEl, (el) => { options.renderOptions.panel = el ?? undefined; });

const EBikeRouteInner = defineComponent({
  name: 'EBikeRouteInner',
  setup() {
    const r = useEBikeRoute(options as any);
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
const handleSearch = () => {
  if (!hook) return;
  log(`search(${start.value} → ${end.value})`);
  hook.search(parsePoint(start.value), parsePoint(end.value));
};
const setAutoViewport = (on: boolean) => {
  options.renderOptions.autoViewport = on;
  if (on) hook?.enableAutoViewport(); else hook?.disableAutoViewport();
  log(on ? 'enableAutoViewport' : 'disableAutoViewport');
};
const clearResults = () => { hook?.clearResults(); log('clearResults'); };
const cancel = () => { hook?.cancel(); log('cancel'); };
const applyPolylineStyle = () => {
  hook?.setPolylineStyle({ strokeColor: '#1890ff', strokeWeight: 6, strokeOpacity: 1 });
  log('setPolylineStyle({ strokeColor: #1890ff, strokeWeight: 6 })');
};
const applyLocation = () => {
  hook?.setLocation('北京');
  log('setLocation("北京")');
};
const hasData = computed(() => !!data.value && Object.keys(data.value as object).length > 0);

const CODE_EXAMPLE = `const { search, clearResults, enableAutoViewport, disableAutoViewport,
  setLocation, setPolylineStyle, getStatus, data, loading, cancel } = useEBikeRoute({
  location: '北京',
  renderOptions: { map, panel: domEl, autoViewport: true },
  onSearchComplete: (results) => console.log(results),
});

// search 只接受坐标(Point)，不支持字符串地址
search({ lng: 116.404, lat: 39.915 }, { lng: 116.397, lat: 39.908 });

setPolylineStyle({ strokeColor: '#1890ff', strokeWeight: 6 });
setLocation('北京');
getStatus(); // 0=成功`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <EBikeRouteInner />
      </Map>
      <EventLog :log="eventLog" hint="search / onSearchComplete / clearResults / setPolylineStyle / setLocation 等操作日志" @clear="eventLog = []" />
    </div>
    <div class="test-controls">
      <h2>useEBikeRoute</h2>

      <section>
        <h3>能力 <span :class="`cap-tag ${caps.has('EBikeRoute') ? 'ok' : 'no'}`">{{ caps.has('EBikeRoute') ? 'v4+' : 'v3 ✗' }}</span></h3>
        <p class="muted small">@since 4.0。电动车路线规划（与骑行同构：SDK 请求 qt=drct_riding、riding_type=1）。search 只接受坐标(Point)。v3 不支持。</p>
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
        <h3>路线样式 / 定位</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="applyPolylineStyle">setPolylineStyle（蓝色粗线）</button>
          <button style="font-size:11px" @click="applyLocation">setLocation('北京')</button>
        </div>
        <p class="muted small">setPolylineStyle 设置路线折线样式（strokeColor / strokeWeight / strokeOpacity）；setLocation 重置检索位置（城市名或 Point）。</p>
      </section>

      <section>
        <h3>状态</h3>
        <ul class="state-list">
          <li>loading: <code>{{ String(loading) }}</code></li>
          <li>error: <code>{{ error?.message ?? 'null' }}</code></li>
          <li>status: <code>{{ String(status) }}</code> ({{ status !== undefined ? (STATUS_MEANING[status] ?? '未知') : 'N/A' }})</li>
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
