/**
 * PixelLayer —— 像素图层（工厂组件）。对应 react-bmap 的 Layer/index.tsx 中的 PixelLayer。
 *
 * 简单图层，无 setData / 命令式句柄，直接用 createLayerComponent 工厂表达。
 * v4 SDK 已废弃 addTileLayer/removeTileLayer，瓦片类图层统一走 addLayer/removeLayer；
 * v3 下 driver.addLayer 会自己分派回 addTileLayer。
 */
import { createLayerComponent } from '../../utils/createComponent';

export interface PixelLayerOptions {
  visible?: boolean;
  opacity?: number;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
}
export type PixelLayerProps = PixelLayerOptions;

export const PixelLayer = createLayerComponent<PixelLayerProps>({
  displayName: 'PixelLayer',
  factory: (d, p) => d.createPixelLayer(p),
});
