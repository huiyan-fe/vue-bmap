# vue-bmap 对齐 JSAPI 4.0 工作项

对照 [JSAPI 4.0 类参考](https://lbs.baidu.com/jsapi/refdoc/v4/modules/BMap.html) 梳理的覆盖缺口与补齐计划。
缺口集中在新版「数据可视化图层」主线；react-bmap 同样缺失（两库共同缺口）。

- 当前版本：1.0.6（已发布）
- 状态标记：⬜ 待做 / 🔄 进行中 / ✅ 已完成

---

## P0 · 数据可视化图层（13 个类，整类缺失）

4.0 新增的一批数据可视化图层，全部需要「组件 + driver create* 能力 + capabilityMatrix 能力声明 + 类型」。
注意：`PointLayer`/`PolygonLayer`/`PolylineLayer`/`TextLayer` 与已实现的 `PointIconLayer`/`PointShapeLayer`/`FillLayer`/`LineLayer` 是**不同类**，不是同一能力的别名。

| 类 | 状态 | 备注 |
|---|---|---|
| Heatmap 热力图 | ✅ | 4.0 已内置为 `BMap.Heatmap`（不再是 BMapLib 插件）；组件+driver+能力矩阵+test 页+文档 已落地（v1.0.4） |
| ClusterLayer 聚合图层 | ✅ | 含 ClusterChangeValue / ClusterClickValue 事件类型；组件+driver+能力矩阵+test 页+文档 已落地（v1.0.4） |
| PointLayer 点图层 | ✅ | 含 PointLayerItem / PointAnchor / PointSource / RenderStage；组件+driver+能力矩阵+test 页+文档+demo 已落地（v1.0.6） |
| PolylineLayer 线图层 | ✅ | 含 PolylineLayerItem / LineStyle；组件+driver+能力矩阵+test 页+文档+demo 已落地（v1.0.6） |
| PolygonLayer 面图层 | ✅ | 含 PolygonLayerItem；组件+driver+能力矩阵+test 页+文档+demo 已落地（v1.0.6） |
| TextLayer 文本图层 | ✅ | 含 TextLayerItem / TextAnchor / PointAnchor；组件+driver+能力矩阵+test 页+文档+demo 已落地（v1.0.6） |
| BarLayer 柱状图层 | ✅ | 含 BarSegmentValue；组件+driver+能力矩阵+test 页+文档+demo 已落地（v1.0.6） |
| FlyLineLayer 飞线图层 | ✅ | 含 FlyLineLayerOptions；组件+driver+能力矩阵+test 页+文档+demo 已落地（v1.0.6） |
| TrackLine 轨迹线 | ✅ | 4.0 新能力，含跟随视角 / 进度事件（TrackLineFollowOptions / TrackLineMovePointOptions / TrackLineEventMap / TrackLineProgressValue / TrackLineStatusValue）；组件+driver+能力矩阵+test 页+文档+demo 已落地（v1.0.6） |
| DeckglLayer deck.gl 接入 | ✅ | 依赖宿主自备 deck.gl（挂到 window.deck）；组件+driver+能力矩阵+文档已落地（v1.0.6） |
| ThreejsLayer three.js 接入 | ✅ | 依赖宿主自备 three.js（挂到 window.THREE）；与已实现的 ThreeLayer 是不同类；组件+driver+能力矩阵+文档已落地（v1.0.6） |
| WebGLCustomLayer 自定义着色器 | ✅ | 含 Attribute / BlendFunc / Draw / RenderState / Texture / WebGLCustomLayerError；组件+driver+能力矩阵+文档已落地（v1.0.6） |
| GeoJSONSource 数据源 | ✅ | 静态工具类（normalize / replaceGeometry / extractPoints / toLineStrings / toPolygons），不建组件；组件+driver+能力矩阵+文档已落地（v1.0.6） |

## P1 · 服务类

| 项 | 状态 | 备注 |
|---|---|---|
| EBikeRoute 电动车路线 | ✅ | useEBikeRoute composable + driver createEBikeRoute + 能力矩阵已落地（v1.0.6） |

## P2 · 图层类 / 类型级

| 项 | 状态 | 备注 |
|---|---|---|
| Entity 实体图层 | ✅ | driver createEntity + 能力矩阵已落地，数据对象不建组件 |
| MapLabel / MapLabelStyle | ✅ | MapLabel 类型 + MapRef.addMapLabels；MapLabelStyle 类型已补（v1.0.6） |
| StyleExpress 样式表达式 | ✅ | 泛型类型 StyleExpress<T> 已导出（v1.0.6）；Fill/Line 图层沿用各自的 FillStyleExpr/LineStyleExpr 表达式数组 |
| ParkingSpot 停车位 | ✅ | ParkingSpotOptions 类型已补（v1.0.6）；MapRef 已有 add/removeParkingSpot |

## P3 · 类型 / 常量级

| 项 | 状态 | 备注 |
|---|---|---|
| 事件映射类型 | ✅ | VisualPickEvent / NormalLayerPickEvent / MVTLayerPickEvent / GraphEditEvent / GraphVertexEvent / GraphEventMap / ViewAnimationEventMap / TrackLineEventMap 已补并导出（v1.0.6） |
| Truck 路线专属结果类型 | ✅ | TruckRouteResult / TruckRouteLine / TruckRoutePlan / TruckTrafficCondition 已补（v1.0.6） |
| LocalSearchSearchOption | ✅ | 已补并导出（v1.0.6） |
| Icons 常量组 | ✅ | 已确认：SDK 的 Icons 是内部 SVG 图标对象（LOCATION/PLUS/MINUS/箭头等），非公开 BMAP_* 常量，不导出（v1.0.6 决策） |

---

## 已完成（供参考）

- ✅ 经典面全覆盖：Map / 覆盖物 17 / 控件 14 / 图层（21，含 GeoJSON/District/Traffic/Custom/Canvas/RasterTile/WMS/WMTS/XYZ/MVT/Pixel/Baidu/PanoramaCoverage + 手写 Fill/Line/DOM/PointIcon/PointShape/Feature/Three/Traffic）/ 检索与路线服务（含 Truck）/ 全景 / 菜单 / 逃生舱
- ✅ Map 4.0 新方法：视角动画（startViewAnimation 系列）、Spots、MapLabel、Earth、Indoor、setMapStyleV2 等（MapRef 全量转发）
- ✅ BMAP_* 常量 27+ 组全覆盖
- ✅ 能力矩阵 + 版本降级（v3/v4）

## 实施约定

- 每个可视化图层落地时对齐 react-bmap 风格：`createXxxLayer` driver 能力 → capabilityMatrix 能力声明 → Layer 组件（优先复用 createLayerComponent 工厂，需要 setData/事件的改手写）→ examples demo + test 页
- 依赖外部库的（DeckglLayer / ThreejsLayer）：宿主自备并挂到全局，组件内做加载守卫（参考 ThreeLayer 现状）
- 每批完成后跑三连验证（tsc / 库 build / test+examples build）
