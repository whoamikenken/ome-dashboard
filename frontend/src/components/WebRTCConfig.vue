<script setup lang="ts">
import { ref, watch } from 'vue'
import { Globe, Zap, Plus, Trash2, Check, Copy, Save } from 'lucide-vue-next'

const props = defineProps<{
  vhost: string
  app: string
  config: {
    enabled: boolean
    timeout: number
    iceServers: {
      urls: string
      username?: string
      credential?: string
    }[]
    portRange: {
      min: number
      max: number
    }
    maxConnections: number
  } | null
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:config', value: {
    enabled: boolean
    timeout: number
    iceServers: {
      urls: string
      username?: string
      credential?: string
    }[]
    portRange: {
      min: number
      max: number
    }
    maxConnections: number
  }): void
  (e: 'save'): void
}>()

const defaultConfig = {
  enabled: false,
  timeout: 30,
  iceServers: [] as { urls: string; username?: string; credential?: string }[],
  portRange: { min: 10000, max: 60000 },
  maxConnections: 100,
}

const localConfig = ref({
  enabled: false,
  timeout: 30,
  iceServers: [] as { urls: string; username?: string; credential?: string }[],
  portRange: { min: 10000, max: 60000 },
  maxConnections: 100,
})

const copied = ref(false)
const streamName = ref('stream')

// Synchronize prop changes to local state with deep comparison to prevent infinite loop
watch(() => props.config, (newVal) => {
  if (!newVal) {
    const isSame = JSON.stringify(localConfig.value) === JSON.stringify(defaultConfig)
    if (!isSame) {
      localConfig.value = {
        enabled: false,
        timeout: 30,
        iceServers: [],
        portRange: { min: 10000, max: 60000 },
        maxConnections: 100,
      }
    }
    return
  }

  const parsed = {
    enabled: newVal.enabled ?? false,
    timeout: newVal.timeout ?? 30,
    iceServers: newVal.iceServers ? JSON.parse(JSON.stringify(newVal.iceServers)) : [],
    portRange: newVal.portRange ? { ...newVal.portRange } : { min: 10000, max: 60000 },
    maxConnections: newVal.maxConnections ?? 100,
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

function applyPreset(preset: 'default' | 'low-latency' | 'high-capacity') {
  if (preset === 'default') {
    localConfig.value.timeout = 30
    localConfig.value.iceServers = []
    localConfig.value.portRange = { min: 10000, max: 60000 }
    localConfig.value.maxConnections = 100
  } else if (preset === 'low-latency') {
    localConfig.value.timeout = 15
    localConfig.value.iceServers = []
    localConfig.value.portRange = { min: 10000, max: 20000 }
    localConfig.value.maxConnections = 50
  } else if (preset === 'high-capacity') {
    localConfig.value.timeout = 60
    localConfig.value.iceServers = []
    localConfig.value.portRange = { min: 10000, max: 60000 }
    localConfig.value.maxConnections = 500
  }
}

function addIceServer() {
  if (!localConfig.value.iceServers) {
    localConfig.value.iceServers = []
  }
  localConfig.value.iceServers.push({ urls: '', username: '', credential: '' })
}

function removeIceServer(index: number) {
  localConfig.value.iceServers.splice(index, 1)
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
      <div class="h-28 bg-muted rounded animate-skeleton"></div>
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
          <Globe class="w-5 h-5 text-primary" />
          <div>
            <h3 class="text-lg font-bold text-foreground">WebRTC Configuration</h3>
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
              @click="applyPreset('default')"
              class="px-3 py-1.5 bg-muted hover:bg-primary/10 border border-subtle hover:border-primary/30 rounded-lg text-xs font-semibold text-foreground hover:text-primary transition-all cursor-pointer flex items-center space-x-1"
            >
              <Zap class="w-3.5 h-3.5" />
              <span>Default</span>
            </button>
            <button
              type="button"
              @click="applyPreset('low-latency')"
              class="px-3 py-1.5 bg-muted hover:bg-primary/10 border border-subtle hover:border-primary/30 rounded-lg text-xs font-semibold text-foreground hover:text-primary transition-all cursor-pointer flex items-center space-x-1"
            >
              <Zap class="w-3.5 h-3.5" />
              <span>Low Latency</span>
            </button>
            <button
              type="button"
              @click="applyPreset('high-capacity')"
              class="px-3 py-1.5 bg-muted hover:bg-primary/10 border border-subtle hover:border-primary/30 rounded-lg text-xs font-semibold text-foreground hover:text-primary transition-all cursor-pointer flex items-center space-x-1"
            >
              <Zap class="w-3.5 h-3.5" />
              <span>High Capacity</span>
            </button>
          </div>
        </div>

        <!-- Form fields grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Timeout -->
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timeout (seconds)</label>
            <input
              v-model.number="localConfig.timeout"
              type="number"
              min="5"
              max="120"
              required
              class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
            />
            <span class="text-[10px] text-muted-foreground">Range: 5 to 120 seconds (default: 30)</span>
          </div>

          <!-- Max Connections -->
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Connections</label>
            <input
              v-model.number="localConfig.maxConnections"
              type="number"
              min="1"
              max="1000"
              required
              class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
            />
            <span class="text-[10px] text-muted-foreground">Range: 1 to 1000 connections (default: 100)</span>
          </div>

          <!-- Port Range Min -->
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Port Range Min</label>
            <input
              v-model.number="localConfig.portRange.min"
              type="number"
              min="10000"
              max="60000"
              required
              class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
            />
            <span class="text-[10px] text-muted-foreground">Range: 10000 to 60000 (default: 10000)</span>
          </div>

          <!-- Port Range Max -->
          <div class="space-y-1">
            <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Port Range Max</label>
            <input
              v-model.number="localConfig.portRange.max"
              type="number"
              min="10000"
              max="60000"
              required
              class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
            />
            <span class="text-[10px] text-muted-foreground">Range: 10000 to 60000 (default: 60000)</span>
          </div>
        </div>

        <!-- ICE Servers Section -->
        <div class="border border-subtle bg-muted/20 rounded-xl p-4 space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ICE Servers</span>
            <button
              @click="addIceServer"
              type="button"
              class="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>Add ICE Server</span>
            </button>
          </div>

          <div v-if="localConfig.iceServers && localConfig.iceServers.length > 0" class="space-y-3">
            <div
              v-for="(server, index) in localConfig.iceServers"
              :key="index"
              class="relative bg-muted/40 border border-subtle p-3 rounded-lg space-y-3"
            >
              <button
                @click="removeIceServer(index)"
                type="button"
                class="absolute top-2 right-2 text-muted-foreground hover:text-danger p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                title="Remove ICE Server"
              >
                <Trash2 class="w-4 h-4" />
              </button>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pr-8">
                <!-- Server URL -->
                <div class="space-y-1">
                  <label class="block text-[10px] font-semibold text-muted-foreground uppercase">Server URL *</label>
                  <input
                    v-model="server.urls"
                    type="text"
                    placeholder="e.g. stun:stun.l.google.com:19302"
                    class="w-full px-2 py-1 bg-background border border-subtle rounded text-foreground text-xs focus:outline-none focus:border-primary/50"
                    required
                  />
                </div>
                <!-- Username -->
                <div class="space-y-1">
                  <label class="block text-[10px] font-semibold text-muted-foreground uppercase">Username (Optional)</label>
                  <input
                    v-model="server.username"
                    type="text"
                    placeholder="username"
                    class="w-full px-2 py-1 bg-background border border-subtle rounded text-foreground text-xs focus:outline-none focus:border-primary/50"
                  />
                </div>
                <!-- Credential -->
                <div class="space-y-1">
                  <label class="block text-[10px] font-semibold text-muted-foreground uppercase">Credential (Optional)</label>
                  <input
                    v-model="server.credential"
                    type="password"
                    placeholder="credential"
                    class="w-full px-2 py-1 bg-background border border-subtle rounded text-foreground text-xs focus:outline-none focus:border-primary/50"
                  />
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-muted-foreground text-center py-6 bg-muted/10 border border-dashed border-subtle rounded-lg">
            No ICE servers configured. WebRTC connection will use browser native connection negotiation.
          </div>
        </div>

        <!-- URL Preview -->
        <div class="border-t border-subtle pt-6 space-y-3">
          <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated WebRTC Stream URL</label>
          <div class="flex items-center space-x-2">
            <div class="flex-1 bg-muted/50 border border-subtle rounded-lg px-3 py-2 font-mono text-xs text-foreground flex items-center justify-between overflow-x-auto select-all">
              <span>webrtc://{host}:{port}/{{ app }}/{{ streamName || '{stream}' }}</span>
            </div>
            <button
              type="button"
              @click="copyToClipboard(`webrtc://{host}:{port}/${app}/${streamName || '{stream}'}`)"
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
        WebRTC transport configuration is currently disabled for this application.
        Toggle the switch above to enable and configure parameters.
      </div>

      <!-- Footer with Save Button -->
      <div class="flex justify-end pt-4 border-t border-subtle">
        <button
          type="submit"
          class="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center space-x-2 cursor-pointer select-none"
        >
          <Save class="w-4 h-4" />
          <span>Save WebRTC Settings</span>
        </button>
      </div>
    </form>
  </div>
</template>
