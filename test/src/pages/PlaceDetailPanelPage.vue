<script setup lang="ts">
/**
 * PlaceDetail Panel 测试页 — 使用框架的 PlaceDetailPanel 组件。
 * 通过条件渲染显示/隐藏面板，uid 变化自动 render。
 */
import { computed, ref } from 'vue';
import { Map, PlaceDetailPanel, useCapabilities } from '@baidumap/vue-bmap';
import { BEIJING } from '../TestProvider';

const PRESET_UIDS = [
  { label: '故宫', uid: '06d2dffda107b0ef89f15db6' },
];

const RENDER_OPTS = [
  { key: 'displayCarousel', label: '照片轮播' },
  { key: 'displayTag', label: '标签' },
  { key: 'displayRating', label: '评分' },
  { key: 'displayPrice', label: '价格' },
  { key: 'displayBangdan', label: '排名' },
  { key: 'displayTradeTag', label: '行业标签' },
  { key: 'displayShopHours', label: '营业时间' },
  { key: 'displayContactInformation', label: '联系方式' },
  { key: 'displayAddress', label: '地址' },
  { key: 'displayComment', label: '评论' },
  { key: 'displayCommentTotalCount', label: '评论总数' },
] as const;

const caps = useCapabilities();
const supported = computed(() => caps.value.has('PlaceDetail'));
const uid = ref(PRESET_UIDS[0].uid);
const compact = ref(false);
const visible = ref(true);
const rerenderKey = ref(0);
const contactCount = ref(3);
const opts = ref<Record<string, boolean>>(
  Object.fromEntries(RENDER_OPTS.map(o => [o.key, true])),
);

const renderOptions = computed(() => ({ ...opts.value, contactInformationCount: contactCount.value }));
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%" />
      <!-- 详情面板通过条件渲染显示/隐藏 -->
      <PlaceDetailPanel
        v-if="visible"
        :key="rerenderKey"
        :uid="uid"
        :compact="compact"
        :render-options="renderOptions"
        :style="{
          position: 'absolute', top: '10px', left: '10px', zIndex: 10,
          width: '440px', background: '#fff', borderRadius: '8px', padding: '4px',
          fontSize: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          overflow: 'auto', maxHeight: 'calc(100% - 20px)',
        }"
      />
    </div>
    <div class="test-controls">
      <h2>PlaceDetail Panel 模式</h2>

      <section>
        <h3>能力</h3>
        <span :class="`cap-tag ${supported ? 'ok' : 'no'}`">{{ supported ? 'v4+' : 'v3 ✗' }}</span>
        <p class="muted small">@since 4.0。组件方式渲染，uid 变化自动 render。</p>
      </section>

      <section>
        <h3>预设地点</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button v-for="p in PRESET_UIDS" :key="p.uid" :class="uid === p.uid ? 'active' : ''"
            @click="uid = p.uid" :disabled="!supported">
            {{ p.label }}
          </button>
        </div>
      </section>

      <section>
        <h3>uid</h3>
        <input class="full-width" v-model="uid" />
      </section>

      <section>
        <h3>显示控制</h3>
        <div class="btn-group">
          <button :class="visible ? 'active' : ''" @click="visible = !visible">
            {{ visible ? '隐藏面板' : '显示面板' }}
          </button>
          <button style="font-size:11px" @click="rerenderKey++">
            重建（rerender）
          </button>
        </div>
      </section>

      <section>
        <h3>选项</h3>
        <label class="checkbox-row">
          <input type="checkbox" v-model="compact" />
          compact（紧凑模式）
        </label>
      </section>

      <section>
        <h3>渲染选项（renderOptions）</h3>
        <div style="display:flex;flex-wrap:wrap;gap:6px">
          <label v-for="o in RENDER_OPTS" :key="o.key" class="checkbox-row" style="margin-bottom:4px;font-size:12px">
            <input type="checkbox" :checked="opts[o.key] ?? false"
              @change="opts = { ...opts, [o.key]: ($event.target as HTMLInputElement).checked }" />
            {{ o.label }}
          </label>
        </div>
        <div class="input-row" style="margin-top:8px">
          <label style="font-size:12px">联系方式数量</label>
          <input type="number" min="1" max="10" :value="contactCount"
            @input="contactCount = Number(($event.target as HTMLInputElement).value)" style="width:60px" />
        </div>
      </section>
    </div>
  </div>
</template>
