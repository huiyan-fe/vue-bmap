<script setup lang="ts">
/**
 * useAutocomplete 测试页 —— 由 react-bmap 的 AutocompletePage.tsx 忠实复刻。
 * 输入提示服务。绑定 input 元素后，输入字符自动触发搜索并显示下拉建议。
 * hook 在 <Map> 内部子组件里调用（与其它 service 页保持一致的组织方式）。
 */
import { computed, defineComponent, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import { Map, useAutocomplete, useCapabilities } from '@baidumap/vue-bmap';
import type { AutocompleteHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';
import { safeStringifySdkResult } from '../../utils/sdkResult';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('Autocomplete'));

const inputEl = ref<HTMLInputElement | null>(null);

const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
let hook: AutocompleteHookResult | null = null;

const options = reactive({
  location: '北京' as unknown,
  input: undefined as HTMLElement | undefined,
  onSearchComplete: (results: unknown) => console.log('[Autocomplete] onSearchComplete:', results),
});

// input DOM 就绪后设入 options → 触发 hook 重建并绑定输入框（对齐 react 的 input callback ref → state）
watch(inputEl, (el) => { options.input = el ?? undefined; });

const AutocompleteInner = defineComponent({
  name: 'AutocompleteInner',
  setup() {
    const r = useAutocomplete(options as any);
    hook = r;
    watchEffect(() => {
      data.value = r.data.value;
      loading.value = r.loading.value;
      error.value = r.error.value;
    });
    return () => null;
  },
});

const show = () => hook?.show();
const hide = () => hook?.hide();
const getResults = () => console.log('getResults:', hook?.getResults());
const cancel = () => hook?.cancel();

const CODE_EXAMPLE = `// 绑定 input 元素，输入字符自动触发搜索
const { show, hide, getResults, data } = useAutocomplete({
  location: '北京',
  input: document.getElementById('myInput'),
  onSearchComplete: (results) => console.log(results),
});

// 辅助操作
show();       // 显示建议列表
hide();       // 隐藏建议列表
getResults(); // 获取结果`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <AutocompleteInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>useAutocomplete</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'supported' : 'unsupported' }}</span>
        <p class="muted small">全版本共有。输入提示服务。绑定 input 元素后，输入字符自动触发搜索并显示下拉建议。</p>
      </section>

      <section>
        <h3>输入框（输入字符自动搜索）</h3>
        <input ref="inputEl" class="full-width" placeholder="输入关键词，如：餐厅" style="padding:6px 8px;border:1px solid #ccc;border-radius:4px" />
        <p class="muted small">在此输入框输入字符会自动触发 onSearchComplete，下方显示下拉建议。</p>
      </section>

      <section>
        <h3>操作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="show">show（显示建议）</button>
          <button style="font-size:11px" @click="hide">hide（隐藏建议）</button>
          <button style="font-size:11px" @click="getResults">getResults</button>
          <button @click="cancel">cancel</button>
        </div>
      </section>

      <section>
        <h3>状态</h3>
        <ul class="state-list">
          <li>loading: <code>{{ String(loading) }}</code></li>
          <li>error: <code>{{ error?.message ?? 'null' }}</code></li>
          <li>supported: <code>{{ String(supported) }}</code></li>
          <li>data: <code>{{ data ? '有结果' : 'null' }}</code></li>
        </ul>
      </section>

      <section v-if="data != null">
        <h3>结果</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto;max-height:300px">{{ safeStringifySdkResult(data) }}</pre>
      </section>

      <section>
        <h3>代码示例</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ CODE_EXAMPLE }}</pre>
      </section>
    </div>
  </div>
</template>

