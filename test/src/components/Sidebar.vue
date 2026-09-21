<script setup lang="ts">
import { PAGES, CATEGORIES } from '../config';

defineProps<{ current: string | null }>();
</script>

<template>
  <aside class="app-sidebar">
    <template v-for="cat in CATEGORIES" :key="cat">
      <div class="cat">{{ cat }}</div>
      <a
        v-for="p in PAGES.filter((x) => x.category === cat)"
        :key="p.id"
        :href="`#/${p.id}`"
        :class="{ active: current === p.id }"
      >{{ p.name }}<span v-if="!p.ready" class="wip">占位</span></a>
    </template>
  </aside>
</template>
