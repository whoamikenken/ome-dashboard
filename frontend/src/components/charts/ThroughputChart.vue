<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const props = defineProps<{
  data: { timestamp: string; value: number }[]
  loading?: boolean
}>()

// Detect theme from document
const isDark = computed(() => document.documentElement.classList.contains('dark'))

// Format time from timestamp string
function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return timestamp
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return timestamp
  }
}

const chartData = computed(() => ({
  labels: props.data.map((d) => formatTime(d.timestamp)),
  datasets: [
    {
      label: 'Throughput',
      data: props.data.map((d) => d.value / 1000000), // bps to Mbps
      borderColor: '#6366f1',
      backgroundColor: (context: any) => {
        const chart = context.chart
        const { ctx, chartArea } = chart
        if (!chartArea) return 'rgba(99, 102, 241, 0.1)'
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
        gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)')
        gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)')
        return gradient
      },
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#6366f1',
      pointBorderColor: isDark.value ? '#1e293b' : '#ffffff',
      pointHoverBackgroundColor: isDark.value ? '#1e293b' : '#ffffff',
      pointHoverBorderColor: '#6366f1',
      pointRadius: 2,
      pointHoverRadius: 5,
    },
  ],
}))

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: isDark.value ? '#1e293b' : '#ffffff',
      titleColor: isDark.value ? '#f8fafc' : '#0f172a',
      bodyColor: isDark.value ? '#94a3b8' : '#64748b',
      borderColor: isDark.value ? '#334155' : '#e2e8f0',
      borderWidth: 1,
      cornerRadius: 8,
      padding: 12,
      callbacks: {
        label: function (context: any) {
          const val = context.parsed.y
          return `Throughput: ${val.toFixed(2)} Mbps`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        font: { size: 10, weight: 500 },
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 8,
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: isDark.value ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.1)',
      },
      ticks: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        font: { size: 10 },
        callback: function (value: any) {
          return value + ' Mbps'
        },
      },
      title: {
        display: true,
        text: 'Mbps',
        color: isDark.value ? '#94a3b8' : '#64748b',
        font: { size: 11, weight: 600 },
      },
    },
  },
}))
</script>

<template>
  <div class="bg-card rounded-xl border border-subtle p-6">
    <h3 class="text-sm font-semibold text-foreground mb-4">Throughput</h3>
    <div v-if="loading" class="h-64 animate-skeleton rounded-lg"></div>
    <div v-else-if="!data || data.length === 0" class="h-64 flex items-center justify-center text-muted-foreground text-sm">
      No throughput data available
    </div>
    <div v-else class="h-64">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
