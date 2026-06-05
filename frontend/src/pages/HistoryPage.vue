<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStreamHistory } from '@/composables/useStreamHistory'
import type { StreamHistoryEntry } from '@/types/history'
import {
  Clock,
  History,
  Search,
  RefreshCw,
  AlertCircle,
  ArrowUpDown,
  Filter,
  Download,
  Trash2,
  X,
  Activity,
  Radio,
} from 'lucide-vue-next'

const {
  entries,
  isLoading,
  error,
  refresh,
  deleteEntry,
  clearHistory
} = useStreamHistory()

// Search and Filter Refs
const searchQuery = ref('')
const filterVHost = ref('')
const filterApp = ref('')
const filterStatus = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')

// Sorting Refs
const sortField = ref<keyof StreamHistoryEntry>('startTime')
const sortDir = ref<'asc' | 'desc'>('desc')

// Deletion Confirmation Refs
const deleteConfirmId = ref<string | null>(null)
const showClearConfirm = ref(false)

// Get unique values for filter dropdowns
const uniqueVHosts = computed(() => {
  return [...new Set(entries.value.map(s => s.vhost))].filter(Boolean).sort()
})

const uniqueApps = computed(() => {
  return [...new Set(entries.value.map(s => s.app))].filter(Boolean).sort()
})

// Local Filtered and Sorted Sessions
const filteredSessions = computed(() => {
  let result = [...entries.value]

  // Search filter (searches streamName, vhost, app)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s =>
      s.streamName.toLowerCase().includes(q) ||
      s.vhost.toLowerCase().includes(q) ||
      (s.app && s.app.toLowerCase().includes(q))
    )
  }

  // Dropdown filters
  if (filterVHost.value) {
    result = result.filter(s => s.vhost === filterVHost.value)
  }
  if (filterApp.value) {
    result = result.filter(s => s.app === filterApp.value)
  }
  if (filterStatus.value) {
    result = result.filter(s => s.status === filterStatus.value)
  }

  // Date range filters
  if (filterDateFrom.value) {
    const from = new Date(filterDateFrom.value).getTime()
    result = result.filter(s => new Date(s.startTime).getTime() >= from)
  }
  if (filterDateTo.value) {
    const to = new Date(filterDateTo.value + 'T23:59:59').getTime()
    result = result.filter(s => new Date(s.startTime).getTime() <= to)
  }

  // Sort
  result.sort((a, b) => {
    const field = sortField.value
    const aVal = a[field]
    const bVal = b[field]
    
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1
    
    let cmp = 0
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      cmp = aVal.localeCompare(bVal)
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      cmp = (aVal as number) - (bVal as number)
    }
    
    return sortDir.value === 'asc' ? cmp : -cmp
  })

  return result
})

// Helper: Format duration to Xh Ym Zs
function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return '0s'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)

  const parts = []
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  if (s > 0 || parts.length === 0) parts.push(`${s}s`)
  return parts.join(' ')
}

// Format duration for table cell
function formatSessionDuration(session: StreamHistoryEntry): string {
  let seconds = session.duration || 0
  if (session.status === 'live') {
    const diff = Math.round((Date.now() - new Date(session.startTime).getTime()) / 1000)
    seconds = diff > 0 ? diff : 0
  }
  return formatDuration(seconds)
}

// Format dates to locale string
function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '-'
  }
}

// Compute Stats Summary
const stats = computed(() => {
  const list = filteredSessions.value
  const totalSessions = list.length
  
  let totalSeconds = 0
  list.forEach(s => {
    if (s.status === 'live') {
      const diff = Math.round((Date.now() - new Date(s.startTime).getTime()) / 1000)
      totalSeconds += diff > 0 ? diff : 0
    } else {
      totalSeconds += s.duration || 0
    }
  })
  
  const avgSeconds = totalSessions > 0 ? Math.round(totalSeconds / totalSessions) : 0
  
  const vhostCounts: Record<string, number> = {}
  list.forEach(s => {
    if (s.vhost) {
      vhostCounts[s.vhost] = (vhostCounts[s.vhost] || 0) + 1
    }
  })
  
  let mostActiveVHost = '-'
  let maxCount = 0
  for (const [vh, count] of Object.entries(vhostCounts)) {
    if (count > maxCount) {
      maxCount = count
      mostActiveVHost = vh
    }
  }
  
  return {
    totalSessions,
    totalDurationStr: formatDuration(totalSeconds),
    avgDurationStr: formatDuration(avgSeconds),
    mostActiveVHost,
  }
})

// Toggle Sort direction and field
function toggleSort(field: keyof StreamHistoryEntry) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

// Retrieve sorting classes/icons
function getSortIcon(field: keyof StreamHistoryEntry): string {
  if (sortField.value !== field) return 'text-muted-foreground/30'
  return sortDir.value === 'asc' ? 'text-primary' : 'text-primary rotate-180'
}

// Clear all filter inputs
function clearFilters() {
  searchQuery.value = ''
  filterVHost.value = ''
  filterApp.value = ''
  filterStatus.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
}

// Export filtered sessions to CSV
function handleExport() {
  const rows = filteredSessions.value
  const header = [
    'ID',
    'VHost',
    'App',
    'Stream Name',
    'Source Type',
    'Source IP',
    'Start Time',
    'End Time',
    'Duration (s)',
    'Status'
  ].join(',')

  const csvRows = rows.map(s => {
    const escape = (val: unknown): string => {
      const str = val == null ? '' : String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    return [
      escape(s.id),
      escape(s.vhost),
      escape(s.app),
      escape(s.streamName),
      escape(s.sourceType),
      escape(s.sourceIp),
      escape(s.startTime),
      escape(s.endTime),
      escape(s.duration),
      escape(s.status)
    ].join(',')
  })

  const csvContent = [header, ...csvRows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `stream-history-${new Date().toISOString().slice(0, 10)}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Delete Confirmation Actions
function requestDelete(id: string) {
  deleteConfirmId.value = id
}

async function confirmDelete() {
  if (deleteConfirmId.value) {
    await deleteEntry(deleteConfirmId.value)
    deleteConfirmId.value = null
  }
}

function openClearConfirm() {
  showClearConfirm.value = true
}

function closeClearConfirm() {
  showClearConfirm.value = false
}

async function confirmClearAll() {
  await clearHistory()
  showClearConfirm.value = false
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Stream History</h1>
        <p class="text-sm text-muted-foreground mt-1">Track stream session history and durations</p>
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
          @click="handleExport"
          :disabled="filteredSessions.length === 0"
          class="inline-flex items-center space-x-1.5 px-4 py-2 text-sm bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg font-semibold transition-colors cursor-pointer shadow-sm"
          title="Export CSV"
        >
          <Download class="w-4 h-4" />
          <span>Export CSV</span>
        </button>
        <button
          @click="openClearConfirm"
          :disabled="entries.length === 0"
          class="inline-flex items-center space-x-1.5 px-4 py-2 text-sm bg-danger/10 hover:bg-danger/20 disabled:opacity-50 disabled:pointer-events-none text-danger rounded-lg font-semibold transition-colors cursor-pointer"
          title="Clear History"
        >
          <Trash2 class="w-4 h-4" />
          <span>Clear History</span>
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="bg-card p-4 rounded-xl border border-subtle shadow-sm space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <!-- Search Input -->
        <div class="relative lg:col-span-2">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search class="w-4 h-4 text-muted-foreground" />
          </span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search streamName, vhost, app..."
            class="w-full pl-9 pr-4 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <!-- VHost Filter -->
        <div>
          <select
            v-model="filterVHost"
            class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option value="">All VHosts</option>
            <option v-for="v in uniqueVHosts" :key="v" :value="v">{{ v }}</option>
          </select>
        </div>

        <!-- App Filter -->
        <div>
          <select
            v-model="filterApp"
            class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option value="">All Apps</option>
            <option v-for="a in uniqueApps" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>

        <!-- Status Filter -->
        <div>
          <select
            v-model="filterStatus"
            class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
            <option value="error">Error</option>
          </select>
        </div>

        <!-- Clear Button -->
        <div class="flex items-center justify-end">
          <button
            @click="clearFilters"
            class="w-full px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-subtle rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
          >
            <X class="w-4 h-4" />
            <span>Clear Filters</span>
          </button>
        </div>
      </div>

      <!-- Date Range Selector Row -->
      <div class="flex flex-wrap items-center gap-4 pt-2 border-t border-subtle/50 text-sm">
        <div class="flex items-center space-x-2">
          <Filter class="w-4 h-4 text-muted-foreground" />
          <span class="font-medium text-muted-foreground">Date Range:</span>
        </div>
        <div class="flex items-center space-x-2">
          <label class="text-xs text-muted-foreground">From</label>
          <input
            v-model="filterDateFrom"
            type="date"
            class="px-3 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          />
        </div>
        <div class="flex items-center space-x-2">
          <label class="text-xs text-muted-foreground">To</label>
          <input
            v-model="filterDateTo"
            type="date"
            class="px-3 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
          />
        </div>
        <div class="ml-auto text-xs text-muted-foreground">
          Showing {{ filteredSessions.length }} of {{ entries.length }} entries
        </div>
      </div>
    </div>

    <!-- Stats Summary Bar -->
    <div v-if="isLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="i in 4" :key="i" class="bg-card rounded-xl border border-subtle p-5 flex items-center space-x-4 shadow-sm animate-skeleton">
        <div class="p-3 bg-muted rounded-lg w-12 h-12"></div>
        <div class="space-y-2 flex-1">
          <div class="h-3 bg-muted rounded w-20"></div>
          <div class="h-5 bg-muted rounded w-32"></div>
        </div>
      </div>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Sessions -->
      <div class="bg-card rounded-xl border border-subtle p-5 flex items-center space-x-4 shadow-sm">
        <div class="p-3 bg-primary/10 text-primary rounded-lg">
          <History class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Sessions</p>
          <h3 class="text-xl font-bold text-foreground mt-0.5">{{ stats.totalSessions }}</h3>
        </div>
      </div>

      <!-- Total Streamed Time -->
      <div class="bg-card rounded-xl border border-subtle p-5 flex items-center space-x-4 shadow-sm">
        <div class="p-3 bg-success/10 text-success rounded-lg">
          <Clock class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Total Streamed Time</p>
          <h3 class="text-xl font-bold text-foreground mt-0.5">{{ stats.totalDurationStr }}</h3>
        </div>
      </div>

      <!-- Avg Session Duration -->
      <div class="bg-card rounded-xl border border-subtle p-5 flex items-center space-x-4 shadow-sm">
        <div class="p-3 bg-warning/10 text-warning rounded-lg">
          <Activity class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Avg Duration</p>
          <h3 class="text-xl font-bold text-foreground mt-0.5">{{ stats.avgDurationStr }}</h3>
        </div>
      </div>

      <!-- Most Active VHost -->
      <div class="bg-card rounded-xl border border-subtle p-5 flex items-center space-x-4 shadow-sm">
        <div class="p-3 bg-primary/10 text-primary rounded-lg">
          <Radio class="w-6 h-6" />
        </div>
        <div>
          <p class="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Most Active VHost</p>
          <h3 class="text-xl font-bold text-foreground mt-0.5 truncate max-w-[150px]" :title="stats.mostActiveVHost">
            {{ stats.mostActiveVHost }}
          </h3>
        </div>
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
        @click="refresh"
        class="text-sm font-semibold text-danger hover:text-danger/80 underline cursor-pointer"
      >
        Retry
      </button>
    </div>

    <!-- Loading Table State -->
    <div v-if="isLoading" class="bg-card rounded-xl border border-subtle overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-muted/50 border-b border-subtle">
              <th v-for="i in 10" :key="i" class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div class="h-3 bg-muted rounded w-16 animate-skeleton"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in 5" :key="row" class="border-t border-subtle">
              <td class="px-6 py-4">
                <div class="flex items-center space-x-2">
                  <div class="w-4 h-4 rounded-full animate-skeleton"></div>
                  <div class="h-4 bg-muted rounded w-20 animate-skeleton"></div>
                </div>
              </td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-32 animate-skeleton"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-16 animate-skeleton"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-16 animate-skeleton"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-12 animate-skeleton"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-24 animate-skeleton"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-28 animate-skeleton"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-28 animate-skeleton"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-muted rounded w-16 animate-skeleton"></div></td>
              <td class="px-6 py-4 text-right"><div class="h-8 bg-muted rounded w-8 ml-auto animate-skeleton"></div></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredSessions.length === 0"
      class="flex flex-col items-center justify-center py-16 bg-card rounded-2xl border border-subtle text-center shadow-sm"
    >
      <div class="w-16 h-16 bg-muted text-muted-foreground rounded-2xl flex items-center justify-center mb-4">
        <Clock class="w-8 h-8" />
      </div>
      <h3 class="text-lg font-semibold text-foreground mb-1">No stream history found</h3>
      <p class="text-sm text-muted-foreground max-w-md">
        {{ (searchQuery || filterVHost || filterApp || filterStatus || filterDateFrom || filterDateTo)
            ? 'No results found matching your filters. Try clearing them or modifying your criteria.'
            : 'No stream sessions have been recorded yet.' }}
      </p>
      <button
        v-if="searchQuery || filterVHost || filterApp || filterStatus || filterDateFrom || filterDateTo"
        @click="clearFilters"
        class="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
      >
        Clear Filters
      </button>
    </div>

    <!-- History Table -->
    <div v-else class="bg-card rounded-xl border border-subtle overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="bg-muted/50 border-b border-subtle">
              <th
                @click="toggleSort('status')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <div class="flex items-center space-x-1">
                  <span>Status</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('status')" />
                </div>
              </th>
              <th
                @click="toggleSort('streamName')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <div class="flex items-center space-x-1">
                  <span>Stream Name</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('streamName')" />
                </div>
              </th>
              <th
                @click="toggleSort('vhost')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <div class="flex items-center space-x-1">
                  <span>VHost</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('vhost')" />
                </div>
              </th>
              <th
                @click="toggleSort('app')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <div class="flex items-center space-x-1">
                  <span>App</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('app')" />
                </div>
              </th>
              <th
                @click="toggleSort('sourceType')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <div class="flex items-center space-x-1">
                  <span>Source Type</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('sourceType')" />
                </div>
              </th>
              <th
                @click="toggleSort('sourceIp')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <div class="flex items-center space-x-1">
                  <span>Source IP</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('sourceIp')" />
                </div>
              </th>
              <th
                @click="toggleSort('startTime')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <div class="flex items-center space-x-1">
                  <span>Start Time</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('startTime')" />
                </div>
              </th>
              <th
                @click="toggleSort('endTime')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <div class="flex items-center space-x-1">
                  <span>End Time</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('endTime')" />
                </div>
              </th>
              <th
                @click="toggleSort('duration')"
                class="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none"
              >
                <div class="flex items-center space-x-1">
                  <span>Duration</span>
                  <ArrowUpDown class="w-3 h-3 transition-transform duration-200" :class="getSortIcon('duration')" />
                </div>
              </th>
              <th class="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-subtle">
            <tr
              v-for="s in filteredSessions"
              :key="s.id"
              class="border-t border-subtle hover:bg-muted/30 transition-colors"
            >
              <!-- Status Badge -->
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span v-if="s.status === 'live'" class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-success/10 text-success">
                  <span class="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                  <span>Live</span>
                </span>
                <span v-else-if="s.status === 'completed'" class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-subtle">
                  <span class="w-2 h-2 rounded-full bg-muted-foreground/60"></span>
                  <span>Completed</span>
                </span>
                <span v-else-if="s.status === 'error'" class="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger">
                  <span class="w-2 h-2 rounded-full bg-danger"></span>
                  <span>Error</span>
                </span>
              </td>

              <!-- Stream Name -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="font-medium text-foreground">{{ s.streamName }}</span>
              </td>

              <!-- VHost -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {{ s.vhost }}
              </td>

              <!-- App -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {{ s.app }}
              </td>

              <!-- Source Type -->
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span v-if="s.sourceType" class="bg-primary/5 text-primary px-2 py-0.5 rounded text-xs font-medium">
                  {{ s.sourceType }}
                </span>
                <span v-else class="text-muted-foreground/40">-</span>
              </td>

              <!-- Source IP -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono text-xs">
                {{ s.sourceIp || '-' }}
              </td>

              <!-- Start Time -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {{ formatDateTime(s.startTime) }}
              </td>

              <!-- End Time -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                {{ formatDateTime(s.endTime) }}
              </td>

              <!-- Duration -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-foreground font-medium">
                {{ formatSessionDuration(s) }}
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  @click="requestDelete(s.id)"
                  class="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs text-danger hover:text-danger-hover hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                  title="Delete entry"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Confirm Single Delete Modal -->
    <Teleport to="body">
      <div v-if="deleteConfirmId" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
        <div class="bg-card border border-subtle rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200">
          <div class="flex items-center space-x-3 text-danger">
            <AlertCircle class="w-6 h-6" />
            <h3 class="text-lg font-bold text-foreground">Delete Entry</h3>
          </div>
          <p class="text-sm text-muted-foreground">
            Are you sure you want to delete this stream session history entry? This action is permanent and cannot be undone.
          </p>
          <div class="flex justify-end space-x-3 pt-2">
            <button
              @click="deleteConfirmId = null"
              class="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-subtle rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="confirmDelete"
              class="px-4 py-2 bg-danger hover:bg-danger/80 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Clear All Modal -->
    <Teleport to="body">
      <div v-if="showClearConfirm" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
        <div class="bg-card border border-subtle rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in duration-200">
          <div class="flex items-center space-x-3 text-danger">
            <AlertCircle class="w-6 h-6" />
            <h3 class="text-lg font-bold text-foreground">Clear All History</h3>
          </div>
          <p class="text-sm text-muted-foreground">
            Are you sure you want to clear the entire stream session history? This action is permanent and cannot be undone.
          </p>
          <div class="flex justify-end space-x-3 pt-2">
            <button
              @click="closeClearConfirm"
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
