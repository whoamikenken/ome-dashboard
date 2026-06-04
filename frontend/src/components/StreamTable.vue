<script setup lang="ts">
import { ref, watch } from 'vue'
import { getStream } from '@/api/streams'
import type { Stream } from '@/types/ome'
import { Activity, Eye, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  streams: string[]
  vhost: string
  app: string
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'view', name: string): void
  (e: 'delete', name: string): void
}>()

const streamDetails = ref<Record<string, Stream>>({})
const detailsLoading = ref(false)

async function fetchDetails() {
  if (props.streams.length === 0) {
    streamDetails.value = {}
    return
  }
  detailsLoading.value = true
  const details: Record<string, Stream> = {}
  await Promise.all(
    props.streams.map(async (name) => {
      try {
        const res = await getStream(props.vhost, props.app, name)
        if (res.response) details[name] = res.response
      } catch { /* skip */ }
    })
  )
  streamDetails.value = details
  detailsLoading.value = false
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString()
  } catch {
    return '-'
  }
}

watch(() => props.streams, fetchDetails, { immediate: true })
</script>

<template>
  <div class="bg-card rounded-xl border border-subtle overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="bg-muted/50">
            <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source Type</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source URL</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tracks</th>
            <th class="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
            <th class="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="name in streams"
            :key="name"
            class="border-t border-subtle hover:bg-muted/30 transition-colors"
          >
            <td class="px-4 py-3">
              <div class="flex items-center space-x-2">
                <Activity class="w-4 h-4 text-primary" />
                <span class="text-sm font-medium text-foreground">{{ name }}</span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="text-sm text-muted-foreground">{{ streamDetails[name]?.input?.sourceType || '-' }}</span>
            </td>
            <td class="px-4 py-3">
              <span class="text-sm text-muted-foreground max-w-[200px] truncate block" :title="streamDetails[name]?.input?.sourceUrl">
                {{ streamDetails[name]?.input?.sourceUrl || '-' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center space-x-1">
                <span
                  v-if="streamDetails[name]?.input?.tracks?.video?.length"
                  class="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-medium"
                >
                  {{ streamDetails[name]?.input?.tracks?.video?.length }}v
                </span>
                <span
                  v-if="streamDetails[name]?.input?.tracks?.audio?.length"
                  class="px-2 py-0.5 bg-success/10 text-success rounded text-xs font-medium"
                >
                  {{ streamDetails[name]?.input?.tracks?.audio?.length }}a
                </span>
                <span
                  v-if="!streamDetails[name]?.input?.tracks?.video?.length && !streamDetails[name]?.input?.tracks?.audio?.length"
                  class="text-xs text-muted-foreground"
                >
                  -
                </span>
              </div>
            </td>
            <td class="px-4 py-3">
              <span class="text-sm text-muted-foreground">
                {{ formatDate(streamDetails[name]?.input?.createdTime) }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end space-x-1">
                <button
                  @click="emit('view', name)"
                  class="p-1.5 text-muted-foreground hover:text-primary rounded hover:bg-primary/10 transition-colors"
                  title="View details"
                >
                  <Eye class="w-4 h-4" />
                </button>
                <button
                  @click="emit('delete', name)"
                  class="p-1.5 text-muted-foreground hover:text-danger rounded hover:bg-danger/10 transition-colors"
                  title="Delete stream"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="loading || detailsLoading" class="p-8 text-center">
      <div class="animate-skeleton h-4 w-48 rounded mx-auto"></div>
    </div>
    <div v-else-if="streams.length === 0" class="p-8 text-center">
      <Activity class="w-8 h-8 text-muted-foreground mx-auto mb-2" />
      <p class="text-sm text-muted-foreground">No streams found</p>
    </div>
  </div>
</template>
