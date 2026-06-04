<script setup lang="ts">
import { useOmeStatus } from '@/composables/useOmeStatus'
import StatCard from '@/components/StatCard.vue'
import StreamsBarChart from '@/components/charts/StreamsBarChart.vue'
import ActiveVsIdleChart from '@/components/charts/ActiveVsIdleChart.vue'
import { Server, Radio, Activity, Play, Video, HardDrive, RotateCw, AlertCircle } from 'lucide-vue-next'

const { stats, fetchStats } = useOmeStatus(10000) // poll every 10s
</script>

<template>
  <div class="space-y-6">
    <!-- Error Banner -->
    <div
      v-if="stats.error"
      class="flex items-center justify-between p-4 bg-danger/10 border border-danger/20 rounded-xl"
    >
      <div class="flex items-center space-x-3">
        <AlertCircle class="w-5 h-5 text-danger" />
        <p class="text-sm font-medium text-danger">{{ stats.error }}</p>
      </div>
      <button
        @click="fetchStats"
        class="text-sm font-semibold text-danger hover:text-danger/80 underline cursor-pointer"
      >
        Retry
      </button>
    </div>

    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Dashboard</h1>
        <p class="text-sm text-muted-foreground mt-1">Overview of your OvenMediaEngine server</p>
      </div>
      <div class="flex items-center space-x-3">
        <span v-if="stats.lastUpdated" class="text-xs text-muted-foreground">
          Last updated: {{ stats.lastUpdated.toLocaleTimeString() }}
        </span>
        <button
          @click="fetchStats"
          class="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          title="Refresh"
        >
          <RotateCw class="w-5 h-5" :class="{ 'animate-spin': stats.isLoading }" />
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard title="Virtual Hosts" :value="stats.totalVHosts" :icon="Server" color="primary" :loading="stats.isLoading" />
      <StatCard title="Applications" :value="stats.totalApps" :icon="Radio" color="info" :loading="stats.isLoading" />
      <StatCard title="Total Streams" :value="stats.totalStreams" :icon="Activity" color="success" :loading="stats.isLoading" />
      <StatCard title="Active Streams" :value="stats.activeStreams" :icon="Play" color="success" :loading="stats.isLoading" />
      <StatCard title="Push Jobs" :value="stats.pushJobs" :icon="Video" color="warning" :loading="stats.isLoading" />
      <StatCard title="Recordings" :value="stats.activeRecordings" :icon="HardDrive" color="danger" :loading="stats.isLoading" />
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <StreamsBarChart :data="stats.vhostStreams" :loading="stats.isLoading" />
      <ActiveVsIdleChart :active="stats.activeStreams" :idle="stats.totalStreams - stats.activeStreams" :loading="stats.isLoading" />
    </div>
  </div>
</template>
