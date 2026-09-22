<script setup lang="ts">
/**
 * PlaceDetail（Overlay）测试页 — 覆盖 v4+ 地点详情组件。
 * 需要嵌套在 <Marker> 内，通过 open 控制 openPlaceDetail / closePlaceDetail。
 * v3 下不渲染组件，避免误触发 unsupported 行为。
 */
import { computed, ref } from 'vue';
import { Map, Marker, PlaceDetail, useCapabilities } from '@baidumap/vue-bmap';
import type { Point, PlaceDetailOptions, PlaceDetailRenderOptions } from '@baidumap/vue-bmap';
import { BEIJING } from '../../TestProvider';

const DEFAULT_POINT: Point = { lng: 116.404, lat: 39.915 };
const DEFAULT_UID = '06d2dffda107b0ef89f15db6';

const caps = useCapabilities();

const position = ref<Point>({ ...DEFAULT_POINT });
const uid = ref(DEFAULT_UID);
const open = ref(true);

const displayCarousel = ref(true);
const displayTag = ref(true);
const displayRating = ref(true);
const displayPrice = ref(true);
const displayBangdan = ref(false);
const displayTradeTag = ref(false);
const displayShopHours = ref(true);
const displayContactInformation = ref(true);
const contactInformationCount = ref<number | undefined>(2);
const displayAddress = ref(true);

const renderOptions = computed<PlaceDetailRenderOptions>(() => ({
  displayCarousel: displayCarousel.value,
  displayTag: displayTag.value,
  displayRating: displayRating.value,
  displayPrice: displayPrice.value,
  displayBangdan: displayBangdan.value,
  displayTradeTag: displayTradeTag.value,
  displayShopHours: displayShopHours.value,
  displayContactInformation: displayContactInformation.value,
  contactInformationCount: contactInformationCount.value,
  displayAddress: displayAddress.value,
}));

const options = computed<PlaceDetailOptions>(() => ({ renderOptions: renderOptions.value }));

const resetAll = () => {
  position.value = { ...DEFAULT_POINT };
  uid.value = DEFAULT_UID;
  open.value = true;
  displayCarousel.value = true;
  displayTag.value = true;
  displayRating.value = true;
  displayPrice.value = true;
  displayBangdan.value = false;
  displayTradeTag.value = false;
  displayShopHours.value = true;
  displayContactInformation.value = true;
  contactInformationCount.value = 2;
  displayAddress.value = true;
};
const presetLite = () => {
  displayCarousel.value = false;
  displayBangdan.value = true;
  displayTradeTag.value = true;
};
const presetBaidu = () => {
  position.value = { lng: 116.397, lat: 39.908 };
  uid.value = '435d7aea036e54355abbbcc8';
  open.value = true;
};
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="14" style="height:100%">
        <Marker :position="position" title="PlaceDetail anchor">
          <PlaceDetail v-if="caps.has('Map.setHeading')" :uid="uid" :open="open" :options="options" />
        </Marker>
      </Map>
    </div>

    <div class="test-controls">
      <h2>PlaceDetail（Overlay）</h2>

      <section>
        <h3>能力</h3>
        <div :class="`cap-tag ${caps.has('Map.setHeading') ? 'ok' : 'no'}`">
          {{ caps.has('Map.setHeading') ? 'v4+' : 'v3 ✗' }}
        </div>
        <p class="muted small">
          PlaceDetail 仅 v4+ 可用，必须挂在 Marker 内通过 open 控制显示。
        </p>
      </section>

      <section>
        <h3>position（Marker 锚点）</h3>
        <div class="input-row">
          <label>lng</label>
          <input type="number" step="0.001" :value="position.lng" @input="position = { ...position, lng: Number(($event.target as HTMLInputElement).value) }" />
          <label>lat</label>
          <input type="number" step="0.001" :value="position.lat" @input="position = { ...position, lat: Number(($event.target as HTMLInputElement).value) }" />
        </div>
      </section>

      <section>
        <h3>uid</h3>
        <input type="text" class="full-width" :value="uid" @input="uid = ($event.target as HTMLInputElement).value" />
        <p class="muted small">地点唯一标识，变更后会重新请求地点详情。</p>
      </section>

      <section>
        <h3>open</h3>
        <div class="btn-group">
          <button :class="open ? 'active' : ''" @click="open = true">打开</button>
          <button :class="!open ? 'active' : ''" @click="open = false">关闭</button>
        </div>
      </section>

      <section>
        <h3>renderOptions</h3>
        <label class="checkbox-row"><input type="checkbox" v-model="displayCarousel" />displayCarousel</label>
        <label class="checkbox-row"><input type="checkbox" v-model="displayTag" />displayTag</label>
        <label class="checkbox-row"><input type="checkbox" v-model="displayRating" />displayRating</label>
        <label class="checkbox-row"><input type="checkbox" v-model="displayPrice" />displayPrice</label>
        <label class="checkbox-row"><input type="checkbox" v-model="displayBangdan" />displayBangdan</label>
        <label class="checkbox-row"><input type="checkbox" v-model="displayTradeTag" />displayTradeTag</label>
        <label class="checkbox-row"><input type="checkbox" v-model="displayShopHours" />displayShopHours</label>
        <label class="checkbox-row"><input type="checkbox" v-model="displayContactInformation" />displayContactInformation</label>
        <label class="checkbox-row">
          contactInformationCount
          <input type="number" placeholder="未设置" :value="contactInformationCount ?? ''" @input="contactInformationCount = ($event.target as HTMLInputElement).value === '' ? undefined : Number(($event.target as HTMLInputElement).value)" />
        </label>
        <label class="checkbox-row"><input type="checkbox" v-model="displayAddress" />displayAddress</label>
      </section>

      <section>
        <h3>动作</h3>
        <div class="btn-group" style="flex-wrap:wrap">
          <button style="font-size:11px" @click="resetAll">reset all</button>
          <button style="font-size:11px" @click="presetLite">精简预设</button>
          <button style="font-size:11px" @click="presetBaidu">百度大厦预设</button>
        </div>
      </section>

      <section>
        <h3>当前配置</h3>
        <pre style="font-size:11px;background:#f5f5f5;padding:8px;border-radius:4px;overflow:auto">{{ JSON.stringify({ uid, open, options, position }, null, 2) }}</pre>
      </section>
    </div>
  </div>
</template>
