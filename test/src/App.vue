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
import PlaceDetailPage from './pages/overlay/PlaceDetailPage.vue';
import HotspotPage from './pages/overlay/HotspotPage.vue';
import CustomOverlayPage from './pages/overlay/CustomOverlayPage.vue';
import MapMaskPage from './pages/overlay/MapMaskPage.vue';
import SimpleInfoWindowPage from './pages/overlay/SimpleInfoWindowPage.vue';
import NavigationControlPage from './pages/control/NavigationControlPage.vue';
import ScaleControlPage from './pages/control/ScaleControlPage.vue';
import ZoomControlPage from './pages/control/ZoomControlPage.vue';
import MapTypeControlPage from './pages/control/MapTypeControlPage.vue';
import NavigationControl3DPage from './pages/control/NavigationControl3DPage.vue';
import OverviewMapControlPage from './pages/control/OverviewMapControlPage.vue';
import CopyrightControlPage from './pages/control/CopyrightControlPage.vue';
import GeolocationControlPage from './pages/control/GeolocationControlPage.vue';
import PanoramaControlPage from './pages/control/PanoramaControlPage.vue';
import CityListControlPage from './pages/control/CityListControlPage.vue';
import LogoControlPage from './pages/control/LogoControlPage.vue';
import CustomControlPage from './pages/control/CustomControlPage.vue';
import TrafficLayerPage from './pages/layer/TrafficLayerPage.vue';
import DistrictLayerPage from './pages/layer/DistrictLayerPage.vue';
import TileLayerPage from './pages/layer/TileLayerPage.vue';
import GeoJSONLayerPage from './pages/layer/GeoJSONLayerPage.vue';
import CustomLayerPage from './pages/layer/CustomLayerPage.vue';
import CanvasLayerPage from './pages/layer/CanvasLayerPage.vue';
import RasterTileLayerPage from './pages/layer/RasterTileLayerPage.vue';
import WMSLayerPage from './pages/layer/WMSLayerPage.vue';
import WMTSLayerPage from './pages/layer/WMTSLayerPage.vue';
import XYZLayerPage from './pages/layer/XYZLayerPage.vue';
import MVTLayerPage from './pages/layer/MVTLayerPage.vue';
import FillLayerPage from './pages/layer/FillLayerPage.vue';
import DOMLayerPage from './pages/layer/DOMLayerPage.vue';
import PointIconLayerPage from './pages/layer/PointIconLayerPage.vue';
import PointShapeLayerPage from './pages/layer/PointShapeLayerPage.vue';
import PanoramaCoverageLayerPage from './pages/layer/PanoramaCoverageLayerPage.vue';
import LineLayerPage from './pages/layer/LineLayerPage.vue';
import PixelLayerPage from './pages/layer/PixelLayerPage.vue';
import BaiduLayerPage from './pages/layer/BaiduLayerPage.vue';
import ThreeLayerPage from './pages/layer/ThreeLayerPage.vue';
import LocalSearchPage from './pages/service/LocalSearchPage.vue';
import DrivingRoutePage from './pages/service/DrivingRoutePage.vue';
import WalkingRoutePage from './pages/service/WalkingRoutePage.vue';
import RidingRoutePage from './pages/service/RidingRoutePage.vue';
import TransitRoutePage from './pages/service/TransitRoutePage.vue';
import BusLineSearchPage from './pages/service/BusLineSearchPage.vue';
import AutocompletePage from './pages/service/AutocompletePage.vue';
import BoundaryPage from './pages/service/BoundaryPage.vue';
import GeolocationPage from './pages/service/GeolocationPage.vue';
import LocalCityPage from './pages/service/LocalCityPage.vue';
import PlaceDetailServicePage from './pages/service/PlaceDetailServicePage.vue';
import ConvertorPage from './pages/service/ConvertorPage.vue';
import PanoramaServicePage from './pages/service/PanoramaServicePage.vue';
import TruckRoutePage from './pages/service/TruckRoutePage.vue';
import ContextMenuTestPage from './pages/ContextMenuTestPage.vue';
import PanoramaTestPage from './pages/PanoramaTestPage.vue';
import PlaceDetailPanelPage from './pages/PlaceDetailPanelPage.vue';

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
  'place-detail-overlay': PlaceDetailPage,
  hotspot: HotspotPage,
  'custom-overlay': CustomOverlayPage,
  'map-mask': MapMaskPage,
  'simple-info-window': SimpleInfoWindowPage,
  'navigation-control': NavigationControlPage,
  'scale-control': ScaleControlPage,
  'zoom-control': ZoomControlPage,
  'map-type-control': MapTypeControlPage,
  'navigation-control-3d': NavigationControl3DPage,
  'overview-map-control': OverviewMapControlPage,
  'copyright-control': CopyrightControlPage,
  'geolocation-control': GeolocationControlPage,
  'panorama-control': PanoramaControlPage,
  'city-list-control': CityListControlPage,
  'logo-control': LogoControlPage,
  'custom-control': CustomControlPage,
  // __LAYERS_AND_SERVICES__
  'traffic-layer': TrafficLayerPage,
  'district-layer': DistrictLayerPage,
  'tile-layer': TileLayerPage,
  'geojson-layer': GeoJSONLayerPage,
  'custom-layer': CustomLayerPage,
  'canvas-layer': CanvasLayerPage,
  'raster-tile-layer': RasterTileLayerPage,
  'wms-layer': WMSLayerPage,
  'wmts-layer': WMTSLayerPage,
  'xyz-layer': XYZLayerPage,
  'mvt-layer': MVTLayerPage,
  'fill-layer': FillLayerPage,
  'dom-layer': DOMLayerPage,
  'point-icon-layer': PointIconLayerPage,
  'point-shape-layer': PointShapeLayerPage,
  'panorama-coverage-layer': PanoramaCoverageLayerPage,
  'line-layer': LineLayerPage,
  'pixel-layer': PixelLayerPage,
  'baidu-layer': BaiduLayerPage,
  'three-layer': ThreeLayerPage,
  'local-search': LocalSearchPage,
  'driving-route': DrivingRoutePage,
  'walking-route': WalkingRoutePage,
  'riding-route': RidingRoutePage,
  'transit-route': TransitRoutePage,
  'bus-line-search': BusLineSearchPage,
  autocomplete: AutocompletePage,
  boundary: BoundaryPage,
  geolocation: GeolocationPage,
  'local-city': LocalCityPage,
  'place-detail': PlaceDetailServicePage,
  convertor: ConvertorPage,
  'panorama-service': PanoramaServicePage,
  'truck-route': TruckRoutePage,
  'context-menu': ContextMenuTestPage,
  panorama: PanoramaTestPage,
  'place-detail-panel': PlaceDetailPanelPage,
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
