export interface TestPage { id: string; name: string; category: string; ready?: boolean; }

export const CATEGORIES = ['框架', '基础', '覆盖物', '控件', '图层', '服务'] as const;

const O = '覆盖物', C = '控件', L = '图层', S = '服务';

// ready:true 的页面有专属测试页；其余走 PlaceholderPage。
export const PAGES: TestPage[] = [
  { id: 'capabilities', name: 'Capabilities', category: '框架', ready: true },
  { id: 'map', name: 'Map（命令式）', category: '基础', ready: true },
  // 覆盖物
  { id: 'marker', name: 'Marker', category: O, ready: true },
  { id: 'label', name: 'Label', category: O, ready: true },
  { id: 'polyline', name: 'Polyline', category: O, ready: true },
  { id: 'polygon', name: 'Polygon', category: O, ready: true },
  { id: 'circle', name: 'Circle', category: O, ready: true },
  { id: 'rectangle', name: 'Rectangle', category: O, ready: true },
  { id: 'bezier-curve', name: 'BezierCurve', category: O, ready: true },
  { id: 'prism', name: 'Prism', category: O, ready: true },
  { id: 'ground-overlay', name: 'GroundOverlay', category: O, ready: true },
  { id: 'ground-point', name: 'GroundPoint', category: O, ready: true },
  { id: 'point-collection', name: 'PointCollection', category: O, ready: true },
  { id: 'info-window', name: 'InfoWindow', category: O, ready: true },
  { id: 'symbol', name: 'Symbol', category: O, ready: true },
  { id: 'icon', name: 'Icon', category: O, ready: true },
  { id: 'icon-sequence', name: 'IconSequence', category: O, ready: true },
  { id: 'marker-3d', name: 'Marker3D', category: O, ready: true },
  // 控件
  { id: 'navigation-control', name: 'NavigationControl', category: C, ready: true },
  { id: 'scale-control', name: 'ScaleControl', category: C, ready: true },
  { id: 'zoom-control', name: 'ZoomControl', category: C, ready: true },
  { id: 'map-type-control', name: 'MapTypeControl', category: C, ready: true },
  // 图层
  { id: 'traffic-layer', name: 'TrafficLayer', category: L, ready: true },
  { id: 'district-layer', name: 'DistrictLayer', category: L, ready: true },
  // 服务
  { id: 'geocoder', name: 'useGeocoder', category: S, ready: true },
];
