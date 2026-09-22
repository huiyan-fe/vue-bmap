<script setup lang="ts">
/**
 * useGeolocation 测试页 —— 由 react-bmap 的 GeolocationPage.tsx 忠实复刻。
 * 覆盖：getCurrentPosition / getStatus / enableSDKLocation / disableSDKLocation / cancel。
 *
 * Vue 组织方式：hook 在 <Map> 内部子组件里调用，返回的 data/loading/error 是 Ref，用
 * watchEffect 桥接到外层控制面板。
 */
import { computed, defineComponent, ref, shallowRef, watchEffect } from 'vue';
import { Map, useGeolocation, useCapabilities } from '@baidumap/vue-bmap';
import type { GeolocationHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('Geolocation'));
const sdkLocation = ref(false);

const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
let hook: GeolocationHookResult | null = null;

const GeolocationInner = defineComponent({
  name: 'GeolocationInner',
  setup() {
    const r = useGeolocation({ enableSDKLocation: sdkLocation.value });
    hook = r;
    watchEffect(() => { data.value = r.data.value; loading.value = r.loading.value; error.value = r.error.value; });
    return () => null;
  },
});

// status 依赖 data 变化重算（getStatus 非响应式，借 data 触发刷新）
const status = computed(() => { void data.value; void loading.value; return hook?.getStatus?.(); });
const getCurrentPosition = () => { hook?.getCurrentPosition(); };
const cancel = () => { hook?.cancel(); };
const enableSDK = () => { sdkLocation.value = true; hook?.enableSDKLocation(); };
const disableSDK = () => { sdkLocation.value = false; hook?.disableSDKLocation(); };

const stringifyData = (d: unknown): string => {
  try { return JSON.stringify(d, (_k, v) => (v instanceof HTMLElement ? '<DOM>' : typeof v === 'function' ? '<fn>' : v), 2); }
  catch { return String(d); }
};

const CODE_EXAMPLE = `import { useGeolocation } from '@baidumap/vue-bmap';

const { getCurrentPosition, getStatus, enableSDKLocation, disableSDKLocation, data, cancel } = useGeolocation();
getCurrentPosition(); // 获取当前位置
getStatus();          // 获取定位状态
enableSDKLocation();  // 启用 SDK 定位`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <GeolocationInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>useGeolocation</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。浏览器定位服务。v3 不支持。</p>
      </section>
      <section>
        <h3>操作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button @click="getCurrentPosition" :disabled="!supported || loading">{{ loading ? 'locating...' : '获取位置' }}</button>
          <button @click="cancel">cancel</button>
        </div>
        <div class="btn-group" style="flex-wrap:wrap;margin-top:4px">
          <button style="font-size:11px" :class="{ active: sdkLocation }" @click="enableSDK">enableSDKLocation</button>
          <button style="font-size:11px" :class="{ active: !sdkLocation }" @click="disableSDK">disableSDKLocation</button>
        </div>
      </section>
      <section>
        <h3>状态</h3>
        <ul class="state-list">
          <li>loading: <code>{{ String(loading) }}</code></li>
          <li>error: <code>{{ error?.message ?? 'null' }}</code></li>
          <li>status: <code>{{ String(status) }}</code></li>
          <li>data: <code>{{ data ? '有结果' : 'null' }}</code></li>
        </ul>
      </section>
      <section v-if="data">
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
