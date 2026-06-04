<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'

import { Server, Radio, Activity, Play, Video, HardDrive } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    title: string
    value: number | string
    icon: Component | object | string
    color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
    loading?: boolean
  }>(),
  {
    color: 'primary',
    loading: false,
  }
)

const colorBgClass = computed(() => {
  if (props.icon === Server) {
    return 'bg-primary/10 text-primary'
  }
  if (props.icon === Radio) {
    return 'bg-success/10 text-success'
  }
  if (props.icon === Activity) {
    return 'bg-warning/10 text-warning'
  }
  if (props.icon === Play) {
    return 'bg-primary/10 text-primary'
  }
  if (props.icon === Video) {
    return 'bg-primary/10 text-primary'
  }
  if (props.icon === HardDrive) {
    return 'bg-muted text-muted-foreground'
  }

  if (typeof props.icon === 'string') {
    const iconName = props.icon.toLowerCase()
    if (iconName === 'server') return 'bg-primary/10 text-primary'
    if (iconName === 'radio') return 'bg-success/10 text-success'
    if (iconName === 'activity') return 'bg-warning/10 text-warning'
    if (iconName === 'play') return 'bg-primary/10 text-primary'
    if (iconName === 'video') return 'bg-primary/10 text-primary'
    if (iconName === 'hard-drive' || iconName === 'harddrive') return 'bg-muted text-muted-foreground'
  }

  return 'bg-primary/10 text-primary'
})
</script>

<template>
  <div class="bg-card rounded-xl border border-subtle p-6">
    <div class="flex items-center justify-between mb-4">
      <div class="p-3 rounded-lg" :class="colorBgClass">
        <component :is="icon" class="w-6 h-6" />
      </div>
      <span v-if="loading" class="animate-skeleton h-8 w-20 rounded"></span>
      <span v-else class="text-3xl font-bold text-foreground font-sans">{{ value }}</span>
    </div>
    <p class="text-sm font-medium text-muted-foreground">{{ title }}</p>
  </div>
</template>
