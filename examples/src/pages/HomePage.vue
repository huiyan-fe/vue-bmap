<script setup lang="ts">
import { COMPONENTS, CATEGORIES } from '../config/components';
import { CHANGELOG } from '../config/changelog';
import { EXAMPLE_AK } from '../mapMode';
import CodeBlock from '../components/CodeBlock.vue';

const hasAk = !!EXAMPLE_AK;

const FEATURES = [
  { title: '声明式 API', desc: '用 Vue 组件与 composable 操作地图，跟着响应式状态走' },
  { title: '多版本 JSAPI', desc: '兼容 JSAPI 3.0 / 4.0（WebGL），按需选择配置' },
  { title: 'TypeScript', desc: '完整类型定义，IDE 自动补全，类型安全' },
  { title: '能力矩阵', desc: '运行时能力探测，v3/v4 差异自动降级' },
];

const HELLO = `<script setup>
import { BMapProvider, Map, Marker } from '@baidumap/vue-bmap';
<\/script>
<template>
  <BMapProvider ak="您的密钥" version="4.0">
    <Map :center="{ lng: 116.4, lat: 39.9 }" :zoom="11">
      <Marker :position="{ lng: 116.4, lat: 39.9 }" />
    </Map>
  </BMapProvider>
</template>`;
</script>

<template>
  <div class="home-page">
    <header class="home-hero">
      <h1 class="home-title">Vue-BMap</h1>
      <p class="home-subtitle">基于百度地图 JavaScript API 封装的 Vue 3 组件库</p>
      <p class="home-desc">
        使用声明式组件方式开发百度地图应用，同时支持百度地图 JSAPI 3.0（2D）与 4.0（WebGL），可按需选择配置。
        提供地图容器、覆盖物、控件、图层、路线规划、输入提示等一系列组件与 composable。
      </p>
    </header>

    <section class="home-features">
      <div v-for="(f, i) in FEATURES" :key="i" class="home-feature-card">
        <h3>{{ f.title }}</h3>
        <p>{{ f.desc }}</p>
      </div>
    </section>

    <section class="home-section">
      <h2 class="home-section-title">快速开始</h2>
      <div class="home-code-label">安装</div>
      <CodeBlock code="npm install @baidumap/vue-bmap" language="bash" />
      <p v-if="!hasAk" class="home-note" style="color:#f5222d">
        未检测到 VITE_BMAP_AK：请在仓库根目录复制 .env.example 为 .env 并填入你的百度地图 ak。
      </p>
      <div class="home-code-label" style="margin-top:16px">Hello World</div>
      <CodeBlock :code="HELLO" language="markup" />
    </section>

    <section class="home-section">
      <h2 class="home-section-title">组件列表</h2>
      <p class="home-section-desc">点击组件名称查看示例与代码</p>
      <div class="home-components">
        <div v-for="cat in CATEGORIES" :key="cat" class="home-category">
          <h3 class="home-category-title">{{ cat }}</h3>
          <div class="home-component-grid">
            <a
              v-for="c in COMPONENTS.filter((x) => x.category === cat)"
              :key="c.id"
              :href="`#/component/${c.id}`"
              class="home-component-link"
            >
              <span class="home-component-name">{{ c.name }}</span>
              <span class="home-component-desc">{{ c.description }}</span>
            </a>
          </div>
        </div>
      </div>
    </section>

    <section class="home-section">
      <h2 class="home-section-title">更新日志</h2>
      <div class="home-changelog">
        <div v-for="entry in CHANGELOG" :key="entry.version" class="home-changelog-entry" style="margin-bottom:20px">
          <h3 class="home-category-title" style="display:flex;align-items:baseline;gap:8px">
            <span>{{ entry.version }}</span>
            <span v-if="entry.date" style="font-size:12px;font-weight:400;color:#888">{{ entry.date }}</span>
          </h3>
          <ul style="margin:6px 0 0;padding-left:20px;line-height:1.9;font-size:13px;color:#444">
            <li v-for="(c, i) in entry.changes" :key="i">{{ c }}</li>
          </ul>
        </div>
      </div>
    </section>

    <footer class="home-footer">
      <p>
        <a href="https://github.com/huiyan-fe/vue-bmap" target="_blank" rel="noopener noreferrer">GitHub</a>
        · <a href="https://www.npmjs.com/package/@baidumap/vue-bmap" target="_blank" rel="noopener noreferrer">npm</a>
        · MIT License
      </p>
    </footer>
  </div>
</template>
