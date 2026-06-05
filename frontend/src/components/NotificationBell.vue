<script setup lang="ts">
import { Bell, BellRing } from 'lucide-vue-next'

defineProps<{
  unreadCount: number
}>()

const emit = defineEmits<{
  (e: 'toggle'): void
}>()
</script>

<template>
  <button
    class="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground focus:outline-none transition-colors duration-150"
    @click="emit('toggle')"
    title="Notifications"
  >
    <BellRing v-if="unreadCount > 0" class="w-5 h-5 text-primary" />
    <Bell v-else class="w-5 h-5" />
    
    <!-- Red badge with unread count (hidden if 0) -->
    <span
      v-if="unreadCount > 0"
      class="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-danger rounded-full transform translate-x-1/4 -translate-y-1/4"
    >
      {{ unreadCount > 99 ? '99+' : unreadCount }}
    </span>
  </button>
</template>
