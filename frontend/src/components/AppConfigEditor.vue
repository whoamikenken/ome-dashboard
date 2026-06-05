<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { X, Check, AlertCircle, Save, RefreshCw, Plus, Trash2, RotateCcw, Code } from 'lucide-vue-next'
import { getApp, updateApp } from '@/api/apps'
import ABRLadderEditor from './ABRLadderEditor.vue'
import ConfigDiffViewer from './ConfigDiffViewer.vue'
import type { Application, OutputProfile } from '@/types/ome'

const props = defineProps<{
  vhost: string
  app: string
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

const activeTab = ref<'form' | 'json'>('form')

const loading = ref(false)
const isSubmitting = ref(false)
const error = ref<string | null>(null)
const success = ref(false)

// Config refs
const initialConfig = ref<Application | null>(null)
const config = ref<Application>({
  name: '',
  type: 'live',
  providers: {},
  publishers: {},
  outputProfiles: []
})

// JSON editor refs
const jsonText = ref('')
const jsonError = ref<string | null>(null)

// Publishers Form Representation
interface PublisherItem {
  key: string
  valueText: string
  error?: string
}
const formPublishers = ref<PublisherItem[]>([])

// Diff modal state
const showDiffViewer = ref(false)

// Provider options with descriptions
const providerOptions = [
  { id: 'rtmp', label: 'RTMP', desc: 'Real-Time Messaging Protocol' },
  { id: 'webrtc', label: 'WebRTC', desc: 'Low-latency browser play' },
  { id: 'srt', label: 'SRT', desc: 'Secure Reliable Transport' },
  { id: 'rtspPull', label: 'RTSP Pull', desc: 'Pull streams from RTSP sources' },
  { id: 'mpegts', label: 'MPEG-TS', desc: 'MPEG-TS input stream' },
  { id: 'file', label: 'File', desc: 'Play static media files' },
  { id: 'ovt', label: 'OVT', desc: 'Oven Video Transport' },
  { id: 'schedule', label: 'Schedule', desc: 'Schedule stream playout' },
  { id: 'multiplex', label: 'Multiplex', desc: 'Multiplex stream outputs' }
] as const

const templates = {
  'Default RTMP': {
    providers: {
      rtmp: { blockDuplicateStreamName: false, passthroughOutputProfile: false }
    },
    publishers: {},
    outputProfiles: []
  },
  'WebRTC + HLS': {
    providers: {
      rtmp: { blockDuplicateStreamName: false, passthroughOutputProfile: false },
      webrtc: { timeout: 0 }
    },
    publishers: {
      webrtc: {},
      hls: {}
    },
    outputProfiles: [
      {
        name: 'abr_720p',
        outputStreamName: '${streamName}_abr_720p',
        encodes: [
          {
            name: 'abr_720p_v',
            type: 'video',
            codec: 'h264',
            bitrate: '2500k',
            width: 1280,
            height: 720,
            framerate: 30
          },
          {
            name: 'abr_720p_a',
            type: 'audio',
            codec: 'aac',
            bitrate: '128k',
            sampleRate: 48000,
            channel: 2
          }
        ]
      }
    ]
  },
  'Recording Only': {
    providers: {
      rtmp: { blockDuplicateStreamName: false, passthroughOutputProfile: false }
    },
    publishers: {},
    outputProfiles: []
  },
  'Full Stack': {
    providers: {
      rtmp: { blockDuplicateStreamName: false, passthroughOutputProfile: false },
      srt: { blockDuplicateStreamName: false },
      webrtc: { timeout: 0 },
      rtspPull: { blockDuplicateStreamName: false },
      mpegts: { streams: { stream: [] } },
      file: { rootPath: '', streamMap: { stream: [] } }
    },
    publishers: {
      webrtc: {},
      hls: {},
      dash: {}
    },
    outputProfiles: [
      {
        name: 'abr_720p',
        outputStreamName: '${streamName}_abr_720p',
        encodes: [
          {
            name: 'abr_720p_v',
            type: 'video',
            codec: 'h264',
            bitrate: '2500k',
            width: 1280,
            height: 720,
            framerate: 30
          },
          {
            name: 'abr_720p_a',
            type: 'audio',
            codec: 'aac',
            bitrate: '128k',
            sampleRate: 48000,
            channel: 2
          }
        ]
      }
    ]
  }
}

// Reset state
function resetForm() {
  activeTab.value = 'form'
  error.value = null
  success.value = false
  isSubmitting.value = false
  jsonError.value = null
  initialConfig.value = null
  config.value = {
    name: '',
    type: 'live',
    providers: {},
    publishers: {},
    outputProfiles: []
  }
  jsonText.value = ''
  formPublishers.value = []
  showDiffViewer.value = false
}

// Fetch and load configuration
async function loadAppConfig() {
  loading.value = true
  error.value = null
  try {
    const data = await getApp(props.vhost, props.app)
    const appData = data.response
    
    // Set config values
    initialConfig.value = JSON.parse(JSON.stringify(appData))
    config.value = JSON.parse(JSON.stringify(appData))
    
    // Sync publishers representation
    syncPublishersFromConfig()
    
    // Sync JSON text
    jsonText.value = JSON.stringify(config.value, null, 2)
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to fetch application configuration'
  } finally {
    loading.value = false
  }
}

// Watch dialog show state
watch(() => props.show, (newVal) => {
  if (newVal) {
    loadAppConfig()
  } else {
    resetForm()
  }
})

// Sync config from publishers form view
function updatePublishersInConfig() {
  const newPublishers: Record<string, any> = {}
  let hasError = false
  const seenKeys = new Set<string>()

  for (const item of formPublishers.value) {
    const key = item.key.trim()
    if (!key) continue

    if (seenKeys.has(key)) {
      item.error = `Duplicate publisher: ${key}`
      hasError = true
      continue
    }
    seenKeys.add(key)

    try {
      const parsedVal = JSON.parse(item.valueText)
      newPublishers[key] = parsedVal
      item.error = undefined
    } catch (e) {
      item.error = 'Invalid JSON (use {} or empty values)'
      hasError = true
    }
  }

  if (!hasError) {
    config.value.publishers = newPublishers
    // Also sync to JSON editor
    jsonText.value = JSON.stringify(config.value, null, 2)
    jsonError.value = null
  }
}

// Sync publishers form from config
function syncPublishersFromConfig() {
  if (!config.value.publishers) {
    formPublishers.value = []
    return
  }
  formPublishers.value = Object.entries(config.value.publishers).map(([key, val]) => ({
    key,
    valueText: typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val),
    error: undefined
  }))
}

// Providers toggles
function isProviderEnabled(id: string) {
  return config.value.providers && config.value.providers[id as keyof typeof config.value.providers] !== undefined
}

function getProviderDefault(key: string) {
  switch (key) {
    case 'rtmp':
      return { blockDuplicateStreamName: false, passthroughOutputProfile: false }
    case 'srt':
      return { blockDuplicateStreamName: false }
    case 'webrtc':
      return { timeout: 0 }
    case 'rtspPull':
      return { blockDuplicateStreamName: false }
    case 'file':
      return { rootPath: '', streamMap: { stream: [] } }
    case 'mpegts':
      return { streams: { stream: [] } }
    case 'schedule':
      return { mediaRootDir: '', scheduleFilesDir: '' }
    case 'multiplex':
      return { muxFilesDir: '' }
    case 'ovt':
    default:
      return {}
  }
}

function toggleProvider(id: string) {
  if (!config.value.providers) {
    config.value.providers = {}
  }
  
  const providers = { ...config.value.providers }
  if (providers[id as keyof typeof providers] !== undefined) {
    delete providers[id as keyof typeof providers]
  } else {
    providers[id as keyof typeof providers] = getProviderDefault(id) as any
  }
  config.value.providers = providers
  // Update JSON text
  jsonText.value = JSON.stringify(config.value, null, 2)
}

// Form Publishers actions
function addPublisher() {
  formPublishers.value.push({
    key: '',
    valueText: '{}'
  })
  updatePublishersInConfig()
}

function removePublisher(index: number) {
  formPublishers.value.splice(index, 1)
  updatePublishersInConfig()
}

function handlePublisherInput() {
  updatePublishersInConfig()
}

// Output profiles
function handleProfilesUpdate(newProfiles: OutputProfile[]) {
  config.value.outputProfiles = newProfiles
  // Update JSON text
  jsonText.value = JSON.stringify(config.value, null, 2)
}

// JSON Editor Tab logic
function handleJsonInput(e: Event) {
  const text = (e.target as HTMLTextAreaElement).value
  jsonText.value = text
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed !== 'object' || parsed === null) {
      jsonError.value = 'Configuration must be a JSON object'
      return
    }
    jsonError.value = null
    
    // Update config, preserve name and type as read-only
    config.value = {
      ...parsed,
      name: props.app,
      type: initialConfig.value?.type || 'live'
    }
    
    // Sync publishers form from parsed config
    syncPublishersFromConfig()
  } catch (err: any) {
    jsonError.value = err.message || 'Invalid JSON syntax'
  }
}

function formatJson() {
  try {
    const parsed = JSON.parse(jsonText.value)
    jsonText.value = JSON.stringify(parsed, null, 2)
    jsonError.value = null
  } catch (err: any) {
    jsonError.value = err.message || 'Invalid JSON syntax'
  }
}

// Templates & defaults
function applyTemplate(templateName: keyof typeof templates) {
  const template = templates[templateName]
  config.value = {
    ...config.value,
    providers: JSON.parse(JSON.stringify(template.providers)),
    publishers: JSON.parse(JSON.stringify(template.publishers)),
    outputProfiles: JSON.parse(JSON.stringify(template.outputProfiles || []))
  }
  syncPublishersFromConfig()
  jsonText.value = JSON.stringify(config.value, null, 2)
  jsonError.value = null
}

function restoreDefaults() {
  if (initialConfig.value) {
    config.value = JSON.parse(JSON.stringify(initialConfig.value))
    syncPublishersFromConfig()
    jsonText.value = JSON.stringify(config.value, null, 2)
    jsonError.value = null
  }
}

function onTemplateChange(e: Event) {
  const select = e.target as HTMLSelectElement
  const templateName = select.value as keyof typeof templates
  if (templateName && templates[templateName]) {
    applyTemplate(templateName)
    // Clear selection so the user can re-select the same template if needed
    select.value = ''
  }
}

// Validation
const isConfigValid = computed(() => {
  if (activeTab.value === 'json') {
    return !jsonError.value
  }
  const hasPublisherError = formPublishers.value.some(p => !!p.error)
  if (hasPublisherError) return false
  
  if (config.value.outputProfiles) {
    for (const p of config.value.outputProfiles) {
      if (!p.name.trim()) return false
      if (!p.outputStreamName.trim()) return false
      if (!p.encodes || p.encodes.length === 0) return false
    }
  }
  
  return true
})

// Save action: trigger review in diff viewer
function handleSaveTrigger() {
  if (!isConfigValid.value) return
  
  // Make sure we update publishers from form first
  if (activeTab.value === 'form') {
    updatePublishersInConfig()
  }
  
  showDiffViewer.value = true
}

// Final Save after diff viewer confirmation
async function handleApplyChanges() {
  isSubmitting.value = true
  error.value = null
  success.value = false
  showDiffViewer.value = false
  
  try {
    const payload = JSON.parse(JSON.stringify(config.value))
    
    // Call updateApp REST API
    await updateApp(props.vhost, props.app, payload)
    
    success.value = true
    setTimeout(() => {
      emit('saved')
      emit('close')
    }, 1500)
  } catch (err: any) {
    error.value = err.response?.data?.message || err.message || 'Failed to update application configuration'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/55">
        <!-- Backdrop -->
        <div class="fixed inset-0 cursor-default" @click="emit('close')"></div>

        <!-- Modal Box -->
        <div class="bg-card rounded-2xl border border-subtle shadow-2xl w-full max-w-4xl z-10 flex flex-col max-h-[90vh]">
          <!-- Header -->
          <div class="flex items-center justify-between p-5 border-b border-subtle">
            <div>
              <h2 class="text-lg font-bold text-foreground">Edit Application Configuration</h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                VHost: <span class="font-semibold text-foreground mr-3">{{ vhost }}</span>
                App: <span class="font-semibold text-foreground mr-3">{{ app }}</span>
              </p>
            </div>
            <button @click="emit('close')" class="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Template & Defaults Row -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-muted/10 border-b border-subtle">
            <div class="flex items-center space-x-2">
              <label class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Config Template:</label>
              <select
                @change="onTemplateChange"
                class="px-3 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-xs focus:outline-none focus:border-primary/50"
              >
                <option value="" disabled selected>Select a Template...</option>
                <option value="Default RTMP">Default RTMP</option>
                <option value="WebRTC + HLS">WebRTC + HLS</option>
                <option value="Recording Only">Recording Only</option>
                <option value="Full Stack">Full Stack</option>
              </select>
            </div>
            
            <button
              type="button"
              @click="restoreDefaults"
              class="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-lg border border-subtle transition-colors cursor-pointer select-none"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              <span>Restore Defaults</span>
            </button>
          </div>

          <!-- Tab Bar -->
          <div class="flex items-center space-x-1 border-b border-subtle px-5">
            <button
              @click="activeTab = 'form'"
              class="px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer select-none"
              :class="activeTab === 'form' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
            >
              Form View
            </button>
            <button
              @click="activeTab = 'json'"
              class="px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer select-none"
              :class="activeTab === 'json' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
            >
              JSON Editor
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-5 space-y-6">
            <!-- Loading State -->
            <div v-if="loading" class="space-y-4 py-6">
              <div class="h-10 bg-muted rounded animate-skeleton"></div>
              <div class="h-10 bg-muted rounded animate-skeleton"></div>
              <div class="h-48 bg-muted rounded animate-skeleton"></div>
            </div>

            <div v-else class="space-y-6">
              <!-- Success Alert Banner -->
              <div v-if="success" class="p-3.5 bg-success/10 border border-success/20 rounded-xl text-sm text-success flex items-center space-x-2">
                <Check class="w-4.5 h-4.5 flex-shrink-0" />
                <span>Configuration saved successfully!</span>
              </div>

              <!-- Error Alert Banner -->
              <div v-if="error" class="p-3.5 bg-danger/10 border border-danger/20 rounded-xl text-sm text-danger flex items-center space-x-2">
                <AlertCircle class="w-4.5 h-4.5 flex-shrink-0" />
                <span>{{ error }}</span>
              </div>

              <!-- Form Tab Content -->
              <div v-if="activeTab === 'form'" class="space-y-6">
                <!-- App Name & Type Row -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Application Name (Read-only)</label>
                    <input
                      :value="props.app"
                      type="text"
                      disabled
                      class="w-full px-3 py-2 bg-muted/40 border border-subtle rounded-lg text-muted-foreground text-sm cursor-not-allowed"
                    />
                  </div>
                  <div class="space-y-1.5">
                    <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type (Read-only)</label>
                    <input
                      :value="config.type"
                      type="text"
                      disabled
                      class="w-full px-3 py-2 bg-muted/40 border border-subtle rounded-lg text-muted-foreground text-sm cursor-not-allowed uppercase font-semibold"
                    />
                  </div>
                </div>

                <!-- Providers -->
                <div class="space-y-3">
                  <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Providers</h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div
                      v-for="provider in providerOptions"
                      :key="provider.id"
                      @click="toggleProvider(provider.id)"
                      class="flex items-center justify-between p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-150"
                      :class="isProviderEnabled(provider.id) ? 'border-primary/60 bg-primary/5 text-foreground' : 'border-subtle hover:border-primary/30 text-muted-foreground hover:text-foreground'"
                    >
                      <div class="flex flex-col space-y-0.5">
                        <span class="text-sm font-bold capitalize">{{ provider.label }}</span>
                        <span class="text-[10px] text-muted-foreground font-medium">{{ provider.desc }}</span>
                      </div>
                      
                      <!-- Toggle Switch -->
                      <div
                        class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                        :class="isProviderEnabled(provider.id) ? 'bg-primary' : 'bg-muted-foreground/30'"
                      >
                        <span
                          class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ml-0.5"
                          :class="isProviderEnabled(provider.id) ? 'translate-x-4' : 'translate-x-0'"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Publishers Section -->
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Publishers</h3>
                    <button
                      type="button"
                      @click="addPublisher"
                      class="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer select-none"
                    >
                      <Plus class="w-3.5 h-3.5" />
                      <span>Add Publisher</span>
                    </button>
                  </div>

                  <div v-if="formPublishers.length === 0" class="text-xs text-muted-foreground italic border border-dashed border-subtle rounded-xl p-6 text-center bg-muted/5">
                    No publishers configured. Click "Add Publisher" to configure a publishing endpoint.
                  </div>

                  <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      v-for="(pub, index) in formPublishers"
                      :key="index"
                      class="flex flex-col space-y-2.5 p-4 border border-subtle rounded-xl bg-card/50 shadow-sm relative group"
                    >
                      <!-- Remove Button -->
                      <button
                        type="button"
                        @click="removePublisher(index)"
                        class="absolute top-3.5 right-3.5 p-1 text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                        title="Remove Publisher"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>

                      <!-- Key input -->
                      <div class="space-y-1">
                        <label class="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Publisher Name *</label>
                        <input
                          v-model="pub.key"
                          @input="handlePublisherInput"
                          type="text"
                          placeholder="e.g. webrtc"
                          class="w-full px-3 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 font-mono"
                        />
                      </div>
                      
                      <!-- Value Editor (JSON) -->
                      <div class="space-y-1">
                        <label class="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Settings (JSON Object) *</label>
                        <textarea
                          v-model="pub.valueText"
                          @input="handlePublisherInput"
                          rows="3"
                          placeholder="e.g. {}"
                          class="w-full px-3 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-xs font-mono focus:outline-none focus:border-primary/50"
                          :class="{ 'border-danger focus:border-danger': pub.error }"
                        ></textarea>
                        <span v-if="pub.error" class="block text-[10px] text-danger">{{ pub.error }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Output Profiles (ABR ladder) -->
                <div class="space-y-3">
                  <h3 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ABR Output Profiles</h3>
                  <div class="border border-subtle bg-muted/5 rounded-xl p-4">
                    <ABRLadderEditor
                      :modelValue="config.outputProfiles || []"
                      @update:modelValue="handleProfilesUpdate"
                      :loading="loading"
                    />
                  </div>
                </div>
              </div>

              <!-- JSON Tab Content -->
              <div v-if="activeTab === 'json'" class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-muted-foreground">
                    Directly modify the application configuration schema. Read-only fields (<span class="font-mono text-foreground">name</span>, <span class="font-mono text-foreground">type</span>) are protected.
                  </span>
                  <button
                    type="button"
                    @click="formatJson"
                    :disabled="!!jsonError"
                    class="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted/80 rounded-lg border border-subtle transition-colors cursor-pointer select-none disabled:opacity-50"
                  >
                    <Code class="w-3.5 h-3.5" />
                    <span>Format JSON</span>
                  </button>
                </div>

                <div class="relative">
                  <textarea
                    :value="jsonText"
                    @input="handleJsonInput"
                    rows="18"
                    class="w-full p-4 bg-muted text-foreground text-xs font-mono rounded-xl border focus:outline-none focus:ring-1 focus:ring-primary/20"
                    :class="jsonError ? 'border-danger focus:border-danger' : 'border-subtle focus:border-primary/50'"
                  ></textarea>
                </div>
                
                <div v-if="jsonError" class="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs text-danger flex items-center space-x-2">
                  <AlertCircle class="w-4 h-4 flex-shrink-0" />
                  <span>{{ jsonError }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end items-center space-x-3 p-4 border-t border-subtle bg-muted/10">
            <button
              type="button"
              @click="emit('close')"
              :disabled="isSubmitting"
              class="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50 select-none"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="handleSaveTrigger"
              :disabled="isSubmitting || !isConfigValid || loading"
              class="flex items-center space-x-1.5 px-5 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors cursor-pointer disabled:opacity-50 select-none"
            >
              <Save v-if="!isSubmitting" class="w-4 h-4" />
              <RefreshCw v-else class="w-4 h-4 animate-spin" />
              <span>{{ isSubmitting ? 'Saving...' : 'Save Changes' }}</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>

  <!-- Nested Diff Viewer Modal -->
  <ConfigDiffViewer
    :show="showDiffViewer"
    :original="JSON.stringify(initialConfig || {}, null, 2)"
    :modified="JSON.stringify(config, null, 2)"
    @close="showDiffViewer = false"
    @apply="handleApplyChanges"
  />
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
