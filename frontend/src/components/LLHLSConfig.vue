<script setup lang="ts">
import { ref, watch } from 'vue'
import { Sliders, Zap, Copy, Check, Save } from 'lucide-vue-next'

const props = defineProps<{
  vhost: string
  app: string
  config: {
    enabled: boolean
    segmentDuration: number
    playlistWindowSize: number
    segmentCount: number
    chunkDuration: number
    maxBufferingQueueSize: number
  } | null
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:config', value: {
    enabled: boolean
    segmentDuration: number
    playlistWindowSize: number
    segmentCount: number
    chunkDuration: number
    maxBufferingQueueSize: number
  }): void
  (e: 'save'): void
}>()

const defaultConfig = {
  enabled: false,
  segmentDuration: 6,
  playlistWindowSize: 10,
  segmentCount: 5,
  chunkDuration: 200,
  maxBufferingQueueSize: 5,
}

const localConfig = ref({ ...defaultConfig })
const copied = ref(false)
const streamName = ref('stream')

// Synchronize prop changes to local state with deep comparison to prevent infinite loop
watch(() => props.config, (newVal) => {
  if (!newVal) {
    const isSame = JSON.stringify(localConfig.value) === JSON.stringify(defaultConfig)
    if (!isSame) {
      localConfig.value = { ...defaultConfig }
    }
    return
  }

  const parsed = {
    enabled: newVal.enabled ?? false,
    segmentDuration: newVal.segmentDuration ?? 6,
    playlistWindowSize: newVal.playlistWindowSize ?? 10,
    segmentCount: newVal.segmentCount ?? 5,
    chunkDuration: newVal.chunkDuration ?? 200,
    maxBufferingQueueSize: newVal.maxBufferingQueueSize ?? 5,
  }

  if (JSON.stringify(localConfig.value) !== JSON.stringify(parsed)) {
    localConfig.value = parsed
  }
}, { immediate: true, deep: true })

// Propagate local state changes back up to the parent
watch(localConfig, (newVal) => {
  emit('update:config', JSON.parse(JSON.stringify(newVal)))
}, { deep: true })

function toggleEnabled() {
  localConfig.value.enabled = !localConfig.value.enabled
}

function applyPreset(preset: 'ultra-low' | 'balanced' | 'reliable') {
  if (preset === 'ultra-low') {
    localConfig.value.segmentDuration = 2
    localConfig.value.chunkDuration = 200
    localConfig.value.playlistWindowSize = 10
    localConfig.value.segmentCount = 5
    localConfig.value.maxBufferingQueueSize = 5
  } else if (preset === 'balanced') {
    localConfig.value.segmentDuration = 1
    localConfig.value.chunkDuration = 500
    localConfig.value.playlistWindowSize = 10
    localConfig.value.segmentCount = 5
    localConfig.value.maxBufferingQueueSize = 5
  } else if (preset === 'reliable') {
    localConfig.value.segmentDuration = 6
    localConfig.value.chunkDuration = 1000
    localConfig.value.playlistWindowSize = 10
    localConfig.value.segmentCount = 5
    localConfig.value.maxBufferingQueueSize = 5
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}
</script>

<template>
  <!-- Loading state with skeleton -->
  <div v-if="loading" class="bg-card rounded-xl border border-subtle p-6 space-y-6">
    <div class="flex items-center justify-between border-b border-subtle pb-4 mb-6">
      <div class="space-y-2 w-1/3">
        <div class="h-6 bg-muted rounded animate-skeleton"></div>
        <div class="h-3 bg-muted rounded animate-skeleton w-2/3"></div>
      </div>
      <div class="h-6 w-12 bg-muted rounded animate-skeleton"></div>
    </div>
    <div class="space-y-4">
      <div class="h-10 bg-muted rounded animate-skeleton w-1/2"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="h-16 bg-muted rounded animate-skeleton" v-for="i in 4" :key="i"></div>
      </div>
      <div class="h-16 bg-muted rounded animate-skeleton"></div>
    </div>
    <div class="flex justify-end pt-4 border-t border-subtle">
      <div class="h-10 w-32 bg-muted rounded animate-skeleton"></div>
    </div>
  </div>

  <!-- Config Panel content -->
  <div v-else class="bg-card text-card-foreground rounded-xl border border-subtle p-6 shadow-sm">
    <form @submit.prevent="emit('save')" class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-subtle pb-4">
        <div class="flex items-center space-x-3">
          <Sliders class="w-5 h-5 text-primary" />
          <div>
            <h3 class="text-lg font-bold text-foreground">LLHLS Configuration</h3>
            <p class="text-xs text-muted-foreground mt-0.5">
              VHost: <span class="font-semibold text-foreground mr-3">{{ vhost }}</span>
              App: <span class="font-semibold text-foreground">{{ app }}</span>
            </p>
          </div>
        </div>
        <!-- Enabled Switch -->
        <div class="flex items-center space-x-3">
          <span class="text-xs font-semibold uppercase tracking-wider" :class="localConfig.enabled ? 'text-primary' : 'text-muted-foreground'">
            {{ localConfig.enabled ? 'Enabled' : 'Disabled' }}
          </span>
          <label class="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              :checked="localConfig.enabled"
              @change="toggleEnabled"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-muted border border-subtle rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-muted-foreground/60 peer-checked:after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      <!-- Config form fields when enabled -->
      <div v-if="localConfig.enabled" class="space-y-6">
        <!-- Preset buttons -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Presets</label>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              @click="applyPreset('ultra-low')"
              class="px-3 py-1.5 bg-muted hover:bg-primary/10 border border-subtle hover:border-primary/30 rounded-lg text-xs font-semibold text-foreground hover:text-primary transition-all cursor-pointer flex items-center space-x-1"
            >
              <Zap class="w-3.5 h-3.5" />
              <span>Ultra Low (0.2s chunks)</span>
            </button>
            <button
              type="button"
              @click="applyPreset('balanced')"
              class="px-3 py-1.5 bg-muted hover:bg-primary/10 border border-subtle hover:border-primary/30 rounded-lg text-xs font-semibold text-foreground hover:text-primary transition-all cursor-pointer flex items-center space-x-1"
            >
              <Zap class="w-3.5 h-3.5" />
              <span>Balanced (1s segments)</span>
            </button>
            <button
              type="button"
              @click="applyPreset('reliable')"
              class="px-3 py-1.5 bg-muted hover:bg-primary/10 border border-subtle hover:border-primary/30 rounded-lg text-xs font-semibold text-foreground hover:text-primary transition-all cursor-pointer flex items-center space-x-1"
            >
              <Zap class="w-3.5 h-3.5" />
              <span>Reliable (6s segments)</span>
            </button>
          </div>
        </div>

        <!-- Form fields grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Segment Duration -->
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Segment Duration (seconds)</label>
            <input
              v-model.number="localConfig.segmentDuration"
              type="number"
              min="1"
              max="10"
              required
              class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
            />
            <span class="text-[10px] text-muted-foreground">Range: 1 to 10 seconds (default: 6)</span>
          </div>

          <!-- Chunk Duration -->
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Chunk Duration (ms)</label>
            <input
              v-model.number="localConfig.chunkDuration"
              type="number"
              min="50"
              max="1000"
              required
              class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
            />
            <span class="text-[10px] text-muted-foreground">Range: 50 to 1000 ms (default: 200)</span>
          </div>

          <!-- Playlist Window Size -->
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Playlist Window Size (segments)</label>
            <input
              v-model.number="localConfig.playlistWindowSize"
              type="number"
              min="2"
              max="30"
              required
              class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
            />
            <span class="text-[10px] text-muted-foreground">Range: 2 to 30 segments (default: 10)</span>
          </div>

          <!-- Segment Count -->
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Segment Count</label>
            <input
              v-model.number="localConfig.segmentCount"
              type="number"
              min="2"
              max="20"
              required
              class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
            />
            <span class="text-[10px] text-muted-foreground">Range: 2 to 20 segments (default: 5)</span>
          </div>

          <!-- Max Buffering Queue Size -->
          <div class="space-y-1 md:col-span-2">
            <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Buffering Queue Size</label>
            <input
              v-model.number="localConfig.maxBufferingQueueSize"
              type="number"
              min="1"
              max="20"
              required
              class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
            />
            <span class="text-[10px] text-muted-foreground">Range: 1 to 20 (default: 5)</span>
          </div>
        </div>

        <!-- URL Preview -->
        <div class="border-t border-subtle pt-6 space-y-3">
          <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated LLHLS Stream URL</label>
          <div class="flex items-center space-x-2">
            <div class="flex-1 bg-muted/50 border border-subtle rounded-lg px-3 py-2 font-mono text-xs text-foreground flex items-center justify-between overflow-x-auto select-all">
              <span>http://{host}:{port}/{{ app }}/{{ streamName || '{stream}' }}.m3u8</span>
            </div>
            <button
              type="button"
              @click="copyToClipboard(`http://{host}:{port}/${app}/${streamName || '{stream}'}.m3u8`)"
              class="p-2 border border-subtle hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
              title="Copy to clipboard"
            >
              <Check v-if="copied" class="w-4 h-4 text-success" />
              <Copy v-else class="w-4 h-4" />
            </button>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-[10px] text-muted-foreground font-medium uppercase">Test Stream Name:</span>
            <input
              v-model="streamName"
              type="text"
              placeholder="stream"
              class="px-2 py-1 bg-muted border border-subtle rounded text-xs text-foreground focus:outline-none focus:border-primary/50 w-32"
            />
          </div>
        </div>
      </div>

      <!-- Disabled placeholder -->
      <div v-else class="py-12 text-center text-sm text-muted-foreground border border-dashed border-subtle rounded-xl bg-muted/5">
        LLHLS streaming configuration is currently disabled for this application.
        Toggle the switch above to enable and configure parameters.
      </div>

      <!-- Footer with Save Button -->
      <div class="flex justify-end pt-4 border-t border-subtle">
        <button
          type="submit"
          class="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center space-x-2 cursor-pointer select-none"
        >
          <Save class="w-4 h-4" />
          <span>Save LLHLS Settings</span>
        </button>
      </div>
    </form>
  </div>
</template>
