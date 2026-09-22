<script setup lang="ts">
/**
 * usePanoramaService 测试页 —— 由 react-bmap 的 PanoramaServicePage.tsx 忠实复刻。
 * 覆盖：getPanoramaById / getPanoramaByLocation / cancel。
 *
 * Vue 组织方式：hook 在 <Map> 内部子组件里调用，返回的 data/loading/error 是 Ref，用
 * watchEffect 桥接到外层控制面板。
 */
import { computed, defineComponent, ref, shallowRef, watchEffect } from 'vue';
import { Map, usePanoramaService, useCapabilities } from '@baidumap/vue-bmap';
import type { PanoramaServiceHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('PanoramaService'));

const mode = ref<'byId' | 'byLocation'>('byLocation');
const panoId = ref('');
const lng = ref('116.404');
const lat = ref('39.915');
const radius = ref(100);

const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
let hook: PanoramaServiceHookResult | null = null;

const PanoramaServiceInner = defineComponent({
  name: 'PanoramaServiceInner',
  setup() {
    const r = usePanoramaService();
    hook = r;
    watchEffect(() => { data.value = r.data.value; loading.value = r.loading.value; error.value = r.error.value; });
    return () => null;
  },
});

const handleRun = () => {
  if (mode.value === 'byId' && panoId.value) {
    hook?.getPanoramaById(panoId.value);
  } else if (mode.value === 'byLocation') {
    hook?.getPanoramaByLocation({ lng: Number(lng.value), lat: Number(lat.value) }, radius.value);
  }
};

const cancel = () => { hook?.cancel(); };

const stringifyData = (d: unknown): string => {
  try { return JSON.stringify(d, (_k, v) => (v instanceof HTMLElement ? '<DOM>' : typeof v === 'function' ? '<fn>' : v), 2); }
  catch { return String(d); }
};

const CODE_EXAMPLE = `import { usePanoramaService } from '@baidumap/vue-bmap';

const { getPanoramaById, getPanoramaByLocation, data, cancel } = usePanoramaService();
getPanoramaByLocation({ lng: 116.404, lat: 39.915 }, 100); // 按坐标查
getPanoramaById('pano_id_here');                            // 按 ID 查`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <PanoramaServiceInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>usePanoramaService</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">全版本共有。全景服务，根据坐标或 ID 获取全景数据。</p>
      </section>
      <section>
        <h3>查询模式</h3>
        <div class="btn-group">
          <button :class="{ active: mode === 'byLocation' }" @click="mode = 'byLocation'">按坐标查询</button>
          <button :class="{ active: mode === 'byId' }" @click="mode = 'byId'">按 ID 查询</button>
        </div>
      </section>
      <section v-if="mode === 'byLocation'">
        <h3>坐标 + 半径</h3>
        <div class="input-row">
          <label>lng</label><input type="number" step="0.001" v-model="lng" />
          <label>lat</label><input type="number" step="0.001" v-model="lat" />
        </div>
        <label class="checkbox-row">半径 (m) <input type="number" v-model.number="radius" /></label>
      </section>
      <section v-else>
        <h3>全景 ID</h3>
        <input class="full-width" v-model="panoId" @keydown.enter="handleRun" />
      </section>
      <section>
        <h3>操作</h3>
        <div class="btn-group">
          <button @click="handleRun" :disabled="!supported || loading">{{ loading ? 'searching...' : 'run' }}</button>
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
      <section v-if="data != null">
        <h3>结果</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto;max-height:300px">{{ stringifyData(data) }}</pre>
      </section>
      <section>
        <h3>代码示例</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ CODE_EXAMPLE }}</pre>
      </section>
    </div>
  </div>
</template>
