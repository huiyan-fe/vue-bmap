/**
 * PanoramaCoverageLayer —— 全景覆盖图层（工厂组件）。
 * 对应 react-bmap 的 Layer/index.tsx 中的 PanoramaCoverageLayer。
 *
 * 无构造参数，直接用 createLayerComponent 工厂以固定 {} 创建。
 */
import { createLayerComponent } from '../../utils/createComponent';

export type PanoramaCoverageLayerProps = Record<string, never>;

export const PanoramaCoverageLayer = createLayerComponent<PanoramaCoverageLayerProps>({
  displayName: 'PanoramaCoverageLayer',
  factory: (d) => d.createPanoramaCoverageLayer({}),
});
