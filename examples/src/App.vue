<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { BMapProvider } from '@baidumap/vue-bmap';
import { EXAMPLE_AK, getMapVersion, setMapVersion } from './mapMode';
import { COMPONENTS, CATEGORIES } from './config/components';
import HomePage from './pages/HomePage.vue';
import ComponentPage from './pages/ComponentPage.vue';
import { LbsHeader } from './components/LbsHeader';
import './demos/registerAll';

const version = getMapVersion();
const hash = ref(window.location.hash);
const onHashChange = () => { hash.value = window.location.hash; };
onMounted(() => window.addEventListener('hashchange', onHashChange));
onUnmounted(() => window.removeEventListener('hashchange', onHashChange));

const currentId = computed(() => {
  const m = hash.value.match(/^#\/component\/(.+)$/);
  return m ? m[1] : null;
});

// 自定义版本下拉
const VERSIONS = ['4.0', '3.0'];
const open = ref(false);
const wrap = ref<HTMLElement | null>(null);
const pick = (v: string) => { open.value = false; if (v !== version) setMapVersion(v as any); };
const onDocClick = (e: MouseEvent) => { if (open.value && wrap.value && !wrap.value.contains(e.target as Node)) open.value = false; };
onMounted(() => document.addEventListener('mousedown', onDocClick));
onUnmounted(() => document.removeEventListener('mousedown', onDocClick));
</script>

<template>
  <BMapProvider :ak="EXAMPLE_AK" :version="version">
    <template #fallback><div class="loading">加载 JSAPI 中…</div></template>
    <template #error="{ error }"><div class="error">JSAPI 加载失败：{{ error?.message }}（请检查 ak 与域名白名单）</div></template>

    <div class="app-layout">
      <LbsHeader />
      <div class="app-body">
        <aside class="app-sidebar">
          <div class="app-sidebar-head">
            <a href="#/" class="app-sidebar-title">Vue-BMap</a>
            <div class="app-sidebar-select-wrap">
              <span class="app-sidebar-select-label">地图版本</span>
              <div class="app-sidebar-select" ref="wrap">
                <button type="button" class="app-sidebar-select-trigger" @click="open = !open">
                  {{ version }}
                  <svg :class="['app-sidebar-select-arrow', { 'is-open': open }]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                <ul v-if="open" class="app-sidebar-select-list" role="listbox">
                  <li v-for="v in VERSIONS" :key="v" :class="['app-sidebar-select-option', { 'is-active': v === version }]" @click="pick(v)">
                    {{ v }}
                    <svg v-if="v === version" class="app-sidebar-option-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <nav class="app-sidebar-nav">
            <template v-for="cat in CATEGORIES" :key="cat">
              <div class="app-sidebar-cat">{{ cat }}</div>
              <a
                v-for="c in COMPONENTS.filter((x) => x.category === cat)"
                :key="c.id"
                :href="`#/component/${c.id}`"
                :class="['app-sidebar-link', { active: currentId === c.id, todo: c.todo }]"
              >{{ c.name }}<span v-if="c.todo" class="todo-tag">规划中</span></a>
            </template>
          </nav>

          <div class="app-sidebar-foot">
            <a class="app-sidebar-icon" href="https://github.com/huiyan-fe/vue-bmap" target="_blank" rel="noopener noreferrer" title="GitHub">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            </a>
            <a class="app-sidebar-icon" href="https://www.npmjs.com/package/@baidumap/vue-bmap" target="_blank" rel="noopener noreferrer" title="npm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.331h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z" /></svg>
            </a>
          </div>
        </aside>

        <main class="app-main">
          <ComponentPage v-if="currentId" :id="currentId" :key="currentId" />
          <HomePage v-else />
        </main>
      </div>
    </div>
  </BMapProvider>
</template>
