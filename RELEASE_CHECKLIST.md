# 上线前检查清单（Release Checklist）

发版前逐项确认。前四步为自动门禁（秒级、无需 AK/联网），全绿才可发版；
第 5 步为人工真机冒烟。

## 一键自动门禁

```bash
npm run preflight
```

`preflight` = `typecheck → test → build`，任一步失败即停。

## 逐项清单

### 1. 静态与类型
- [ ] `npm run typecheck` 通过（`tsc --noEmit`）
- [ ] `npm run build` 成功，且 `dist/index.js`（ESM）、`dist/index.cjs`（CJS）、`dist/index.d.ts` 正常产出

### 2. 单元测试
- [ ] `npm run test` 全绿（当前 1 文件 / 5 用例）
- [ ] 导出快照 `src/__tests__/exports.test.ts` 未意外变动（增删公开导出会触发变动）

### 3. 包出口自检
- [ ] `package.json` 的 `main`/`module`/`types`/`exports` 指向的产物真实存在
- [ ] 冒烟：`import { Map, BMapProvider } from '@baidumap/vue-bmap'` 可解析
- [ ] `peerDependencies.vue` 版本范围正确（`>=3.3`，不含 Vue 2）
- [ ] （可选）`publint` + `@arethetypeswrong/cli`

### 4. 示例站可构建
- [ ] `npx vite build --config examples/vite.config.ts` 成功
- [ ] `npx vite build --config test/vite.config.ts` 成功

### 5. 真实浏览器 E2E（人工，不进 CI）
- [ ] `npm run test:manual`（需 AK / 联网 / WebGL）
- [ ] v3 与 v4 两个版本都过一遍（URL 切 `?v=3` / `?v=4`）
- [ ] Marker3D 的重建路径正常（shape/size 改动重建）
- [ ] NavigationControl 切换 type（小型/大型）重建生效
- [ ] TrafficLayer / DistrictLayer 在真实地图上能加载
- [ ] InfoWindow 打开/关闭、点图关闭（enableCloseOnClick）正常

## 改动时的联动纪律

- [ ] 改了公开导出（`src/index.ts`）→ 已 `npx vitest -u` 更新导出快照，并在提交里说明增删原因
- [ ] 改了 driver 方法 → v3/v4 两侧都已同步（`src/drivers/v3Driver.ts` 与 `v4Driver.ts`），能力矩阵 `capabilityMatrix.ts` 同步更新
- [ ] 新增组件 / composable → 已从 `src/index.ts` 导出，并在 README 组件清单里补齐

## 发布动作（确认门禁全绿后）

- [ ] 版本号已按 semver 更新（`package.json` version）
- [ ] `CHANGELOG` / release notes 已更新（如有）
- [ ] 确认发布 registry 与账号正确（公网 npm 用对应账号，勿误发到内网镜像）
- [ ] `npm publish`（`prepublishOnly` 会自动再跑一次 build）

> 说明：本库测试以「公开导出快照 + 手动真机冒烟」为主，driver 的 v3/v4 平价与组件行为主要靠 `test/` 手动测试页覆盖，不追求行覆盖率数字。
