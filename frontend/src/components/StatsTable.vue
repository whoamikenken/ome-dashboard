<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronRight, ChevronDown, ArrowUp, ArrowDown } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  stats: any[]
  columns: { key: string; label: string; format?: 'number' | 'bytes' | 'date' | 'bytes-sec' }[]
  loading?: boolean
  title: string
  rowKey?: string
  expandable?: boolean
}>(), {
  loading: false,
  rowKey: 'name',
  expandable: false
})

const emit = defineEmits<{
  (e: 'row-click', row: any): void
}>()

const sortKey = ref<string | null>(null)
const sortOrder = ref<'asc' | 'desc'>('asc')
const expandedRows = ref(new Set<string>())

function handleSort(key: string) {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

function toggleRow(row: any) {
  emit('row-click', row)
  if (!props.expandable) return
  
  const key = row[props.rowKey]
  const newSet = new Set(expandedRows.value)
  if (newSet.has(key)) {
    newSet.delete(key)
  } else {
    newSet.add(key)
  }
  expandedRows.value = newSet
}

const sortedStats = computed(() => {
  if (!sortKey.value) return props.stats
  
  return [...props.stats].sort((a, b) => {
    const aVal = a[sortKey.value!]
    const bVal = b[sortKey.value!]
    
    if (aVal === bVal) return 0
    if (aVal == null) return 1
    if (bVal == null) return -1
    
    let comparison = 0
    const col = props.columns.find(c => c.key === sortKey.value)
    
    if (col?.format === 'date') {
      const aDate = new Date(aVal)
      const bDate = new Date(bVal)
      const aTime = isNaN(aDate.getTime()) ? 0 : aDate.getTime()
      const bTime = isNaN(bDate.getTime()) ? 0 : bDate.getTime()
      comparison = aTime - bTime
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal
    } else {
      comparison = String(aVal).localeCompare(String(bVal))
    }
    
    return sortOrder.value === 'asc' ? comparison : -comparison
  })
})

function formatValue(value: any, format?: 'number' | 'bytes' | 'date' | 'bytes-sec') {
  if (value == null) return '-'
  
  if (format === 'number') {
    return typeof value === 'number' ? value.toLocaleString() : value
  }
  
  if (format === 'bytes' || format === 'bytes-sec') {
    if (typeof value !== 'number') return value
    if (value === 0) return format === 'bytes-sec' ? '0 B/s' : '0 B'
    const k = 1024
    const sizes = format === 'bytes-sec'
      ? ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s']
      : ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(value) / Math.log(k))
    return parseFloat((value / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  if (format === 'date') {
    try {
      const date = new Date(value)
      if (isNaN(date.getTime())) return value
      return date.toLocaleDateString()
    } catch {
      return value
    }
  }
  
  return value
}
</script>

<template>
  <div class="bg-card rounded-xl border border-subtle overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-subtle flex justify-between items-center bg-card">
      <h3 class="text-base font-semibold text-foreground">{{ title }}</h3>
    </div>

    <!-- Table Wrapper -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-muted/50 border-b border-subtle">
            <!-- Expand Toggle Spacer Header -->
            <th v-if="expandable" class="w-10 px-4 py-3"></th>
            
            <th 
              v-for="col in columns" 
              :key="col.key"
              @click="handleSort(col.key)"
              class="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors"
            >
              <div class="flex items-center space-x-1">
                <span>{{ col.label }}</span>
                <span class="inline-flex">
                  <template v-if="sortKey === col.key">
                    <ArrowUp v-if="sortOrder === 'asc'" class="w-3.5 h-3.5" />
                    <ArrowDown v-else class="w-3.5 h-3.5" />
                  </template>
                </span>
              </div>
            </th>
          </tr>
        </thead>
        
        <tbody>
          <!-- Loading State -->
          <template v-if="loading">
            <tr v-for="i in 5" :key="i" class="border-b border-subtle">
              <td v-if="expandable" class="px-4 py-4 w-10">
                <div class="w-4 h-4 rounded animate-skeleton"></div>
              </td>
              <td v-for="col in columns" :key="col.key" class="px-4 py-4">
                <div class="h-4 rounded animate-skeleton" :class="i % 2 === 0 ? 'w-24' : 'w-36'"></div>
              </td>
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-else-if="stats.length === 0">
            <td :colspan="columns.length + (expandable ? 1 : 0)" class="px-6 py-10 text-center text-muted-foreground text-sm bg-card">
              No statistics available
            </td>
          </tr>

          <!-- Data Rows -->
          <template v-else v-for="row in sortedStats" :key="row[rowKey]">
            <tr 
              @click="toggleRow(row)"
              class="border-b border-subtle hover:bg-muted/30 transition-colors cursor-pointer group"
            >
              <!-- Expand Icon -->
              <td v-if="expandable" class="px-4 py-3 w-10 text-center">
                <button class="p-0.5 rounded hover:bg-muted text-muted-foreground group-hover:text-foreground transition-colors">
                  <ChevronDown v-if="expandedRows.has(row[rowKey])" class="w-4 h-4" />
                  <ChevronRight v-else class="w-4 h-4" />
                </button>
              </td>

              <!-- Data Cells -->
              <td 
                v-for="col in columns" 
                :key="col.key"
                class="px-4 py-3 text-sm text-foreground"
              >
                {{ formatValue(row[col.key], col.format) }}
              </td>
            </tr>

            <!-- Expanded Row Content -->
            <tr v-if="expandable && expandedRows.has(row[rowKey])" class="bg-muted/5">
              <td :colspan="columns.length + 1" class="p-4 border-b border-subtle">
                <slot name="expanded" :row="row"></slot>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
