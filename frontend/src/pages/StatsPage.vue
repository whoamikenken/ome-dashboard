<script setup lang="ts">
import { useOmeStats } from '@/composables/useOmeStats'
import ThroughputChart from '@/components/charts/ThroughputChart.vue'
import ConnectionChart from '@/components/charts/ConnectionChart.vue'
import StatsTable from '@/components/StatsTable.vue'
import { RotateCw, AlertCircle, Download } from 'lucide-vue-next'

const {
  vhostsStats,
  throughputData,
  connectionData,
  isLoading,
  error,
  lastUpdated,
  fetchStats
} = useOmeStats(5000) // poll every 5s

const vhostColumns = [
  { key: 'name', label: 'Virtual Host' },
  { key: 'totalConnections', label: 'Connections', format: 'number' as const },
  { key: 'throughput', label: 'Throughput', format: 'bytes-sec' as const },
  { key: 'uptime', label: 'Uptime' }
]

const appColumns = [
  { key: 'name', label: 'Application' },
  { key: 'totalConnections', label: 'Connections', format: 'number' as const },
  { key: 'throughput', label: 'Throughput', format: 'bytes-sec' as const },
  { key: 'uptime', label: 'Uptime' }
]

function exportStats() {
  const data = {
    timestamp: new Date().toISOString(),
    vhosts: vhostsStats.value,
    history: {
      throughput: throughputData.value,
      connections: connectionData.value
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ome-server-stats-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Error Banner -->
    <div
      v-if="error"
      class="flex items-center justify-between p-4 bg-danger/10 border border-danger/20 rounded-xl"
    >
      <div class="flex items-center space-x-3">
        <AlertCircle class="w-5 h-5 text-danger" />
        <p class="text-sm font-medium text-danger">{{ error }}</p>
      </div>
      <button
        @click="fetchStats"
        class="text-sm font-semibold text-danger hover:text-danger/80 underline cursor-pointer"
      >
        Retry
      </button>
    </div>

    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Statistics</h1>
        <p class="text-sm text-muted-foreground mt-1">Real-time server metrics</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <span v-if="lastUpdated" class="text-xs text-muted-foreground">
          Last updated: {{ lastUpdated.toLocaleTimeString() }}
        </span>
        <button
          @click="fetchStats"
          class="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Refresh"
        >
          <RotateCw class="w-5 h-5" :class="{ 'animate-spin': isLoading }" />
        </button>
        <button
          @click="exportStats"
          class="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold flex items-center space-x-2 transition-colors cursor-pointer"
          title="Export statistics as JSON"
        >
          <Download class="w-4 h-4" />
          <span>Export JSON</span>
        </button>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ThroughputChart :data="throughputData" :loading="isLoading" />
      <ConnectionChart :data="connectionData" :loading="isLoading" />
    </div>

    <!-- Stats Table Section -->
    <div class="space-y-6">
      <StatsTable
        :stats="vhostsStats"
        :columns="vhostColumns"
        :loading="isLoading"
        title="Virtual Host Statistics"
        rowKey="name"
        :expandable="true"
      >
        <template #expanded="{ row }">
          <div class="p-2 bg-muted/20 rounded-lg">
            <StatsTable
              :stats="row.apps"
              :columns="appColumns"
              :loading="false"
              title="Application Statistics"
              rowKey="name"
            />
          </div>
        </template>
      </StatsTable>
    </div>
  </div>
</template>
