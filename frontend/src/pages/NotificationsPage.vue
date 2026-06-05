<script setup lang="ts">
import { ref, computed } from 'vue'
import { useNotifications, type NotificationEvent } from '@/composables/useNotifications'
import {
  Bell,
  Square,
  HardDrive,
  Video,
  WifiOff,
  AlertCircle,
  Trash2,
  CheckCircle,
  BellOff,
  Settings,
  Volume2,
  VolumeX,
  RefreshCw
} from 'lucide-vue-next'

const {
  notifications,
  unreadCount,
  isLoading,
  error,
  refresh,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAll,
  preferences,
  updatePreferences
} = useNotifications()

const activeTab = ref<'All' | 'Unread' | 'Stream' | 'Recording' | 'Push' | 'Errors'>('All')
const currentPage = ref(1)
const itemsPerPage = 10
const showClearConfirm = ref(false)

// Reset to page 1 when tab changes
const selectTab = (tab: typeof activeTab.value) => {
  activeTab.value = tab
  currentPage.value = 1
}

// Filter notifications by active tab
const filteredNotifications = computed(() => {
  let result = [...notifications.value]

  if (activeTab.value === 'Unread') {
    result = result.filter(n => !n.isRead)
  } else if (activeTab.value === 'Stream') {
    result = result.filter(n => n.type === 'stream_start' || n.type === 'stream_stop')
  } else if (activeTab.value === 'Recording') {
    result = result.filter(n => n.type === 'recording_complete')
  } else if (activeTab.value === 'Push') {
    result = result.filter(n => n.type === 'push_status_change')
  } else if (activeTab.value === 'Errors') {
    result = result.filter(n => n.type === 'error' || n.type === 'connection_loss')
  }

  return result
})

// Calculate total pages for pagination
const totalPages = computed(() => {
  return Math.ceil(filteredNotifications.value.length / itemsPerPage)
})

// Slice for current page
const paginatedNotifications = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredNotifications.value.slice(start, end)
})

// Helpers for icons and colors
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

// Date and relative time formatters
function formatAbsoluteTime(timestamp: string): string {
  try {
    const d = new Date(timestamp)
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return timestamp
  }
}

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

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Toggle Sound and Preferences
function toggleSound(e: Event) {
  const target = e.target as HTMLInputElement
  updatePreferences({ soundEnabled: target.checked })
}

function toggleEvent(eventKey: keyof typeof preferences.value.events, e: Event) {
  const target = e.target as HTMLInputElement
  const updatedEvents = {
    ...preferences.value.events,
    [eventKey]: target.checked
  }
  updatePreferences({ events: updatedEvents })
}

// Confirmation handlers
async function confirmClearAll() {
  await clearAll()
  showClearConfirm.value = false
  currentPage.value = 1
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Notifications</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Monitor OME stream lifecycle events, status changes, and warnings
        </p>
      </div>
      <div class="flex items-center space-x-3">
        <button
          @click="refresh"
          class="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': isLoading }" />
        </button>
        <button
          @click="markAllAsRead"
          :disabled="unreadCount === 0"
          class="inline-flex items-center space-x-1.5 px-4 py-2 text-sm bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg font-semibold transition-colors cursor-pointer shadow-sm"
        >
          <CheckCircle class="w-4 h-4" />
          <span>Mark All Read</span>
        </button>
        <button
          @click="showClearConfirm = true"
          :disabled="notifications.length === 0"
          class="inline-flex items-center space-x-1.5 px-4 py-2 text-sm bg-danger/10 hover:bg-danger/20 disabled:opacity-50 disabled:pointer-events-none text-danger rounded-lg font-semibold transition-colors cursor-pointer"
        >
          <Trash2 class="w-4 h-4" />
          <span>Clear All</span>
        </button>
      </div>
    </div>

    <!-- Layout Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Left: Filters & List -->
      <div class="lg:col-span-8 space-y-4">
        <!-- Filter Tabs -->
        <div class="bg-card rounded-xl border border-subtle p-2 shadow-sm">
          <div class="flex items-center overflow-x-auto gap-1">
            <button
              v-for="tab in ['All', 'Unread', 'Stream', 'Recording', 'Push', 'Errors']"
              :key="tab"
              @click="selectTab(tab as any)"
              class="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-150 whitespace-nowrap focus:outline-none cursor-pointer"
              :class="activeTab === tab
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
            >
              {{ tab }}
              <span
                v-if="tab === 'Unread' && unreadCount > 0"
                class="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white text-primary"
              >
                {{ unreadCount }}
              </span>
            </button>
          </div>
        </div>

        <!-- Notification List Card -->
        <div class="bg-card rounded-xl border border-subtle overflow-hidden shadow-sm flex flex-col min-h-[400px]">
          <!-- List Container -->
          <div class="flex-1 divide-y divide-subtle">
            <!-- Loading State -->
            <div v-if="isLoading && notifications.length === 0" class="p-8 space-y-4">
              <div v-for="i in 3" :key="i" class="flex items-start animate-skeleton rounded-lg p-4 bg-muted">
                <div class="w-8 h-8 bg-card rounded-lg mr-3"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-card rounded w-1/4"></div>
                  <div class="h-3 bg-card rounded w-3/4"></div>
                </div>
              </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="p-8 text-center text-danger flex flex-col items-center justify-center">
              <AlertCircle class="w-10 h-10 mb-3" />
              <p class="font-medium">{{ error }}</p>
              <button @click="refresh" class="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-hover transition-colors">
                Retry
              </button>
            </div>

            <!-- Empty State -->
            <div v-else-if="filteredNotifications.length === 0" class="flex flex-col items-center justify-center py-20 text-center px-4">
              <div class="w-16 h-16 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center mb-4">
                <BellOff class="w-8 h-8" />
              </div>
              <h3 class="text-lg font-semibold text-foreground mb-1">No notifications</h3>
              <p class="text-sm text-muted-foreground max-w-sm">
                {{ activeTab === 'All' ? "You don't have any notifications yet." : `No notifications matching the "${activeTab}" filter.` }}
              </p>
            </div>

            <!-- Items -->
            <template v-else>
              <div
                v-for="item in paginatedNotifications"
                :key="item.id"
                class="group relative flex items-start p-4 md:p-5 hover:bg-muted/30 transition-colors cursor-pointer"
                :class="{ 'bg-primary/5 hover:bg-primary/8': !item.isRead }"
                @click="!item.isRead && markAsRead(item.id)"
              >
                <!-- Category Icon -->
                <div class="mr-4 mt-0.5">
                  <div class="flex items-center justify-center w-9 h-9 rounded-lg" :class="getIconColorClass(item.type)">
                    <component :is="getNotificationIcon(item.type)" class="w-5 h-5" />
                  </div>
                </div>

                <!-- Text Details -->
                <div class="flex-1 min-w-0 pr-12">
                  <div class="flex items-baseline mb-1">
                    <h3 class="text-sm font-semibold" :class="!item.isRead ? 'text-primary' : 'text-foreground'">
                      {{ item.title }}
                    </h3>
                    <span v-if="!item.isRead" class="ml-2.5 inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded bg-primary text-white uppercase">
                      New
                    </span>
                  </div>
                  <p class="text-xs text-muted-foreground break-words leading-relaxed">
                    {{ item.message }}
                  </p>
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-muted-foreground">
                    <span :title="formatAbsoluteTime(item.timestamp)">
                      {{ formatRelativeTime(item.timestamp) }}
                    </span>
                    <span>•</span>
                    <span>{{ formatAbsoluteTime(item.timestamp) }}</span>
                    <template v-if="item.vhost">
                      <span>•</span>
                      <span class="font-mono bg-muted text-foreground px-1.5 py-0.5 rounded text-[9px]">
                        vhost: {{ item.vhost }} / app: {{ item.app }}
                      </span>
                    </template>
                  </div>
                </div>

                <!-- Action Button Overlay -->
                <div class="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                  <button
                    class="p-2 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 cursor-pointer"
                    title="Delete notification"
                    @click.stop="deleteNotification(item.id)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </template>
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex items-center justify-between p-4 border-t border-subtle">
            <div class="text-xs text-muted-foreground">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, filteredNotifications.length) }} of {{ filteredNotifications.length }} notifications
            </div>
            <div class="flex items-center space-x-1.5">
              <button
                :disabled="currentPage === 1"
                @click="currentPage--"
                class="px-3 py-1.5 text-xs bg-card hover:bg-muted text-foreground border border-subtle rounded-md font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                Previous
              </button>
              <button
                v-for="p in totalPages"
                :key="p"
                @click="currentPage = p"
                class="px-2.5 py-1 text-xs border rounded-md font-semibold transition-colors cursor-pointer"
                :class="currentPage === p
                  ? 'bg-primary text-white border-primary'
                  : 'bg-card hover:bg-muted text-foreground border-subtle'"
              >
                {{ p }}
              </button>
              <button
                :disabled="currentPage === totalPages"
                @click="currentPage++"
                class="px-3 py-1.5 text-xs bg-card hover:bg-muted text-foreground border border-subtle rounded-md font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Settings Sidebar -->
      <div class="lg:col-span-4 space-y-6">
        <!-- Settings Card -->
        <div class="bg-card text-card-foreground rounded-xl border border-subtle p-6 shadow-sm">
          <div class="flex items-center space-x-2.5 mb-5">
            <Settings class="w-5 h-5 text-primary" />
            <h2 class="text-base font-bold text-foreground">Notification Settings</h2>
          </div>

          <!-- Audio Alert Toggle -->
          <div class="flex items-center justify-between py-3.5 border-b border-subtle">
            <div class="pr-4">
              <label for="soundEnabled" class="text-sm font-semibold text-foreground cursor-pointer flex items-center space-x-1.5">
                <component :is="preferences.soundEnabled ? Volume2 : VolumeX" class="w-4 h-4 text-primary" />
                <span>Play Audio Alert</span>
              </label>
              <p class="text-xs text-muted-foreground mt-0.5">
                Play a simple beep sound in the browser on new events
              </p>
            </div>
            <div class="flex items-center">
              <input
                id="soundEnabled"
                type="checkbox"
                :checked="preferences.soundEnabled"
                @change="toggleSound"
                class="rounded border-subtle bg-background text-primary focus:ring-primary/40 focus:ring-2 h-4 w-4 cursor-pointer"
              />
            </div>
          </div>

          <!-- Event type selectors -->
          <div class="space-y-4 pt-4">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notify on:
            </h3>

            <!-- stream_start -->
            <div class="flex items-center justify-between">
              <label for="event_stream_start" class="text-sm text-foreground cursor-pointer flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-success"></span>
                <span>Stream Started</span>
              </label>
              <input
                id="event_stream_start"
                type="checkbox"
                :checked="preferences.events.stream_start"
                @change="toggleEvent('stream_start', $event)"
                class="rounded border-subtle bg-background text-primary focus:ring-primary/40 focus:ring-2 h-4 w-4 cursor-pointer"
              />
            </div>

            <!-- stream_stop -->
            <div class="flex items-center justify-between">
              <label for="event_stream_stop" class="text-sm text-foreground cursor-pointer flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-danger"></span>
                <span>Stream Stopped</span>
              </label>
              <input
                id="event_stream_stop"
                type="checkbox"
                :checked="preferences.events.stream_stop"
                @change="toggleEvent('stream_stop', $event)"
                class="rounded border-subtle bg-background text-primary focus:ring-primary/40 focus:ring-2 h-4 w-4 cursor-pointer"
              />
            </div>

            <!-- recording_complete -->
            <div class="flex items-center justify-between">
              <label for="event_recording_complete" class="text-sm text-foreground cursor-pointer flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-primary"></span>
                <span>Recording Completed</span>
              </label>
              <input
                id="event_recording_complete"
                type="checkbox"
                :checked="preferences.events.recording_complete"
                @change="toggleEvent('recording_complete', $event)"
                class="rounded border-subtle bg-background text-primary focus:ring-primary/40 focus:ring-2 h-4 w-4 cursor-pointer"
              />
            </div>

            <!-- push_status_change -->
            <div class="flex items-center justify-between">
              <label for="event_push_status_change" class="text-sm text-foreground cursor-pointer flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-warning"></span>
                <span>Push Status Change</span>
              </label>
              <input
                id="event_push_status_change"
                type="checkbox"
                :checked="preferences.events.push_status_change"
                @change="toggleEvent('push_status_change', $event)"
                class="rounded border-subtle bg-background text-primary focus:ring-primary/40 focus:ring-2 h-4 w-4 cursor-pointer"
              />
            </div>

            <!-- connection_loss -->
            <div class="flex items-center justify-between">
              <label for="event_connection_loss" class="text-sm text-foreground cursor-pointer flex items-center space-x-2">
                <span class="w-2 h-2 bg-danger rounded-full animate-ping"></span>
                <span>Connection Loss</span>
              </label>
              <input
                id="event_connection_loss"
                type="checkbox"
                :checked="preferences.events.connection_loss"
                @change="toggleEvent('connection_loss', $event)"
                class="rounded border-subtle bg-background text-primary focus:ring-primary/40 focus:ring-2 h-4 w-4 cursor-pointer"
              />
            </div>

            <!-- error -->
            <div class="flex items-center justify-between">
              <label for="event_error" class="text-sm text-foreground cursor-pointer flex items-center space-x-2">
                <span class="w-2 h-2 rounded-full bg-danger"></span>
                <span>System Errors</span>
              </label>
              <input
                id="event_error"
                type="checkbox"
                :checked="preferences.events.error"
                @change="toggleEvent('error', $event)"
                class="rounded border-subtle bg-background text-primary focus:ring-primary/40 focus:ring-2 h-4 w-4 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Clear All Modal -->
    <Teleport to="body">
      <div v-if="showClearConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
        <div class="bg-card border border-subtle rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200">
          <div class="flex items-center space-x-3 text-danger">
            <AlertCircle class="w-6 h-6" />
            <h3 class="text-lg font-bold text-foreground">Clear All Notifications</h3>
          </div>
          <p class="text-sm text-muted-foreground">
            Are you sure you want to clear all notifications? This action is permanent and cannot be undone.
          </p>
          <div class="flex justify-end space-x-3 pt-2">
            <button
              @click="showClearConfirm = false"
              class="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-subtle rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="confirmClearAll"
              class="px-4 py-2 bg-danger hover:bg-danger/80 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
