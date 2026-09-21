/**
 * 兼容层 —— 常量的唯一权威来源是 ../constants/index.ts。
 *
 * 这里只做两件事：
 *  1. re-export ../constants 的全部常量与类型（保持单一数据源，杜绝重复定义与取值冲突）；
 *  2. 保留少量历史命名别名与 getSdkConstant 工具，避免破坏既有对外 API。
 *
 * ⚠️ 请勿在此重复定义 BMAP_* 常量：任何与 ../constants 同名的声明都会造成导出冲突/取值分叉。
 */
import { tryGetSDK } from '../utils/sdk';
import {
  BMAP_ANCHOR_LEFT_CENTER, BMAP_ANCHOR_RIGHT_CENTER,
  BMAP_LANGUAGE_ZH, BMAP_LANGUAGE_EN, BMAP_SHAPE_RECT,
} from '../constants';
import type { MarkerAnimation } from '../constants';

export * from '../constants';

// ─── 历史命名别名（指向 ../constants 的规范值，避免破坏旧用法） ───
/** @deprecated 用 BMAP_ANCHOR_LEFT_CENTER */
export const BMAP_ANCHOR_MIDDLE_LEFT = BMAP_ANCHOR_LEFT_CENTER;
/** @deprecated 用 BMAP_ANCHOR_RIGHT_CENTER */
export const BMAP_ANCHOR_MIDDLE_RIGHT = BMAP_ANCHOR_RIGHT_CENTER;
/** @deprecated 用 BMAP_LANGUAGE_ZH */
export const BMAP_LANG_CN = BMAP_LANGUAGE_ZH;
/** @deprecated 用 BMAP_LANGUAGE_EN */
export const BMAP_LANG_EN = BMAP_LANGUAGE_EN;
/** @deprecated 用 BMAP_SHAPE_RECT */
export const BMAP_SHAPE_RECTANGLE = BMAP_SHAPE_RECT;
/** @deprecated 用 MarkerAnimation */
export type Animation = MarkerAnimation;

/**
 * 从 SDK 全局对象获取运行时常量（v3/v4 值可能不同），回退到静态值。
 */
export function getSdkConstant(name: string, fallback: number): number {
  const SDK = tryGetSDK();
  return (SDK?.[name] as number | undefined) ?? fallback;
}
