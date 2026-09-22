<script setup lang="ts">
import { Map, ContextMenu, MenuItem } from '@baidumap/vue-bmap';
import { BEIJING } from '../TestProvider';

const notify = (msg: string) => alert(msg);
</script>

<template>
  <div class="test-page">
    <div class="test-map">
      <Map :default-center="BEIJING" :default-zoom="12" style="height:100%">
        <ContextMenu>
          <MenuItem text="放大一级" :callback="() => notify('放大')" />
          <MenuItem text="缩小一级" :callback="() => notify('缩小')" />
          <MenuItem text="重置地图" :callback="() => notify('重置')" />
        </ContextMenu>
      </Map>
    </div>
    <div class="test-controls">
      <h2>ContextMenu + MenuItem</h2>
      <p class="muted small">
        在地图上右键点击，应该看到三个菜单项：
      </p>
      <ul class="state-list">
        <li>• 放大一级</li>
        <li>• 缩小一级</li>
        <li>• 重置地图</li>
      </ul>
      <p class="muted small">
        点击菜单项会弹出对应的 alert。
        ContextMenu 也可以挂在 Marker 下（作为 Marker 的 children）。
      </p>
    </div>
  </div>
</template>
