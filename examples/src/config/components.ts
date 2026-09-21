/** 示例站左侧导航配置（对齐 react-bmap examples 的 config/components.ts）。 */
export interface ComponentMeta {
  id: string;
  name: string;
  category: string;
  description: string;
  /** 传 false 表示不受版本能力矩阵约束（如 Provider 这类非 SDK 能力的组件） */
  capability?: false;
  /** vue-bmap 当前尚未实现（示例页显示"示例编写中"），用于对齐 react-bmap 的组件清单 */
  todo?: boolean;
}

export const CATEGORIES = ['Map', 'Overlay', 'Control', 'Layer', 'Service', 'Other', 'Hook'] as const;

export const COMPONENTS: ComponentMeta[] = [
  // Map
  { id: 'bmap-provider', name: 'BMapProvider', category: 'Map', description: 'JSAPI 加载与 driver 注入', capability: false },
  { id: 'map', name: 'Map', category: 'Map', description: '地图容器' },

  // Overlay
  { id: 'marker', name: 'Marker', category: 'Overlay', description: '点标注' },
  { id: 'label', name: 'Label', category: 'Overlay', description: '文本标注' },
  { id: 'polyline', name: 'Polyline', category: 'Overlay', description: '折线' },
  { id: 'polygon', name: 'Polygon', category: 'Overlay', description: '多边形' },
  { id: 'circle', name: 'Circle', category: 'Overlay', description: '圆形' },
  { id: 'rectangle', name: 'Rectangle', category: 'Overlay', description: '矩形' },
  { id: 'bezier-curve', name: 'BezierCurve', category: 'Overlay', description: '贝塞尔曲线' },
  { id: 'prism', name: 'Prism', category: 'Overlay', description: '棱柱（3D）' },
  { id: 'ground-overlay', name: 'GroundOverlay', category: 'Overlay', description: '地面叠加层' },
  { id: 'ground-point', name: 'GroundPoint', category: 'Overlay', description: '地面点（3D）' },
  { id: 'point-collection', name: 'PointCollection', category: 'Overlay', description: '点集合' },
  { id: 'info-window', name: 'InfoWindow', category: 'Overlay', description: '信息窗口' },
  { id: 'symbol', name: 'Symbol', category: 'Overlay', description: '符号（Marker icon 值对象）' },
  { id: 'icon', name: 'Icon', category: 'Overlay', description: '图标（Marker icon 值对象）' },
  { id: 'icon-sequence', name: 'IconSequence', category: 'Overlay', description: '图标序列' },
  { id: 'marker-3d', name: 'Marker3D', category: 'Overlay', description: '3D 标注' },
  { id: 'custom-overlay', name: 'CustomOverlay', category: 'Overlay', description: '自定义覆盖物', todo: true },
  { id: 'map-mask', name: 'MapMask', category: 'Overlay', description: '地图遮罩', todo: true },
  { id: 'simple-info-window', name: 'SimpleInfoWindow', category: 'Overlay', description: '简单信息窗口', todo: true },
  { id: 'place-detail-overlay', name: 'PlaceDetail', category: 'Overlay', description: '地点详情', todo: true },
  { id: 'raw-overlay', name: 'RawOverlay', category: 'Overlay', description: '原生覆盖物逃生舱', capability: false, todo: true },

  // Control
  { id: 'navigation-control', name: 'NavigationControl', category: 'Control', description: '缩放平移控件' },
  { id: 'navigation-control-3d', name: 'NavigationControl3D', category: 'Control', description: '3D 缩放控件' },
  { id: 'scale-control', name: 'ScaleControl', category: 'Control', description: '比例尺控件' },
  { id: 'overview-map-control', name: 'OverviewMapControl', category: 'Control', description: '缩略图控件' },
  { id: 'map-type-control', name: 'MapTypeControl', category: 'Control', description: '地图类型控件' },
  { id: 'copyright-control', name: 'CopyrightControl', category: 'Control', description: '版权控件' },
  { id: 'geolocation-control', name: 'GeolocationControl', category: 'Control', description: '定位控件' },
  { id: 'panorama-control', name: 'PanoramaControl', category: 'Control', description: '全景控件' },
  { id: 'zoom-control', name: 'ZoomControl', category: 'Control', description: '缩放控件（4.0+）' },
  { id: 'city-list-control', name: 'CityListControl', category: 'Control', description: '城市列表控件' },
  { id: 'logo-control', name: 'LogoControl', category: 'Control', description: 'Logo 控件' },
  { id: 'custom-control', name: 'CustomControl', category: 'Control', description: '自定义控件', capability: false, todo: true },
  { id: 'raw-control', name: 'RawControl', category: 'Control', description: '原生控件逃生舱', capability: false, todo: true },

  // Layer
  { id: 'geojson-layer', name: 'GeoJSONLayer', category: 'Layer', description: 'GeoJSON 图层' },
  { id: 'district-layer', name: 'DistrictLayer', category: 'Layer', description: '行政区图层' },
  { id: 'traffic-layer', name: 'TrafficLayer', category: 'Layer', description: '交通路况图层' },
  { id: 'fill-layer', name: 'FillLayer', category: 'Layer', description: '填充图层', todo: true },
  { id: 'dom-layer', name: 'DOMLayer', category: 'Layer', description: 'DOM 图层', todo: true },
  { id: 'line-layer', name: 'LineLayer', category: 'Layer', description: '线图层', todo: true },
  { id: 'point-icon-layer', name: 'PointIconLayer', category: 'Layer', description: '图标点图层', todo: true },
  { id: 'point-shape-layer', name: 'PointShapeLayer', category: 'Layer', description: '图形点图层', todo: true },
  { id: 'three-layer', name: 'ThreeLayer', category: 'Layer', description: 'three.js 图层', todo: true },

  // Service
  { id: 'geocoder', name: 'useGeocoder', category: 'Service', description: '地理编码' },
  { id: 'local-search', name: 'useLocalSearch', category: 'Service', description: '本地搜索', todo: true },
  { id: 'driving-route', name: 'useDrivingRoute', category: 'Service', description: '驾车路线', todo: true },
  { id: 'walking-route', name: 'useWalkingRoute', category: 'Service', description: '步行路线', todo: true },
  { id: 'riding-route', name: 'useRidingRoute', category: 'Service', description: '骑行路线', todo: true },
  { id: 'transit-route', name: 'useTransitRoute', category: 'Service', description: '公交路线', todo: true },
  { id: 'bus-line-search', name: 'useBusLineSearch', category: 'Service', description: '公交线路查询', todo: true },
  { id: 'autocomplete', name: 'useAutocomplete', category: 'Service', description: '输入提示', todo: true },
  { id: 'boundary', name: 'useBoundary', category: 'Service', description: '行政区划', todo: true },
  { id: 'geolocation', name: 'useGeolocation', category: 'Service', description: '定位', todo: true },
  { id: 'local-city', name: 'useLocalCity', category: 'Service', description: '城市查询', todo: true },
  { id: 'place-detail', name: 'usePlaceDetail', category: 'Service', description: '地点详情', todo: true },
  { id: 'convertor', name: 'useConvertor', category: 'Service', description: '坐标转换', todo: true },
  { id: 'panorama-service', name: 'usePanoramaService', category: 'Service', description: '全景服务', todo: true },
  { id: 'truck-route', name: 'useTruckRoute', category: 'Service', description: '货车路线', todo: true },

  // Other
  { id: 'context-menu', name: 'ContextMenu', category: 'Other', description: '右键菜单', todo: true },
  { id: 'panorama', name: 'Panorama', category: 'Other', description: '全景地图', todo: true },

  // Hook
  { id: 'use-map', name: 'useMap', category: 'Hook', description: '拿地图句柄（响应式）', capability: false },
  { id: 'use-map-event', name: 'useMapEvent', category: 'Hook', description: '订阅地图原生事件', capability: false },
  { id: 'use-map-ready', name: 'useMapReady', category: 'Hook', description: '地图就绪哨兵', capability: false },
  { id: 'use-driver', name: 'useDriver', category: 'Hook', description: '拿当前版本 driver', capability: false },
  { id: 'use-map-ref', name: 'useMapRef', category: 'Hook', description: '命令式操作地图', capability: false },
  { id: 'use-capabilities', name: 'useCapabilities', category: 'Hook', description: '读取能力集合', capability: false },
  { id: 'use-symbol', name: 'useSymbol', category: 'Hook', description: '创建 Symbol 值对象', capability: false },
  { id: 'use-icon', name: 'useIcon', category: 'Hook', description: '创建 Icon 值对象', capability: false },
];
