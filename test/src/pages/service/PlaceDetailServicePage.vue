<script setup lang="ts">
/**
 * PlaceDetail 测试页（Service panel 方式）—— 由 react-bmap 的 PlaceDetailPage.tsx 忠实复刻。
 * render(uid) 渲染地点详情到面板容器；覆盖 render / rerender / dispose。
 *
 * Vue 组织方式：hook 在 <Map> 内部子组件里调用，返回的 data/loading/error 是 Ref，用
 * watchEffect 桥接到外层控制面板；面板 DOM 就绪后写入 reactive options.container 触发 hook 重建
 * （对齐 react 的 panel callback ref → state）。
 */
import { computed, defineComponent, reactive, ref, shallowRef, watch, watchEffect } from 'vue';
import { Map, usePlaceDetail, useCapabilities } from '@baidumap/vue-bmap';
import type { PlaceDetailHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const DEFAULT_UID = '06d2dffda107b0ef89f15db6';

const caps = useCapabilities();
const supported = computed(() => caps.value.has('PlaceDetail'));

const uid = ref(DEFAULT_UID);
const panelEl = ref<HTMLElement | null>(null);

// 响应式 options：container 变化触发 hook 重建
const options = reactive({
  container: undefined as HTMLElement | undefined,
  renderOptions: {
    displayCarousel: true,
    displayTag: true,
    displayRating: true,
    displayPrice: true,
    displayBangdan: true,
    displayTradeTag: true,
    displayShopHours: true,
    displayContactInformation: true,
    contactInformationCount: 3,
    displayAddress: true,
    displayComment: true,
    displayCommentTotalCount: true,
  },
});
watch(panelEl, (el) => { options.container = el ?? undefined; });

const data = shallowRef<unknown>(undefined);
const loading = ref(false);
const error = ref<Error | null>(null);
let hook: PlaceDetailHookResult | null = null;

const PlaceDetailInner = defineComponent({
  name: 'PlaceDetailInner',
  setup() {
    const r = usePlaceDetail(options as any);
    hook = r;
    watchEffect(() => { data.value = r.data.value; loading.value = r.loading.value; error.value = r.error.value; });
    return () => null;
  },
});

const render = (id: string) => { hook?.render(id); };
const rerender = () => { hook?.rerender(); };
const dispose = () => { hook?.dispose(); };

const CODE_EXAMPLE = `const { render, rerender, dispose, data } = usePlaceDetail({
  container: domEl,
  renderOptions: {
    displayCarousel: true,
    displayTag: true,
    displayRating: true,
    displayPrice: true,
    displayAddress: true,
    displayComment: true,
  },
});
render('06d2dffda107b0ef89f15db6'); // 天安门 uid`;
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <PlaceDetailInner />
      </Map>
    </div>
    <div class="test-controls">
      <h2>PlaceDetail</h2>
      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。地点详情面板模式。render(uid) 渲染到容器。</p>
      </section>
      <section>
        <h3>uid</h3>
        <input class="full-width" v-model="uid" @keydown.enter="render(uid)" />
      </section>
      <section>
        <h3>操作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button @click="render(uid)" :disabled="!supported || loading">{{ loading ? 'rendering...' : 'render' }}</button>
          <button style="font-size:11px" @click="rerender">rerender</button>
          <button style="font-size:11px" @click="dispose">dispose</button>
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
        <h3>详情面板</h3>
        <div ref="panelEl" style="min-height:100px;background:#fff;border-radius:4px;padding:4px;font-size:12px;border:1px solid #ccc;overflow:auto;max-height:300px">
          <span class="muted small">render 后显示地点详情</span>
        </div>
      </section>
      <section>
        <h3>代码示例</h3>
        <pre style="font-size:10px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ CODE_EXAMPLE }}</pre>
      </section>
    </div>
  </div>
</template>
