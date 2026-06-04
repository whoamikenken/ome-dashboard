<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  data: { name: string; count: number }[]
  loading?: boolean
}>()

// Detect theme from document
const isDark = computed(() => document.documentElement.classList.contains('dark'))

const chartData = computed(() => ({
  labels: props.data.map((d) => d.name),
  datasets: [
    {
      label: 'Streams',
      data: props.data.map((d) => d.count),
      backgroundColor: '#6366f1',
      borderRadius: 6,
      maxBarThickness: 48,
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
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        font: { size: 11, weight: 600 },
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: isDark.value ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.1)',
      },
      ticks: {
        color: isDark.value ? '#94a3b8' : '#64748b',
        font: { size: 11 },
        stepSize: 1,
      },
    },
  },
}))
</script>

<template>
  <div class="bg-card rounded-xl border border-subtle p-6">
    <h3 class="text-sm font-semibold text-foreground mb-4">Streams per Virtual Host</h3>
    <div v-if="loading" class="h-64 animate-skeleton rounded-lg"></div>
    <div v-else-if="data.length === 0" class="h-64 flex items-center justify-center text-muted-foreground text-sm">
      No data available
    </div>
    <div v-else class="h-64">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
