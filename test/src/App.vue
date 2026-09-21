<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Component } from 'vue';
import { AppProvider, readVersionFromLocation } from './TestProvider';
import Header from './components/Header.vue';
import Sidebar from './components/Sidebar.vue';
import { PAGES } from './config';
import PlaceholderPage from './pages/PlaceholderPage.vue';
import CapabilitiesPage from './pages/CapabilitiesPage.vue';
import MapTestPage from './pages/MapTestPage.vue';
import MarkerPage from './pages/overlay/MarkerPage.vue';
import GeocoderPage from './pages/GeocoderPage.vue';
import LabelPage from './pages/overlay/LabelPage.vue';
import PolylinePage from './pages/overlay/PolylinePage.vue';
import PolygonPage from './pages/overlay/PolygonPage.vue';
import CirclePage from './pages/overlay/CirclePage.vue';
import RectanglePage from './pages/overlay/RectanglePage.vue';
import BezierCurvePage from './pages/overlay/BezierCurvePage.vue';
import PrismPage from './pages/overlay/PrismPage.vue';
import GroundOverlayPage from './pages/overlay/GroundOverlayPage.vue';
import GroundPointPage from './pages/overlay/GroundPointPage.vue';
import PointCollectionPage from './pages/overlay/PointCollectionPage.vue';
import InfoWindowPage from './pages/overlay/InfoWindowPage.vue';
import SymbolPage from './pages/overlay/SymbolPage.vue';
import IconPage from './pages/overlay/IconPage.vue';
import IconSequencePage from './pages/overlay/IconSequencePage.vue';
import Marker3DPage from './pages/overlay/Marker3DPage.vue';
import NavigationControlPage from './pages/control/NavigationControlPage.vue';
import ScaleControlPage from './pages/control/ScaleControlPage.vue';
import ZoomControlPage from './pages/control/ZoomControlPage.vue';
import MapTypeControlPage from './pages/control/MapTypeControlPage.vue';
import TrafficLayerPage from './pages/layer/TrafficLayerPage.vue';
import DistrictLayerPage from './pages/layer/DistrictLayerPage.vue';

const version = readVersionFromLocation();

const PAGE_MAP: Record<string, Component> = {
  capabilities: CapabilitiesPage,
  map: MapTestPage,
  marker: MarkerPage,
  geocoder: GeocoderPage,
  label: LabelPage,
  polyline: PolylinePage,
  polygon: PolygonPage,
  circle: CirclePage,
  rectangle: RectanglePage,
  'bezier-curve': BezierCurvePage,
  prism: PrismPage,
  'ground-overlay': GroundOverlayPage,
  'ground-point': GroundPointPage,
  'point-collection': PointCollectionPage,
  'info-window': InfoWindowPage,
  symbol: SymbolPage,
  icon: IconPage,
  'icon-sequence': IconSequencePage,
  'marker-3d': Marker3DPage,
  'navigation-control': NavigationControlPage,
  'scale-control': ScaleControlPage,
  'zoom-control': ZoomControlPage,
  'map-type-control': MapTypeControlPage,
  'traffic-layer': TrafficLayerPage,
  'district-layer': DistrictLayerPage,
};

const hash = ref(window.location.hash);
const onHashChange = () => { hash.value = window.location.hash; };
onMounted(() => window.addEventListener('hashchange', onHashChange));
onUnmounted(() => window.removeEventListener('hashchange', onHashChange));

const currentId = computed(() => hash.value.replace(/^#\//, '') || 'capabilities');
const currentPage = computed(() => PAGES.find((p) => p.id === currentId.value));
const currentComp = computed<Component | null>(() => {
  const p = currentPage.value;
  return p?.ready && PAGE_MAP[p.id] ? PAGE_MAP[p.id] : null;
});
</script>

<template>
  <AppProvider :version="version">
    <div class="app-layout">
      <Header :version="version" />
      <div class="app-body">
        <Sidebar :current="currentId" />
        <main class="app-main">
          <component :is="currentComp" v-if="currentComp" :key="currentId" />
          <PlaceholderPage v-else :name="currentPage?.name ?? currentId" />
        </main>
      </div>
    </div>
  </AppProvider>
</template>
