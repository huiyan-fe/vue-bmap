// ──────────────────────────────────────────────────────────────
// vue-bmap 主入口 —— 全量导出（P2 可用版本）
// ──────────────────────────────────────────────────────────────

// Provider
export { BMapProvider } from './provider/BMapProvider';
export type { BMapProviderProps } from './provider/BMapProvider';

// ─── SDK 常量 ───
export {
  BMAP_ANCHOR_TOP_LEFT, BMAP_ANCHOR_TOP_RIGHT, BMAP_ANCHOR_BOTTOM_LEFT, BMAP_ANCHOR_BOTTOM_RIGHT,
  BMAP_ANCHOR_TOP_CENTER, BMAP_ANCHOR_MIDDLE_LEFT, BMAP_ANCHOR_CENTER, BMAP_ANCHOR_MIDDLE_RIGHT,
  BMAP_ANCHOR_BOTTOM_CENTER,
  BMAP_STATUS_SUCCESS, BMAP_STATUS_CITY_LIST, BMAP_STATUS_UNKNOWN_LOCATION, BMAP_STATUS_UNKNOWN_ROUTE,
  BMAP_STATUS_INVALID_KEY, BMAP_STATUS_INVALID_REQUEST, BMAP_STATUS_PERMISSION_DENIED,
  BMAP_STATUS_SERVICE_UNAVAILABLE, BMAP_STATUS_TIMEOUT,
  BMAP_DRIVING_POLICY_DEFAULT, BMAP_DRIVING_POLICY_DESTANCE, BMAP_DRIVING_POLICY_AVOID_HIGHWAYS,
  BMAP_DRIVING_POLICY_FIRST_HIGHWAYS, BMAP_DRIVING_POLICY_AVOID_CONGESTION, BMAP_DRIVING_POLICY_AVOID_PAY,
  BMAP_TRANSIT_POLICY_RECOMMEND, BMAP_TRANSIT_POLICY_LEAST_TRANSFER, BMAP_TRANSIT_POLICY_LEAST_WALKING,
  BMAP_TRANSIT_POLICY_AVOID_SUBWAYS, BMAP_TRANSIT_POLICY_LEAST_TIME, BMAP_TRANSIT_POLICY_FIRST_SUBWAYS,
  BMAP_ANIMATION_BOUNCE, BMAP_ANIMATION_DROP,
  BMAP_UNIT_METRIC, BMAP_UNIT_IMPERIAL,
  BMAP_LANG_CN, BMAP_LANG_EN,
  BMAP_NAVIGATION_CONTROL_LARGE, BMAP_NAVIGATION_CONTROL_SMALL, BMAP_NAVIGATION_CONTROL_PAN, BMAP_NAVIGATION_CONTROL_ZOOM,
  BMAP_MAPTYPE_CONTROL_HORIZONTAL, BMAP_MAPTYPE_CONTROL_DROPDOWN, BMAP_MAPTYPE_CONTROL_MAP,
  BMAP_SHAPE_CIRCLE, BMAP_SHAPE_RECTANGLE,
  getSdkConstant,
} from './const';
export type { ControlAnchor, ServiceStatus, DrivingPolicy, TransitPolicy, Animation, LengthUnit, Language, NavigationControlType, MapTypeControlType, ShapeType } from './const';
export * from './constants';

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
} from './components/Overlay';
export type {
  MarkerProps, LabelProps, PolylineProps, PolygonProps, CircleProps, RectangleProps,
  BezierCurveProps, PrismProps, GroundOverlayProps, GroundPointProps, PointCollectionProps,
  SymbolProps, IconProps, IconSequenceProps, HotspotProps, Marker3DProps, InfoWindowProps,
  MarkerOptions, LabelOptions, PolylineOptions, PolygonOptions, CircleOptions, RectangleOptions,
  InfoWindowOptions, PlainIcon, SymbolIcon,
} from './components/Overlay';

// ─── Control 组件 ───
export {
  NavigationControl, NavigationControl3D, ScaleControl, OverviewMapControl,
  MapTypeControl, CopyrightControl, GeolocationControl, PanoramaControl,
  ZoomControl, CityListControl, LocationControl, LogoControl,
} from './components/Control';
export type {
  NavigationControlProps, ScaleControlProps, MapTypeControlProps,
  GeolocationControlProps, ZoomControlProps, OverviewMapControlProps,
  CopyrightControlProps, CityListControlProps, LogoControlProps,
} from './components/Control';

// ─── Layer 组件 ───
export {
  TileLayer, NormalLayer, GeoJSONLayer, DistrictLayer, CustomLayer, CanvasLayer, TrafficLayer,
  RasterTileLayer, WMSLayer, WMTSLayer, XYZLayer, MVTLayer,
} from './components/Layer';
export type {
  TileLayerProps, NormalLayerProps, GeoJSONLayerProps, DistrictLayerProps,
  CustomLayerProps, CanvasLayerProps, TrafficLayerProps,
} from './components/Layer';

// ─── Composables ───
export {
  useMap, useMapEvent, useMapReady, useDriver, useMapRef, useCapabilities,
  useSymbol, useIcon, useGeocoder, useServiceTimeout,
} from './composables';
export type { GeocoderHookResult } from './composables';

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
