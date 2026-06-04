<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  active: number
  idle: number
  loading?: boolean
}>()

const isDark = computed(() => document.documentElement.classList.contains('dark'))

const chartData = computed(() => ({
  labels: ['Active Streams', 'Idle Streams'],
  datasets: [
    {
      data: [props.active, props.idle],
      backgroundColor: ['#22c55e', '#64748b'],
      borderWidth: 0,
      hoverOffset: 8,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        font: { size: 12, weight: 600 },
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle' as const,
      },
    },
    tooltip: {
      backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
      titleColor: isDark.value ? '#f8fafc' : '#0f172a',
      bodyColor: isDark.value ? '#94a3b8' : '#64748b',
      borderColor: isDark.value ? '#334155' : '#e2e8f0',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      callbacks: {
        label: function(context: any) {
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const pct = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0'
          return `${context.label}: ${context.parsed} (${pct}%)`
        }
      }
    },
  },
}))
</script>

<template>
  <div class="bg-card rounded-xl border border-subtle p-6">
    <h3 class="text-sm font-semibold text-foreground mb-4">Stream Status</h3>
    <div v-if="loading" class="h-64 animate-skeleton rounded-lg"></div>
    <div v-else-if="active === 0 && idle === 0" class="h-64 flex items-center justify-center text-muted-foreground text-sm">
      No data available
    </div>
    <div v-else class="h-64 flex items-center justify-center">
      <div class="w-56 h-56">
        <Doughnut :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>
