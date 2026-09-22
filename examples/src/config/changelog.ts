/**
 * examples 首页「更新日志」数据（对齐 react-bmap examples 的 config/changelog.ts）。
 * 版本内容取自 git tag 历史（v1.0.0 / v1.0.1）与其后累积的待发布改动。
 * 发版时把顶部「未发布」改成正式版本号 + 日期即可。
 */
export interface ChangelogEntry {
  version: string;
  date?: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.2',
    date: '未发布',
    changes: [
      '对齐 react-bmap，补齐全部功能：新增 API 在示例站与组件说明中均标注「v1.0.2 新增」',
      '补齐全部 service composable：useLocalSearch / useDrivingRoute / useWalkingRoute / useRidingRoute / useTransitRoute / useTruckRoute / useBusLineSearch / useAutocomplete / useBoundary / useLocalCity / useConvertor / useGeolocation / usePlaceDetail / usePanoramaService',
      '新增逃生舱：RawOverlay / RawControl（及 useRawOverlay / useRawControl）、CustomControl / CustomOverlay，挂载任意原生 Overlay / Control 或自定义 DOM 内容',
      '新增 useMapStatus：订阅地图状态快照（center / zoom / bounds / size / heading / tilt）',
      '补齐长尾图层：FillLayer / LineLayer / DOMLayer / PointIconLayer / PointShapeLayer / ThreeLayer / PanoramaCoverageLayer / BaiduLayer / PixelLayer / FeatureLayer',
      '补齐长尾覆盖物：MapMask（任意多边形遮罩）/ SimpleInfoWindow / PlaceDetail / PlaceDetailPanel',
      '新增全景 Panorama / PanoramaLabel 与右键菜单 ContextMenu / MenuItem',
      'useConvertor：translate 内部按 100 点自动分批、并发请求再按序合并，支持 >100 点',
      'useGeocoder：新增 getPoints / getLocations 并发批量方法（Promise、保序、失败位 null）',
      'test 工程复刻 react-bmap 全部功能页；examples 示例站补齐全部示例与更新日志',
      'fix：CustomOverlay 进场定位漂移、MapMask points 多边形模式、GeoJSONLayer dataSource 透传、FillLayer 描边样式需重建才生效等',
    ],
  },
  {
    version: '1.0.1',
    date: '2026-09-22',
    changes: [
      '构建关闭 sourcemap，产物更干净',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-22',
    changes: [
      'vue-bmap 首个正式版本：声明式 Vue 3 组件库，封装百度地图 JSAPI',
      '兼容 JSAPI 3.0（2D）与 4.0（WebGL），运行时能力矩阵探测、v3/v4 差异自动降级',
      '提供地图容器、覆盖物、控件、图层与地理编码等核心组件与 composable',
      '统一常量来源，修复句柄型 prop 的依赖比较',
    ],
  },
];
