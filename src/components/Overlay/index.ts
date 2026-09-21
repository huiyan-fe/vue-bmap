/**
 * 全部 Overlay 组件 —— 使用 createOverlayComponent 工厂批量生成。
 * 配置与 react-bmap 对齐（工厂配置与框架无关）。
 */
import { createOverlayComponent } from '../../utils/createComponent';
export type {
  MarkerProps, LabelProps, PolylineProps, PolygonProps, CircleProps,
  RectangleProps, BezierCurveProps, PrismProps, GroundOverlayProps,
  GroundPointProps, PointCollectionProps, InfoWindowProps, SymbolProps,
  IconProps, IconSequenceProps, HotspotProps, CustomOverlayProps,
  Marker3DProps, Marker3DOptions, IconSequenceHandle,
  MarkerOptions, LabelOptions, PolylineOptions, PolygonOptions, CircleOptions,
  RectangleOptions, BezierCurveOptions, PrismOptions, GroundOverlayOptions,
  GroundPointOptions, PointCollectionOptions, InfoWindowOptions, SymbolOptions,
  IconOptions, HotspotOptions, CustomOverlayOptions,
  OverlayReactProps, PlainIcon, SymbolIcon,
} from './types';
import type {
  MarkerProps, LabelProps, PolylineProps, PolygonProps, CircleProps,
  RectangleProps, BezierCurveProps, PrismProps, GroundOverlayProps,
  GroundPointProps, PointCollectionProps, SymbolProps,
  IconProps, IconSequenceProps, HotspotProps, Marker3DProps,
} from './types';

const OVERLAY_EVENTS = [
  { sdk: 'click', prop: 'onClick' }, { sdk: 'dblclick', prop: 'onDoubleClick' },
  { sdk: 'rightclick', prop: 'onRightClick' }, { sdk: 'rightdblclick', prop: 'onRightDoubleClick' },
  { sdk: 'mousedown', prop: 'onMouseDown' }, { sdk: 'mouseup', prop: 'onMouseUp' },
  { sdk: 'mouseover', prop: 'onMouseOver' }, { sdk: 'mouseout', prop: 'onMouseOut' },
  { sdk: 'mousemove', prop: 'onMouseMove' }, { sdk: 'remove', prop: 'onRemove' },
  { sdk: 'lineupdate', prop: 'onLineUpdate' }, { sdk: 'editstart', prop: 'onEditStart' },
  { sdk: 'editend', prop: 'onEditEnd' },
  { sdk: 'linevertexdragstart', prop: 'onLineVertexDragStart' },
  { sdk: 'linevertexdragging', prop: 'onLineVertexDragging' },
  { sdk: 'linevertexdragend', prop: 'onLineVertexDragEnd' },
  { sdk: 'linevertexdel', prop: 'onLineVertexDel' },
] as any;

export const Marker = createOverlayComponent<MarkerProps>({
  displayName: 'Marker',
  factory: (d, p) => d.createMarker(p.position, p),
  positionProp: 'position',
  optionProps: ['offset', 'icon', 'enableMassClear', 'enableDragging', 'rotation', 'title', 'zIndex', 'opacity', 'color', 'rank', 'rotationOrigin'],
  ctorOnlyProps: ['enableClicking', 'raiseOnDrag', 'draggingCursor', 'shadow', 'baseZIndex', 'restrictDraggingArea', 'enableCollisionDetection', 'enableDraggingMap', 'anchor'],
  events: [
    { sdk: 'click', prop: 'onClick' }, { sdk: 'dblclick', prop: 'onDoubleClick' },
    { sdk: 'rightclick', prop: 'onRightClick' }, { sdk: 'dragstart', prop: 'onDragStart' },
    { sdk: 'dragging', prop: 'onDragging' }, { sdk: 'dragend', prop: 'onDragEnd' },
    { sdk: 'mouseover', prop: 'onMouseOver' }, { sdk: 'mouseout', prop: 'onMouseOut' },
    { sdk: 'mousedown', prop: 'onMouseDown' }, { sdk: 'mouseup', prop: 'onMouseUp' },
    { sdk: 'remove', prop: 'onRemove' },
  ],
  supportsChildren: true,
  childTargetType: 'marker',
});

export const Label = createOverlayComponent<LabelProps>({
  displayName: 'Label',
  factory: (d, p) => d.createLabel(p.content, p),
  positionProp: 'position',
  optionProps: ['content', 'offset', 'enableMassClear', 'styles', 'opacity', 'title', 'zIndex'],
  ctorOnlyProps: ['enableClicking', 'width', 'anchor'],
  attachToMarkerAsLabel: true,
  events: [
    { sdk: 'click', prop: 'onClick' }, { sdk: 'dblclick', prop: 'onDoubleClick' },
    { sdk: 'rightclick', prop: 'onRightClick' }, { sdk: 'mouseover', prop: 'onMouseOver' },
    { sdk: 'mouseout', prop: 'onMouseOut' }, { sdk: 'mousedown', prop: 'onMouseDown' },
    { sdk: 'mouseup', prop: 'onMouseUp' }, { sdk: 'remove', prop: 'onRemove' },
  ],
});

export const Polyline = createOverlayComponent<PolylineProps>({
  displayName: 'Polyline',
  factory: (d, p) => d.createPolyline(p.path, p),
  pathProp: 'path',
  optionProps: ['strokeColor', 'strokeWeight', 'strokeOpacity', 'strokeStyle', 'enableEditing', 'enableMassClear', 'zIndex'],
  ctorOnlyProps: ['enableClicking', 'strokeLineCap', 'strokeLineJoin', 'geodesic', 'linkRight', 'clip', 'coordType', 'icons', 'dashArray', 'strokeTexture', 'node', 'nodeT'],
  events: OVERLAY_EVENTS,
});

export const Polygon = createOverlayComponent<PolygonProps>({
  displayName: 'Polygon',
  factory: (d, p) => d.createPolygon(p.path, p),
  pathProp: 'path',
  optionProps: ['strokeColor', 'fillColor', 'strokeWeight', 'strokeOpacity', 'fillOpacity', 'strokeStyle', 'enableEditing', 'enableMassClear', 'zIndex'],
  ctorOnlyProps: ['enableClicking', 'strokeLineCap', 'strokeLineJoin', 'linkRight', 'coordType', 'dashArray', 'node', 'nodeT'],
  events: OVERLAY_EVENTS,
});

export const Circle = createOverlayComponent<CircleProps>({
  displayName: 'Circle',
  factory: (d, p) => d.createCircle(p.center, p.radius, p),
  positionProp: 'center',
  optionProps: ['radius', 'strokeColor', 'fillColor', 'strokeWeight', 'strokeOpacity', 'fillOpacity', 'strokeStyle', 'enableMassClear', 'zIndex'],
  ctorOnlyProps: ['enableEditing', 'enableClicking', 'coordType', 'dashArray', 'node', 'nodeT'],
  events: OVERLAY_EVENTS,
});

export const Rectangle = createOverlayComponent<RectangleProps>({
  displayName: 'Rectangle',
  factory: (d, p) => d.createRectangle(p.bounds, p),
  optionProps: ['bounds', 'strokeColor', 'fillColor', 'strokeWeight', 'strokeOpacity', 'fillOpacity', 'strokeStyle', 'enableEditing', 'enableMassClear', 'zIndex'],
  ctorOnlyProps: ['enableClicking', 'linkRight', 'coordType', 'dashArray', 'node', 'nodeT'],
  events: OVERLAY_EVENTS,
});

export const BezierCurve = createOverlayComponent<BezierCurveProps>({
  displayName: 'BezierCurve',
  factory: (d, p) => d.createBezierCurve(p.path, p.controlPoints, p),
  pathProp: 'path',
  optionProps: ['controlPoints', 'strokeColor', 'strokeWeight', 'strokeOpacity', 'strokeStyle', 'enableMassClear', 'zIndex'],
  ctorOnlyProps: ['enableClicking', 'enableEditing', 'dashArray', 'node', 'nodeT'],
  events: OVERLAY_EVENTS,
});

export const Prism = createOverlayComponent<PrismProps>({
  displayName: 'Prism',
  factory: (d, p) => d.createPrism(p.path, p.altitude, p),
  pathProp: 'path',
  optionProps: ['altitude', 'topFillColor', 'topFillOpacity', 'sideFillColor', 'sideFillOpacity', 'enableMassClear', 'zIndex'],
  ctorOnlyProps: ['enableClicking'],
  events: OVERLAY_EVENTS,
});

export const GroundOverlay = createOverlayComponent<GroundOverlayProps>({
  displayName: 'GroundOverlay',
  factory: (d, p) => d.createGroundOverlay(p.bounds, p),
  optionProps: ['bounds', 'opacity', 'url', 'imageURL', 'displayOnMinLevel', 'displayOnMaxLevel', 'enableMassClear', 'zIndex'],
  ctorOnlyProps: ['enableClicking', 'type', 'top', 'isReDraw', 'drawHook', 'stretch'],
  events: OVERLAY_EVENTS,
});

export const GroundPoint = createOverlayComponent<GroundPointProps>({
  displayName: 'GroundPoint',
  factory: (d, p) => d.createGroundPoint(p.point, p),
  positionProp: 'point',
  optionProps: ['url', 'size', 'anchor', 'scale', 'rotation', 'offset', 'opacity', 'imageURL', 'displayOnMinLevel', 'displayOnMaxLevel', 'enableMassClear', 'zIndex'],
  ctorOnlyProps: ['level', 'enableClicking', 'type', 'top', 'isReDraw', 'drawHook'],
  events: OVERLAY_EVENTS,
});

export const PointCollection = createOverlayComponent<PointCollectionProps>({
  displayName: 'PointCollection',
  factory: (d, p) => d.createPointCollection(p.points, p),
  pathProp: 'points',
  optionProps: ['shape', 'color', 'size', 'enableMassClear'],
  events: [
    { sdk: 'click', prop: 'onClick' }, { sdk: 'mouseover', prop: 'onMouseOver' },
    { sdk: 'mouseout', prop: 'onMouseOut' },
  ],
});

// ─── 值对象（skipMount，用作 Marker icon / Polyline icons） ───
export const Symbol = createOverlayComponent<SymbolProps>({
  displayName: 'Symbol',
  factory: (d, p) => d.createSymbol(p.path, p),
  optionProps: ['path', 'anchor', 'fillColor', 'fillOpacity', 'scale', 'rotation', 'strokeColor', 'strokeOpacity', 'strokeWeight'],
  skipMount: true,
});

export const Icon = createOverlayComponent<IconProps>({
  displayName: 'Icon',
  factory: (d, p) => d.createIcon(p.url, p.size, p),
  optionProps: ['url', 'size', 'anchor', 'imageOffset', 'imageSize', 'infoWindowAnchor', 'printImageUrl', 'srcset'],
  skipMount: true,
});

export const IconSequence = createOverlayComponent<IconSequenceProps>({
  displayName: 'IconSequence',
  factory: (d, p) => d.createIconSequence(p.symbol as any, p.offset, p.repeat, p.fixedRotation),
  ctorOnlyProps: ['symbol', 'offset', 'repeat', 'fixedRotation'],
  skipMount: true,
});

export const Hotspot = createOverlayComponent<HotspotProps>({
  displayName: 'Hotspot',
  factory: (d, p) => d.createHotspot(p.position, p),
  positionProp: 'position',
  optionProps: ['text', 'userData'],
  ctorOnlyProps: ['offsets', 'minZoom', 'maxZoom'],
});

export const Marker3D = createOverlayComponent<Marker3DProps>({
  displayName: 'Marker3D',
  factory: (d, p) => d.createMarker3D(p.position, p.height, p),
  positionProp: 'position',
  optionProps: ['height', 'fillColor', 'fillOpacity'],
  ctorOnlyProps: ['shape', 'size', 'enableMassClear'],
  events: [
    { sdk: 'click', prop: 'onClick' }, { sdk: 'dblclick', prop: 'onDoubleClick' },
    { sdk: 'rightclick', prop: 'onRightClick' }, { sdk: 'mouseover', prop: 'onMouseOver' },
    { sdk: 'mouseout', prop: 'onMouseOut' }, { sdk: 'mousedown', prop: 'onMouseDown' },
    { sdk: 'mouseup', prop: 'onMouseUp' },
  ],
  supportsChildren: true,
});

// ─── 信息窗口（独立 Vue 组件） ───
export { InfoWindow } from './InfoWindow';
