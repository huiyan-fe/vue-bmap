import { describe, it, expect } from 'vitest';
import * as VueBMap from '../index';

describe('vue-bmap 导出冒烟测试', () => {
  it('导出 Provider / Map / 主要覆盖物组件', () => {
    expect(VueBMap.BMapProvider).toBeDefined();
    expect(VueBMap.Map).toBeDefined();
    expect(VueBMap.Marker).toBeDefined();
    expect(VueBMap.Label).toBeDefined();
    expect(VueBMap.Polyline).toBeDefined();
    expect(VueBMap.Polygon).toBeDefined();
    expect(VueBMap.Circle).toBeDefined();
    expect(VueBMap.Rectangle).toBeDefined();
    expect(VueBMap.InfoWindow).toBeDefined();
  });

  it('导出控件与图层组件', () => {
    expect(VueBMap.NavigationControl).toBeDefined();
    expect(VueBMap.ScaleControl).toBeDefined();
    expect(VueBMap.ZoomControl).toBeDefined();
    expect(VueBMap.MapTypeControl).toBeDefined();
    expect(VueBMap.TileLayer).toBeDefined();
    expect(VueBMap.TrafficLayer).toBeDefined();
  });

  it('导出 composables 与工厂', () => {
    expect(typeof VueBMap.useMap).toBe('function');
    expect(typeof VueBMap.useMapEvent).toBe('function');
    expect(typeof VueBMap.useMapReady).toBe('function');
    expect(typeof VueBMap.useDriver).toBe('function');
    expect(typeof VueBMap.useMapRef).toBe('function');
    expect(typeof VueBMap.useCapabilities).toBe('function');
    expect(typeof VueBMap.useSymbol).toBe('function');
    expect(typeof VueBMap.useIcon).toBe('function');
    expect(typeof VueBMap.useGeocoder).toBe('function');
    expect(typeof VueBMap.createOverlayComponent).toBe('function');
    expect(typeof VueBMap.createDriver).toBe('function');
  });

  it('导出 SDK 常量', () => {
    expect(VueBMap.BMAP_ANCHOR_TOP_RIGHT).toBeDefined();
    expect(VueBMap.BMAP_DRIVING_POLICY_DEFAULT).toBe(0);
  });

  it('组件是合法的 Vue 组件对象', () => {
    expect(typeof VueBMap.Marker).toBe('object');
    expect((VueBMap.Marker as any).name).toBe('Marker');
    expect((VueBMap.Map as any).name).toBe('Map');
  });
});
