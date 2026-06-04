<script setup lang="ts">
import { ref } from 'vue'
import { startRecord, stopRecord } from '@/api/record'
import { Circle, Square, HardDrive, Loader2 } from 'lucide-vue-next'

const props = defineProps<{ vhost: string; app: string; streamName: string }>()
const emit = defineEmits<{ (e: 'stateChange'): void }>()

const isRecording = ref(false)
const isStarting = ref(false)
const isStopping = ref(false)
const filePath = ref('')
const schedule = ref('')
const segmentationRule = ref<'discontinuity' | 'continuity'>('discontinuity')
const error = ref<string | null>(null)

async function handleStartRecord() {
  if (!filePath.value.trim()) {
    error.value = 'File path is required'
    return
  }
  isStarting.value = true
  error.value = null
  try {
    await startRecord(props.vhost, props.app, {
      stream: { name: props.streamName },
      filePath: filePath.value,
      schedule: schedule.value || undefined,
      segmentationRule: segmentationRule.value,
    })
    isRecording.value = true
    emit('stateChange')
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to start recording'
  } finally {
    isStarting.value = false
  }
}

async function handleStopRecord() {
  isStopping.value = true
  error.value = null
  try {
    await stopRecord(props.vhost, props.app, { id: props.streamName })
    isRecording.value = false
    emit('stateChange')
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to stop recording'
  } finally {
    isStopping.value = false
  }
}
</script>

<template>
  <div class="bg-card rounded-xl border border-subtle p-6">
    <h3 class="flex items-center space-x-2 text-sm font-semibold text-foreground mb-4">
      <HardDrive class="w-4 h-4 text-primary" />
      <span>Recording</span>
    </h3>

    <div v-if="error" class="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
      {{ error }}
    </div>

    <div v-if="!isRecording" class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-muted-foreground mb-1">File Path *</label>
        <input
          v-model="filePath"
          placeholder="/path/to/recordings/output.ts"
          class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-muted-foreground mb-1">Schedule (cron, optional)</label>
        <input
          v-model="schedule"
          placeholder="0 */6 * * *"
          class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-muted-foreground mb-1">Segmentation Rule</label>
        <select
          v-model="segmentationRule"
          class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
        >
          <option value="discontinuity">Discontinuity</option>
          <option value="continuity">Continuity</option>
        </select>
      </div>

      <button
        @click="handleStartRecord"
        :disabled="isStarting"
        class="w-full px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Loader2 v-if="isStarting" class="w-4 h-4 animate-spin" />
        <Circle v-else class="w-4 h-4" />
        <span>{{ isStarting ? 'Starting...' : 'Start Recording' }}</span>
      </button>
    </div>

    <div v-else class="space-y-3">
      <div class="flex items-center space-x-2 p-3 bg-danger/10 text-danger rounded-lg">
        <div class="w-2 h-2 rounded-full bg-danger animate-pulse"></div>
        <span class="text-sm font-medium">Recording in progress</span>
      </div>

      <div class="text-sm text-muted-foreground">
        <span>File: {{ filePath }}</span>
      </div>

      <button
        @click="handleStopRecord"
        :disabled="isStopping"
        class="w-full px-4 py-2 bg-danger hover:bg-danger/80 text-white rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Loader2 v-if="isStopping" class="w-4 h-4 animate-spin" />
        <Square class="w-4 h-4" />
        <span>{{ isStopping ? 'Stopping...' : 'Stop Recording' }}</span>
      </button>
    </div>
  </div>
</template>
