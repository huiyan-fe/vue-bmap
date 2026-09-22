// ──────────────────────────────────────────────────────────────
// vue-bmap 主入口 —— 全量导出（P2 可用版本）
// ──────────────────────────────────────────────────────────────

// Provider
export { BMapProvider } from './provider/BMapProvider';
export type { BMapProviderProps } from './provider/BMapProvider';

// ─── SDK 常量（唯一来源：./const 转发 ./constants，避免双源取值冲突） ───
export * from './const';

// ─── Context / provide-inject（高级用法） ───
export {
  BMAP_KEY, MAP_KEY, OVERLAY_TARGET_KEY,
  useBMapContext, useMapContext, useMapContextOptional,
} from './context';
export type { BMapContextValue, MapContextValue, OverlayTargetStore, OverlayTargetType } from './context';

// ─── Map 容器 ───
export { Map, MapRefImpl } from './components/Map';
export type { MapProps, MapRef } from './components/Map';

// ─── Overlay 组件 ───
export {
  Marker, Label, Polyline, Polygon, Circle, Rectangle, BezierCurve, Prism,
  GroundOverlay, GroundPoint, PointCollection, Symbol, Icon, IconSequence, Hotspot,
  Marker3D, InfoWindow,
  RawOverlay, CustomOverlay, MapMask, SimpleInfoWindow, PlaceDetail, PlaceDetailPanel,
} from './components/Overlay';
export type {
  MarkerProps, LabelProps, PolylineProps, PolygonProps, CircleProps, RectangleProps,
  BezierCurveProps, PrismProps, GroundOverlayProps, GroundPointProps, PointCollectionProps,
  SymbolProps, IconProps, IconSequenceProps, HotspotProps, Marker3DProps, InfoWindowProps,
  MarkerOptions, LabelOptions, PolylineOptions, PolygonOptions, CircleOptions, RectangleOptions,
  InfoWindowOptions, PlainIcon, SymbolIcon,
  RawOverlayProps, CustomOverlayProps, MapMaskProps, MapMaskOptions,
  SimpleInfoWindowProps, SimpleInfoWindowOptions,
  PlaceDetailProps, PlaceDetailRenderOptions, PlaceDetailPanelProps,
} from './components/Overlay';

// ─── Control 组件 ───
export {
  NavigationControl, NavigationControl3D, ScaleControl, OverviewMapControl,
  MapTypeControl, CopyrightControl, GeolocationControl, PanoramaControl,
  ZoomControl, CityListControl, LocationControl, LogoControl,
  RawControl, CustomControl,
} from './components/Control';
export type {
  NavigationControlProps, ScaleControlProps, MapTypeControlProps,
  GeolocationControlProps, ZoomControlProps, OverviewMapControlProps,
  CopyrightControlProps, CityListControlProps, LogoControlProps,
  RawControlProps, CustomControlProps,
} from './components/Control';

// ─── Layer 组件 ───
export {
  TileLayer, NormalLayer, GeoJSONLayer, DistrictLayer, CustomLayer, CanvasLayer, TrafficLayer,
  RasterTileLayer, WMSLayer, WMTSLayer, XYZLayer, MVTLayer,
  PixelLayer, BaiduLayer, PanoramaCoverageLayer, FeatureLayer, DOMLayer,
  PointShapeLayer, PointIconLayer, FillLayer, LineLayer, ThreeLayer,
} from './components/Layer';
export type {
  TileLayerProps, NormalLayerProps, GeoJSONLayerProps, DistrictLayerProps,
  CustomLayerProps, CanvasLayerProps, TrafficLayerProps,
  PixelLayerOptions, PixelLayerProps, BaiduLayerOptions, BaiduLayerProps,
  PanoramaCoverageLayerProps, FeatureLayerOptions, FeatureLayerProps,
  DOMLayerOptions, DOMLayerProps, PointShapeStyle, PointShapeLayerOptions, PointShapeLayerProps,
  PointIconLayerEvent, PointIconStyle, PointIconLayerOptions, PointIconLayerProps,
  FillStyleExpr, FillLayerStyle, FillLayerOptions, FillLayerEvent, FillLayerProps,
  LineStyleExpr, LineLayerStyle, LineLayerOptions, LineLayerEvent, LineLayerProps,
  ThreeObject, ThreeLayerInstance, ThreeLayerHook, ThreeLayerRef, ThreeLayerOptions, ThreeLayerProps,
} from './components/Layer';

// ─── 右键菜单 / 全景 ───
export { ContextMenu, MenuItem } from './components/Menu';
export type { ContextMenuProps, MenuItemProps } from './components/Menu';
export { Panorama, PanoramaLabel } from './components/Panorama';
export type { PanoramaProps, PanoramaLabelProps, PanoramaRef, PanoramaPov, PanoramaOptions } from './components/Panorama';

// ─── Composables ───
export {
  useMap, useMapEvent, useMapReady, useDriver, useMapRef, useCapabilities,
  useSymbol, useIcon, useGeocoder, useServiceTimeout,
  useDrivingRoute, useWalkingRoute, useRidingRoute, useTransitRoute, useTruckRoute,
  useLocalSearch, useAutocomplete, useBusLineSearch, usePlaceDetail,
  useBoundary, useLocalCity, useConvertor, useGeolocation, usePanoramaService,
  useMapStatus, useRawControl, useRawOverlay,
} from './composables';
export type {
  GeocoderHookResult, MapSnapshot,
  DrivingRouteOptions, DrivingRouteHookResult, DrivingRouteRenderOptions,
  WalkingRouteOptions, WalkingRouteHookResult,
  RidingRouteOptions, RidingRouteHookResult,
  TransitRouteOptions, TransitRouteHookResult,
  TruckRouteOptions, TruckRouteHookResult,
  LocalSearchOptions, LocalSearchHookResult, LocalSearchRenderOptions,
  AutocompleteOptions, AutocompleteHookResult,
  BusLineSearchOptions, BusLineSearchHookResult,
  PlaceDetailOptions, PlaceDetailHookResult,
  BoundaryHookResult, LocalCityHookResult, ConvertorHookResult,
  GeolocationHookResult, PanoramaServiceHookResult,
} from './composables';

// ─── 组件工厂（高级用法：自定义组件） ───
export { createOverlayComponent, createControlComponent, createLayerComponent } from './utils/createComponent';

// ─── Driver（高级用法） ───
export type { BMapDriver } from './drivers/types';
export { createDriver } from './drivers/createDriver';
export { UnsupportedCapabilityError, tryOp } from './drivers/unsupported';

// ─── 核心类型 ───
export type {
  Point, Pixel, Size, Bounds,
  MapHandle, OverlayHandle, ControlHandle, LayerHandle, ServiceHandle,
  BMapVersion, UnsupportedBehavior, Capability, BMapEvent,
  MapMouseEvent, MapMoveEvent, MapZoomEvent, MapEvent,
  LoadKeyComponents, LoaderStatus,
} from './types';
export type { DisplayOptions } from './types/core';
export type { GeocoderResult } from './types/results';
