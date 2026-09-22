/**
 * BaiduLayer —— 百度图层（工厂组件）。对应 react-bmap 的 Layer/index.tsx 中的 BaiduLayer。
 *
 * 简单图层，无 setData / 命令式句柄，直接用 createLayerComponent 工厂表达。
 */
import { createLayerComponent } from '../../utils/createComponent';

export interface BaiduLayerOptions {
  visible?: boolean;
  opacity?: number;
  minZoom?: number;
  maxZoom?: number;
  zIndex?: number;
}
export type BaiduLayerProps = BaiduLayerOptions;

export const BaiduLayer = createLayerComponent<BaiduLayerProps>({
  displayName: 'BaiduLayer',
  factory: (d, p) => d.createBaiduLayer(p),
});
