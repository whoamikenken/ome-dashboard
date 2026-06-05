<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAllStreams } from '@/composables/useAllStreams'
import type { StreamEntry } from '@/composables/useAllStreams'
import { Activity, Search, RefreshCw, AlertCircle, Eye, ArrowUpDown, Radio, Play } from 'lucide-vue-next'
import StreamPlayer from '@/components/StreamPlayer.vue'

const router = useRouter()
const { streams, isLoading, error, lastUpdated, fetchAllStreams } = useAllStreams(15000)

const searchQuery = ref('')
const filterVHost = ref('')
const filterApp = ref('')
const filterSourceType = ref('')
const sortField = ref<'name' | 'vhost' | 'app' | 'sourceType' | 'createdTime'>('name')
const sortDir = ref<'asc' | 'desc'>('asc')

const selectedStream = ref<{ vhost: string; app: string; streamName: string } | null>(null)
const showPlayer = ref(false)

// Get unique values for filter dropdowns
const uniqueVHosts = computed(() => [...new Set(streams.value.map(s => s.vhost))].sort())
const uniqueApps = computed(() => [...new Set(streams.value.map(s => s.app))].sort())
const uniqueSourceTypes = computed(() => [...new Set(streams.value.map(s => s.sourceType).filter(Boolean))].sort())

const filteredStreams = computed(() => {
  let result = [...streams.value]

  // Search filter (searches name, vhost, app, sourceUrl)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.vhost.toLowerCase().includes(q) ||
      s.app.toLowerCase().includes(q) ||
      s.sourceUrl.toLowerCase().includes(q)
    )
  }

  // Dropdown filters
  if (filterVHost.value) result = result.filter(s => s.vhost === filterVHost.value)
  if (filterApp.value) result = result.filter(s => s.app === filterApp.value)
  if (filterSourceType.value) result = result.filter(s => s.sourceType === filterSourceType.value)

  // Sort
  result.sort((a, b) => {
    let cmp = 0
    const field = sortField.value
    if (field === 'createdTime') {
      cmp = (a.createdTime || '').localeCompare(b.createdTime || '')
    } else {
      cmp = (a[field] || '').localeCompare(b[field] || '')
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })

  return result
})

function toggleSort(field: 'name' | 'vhost' | 'app' | 'sourceType' | 'createdTime') {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

function viewStream(entry: StreamEntry) {
  router.push({
    name: 'app-detail',
    params: { vhost: entry.vhost, app: entry.app },
  })
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString()
  } catch {
    return '-'
  }
}

function getSortIcon(field: string): string {
  if (sortField.value !== field) return 'text-muted-foreground/30'
  return sortDir.value === 'asc' ? 'text-primary' : 'text-primary rotate-180'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Streams</h1>
        <p class="text-sm text-muted-foreground mt-1">All streams across all virtual hosts</p>
      </div>
      <div class="flex items-center space-x-3">
        <div v-if="lastUpdated" class="text-xs text-muted-foreground hidden sm:block">
          Last updated: {{ lastUpdated.toLocaleTimeString() }}
        </div>
        <button
          @click="fetchAllStreams"
          class="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw class="w-5 h-5" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </div>

    <!-- Search + Filters Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-subtle shadow-sm">
      <div class="flex flex-wrap items-center gap-3 flex-1">
        <!-- Search Input -->
        <div class="relative min-w-[240px] flex-1 max-w-md">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search class="w-4 h-4 text-muted-foreground" />
          </span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search streams..."
            class="w-full pl-9 pr-4 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <!-- VHost Filter -->
        <div class="min-w-[160px]">
          <select
            v-model="filterVHost"
            class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option value="">All VHosts</option>
            <option v-for="v in uniqueVHosts" :key="v" :value="v">{{ v }}</option>
          </select>
        </div>

        <!-- App Filter -->
        <div class="min-w-[160px]">
          <select
            v-model="filterApp"
            class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option value="">All Apps</option>
            <option v-for="a in uniqueApps" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>

        <!-- Source Type Filter -->
        <div class="min-w-[160px]">
          <select
            v-model="filterSourceType"
            class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option value="">All Sources</option>
            <option v-for="t in uniqueSourceTypes" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
      </div>

      <div class="flex items-center space-x-2 shrink-0 self-end lg:self-auto">
        <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          {{ filteredStreams.length }} streams
        </span>
      </div>
    </div>

    <!-- Error Banner -->
    <div
      v-if="error"
      class="flex items-center justify-between p-4 bg-danger/10 border border-danger/20 rounded-xl"
    >
      <div class="flex items-center space-x-3">
        <AlertCircle class="w-5 h-5 text-danger" />
        <span class="text-sm font-medium text-danger">{{ error }}</span>
      </div>
      <button
        @click="fetchAllStreams"
        class="text-sm font-semibold text-danger hover:text-danger/80 underline cursor-pointer"
      >
        Retry
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="bg-card rounded-xl border border-subtle overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-muted/50 border-b border-subtle">
              <th v-for="i in 8" :key="i" class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div class="h-3 bg-muted rounded w-16 animate-skeleton"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in 5" :key="row" class="border-t border-subtle">
              <td class="px-6 py-4">
                <div class="flex items-center space-x-2">
                  <div class="w-4 h-4 rounded-full animate-skeleton"></div>
                  <div class="h-4 bg-muted rounded w-32 animate-skeleton"></div>
                </div>
              </td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-16 animate-skeleton"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-16 animate-skeleton"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-12 animate-skeleton"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-48 animate-skeleton"></div></td>
              <td class="px-6 py-4">
                <div class="flex space-x-1">
                  <div class="h-4 bg-muted rounded w-6 animate-skeleton"></div>
                  <div class="h-4 bg-muted rounded w-6 animate-skeleton"></div>
                </div>
              </td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-24 animate-skeleton"></div></td>
              <td class="px-6 py-4 text-right"><div class="h-8 bg-muted rounded w-8 ml-auto animate-skeleton"></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredStreams.length === 0"
      class="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border border-subtle text-center shadow-sm"
    >
      <div class="w-16 h-16 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center mb-4">
        <Radio class="w-8 h-8" />
      </div>
      <h3 class="text-lg font-semibold text-foreground mb-1">No streams found</h3>
      <p class="text-sm text-muted-foreground max-w-sm">
        {{ (searchQuery || filterVHost || filterApp || filterSourceType) ? 'No results found matching your filters. Try clearing them or modifying your search.' : 'No active streams were found on the server.' }}
      </p>
      <button
        v-if="searchQuery || filterVHost || filterApp || filterSourceType"
        @click="searchQuery = ''; filterVHost = ''; filterApp = ''; filterSourceType = ''"
        class="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
      >
        Clear Filters
      </button>
    </div>

    <!-- Streams Table -->
    <div v-else class="bg-card rounded-xl border border-subtle overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-muted/50 border-b border-subtle">
              <th
                @click="toggleSort('name')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
              >
                <div class="flex items-center space-x-1 select-none">
                  <span>Name</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('name')" />
                </div>
              </th>
              <th
                @click="toggleSort('vhost')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
              >
                <div class="flex items-center space-x-1 select-none">
                  <span>VHost</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('vhost')" />
                </div>
              </th>
              <th
                @click="toggleSort('app')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
              >
                <div class="flex items-center space-x-1 select-none">
                  <span>App</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('app')" />
                </div>
              </th>
              <th
                @click="toggleSort('sourceType')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
              >
                <div class="flex items-center space-x-1 select-none">
                  <span>Source Type</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('sourceType')" />
                </div>
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                Source URL
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                Tracks
              </th>
              <th
                @click="toggleSort('createdTime')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
              >
                <div class="flex items-center space-x-1 select-none">
                  <span>Created</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('createdTime')" />
                </div>
              </th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-subtle">
            <tr
              v-for="s in filteredStreams"
              :key="s.vhost + '/' + s.app + '/' + s.name"
              class="border-t border-subtle hover:bg-muted/30 transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                  <Activity class="w-4 h-4 text-success animate-pulse shrink-0" />
                  <span class="font-medium text-foreground">{{ s.name }}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {{ s.vhost }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {{ s.app }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span v-if="s.sourceType" class="bg-primary/5 text-primary px-2 py-0.5 rounded text-xs font-medium">
                  {{ s.sourceType }}
                </span>
                <span v-else class="text-muted-foreground/40">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="truncate max-w-[200px] text-xs text-muted-foreground font-mono" :title="s.sourceUrl || ''">
                  {{ s.sourceUrl || '-' }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <div class="flex items-center space-x-1">
                  <span class="bg-success/10 text-success text-xs px-1.5 py-0.5 rounded font-mono font-semibold" title="Video Tracks">
                    {{ s.videoTracks }}v
                  </span>
                  <span class="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded font-mono font-semibold" title="Audio Tracks">
                    {{ s.audioTracks }}a
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {{ formatDate(s.createdTime) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                  <button
                    @click="viewStream(s)"
                    class="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-primary hover:text-primary-hover bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
                    title="View Detail"
                  >
                    <Eye class="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                  <button
                    @click="selectedStream = { vhost: s.vhost, app: s.app, streamName: s.name }; showPlayer = true"
                    class="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs text-success hover:text-success/80 bg-success/10 hover:bg-success/20 rounded-lg transition-colors cursor-pointer"
                    title="Play Stream"
                  >
                    <Play class="w-3.5 h-3.5 fill-current" />
                    <span>Play</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <StreamPlayer
    v-if="showPlayer && selectedStream"
    :vhost="selectedStream.vhost"
    :app="selectedStream.app"
    :streamName="selectedStream.streamName"
    :show="showPlayer"
    @close="showPlayer = false; selectedStream = null"
  />
</template>
