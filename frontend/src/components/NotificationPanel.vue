<script setup lang="ts">
import {
  Bell,
  Square,
  HardDrive,
  Video,
  WifiOff,
  AlertCircle,
  X,
  Trash2,
  CheckCircle,
  BellOff
} from 'lucide-vue-next'
import type { NotificationEvent } from '@/composables/useNotifications'

const props = defineProps<{
  show: boolean
  notifications: NotificationEvent[]
  unreadCount: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'markRead', id: string): void
  (e: 'markAllRead'): void
  (e: 'delete', id: string): void
  (e: 'clearAll'): void
  (e: 'viewAll'): void
}>()

// Helper to determine the icon to display
function getNotificationIcon(type: NotificationEvent['type']) {
  switch (type) {
    case 'stream_start':
      return Bell
    case 'stream_stop':
      return Square
    case 'recording_complete':
      return HardDrive
    case 'push_status_change':
      return Video
    case 'connection_loss':
      return WifiOff
    case 'error':
      return AlertCircle
    default:
      return Bell
  }
}

// Helper to get color classes based on event type
function getIconColorClass(type: NotificationEvent['type']) {
  switch (type) {
    case 'stream_start':
      return 'bg-success/15 text-success dark:bg-success/20 dark:text-success'
    case 'stream_stop':
      return 'bg-danger/15 text-danger dark:bg-danger/20 dark:text-danger'
    case 'recording_complete':
      return 'bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary'
    case 'push_status_change':
      return 'bg-warning/15 text-warning dark:bg-warning/20 dark:text-warning'
    case 'connection_loss':
      return 'bg-danger/15 text-danger dark:bg-danger/20 dark:text-danger animate-pulse'
    case 'error':
      return 'bg-danger/15 text-danger dark:bg-danger/20 dark:text-danger'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

// Format relative time helper
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 0 || seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  // Return standard date string for old events
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function handleItemClick(item: NotificationEvent) {
  if (!item.isRead) {
    emit('markRead', item.id)
  }
}
</script>

<template>
  <div>
    <!-- Backdrop Overlay -->
    <transition name="fade">
      <div
        v-if="show"
        class="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
        @click="emit('close')"
      ></div>
    </transition>

    <!-- Slide-out Drawer Panel -->
    <transition name="slide">
      <div
        v-if="show"
        class="fixed top-0 bottom-0 right-0 z-50 flex flex-col w-full max-w-md bg-card text-foreground border-l border-subtle shadow-2xl transition-transform duration-300"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-subtle">
          <div class="flex items-center space-x-2.5">
            <h2 class="text-base font-semibold">Notifications</h2>
            <span
              v-if="unreadCount > 0"
              class="flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full bg-primary/15 text-primary"
            >
              {{ unreadCount }} new
            </span>
          </div>
          <button
            class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
            @click="emit('close')"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Utility Bar (Mark all, Clear) -->
        <div
          v-if="notifications.length > 0"
          class="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-subtle text-xs"
        >
          <button
            v-if="unreadCount > 0"
            class="text-primary hover:text-primary-hover font-medium transition-colors focus:outline-none flex items-center space-x-1"
            @click="emit('markAllRead')"
          >
            <CheckCircle class="w-3.5 h-3.5" />
            <span>Mark all as read</span>
          </button>
          <div v-else></div>

          <button
            class="text-muted-foreground hover:text-danger font-medium transition-colors focus:outline-none flex items-center space-x-1"
            @click="emit('clearAll')"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>Clear all</span>
          </button>
        </div>

        <!-- Notification List -->
        <div class="flex-1 overflow-y-auto divide-y divide-subtle">
          <div v-if="notifications.length === 0" class="flex flex-col items-center justify-center h-64 p-6 text-center">
            <div class="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <BellOff class="w-6 h-6 text-muted-foreground" />
            </div>
            <p class="font-medium text-sm">All caught up!</p>
            <p class="text-xs text-muted-foreground mt-1">You don't have any notifications at the moment.</p>
          </div>

          <template v-else>
            <div
              v-for="item in notifications.slice(0, 50)"
              :key="item.id"
              class="group relative flex items-start p-4 hover:bg-muted/40 transition-colors cursor-pointer"
              :class="{ 'bg-primary/5 hover:bg-primary/10': !item.isRead }"
              @click="handleItemClick(item)"
            >
              <!-- Left: Category Icon -->
              <div class="mr-3 mt-0.5">
                <div class="flex items-center justify-center w-8 h-8 rounded-lg" :class="getIconColorClass(item.type)">
                  <component :is="getNotificationIcon(item.type)" class="w-4 h-4" />
                </div>
              </div>

              <!-- Center: Text Details -->
              <div class="flex-1 min-w-0 pr-6">
                <div class="flex items-baseline justify-between mb-0.5">
                  <h3 class="text-sm font-semibold truncate" :class="{ 'text-primary': !item.isRead }">
                    {{ item.title }}
                  </h3>
                </div>
                <p class="text-xs text-muted-foreground line-clamp-2 break-words leading-relaxed">
                  {{ item.message }}
                </p>
                <div class="flex items-center space-x-2 mt-1.5 text-[10px] text-muted-foreground">
                  <span>{{ formatRelativeTime(item.timestamp) }}</span>
                  <template v-if="item.vhost">
                    <span>•</span>
                    <span class="font-mono bg-muted px-1.5 py-0.5 rounded text-[9px]">{{ item.vhost }}/{{ item.app }}</span>
                  </template>
                </div>
              </div>

              <!-- Right: Unread Indicator & Delete Button -->
              <div class="absolute right-4 top-4 bottom-4 flex flex-col justify-between items-end">
                <div
                  v-if="!item.isRead"
                  class="w-2 h-2 bg-primary rounded-full"
                  title="Unread"
                ></div>
                <div v-else class="w-2 h-2"></div>

                <button
                  class="p-1 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150"
                  title="Delete notification"
                  @click.stop="emit('delete', item.id)"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Footer -->
        <div
          v-if="notifications.length > 0"
          class="p-3 bg-muted/20 border-t border-subtle text-center"
        >
          <button
            class="text-xs font-semibold text-primary hover:text-primary-hover hover:underline transition-colors focus:outline-none"
            @click="emit('viewAll')"
          >
            View All Notifications
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
