42<script setup lang="ts">
/**
 * useLocalSearch panel 使用时机验证页。
 *
 * 对照三种写法（都放在 <Map> 内部，以排除「不在 Provider/Map 内」的干扰）：
 * A. panel 传容器 id 字符串 —— 不依赖 DOM mount 时机，推荐
 * B. panel 传 HTMLElement，但 options 用 reactive，onMounted 里再赋值 —— 也可行
 * C. panel 直接传 Ref —— 元素就绪后自动生效（1.0.5+）
 * D. onMounted 里同步调用 —— 实测不报错（Vue 会恢复 currentInstance/scope），但不推荐
 * E. onMounted 里 await 之后再调用 —— 必然报注入错误（真实反例）
 *
 * 钩子必须在子组件 setup() 里调用（本页三个 Demo 都是子组件）。
 */
import { computed, defineComponent, onMounted, reactive, ref, shallowRef } from 'vue';
import { Map, useLocalSearch } from '@baidumap/vue-bmap';
import type { LocalSearchHookResult } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const keywordA = ref('餐厅');
const keywordB = ref('酒店');

const hookA = shallowRef<LocalSearchHookResult | null>(null);
const hookB = shallowRef<LocalSearchHookResult | null>(null);

const loadingA = computed(() => hookA.value?.loading.value ?? false);
const loadingB = computed(() => hookB.value?.loading.value ?? false);
const dataA = computed(() => hookA.value?.data.value);
const dataB = computed(() => hookB.value?.data.value);

// ── A：panel 直接传容器 id 字符串（不依赖 mount 时机）──
const DemoA = defineComponent({
  name: 'PanelByIdString',
  setup() {
    const r = useLocalSearch({
      location: '北京',
      renderOptions: { panel: 'ls-panel-a', autoViewport: true },
    });
    hookA.value = r;
    return () => null;
  },
});

// ── B：panel 传 HTMLElement，reactive options + onMounted 赋值 ──
const panelElB = ref<HTMLElement | null>(null);
const optionsB = reactive({
  location: '北京' as unknown,
  renderOptions: { panel: undefined as HTMLElement | undefined, autoViewport: true },
});
onMounted(() => { optionsB.renderOptions.panel = panelElB.value ?? undefined; });

const DemoB = defineComponent({
  name: 'PanelByElement',
  setup() {
    const r = useLocalSearch(optionsB as any);
    hookB.value = r;
    return () => null;
  },
});

// ── C：panel 直接传 Ref（1.0.5 起支持：元素就绪后自动生效，无需手动赋值）──
const keywordC = ref('超市');
const panelElC = ref<HTMLElement | null>(null);
const hookC = shallowRef<LocalSearchHookResult | null>(null);
const loadingC = computed(() => hookC.value?.loading.value ?? false);
const dataC = computed(() => hookC.value?.data.value);

const DemoCRef = defineComponent({
  name: 'PanelByRef',
  setup() {
    const r = useLocalSearch({
      location: '北京',
      renderOptions: { panel: panelElC, autoViewport: true },
    });
    hookC.value = r;
    return () => null;
  },
});

// ── C：onMounted 里同步调用（实测不报注入错误，但不推荐）──
const syncError = ref('');
const DemoCSync = defineComponent({
  name: 'HookInOnMountedSync',
  setup() {
    onMounted(() => {
      try {
        useLocalSearch({ location: '北京' });
        syncError.value = '未抛错';
      } catch (e) {
        syncError.value = (e as Error).message;
      }
    });
    return () => null;
  },
});

// ── D：onMounted 里 await 之后再调用（currentInstance 已丢失 → 必然报错）──
const asyncError = ref('');
const DemoCAsync = defineComponent({
  name: 'HookInOnMountedAsync',
  setup() {
    onMounted(async () => {
      await Promise.resolve(); // 模拟 await 之后再调用
      try {
        useLocalSearch({ location: '北京' });
        asyncError.value = '（未报错，与预期不符）';
      } catch (e) {
        asyncError.value = (e as Error).message;
      }
    });
    return () => null;
  },
});

const count = (d: unknown) => {
  if (!d) return 'null';
  const n = (d as any)?.getNumPois?.();
  return n !== undefined ? `${n} 条` : '有结果';
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <DemoA />
        <DemoB />
        <DemoCRef />
        <DemoCSync />
        <DemoCAsync />
      </Map>
    </div>

    <div class="test-controls">
      <h2>useLocalSearch · panel 时机验证</h2>

      <section>
        <h3>方案 A：panel 传 id 字符串 ✅ 推荐</h3>
        <p class="muted small">
          <code>renderOptions: { panel: 'ls-panel-a' }</code>，SDK 在渲染结果时自行
          <code>getElementById</code>，不依赖元素是否已 mount。
        </p>
        <div class="btn-group" style="flex-wrap:wrap">
          <input class="full-width" v-model="keywordA" @keydown.enter="hookA?.search(keywordA)" />
          <button :disabled="!hookA || loadingA" @click="hookA?.search(keywordA)">
            {{ loadingA ? 'searching...' : 'search' }}
          </button>
        </div>
        <p class="muted small">状态：loading={{ loadingA }}，data={{ count(dataA) }}</p>
        <div
          id="ls-panel-a"
          style="min-height:50px;background:#f5f5f5;border-radius:4px;padding:4px;font-size:12px;border:1px solid #ddd"
        >
          <span class="muted small">搜索后此处显示 SDK 结果列表（空容器即可）</span>
        </div>
      </section>

      <section>
        <h3>方案 B：panel 传元素 + onMounted 赋值 ✅ 可行</h3>
        <p class="muted small">
          setup 里 <code>panel</code> 先为 <code>undefined</code>，元素 mount 后在
          <code>onMounted</code> 写入 reactive options，hook 自动重建。
        </p>
        <div class="btn-group" style="flex-wrap:wrap">
          <input class="full-width" v-model="keywordB" @keydown.enter="hookB?.search(keywordB)" />
          <button :disabled="!hookB || loadingB" @click="hookB?.search(keywordB)">
            {{ loadingB ? 'searching...' : 'search' }}
          </button>
        </div>
        <p class="muted small">状态：loading={{ loadingB }}，data={{ count(dataB) }}</p>
        <div
          ref="panelElB"
          style="min-height:50px;background:#f5f5f5;border-radius:4px;padding:4px;font-size:12px;border:1px solid #ddd"
        >
          <span class="muted small">搜索后此处显示 SDK 结果列表（空容器即可）</span>
        </div>
      </section>

      <section>
        <h3>方案 C：panel 直接传 Ref ✅ 推荐（1.0.5+）</h3>
        <p class="muted small">
          <code>renderOptions: { panel: panelRef }</code>，setup 时元素还是 null 也没关系；
          元素就绪后自动生效，无需 reactive + onMounted 手动赋值。
        </p>
        <div class="btn-group" style="flex-wrap:wrap">
          <input class="full-width" v-model="keywordC" @keydown.enter="hookC?.search(keywordC)" />
          <button :disabled="!hookC || loadingC" @click="hookC?.search(keywordC)">
            {{ loadingC ? 'searching...' : 'search' }}
          </button>
        </div>
        <p class="muted small">状态：loading={{ loadingC }}，data={{ count(dataC) }}</p>
        <div
          ref="panelElC"
          style="min-height:50px;background:#f5f5f5;border-radius:4px;padding:4px;font-size:12px;border:1px solid #ddd"
        >
          <span class="muted small">搜索后此处显示 SDK 结果列表（空容器即可）</span>
        </div>
      </section>

      <section>
        <h3>反例 D：onMounted 里「同步」调用 —— 实测不报注入错 ❗</h3>
        <p class="muted small">
          Vue 在调用生命周期钩子时会恢复 <code>currentInstance</code> 并激活组件 scope
          （runtime-core <code>injectHook</code> → <code>setCurrentInstance</code>），
          所以同步写在 <code>onMounted</code> 里的 <code>inject()</code> 是能拿到上下文的。
          但仍不建议这么写（依赖实现细节，且服务创建时机被推迟）。
        </p>
        <pre
          style="font-size:11px;background:#fffbe6;color:#8a6d3b;padding:8px;border-radius:4px;white-space:pre-wrap;margin:0"
        >{{ syncError || '（等待 onMounted 执行...）' }}</pre>
      </section>

      <section>
        <h3>反例 E：onMounted 里「await 之后」调用 ❌ 这才是报错场景</h3>
        <p class="muted small">
          <code>await</code> 之后钩子已返回，<code>currentInstance</code> 被清空，
          注入上下文已丢失。库会在调用 <code>inject</code> 前直接抛出可定位的提示：
        </p>
        <pre
          style="font-size:11px;background:#fff1f0;color:#c0392b;padding:8px;border-radius:4px;white-space:pre-wrap;margin:0"
        >{{ asyncError || '（等待 onMounted 执行...）' }}</pre>
      </section>

      <section>
        <h3>结论</h3>
        <ul class="state-list">
          <li><code>useLocalSearch</code> 应在 <code>setup()</code> 同步调用；<b>异步回调 / await 之后 / 事件处理里调用必然报错</b>。</li>
          <li>另一种报错原因：调用 hook 的组件不在 <code>&lt;BMapProvider&gt;</code> 后代树中（例如就是渲染 Provider 的那个组件）。</li>
          <li><code>panel</code> 只需一个空容器，结果列表由 SDK 渲染；搜索框/按钮需自己实现。</li>
          <li>元素时机问题三种解法：传 id 字符串（A）、reactive + mount 后赋值（B）、直接传 Ref（C，1.0.5+ 推荐）。</li>
        </ul>
      </section>
    </div>
  </div>
</template>
