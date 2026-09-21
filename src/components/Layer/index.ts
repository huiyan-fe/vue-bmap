/**
 * Layer 组件 —— 使用 createLayerComponent 工厂生成（P2 覆盖主要图层，手写型图层见后续阶段）。
 */
import { createLayerComponent } from '../../utils/createComponent';
import type { Point } from '../../types';

export interface TileLayerOptions {
  transparentPng?: boolean; tileUrlTemplate?: string; zIndex?: number; copyright?: unknown;
  boundary?: string | string[]; opacity?: number; showRegion?: string; retry?: boolean; retryTime?: number; cacheSize?: number;
  tileLoadFunction?: (tile: HTMLImageElement, url: string) => void;
}
export interface NormalLayerOptions {
  visible?: boolean; opacity?: number; minZoom?: number; maxZoom?: number; zIndex?: number;
  enablePicked?: boolean; autoSelect?: boolean; popEvent?: boolean; isTop?: boolean; isLowText?: boolean;
  referCenter?: Point; pickWidth?: number; pickHeight?: number;
}
export interface GeoJSONLayerOptions {
  dataSource?: unknown; reference?: string;
  markerStyle?: unknown; polylineStyle?: unknown; polygonStyle?: unknown;
  minZoom?: number; maxZoom?: number; level?: number; visible?: boolean;
}
export interface DistrictLayerOptions {
  name?: string; adcode?: string; kind?: number; autoViewport?: boolean;
  strokeColor?: string; strokeWeight?: number; strokeOpacity?: number;
  fillColor?: string; fillOpacity?: number;
}
export interface CustomLayerOptions { databoxId?: string; geotableId?: string; q?: string; tags?: string; filter?: string; pointDensity?: number; }
export interface CanvasLayerOptions { zIndex?: number; paneName?: string; update?: Function; }
export interface TrafficLayerOptions { predictDate?: unknown; }

export type TileLayerProps = TileLayerOptions;
export type NormalLayerProps = NormalLayerOptions;
export type GeoJSONLayerProps = GeoJSONLayerOptions;
export type DistrictLayerProps = DistrictLayerOptions;
export type CustomLayerProps = CustomLayerOptions;
export type CanvasLayerProps = CanvasLayerOptions;
export type TrafficLayerProps = TrafficLayerOptions;

export const TileLayer = createLayerComponent<TileLayerProps>({ displayName: 'TileLayer', factory: (d, p) => d.createTileLayer(p) });
export const NormalLayer = createLayerComponent<NormalLayerProps>({ displayName: 'NormalLayer', factory: (d, p) => d.createNormalLayer(p) });
export const GeoJSONLayer = createLayerComponent<GeoJSONLayerProps>({ displayName: 'GeoJSONLayer', factory: (d, p) => d.createGeoJSONLayer(p) });
export const DistrictLayer = createLayerComponent<DistrictLayerProps>({ displayName: 'DistrictLayer', factory: (d, p) => d.createDistrictLayer(p) });
export const CustomLayer = createLayerComponent<CustomLayerProps>({ displayName: 'CustomLayer', factory: (d, p) => d.createCustomLayer(p) });
export const CanvasLayer = createLayerComponent<CanvasLayerProps>({ displayName: 'CanvasLayer', factory: (d, p) => d.createCanvasLayer(p) });
export const TrafficLayer = createLayerComponent<TrafficLayerProps>({ displayName: 'TrafficLayer', factory: (d, p) => d.createTrafficLayer(p) });

// ─── 高级瓦片图层（4.0+） ───
export interface RasterTileLayerOptions { url: string | ((x: number, y: number, z: number) => string); [k: string]: unknown; }
export interface WMSLayerOptions { url?: string; params?: Record<string, string>; [k: string]: unknown; }
export interface WMTSLayerOptions { url?: string; params?: Record<string, string>; [k: string]: unknown; }
export interface XYZLayerOptions { tileUrlTemplate?: string; [k: string]: unknown; }
export interface MVTLayerOptions { tileUrlTemplate?: string; [k: string]: unknown; }
export type RasterTileLayerProps = RasterTileLayerOptions;
export type WMSLayerProps = WMSLayerOptions;
export type WMTSLayerProps = WMTSLayerOptions;
export type XYZLayerProps = XYZLayerOptions;
export type MVTLayerProps = MVTLayerOptions;

export const RasterTileLayer = createLayerComponent<RasterTileLayerProps>({ displayName: 'RasterTileLayer', factory: (d, p) => d.createRasterTileLayer(p) });
export const WMSLayer = createLayerComponent<WMSLayerProps>({ displayName: 'WMSLayer', factory: (d, p) => d.createWMSLayer(p) });
export const WMTSLayer = createLayerComponent<WMTSLayerProps>({ displayName: 'WMTSLayer', factory: (d, p) => d.createWMTSLayer(p) });
export const XYZLayer = createLayerComponent<XYZLayerProps>({ displayName: 'XYZLayer', factory: (d, p) => d.createXYZLayer(p) });
export const MVTLayer = createLayerComponent<MVTLayerProps>({
  displayName: 'MVTLayer',
  factory: (d, p) => d.createMVTLayer(p),
  events: [
    { sdk: 'click', prop: 'onclick' }, { sdk: 'dblclick', prop: 'ondblclick' },
    { sdk: 'mousemove', prop: 'onmousemove' }, { sdk: 'mouseout', prop: 'onmouseout' },
  ],
});
