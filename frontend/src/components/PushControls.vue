<script setup lang="ts">
import { ref } from 'vue'
import { startPush, stopPush } from '@/api/push'
import { Play, Square, Video, ExternalLink, Loader2 } from 'lucide-vue-next'

const props = defineProps<{ vhost: string; app: string; streamName: string }>()
const emit = defineEmits<{ (e: 'stateChange'): void }>()

const isPushing = ref(false)
const isStarting = ref(false)
const isStopping = ref(false)
const pushUrl = ref('')
const pushProtocol = ref<'srt' | 'rtmp' | 'mpegts'>('rtmp')
const pushStreamKey = ref('')
const error = ref<string | null>(null)

async function handleStartPush() {
  if (!pushUrl.value.trim()) {
    error.value = 'Push URL is required'
    return
  }
  isStarting.value = true
  error.value = null
  try {
    await startPush(props.vhost, props.app, {
      stream: { name: props.streamName },
      protocol: pushProtocol.value,
      url: pushUrl.value,
      streamKey: pushStreamKey.value || undefined,
    })
    isPushing.value = true
    emit('stateChange')
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to start push'
  } finally {
    isStarting.value = false
  }
}

async function handleStopPush() {
  isStopping.value = true
  error.value = null
  try {
    await stopPush(props.vhost, props.app, { id: props.streamName })
    isPushing.value = false
    emit('stateChange')
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to stop push'
  } finally {
    isStopping.value = false
  }
}
</script>

<template>
  <div class="bg-card rounded-xl border border-subtle p-6">
    <h3 class="flex items-center space-x-2 text-sm font-semibold text-foreground mb-4">
      <Video class="w-4 h-4 text-primary" />
      <span>Push Publishing</span>
    </h3>

    <div v-if="error" class="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
      {{ error }}
    </div>

    <div v-if="!isPushing" class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-muted-foreground mb-1">Protocol</label>
        <select
          v-model="pushProtocol"
          class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
        >
          <option value="rtmp">RTMP</option>
          <option value="srt">SRT</option>
          <option value="mpegts">MPEG-TS</option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium text-muted-foreground mb-1">Push URL *</label>
        <input
          v-model="pushUrl"
          placeholder="rtmp://destination-server/live"
          class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      <div>
        <label class="block text-xs font-medium text-muted-foreground mb-1">Stream Key (optional)</label>
        <input
          v-model="pushStreamKey"
          placeholder="stream-key"
          class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
        />
      </div>

      <button
        @click="handleStartPush"
        :disabled="isStarting"
        class="w-full px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Loader2 v-if="isStarting" class="w-4 h-4 animate-spin" />
        <Play v-else class="w-4 h-4" />
        <span>{{ isStarting ? 'Starting...' : 'Start Push' }}</span>
      </button>
    </div>

    <div v-else class="space-y-3">
      <div class="flex items-center space-x-2 p-3 bg-success/10 text-success rounded-lg">
        <div class="w-2 h-2 rounded-full bg-success animate-pulse"></div>
        <span class="text-sm font-medium">Actively pushing</span>
      </div>

      <div class="flex items-center space-x-2 text-sm text-muted-foreground">
        <ExternalLink class="w-4 h-4" />
        <span>{{ pushProtocol }}://...{{ pushUrl.slice(-30) }}</span>
      </div>

      <button
        @click="handleStopPush"
        :disabled="isStopping"
        class="w-full px-4 py-2 bg-danger hover:bg-danger/80 text-white rounded-lg text-sm font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Loader2 v-if="isStopping" class="w-4 h-4 animate-spin" />
        <Square class="w-4 h-4" />
        <span>{{ isStopping ? 'Stopping...' : 'Stop Push' }}</span>
      </button>
    </div>
  </div>
</template>
