<script setup lang="ts">
defineProps<{ name: string }>();
</script>

<template>
  <div class="placeholder">
    <h2>{{ name }}</h2>
    <p>该测试页占位中：组件已在库中实现，可参照 examples 中的用法自行验证；此测试工程后续补交互页。</p>
  </div>
</template>
