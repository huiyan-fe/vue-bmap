# vue-bmap 对齐 JSAPI 4.0 工作项

对照 [JSAPI 4.0 类参考](https://lbs.baidu.com/jsapi/refdoc/v4/modules/BMap.html) 梳理的覆盖缺口与补齐计划。
缺口集中在新版「数据可视化图层」主线；react-bmap 同样缺失（两库共同缺口）。

- 当前版本：1.0.3（已发布）
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
| DeckglLayer deck.gl 接入 | ⬜ | 依赖宿主自备 deck.gl；含 DeckglLayerError |
| ThreejsLayer three.js 接入 | ⬜ | 依赖宿主自备 three.js；与已实现的 ThreeLayer 是不同类；含 ThreejsLayerError / ThreejsRenderContext |
| WebGLCustomLayer 自定义着色器 | ⬜ | 含 Attribute / BlendFunc / Draw / RenderState / Texture / WebGLCustomLayerError |
| GeoJSONSource 数据源 | ⬜ | 与 GeoJSONLayer 的 dataSource 入参的关系待确认后定实现形态 |

## P1 · 服务类

| 项 | 状态 | 备注 |
|---|---|---|
| EBikeRoute 电动车路线 | ⬜ | 4.0 新增，用法同 RidingRoute（支持途经点）；需 useEBikeRoute composable + driver createEBikeRoute + BMAP_EBike* 常量（若有） |

## P2 · 图层类 / 类型级

| 项 | 状态 | 备注 |
|---|---|---|
| Entity 实体图层 | ⬜ | capabilityMatrix 已声明能力名，缺组件 + driver 工厂 |
| MapLabel / MapLabelStyle | ⬜ | 目前只有类型 + MapRef.addMapLabels；缺类/常量/组件（低优先级） |
| StyleExpress 样式表达式 | ⬜ | 供 FillLayerStyle / LineLayerStyle 引用（低优先级） |
| ParkingSpot 停车位 | ⬜ | MapRef 已有 add/removeParkingSpot，缺类/类型/组件（低优先级） |

## P3 · 类型 / 常量级

| 项 | 状态 | 备注 |
|---|---|---|
| 事件映射类型 | ⬜ | TrackLineEventMap / ViewAnimationEventMap / VisualPickEvent / GraphEventMap / GraphVertexEvent / GraphEditEvent / NormalLayerPickEvent / MVTLayerPickEvent 等 4.0 新增事件类型 |
| Truck 路线专属结果类型 | ⬜ | TruckRouteResult / TruckRouteLine / TruckRoutePlan / TruckTrafficCondition（当前用 DrivingRouteResult 顶替） |
| LocalSearchSearchOption | ⬜ | 4.0 LocalSearch 新配置项类型 |
| Icons 常量组 | ⬜ | BMAP_ICON_*（具体枚举名待确认） |

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
