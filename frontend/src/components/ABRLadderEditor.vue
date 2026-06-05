<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import {
  Plus,
  Trash2,
  GripVertical,
  Code,
  AlertCircle,
  Settings,
  Video,
  Music,
  Layers
} from 'lucide-vue-next'
import type { OutputProfile } from '@/types/ome'

interface RenditionUI {
  id: string
  name: string
  width: number
  height: number
  videoBitrate: number // in kbps
  videoCodec: string
  framerate: number
  audioBitrate: number // in kbps
  audioCodec: string
  sampleRate: number
  channels: number
  isExpanded: boolean
}

interface ValidationError {
  index: number
  field: string
  message: string
}

const props = defineProps<{
  modelValue: OutputProfile[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: OutputProfile[]): void
}>()

const renditionsUI = ref<RenditionUI[]>([])
const jsonText = ref('')
const isJsonMode = ref(false)
const jsonError = ref<string | null>(null)

// Drag and drop state
const dragIndex = ref<number | null>(null)
const activeDragCardId = ref<string | null>(null)

function onDragHandleMouseEnter(id: string) {
  activeDragCardId.value = id
}

function onDragHandleMouseLeave() {
  activeDragCardId.value = null
}

function onDragStart(index: number) {
  dragIndex.value = index
}

function onDragOver(index: number) {
  if (dragIndex.value === null || dragIndex.value === index) return
  const list = [...renditionsUI.value]
  const draggedItem = list[dragIndex.value]
  list.splice(dragIndex.value, 1)
  list.splice(index, 0, draggedItem)
  renditionsUI.value = list
  dragIndex.value = index
  emitUpdate()
}

function onDragEnd() {
  dragIndex.value = null
  activeDragCardId.value = null
}

// Convert a single OutputProfile to RenditionUI
function mapProfileToUI(profile: OutputProfile): RenditionUI {
  const videoEncode = profile.encodes?.find(e => e.type === 'video') || {}
  const audioEncode = profile.encodes?.find(e => e.type === 'audio') || {}

  const parseBitrate = (val: any): number => {
    if (typeof val === 'number') return Math.floor(val / 1000)
    if (typeof val === 'string') {
      const lower = val.toLowerCase()
      if (lower.endsWith('k')) {
        return parseInt(lower) || 0
      }
      if (lower.endsWith('m')) {
        return (parseInt(lower) || 0) * 1000
      }
      const num = parseInt(lower)
      return isNaN(num) ? 0 : Math.floor(num / 1000)
    }
    return 0
  }

  return {
    id: Math.random().toString(36).substring(2, 9),
    name: profile.name || '',
    width: Number(videoEncode.width) || 1280,
    height: Number(videoEncode.height) || 720,
    videoBitrate: parseBitrate(videoEncode.bitrate) || 2500,
    videoCodec: String(videoEncode.codec || 'h264'),
    framerate: Number(videoEncode.framerate) || 30,
    audioBitrate: parseBitrate(audioEncode.bitrate) || 128,
    audioCodec: String(audioEncode.codec || 'aac'),
    sampleRate: Number(audioEncode.sampleRate) || 48000,
    channels: Number(audioEncode.channel) || 2,
    isExpanded: false
  }
}

// Convert RenditionUI back to OutputProfile
function mapUIToProfile(ui: RenditionUI): OutputProfile {
  return {
    name: ui.name,
    outputStreamName: ui.name.startsWith('${streamName}') ? ui.name : `\${streamName}_${ui.name}`,
    encodes: [
      {
        name: `${ui.name}_v`,
        type: 'video',
        codec: ui.videoCodec,
        bitrate: `${ui.videoBitrate}k`,
        width: ui.width,
        height: ui.height,
        framerate: ui.framerate
      },
      {
        name: `${ui.name}_a`,
        type: 'audio',
        codec: ui.audioCodec,
        bitrate: `${ui.audioBitrate}k`,
        sampleRate: ui.sampleRate,
        channel: ui.channels
      }
    ]
  }
}

// Sync from props if different
function syncFromProps() {
  const currentPropsJson = JSON.stringify(props.modelValue || [])
  const currentUIJson = JSON.stringify(renditionsUI.value.map(mapUIToProfile))

  if (currentPropsJson !== currentUIJson) {
    renditionsUI.value = (props.modelValue || []).map(mapProfileToUI)
  }
}

watch(() => props.modelValue, syncFromProps, { deep: true })

onMounted(() => {
  syncFromProps()
})

// Emit the changes
function emitUpdate() {
  const profiles = renditionsUI.value.map(mapUIToProfile)
  emit('update:modelValue', profiles)
  if (isJsonMode.value) {
    jsonText.value = JSON.stringify(profiles, null, 2)
  }
}

// Add default rendition
function addRendition() {
  const suffix = renditionsUI.value.length + 1
  renditionsUI.value.push({
    id: Math.random().toString(36).substring(2, 9),
    name: `rendition_${suffix}`,
    width: 1280,
    height: 720,
    videoBitrate: 2500,
    videoCodec: 'h264',
    framerate: 30,
    audioBitrate: 128,
    audioCodec: 'aac',
    sampleRate: 48000,
    channels: 2,
    isExpanded: false
  })
  emitUpdate()
}

// Remove rendition
function removeRendition(index: number) {
  if (renditionsUI.value.length > 1) {
    renditionsUI.value.splice(index, 1)
    emitUpdate()
  }
}

// JSON view actions
function toggleJsonMode() {
  if (!isJsonMode.value) {
    jsonText.value = JSON.stringify(renditionsUI.value.map(mapUIToProfile), null, 2)
    jsonError.value = null
    isJsonMode.value = true
  } else {
    if (parseJsonText()) {
      isJsonMode.value = false
    }
  }
}

function onJsonInput() {
  parseJsonText()
}

function parseJsonText(): boolean {
  try {
    const parsed = JSON.parse(jsonText.value)
    if (!Array.isArray(parsed)) {
      jsonError.value = 'Root must be an array of output profiles'
      return false
    }

    for (const profile of parsed) {
      if (!profile.name || typeof profile.name !== 'string') {
        jsonError.value = 'Each profile must have a string "name"'
        return false
      }
      if (!profile.outputStreamName || typeof profile.outputStreamName !== 'string') {
        jsonError.value = 'Each profile must have a string "outputStreamName"'
        return false
      }
      if (!Array.isArray(profile.encodes)) {
        jsonError.value = `Profile "${profile.name}" must have an "encodes" array`
        return false
      }
    }

    jsonError.value = null
    renditionsUI.value = parsed.map(mapProfileToUI)
    emit('update:modelValue', parsed)
    return true
  } catch (e: any) {
    jsonError.value = `Invalid JSON: ${e.message}`
    return false
  }
}

// Presets
function applyPreset(presetName: string) {
  let presets: RenditionUI[] = []

  if (presetName === 'low') {
    presets = [
      {
        id: Math.random().toString(36).substring(2, 9),
        name: '480p',
        width: 854,
        height: 480,
        videoBitrate: 1000,
        videoCodec: 'h264',
        framerate: 30,
        audioBitrate: 96,
        audioCodec: 'aac',
        sampleRate: 48000,
        channels: 2,
        isExpanded: false
      }
    ]
  } else if (presetName === 'medium') {
    presets = [
      {
        id: Math.random().toString(36).substring(2, 9),
        name: '720p',
        width: 1280,
        height: 720,
        videoBitrate: 2500,
        videoCodec: 'h264',
        framerate: 30,
        audioBitrate: 128,
        audioCodec: 'aac',
        sampleRate: 48000,
        channels: 2,
        isExpanded: false
      }
    ]
  } else if (presetName === 'high') {
    presets = [
      {
        id: Math.random().toString(36).substring(2, 9),
        name: '1080p',
        width: 1920,
        height: 1080,
        videoBitrate: 5000,
        videoCodec: 'h264',
        framerate: 30,
        audioBitrate: 192,
        audioCodec: 'aac',
        sampleRate: 48000,
        channels: 2,
        isExpanded: false
      }
    ]
  } else if (presetName === 'full-hd') {
    presets = [
      {
        id: Math.random().toString(36).substring(2, 9),
        name: '1080p',
        width: 1920,
        height: 1080,
        videoBitrate: 5000,
        videoCodec: 'h264',
        framerate: 30,
        audioBitrate: 192,
        audioCodec: 'aac',
        sampleRate: 48000,
        channels: 2,
        isExpanded: false
      },
      {
        id: Math.random().toString(36).substring(2, 9),
        name: '720p',
        width: 1280,
        height: 720,
        videoBitrate: 2500,
        videoCodec: 'h264',
        framerate: 30,
        audioBitrate: 128,
        audioCodec: 'aac',
        sampleRate: 48000,
        channels: 2,
        isExpanded: false
      },
      {
        id: Math.random().toString(36).substring(2, 9),
        name: '480p',
        width: 854,
        height: 480,
        videoBitrate: 1000,
        videoCodec: 'h264',
        framerate: 30,
        audioBitrate: 96,
        audioCodec: 'aac',
        sampleRate: 48000,
        channels: 2,
        isExpanded: false
      }
    ]
  }

  renditionsUI.value = presets
  emitUpdate()
}

// Resolution helpers
function onResolutionChange(rendition: RenditionUI, event: Event) {
  const val = (event.target as HTMLSelectElement).value
  if (val !== 'custom') {
    const [w, h] = val.split('x').map(Number)
    rendition.width = w
    rendition.height = h
  }
  emitUpdate()
}

function getResolutionValue(rendition: RenditionUI): string {
  const resStr = `${rendition.width}x${rendition.height}`
  const presets = ['1920x1080', '1280x720', '854x480', '640x360']
  return presets.includes(resStr) ? resStr : 'custom'
}

// Validation
const validationErrors = computed<ValidationError[]>(() => {
  const errors: ValidationError[] = []

  if (renditionsUI.value.length === 0) {
    errors.push({ index: -1, field: 'general', message: 'At least one rendition is required.' })
    return errors
  }

  const names = new Set<string>()

  renditionsUI.value.forEach((rendition, idx) => {
    const trimmedName = rendition.name.trim()
    if (!trimmedName) {
      errors.push({ index: idx, field: 'name', message: 'Rendition name cannot be empty.' })
    } else if (names.has(trimmedName)) {
      errors.push({ index: idx, field: 'name', message: `Duplicate name: "${trimmedName}".` })
    } else {
      names.add(trimmedName)
    }

    if (rendition.videoBitrate < 100 || rendition.videoBitrate > 20000) {
      errors.push({ index: idx, field: 'videoBitrate', message: 'Video bitrate must be 100-20000 kbps.' })
    }

    if (rendition.audioBitrate < 32 || rendition.audioBitrate > 512) {
      errors.push({ index: idx, field: 'audioBitrate', message: 'Audio bitrate must be 32-512 kbps.' })
    }

    if (rendition.width <= 0) {
      errors.push({ index: idx, field: 'width', message: 'Width must be greater than 0.' })
    }

    if (rendition.height <= 0) {
      errors.push({ index: idx, field: 'height', message: 'Height must be greater than 0.' })
    }
  })

  return errors
})
</script>

<template>
  <div class="space-y-4">
    <!-- Skeleton Loading State -->
    <div v-if="loading" class="space-y-4">
      <div class="flex items-center justify-between border-b border-subtle pb-4">
        <div class="h-6 w-36 bg-muted rounded animate-skeleton"></div>
        <div class="flex space-x-2">
          <div class="h-8 w-24 bg-muted rounded animate-skeleton"></div>
          <div class="h-8 w-28 bg-muted rounded animate-skeleton"></div>
        </div>
      </div>
      <div class="space-y-3">
        <div v-for="i in 3" :key="i" class="border border-subtle bg-card rounded-xl p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3 w-1/2">
              <div class="w-4 h-6 bg-muted rounded animate-skeleton"></div>
              <div class="h-7 bg-muted rounded animate-skeleton w-full"></div>
            </div>
            <div class="flex space-x-2">
              <div class="w-8 h-8 bg-muted rounded animate-skeleton"></div>
              <div class="w-8 h-8 bg-muted rounded animate-skeleton"></div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="h-10 bg-muted rounded animate-skeleton"></div>
            <div class="h-10 bg-muted rounded animate-skeleton"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Editor -->
    <div v-else class="space-y-4">
      <!-- Editor Header -->
      <div class="flex items-center justify-between border-b border-subtle pb-3">
        <div class="flex items-center space-x-2">
          <Layers class="w-4 h-4 text-primary" />
          <span class="text-sm font-semibold text-foreground">ABR Ladder Editor</span>
        </div>
        <div class="flex items-center space-x-2">
          <button
            type="button"
            @click="toggleJsonMode"
            class="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold border rounded-lg transition-colors cursor-pointer select-none"
            :class="isJsonMode ? 'border-primary bg-primary/10 text-primary' : 'border-subtle text-muted-foreground hover:text-foreground hover:bg-muted'"
          >
            <Code class="w-3.5 h-3.5" />
            <span>{{ isJsonMode ? 'Visual Editor' : 'JSON View' }}</span>
          </button>

          <button
            v-if="!isJsonMode"
            type="button"
            @click="addRendition"
            class="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors cursor-pointer select-none"
          >
            <Plus class="w-3.5 h-3.5" />
            <span>Add Rendition</span>
          </button>
        </div>
      </div>

      <!-- Presets Header -->
      <div v-if="!isJsonMode" class="flex flex-wrap gap-2 items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-subtle">
        <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Presets</span>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            @click="applyPreset('low')"
            class="px-2 py-1 text-xs font-medium text-foreground bg-card hover:bg-muted border border-subtle rounded transition-colors cursor-pointer"
          >
            Low (480p)
          </button>
          <button
            type="button"
            @click="applyPreset('medium')"
            class="px-2 py-1 text-xs font-medium text-foreground bg-card hover:bg-muted border border-subtle rounded transition-colors cursor-pointer"
          >
            Medium (720p)
          </button>
          <button
            type="button"
            @click="applyPreset('high')"
            class="px-2 py-1 text-xs font-medium text-foreground bg-card hover:bg-muted border border-subtle rounded transition-colors cursor-pointer"
          >
            High (1080p)
          </button>
          <button
            type="button"
            @click="applyPreset('full-hd')"
            class="px-2 py-1 text-xs font-medium text-foreground bg-card hover:bg-muted border border-subtle rounded transition-colors cursor-pointer"
          >
            Full HD (1080p+720p+480p)
          </button>
        </div>
      </div>

      <!-- Global Validation Warning -->
      <div v-if="validationErrors.some(e => e.index === -1)" class="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger flex items-center space-x-2">
        <AlertCircle class="w-4 h-4 flex-shrink-0" />
        <span>At least one rendition is required.</span>
      </div>

      <!-- JSON mode view -->
      <div v-if="isJsonMode" class="space-y-2">
        <div v-if="jsonError" class="p-3 bg-danger/10 border border-danger/20 rounded-lg text-xs text-danger flex items-center space-x-2">
          <AlertCircle class="w-4 h-4 flex-shrink-0" />
          <span>{{ jsonError }}</span>
        </div>
        <textarea
          v-model="jsonText"
          @input="onJsonInput"
          rows="15"
          class="w-full font-mono text-xs px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground focus:outline-none focus:border-primary/50"
          placeholder="[ ... raw OutputProfile JSON ... ]"
        ></textarea>
      </div>

      <!-- Visual list of renditions -->
      <div v-else class="space-y-3">
        <div
          v-for="(rendition, index) in renditionsUI"
          :key="rendition.id"
          :draggable="activeDragCardId === rendition.id"
          @dragstart="onDragStart(index)"
          @dragover.prevent="onDragOver(index)"
          @dragend="onDragEnd"
          class="flex flex-col border border-subtle bg-card rounded-xl transition-all"
          :class="{ 'opacity-50 border-primary': dragIndex === index }"
        >
          <!-- Rendition Header (Drag handle, Name, Settings, Delete) -->
          <div class="flex items-center justify-between p-3 border-b border-subtle/50 bg-muted/10">
            <div class="flex items-center space-x-3 flex-1 min-w-0 mr-4">
              <!-- Grip Drag Handle -->
              <div
                class="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 select-none"
                @mouseenter="onDragHandleMouseEnter(rendition.id)"
                @mouseleave="onDragHandleMouseLeave"
              >
                <GripVertical class="w-4 h-4" />
              </div>

              <!-- Rendition Name Input -->
              <div class="flex-1 min-w-0">
                <input
                  v-model="rendition.name"
                  @input="emitUpdate"
                  type="text"
                  class="w-full px-2 py-1 bg-muted border border-subtle rounded text-foreground text-sm font-semibold focus:outline-none focus:border-primary/50"
                  placeholder="Rendition suffix (e.g. 1080p)"
                />
                <div v-if="validationErrors.some(e => e.index === index && e.field === 'name')" class="text-xs text-danger mt-1 flex items-center space-x-1">
                  <AlertCircle class="w-3 h-3 flex-shrink-0" />
                  <span>{{ validationErrors.find(e => e.index === index && e.field === 'name')?.message }}</span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center space-x-1">
              <button
                type="button"
                @click="rendition.isExpanded = !rendition.isExpanded"
                class="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                title="Toggle advanced settings"
              >
                <Settings class="w-4 h-4" :class="{ 'text-primary': rendition.isExpanded }" />
              </button>

              <button
                type="button"
                @click="removeRendition(index)"
                :disabled="renditionsUI.length <= 1"
                class="p-1.5 text-muted-foreground hover:text-danger hover:bg-muted rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                title="Remove rendition"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Rendition Settings Body -->
          <div class="p-4 space-y-4">
            <!-- Resolution and Bitrate -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Resolution Selector -->
              <div class="space-y-1.5">
                <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resolution</label>
                <div class="flex items-center space-x-2">
                  <select
                    :value="getResolutionValue(rendition)"
                    @change="onResolutionChange(rendition, $event)"
                    class="px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 flex-1 cursor-pointer"
                  >
                    <option value="1920x1080">1920x1080 (1080p)</option>
                    <option value="1280x720">1280x720 (720p)</option>
                    <option value="854x480">854x480 (480p)</option>
                    <option value="640x360">640x360 (360p)</option>
                    <option value="custom">Custom</option>
                  </select>

                  <!-- Custom Dimension Inputs -->
                  <div v-if="getResolutionValue(rendition) === 'custom'" class="flex items-center space-x-1 w-44">
                    <input
                      v-model.number="rendition.width"
                      @input="emitUpdate"
                      type="number"
                      placeholder="W"
                      class="w-20 text-center px-2 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
                    />
                    <span class="text-muted-foreground text-xs font-bold">x</span>
                    <input
                      v-model.number="rendition.height"
                      @input="emitUpdate"
                      type="number"
                      placeholder="H"
                      class="w-20 text-center px-2 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
                <div v-if="validationErrors.some(e => e.index === index && (e.field === 'width' || e.field === 'height'))" class="text-xs text-danger flex items-center space-x-1 mt-1">
                  <AlertCircle class="w-3 h-3 flex-shrink-0" />
                  <span>Width/Height must be greater than 0.</span>
                </div>
              </div>

              <!-- Video Bitrate -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Video Bitrate</label>
                  <div class="flex items-center space-x-1">
                    <input
                      v-model.number="rendition.videoBitrate"
                      @input="emitUpdate"
                      type="number"
                      min="100"
                      max="20000"
                      class="w-20 px-2 py-1 text-right bg-muted border border-subtle rounded-lg text-foreground text-xs focus:outline-none focus:border-primary/50"
                    />
                    <span class="text-[10px] text-muted-foreground font-semibold">kbps</span>
                  </div>
                </div>
                <div class="flex items-center space-x-3 pt-1">
                  <input
                    v-model.number="rendition.videoBitrate"
                    @input="emitUpdate"
                    type="range"
                    min="100"
                    max="20000"
                    step="100"
                    class="flex-1 accent-primary h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <div v-if="validationErrors.some(e => e.index === index && e.field === 'videoBitrate')" class="text-xs text-danger flex items-center space-x-1 mt-1">
                  <AlertCircle class="w-3 h-3 flex-shrink-0" />
                  <span>{{ validationErrors.find(e => e.index === index && e.field === 'videoBitrate')?.message }}</span>
                </div>
              </div>
            </div>

            <!-- Collapsible Advanced Settings -->
            <div v-show="rendition.isExpanded" class="pt-4 border-t border-subtle/40 space-y-4">
              <!-- Video Advanced -->
              <div class="space-y-2">
                <div class="flex items-center space-x-1.5 text-xs font-bold text-foreground uppercase tracking-wider bg-muted/30 py-1 px-2 rounded">
                  <Video class="w-3.5 h-3.5 text-primary" />
                  <span>Video Settings</span>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-muted-foreground mb-1">Video Codec</label>
                    <select
                      v-model="rendition.videoCodec"
                      @change="emitUpdate"
                      class="w-full px-2.5 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option value="h264">H.264 (AVC)</option>
                      <option value="h265">H.265 (HEVC)</option>
                      <option value="vp9">VP9</option>
                      <option value="av1">AV1</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-muted-foreground mb-1">Framerate</label>
                    <select
                      v-model.number="rendition.framerate"
                      @change="emitUpdate"
                      class="w-full px-2.5 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option :value="24">24 fps</option>
                      <option :value="25">25 fps</option>
                      <option :value="30">30 fps</option>
                      <option :value="60">60 fps</option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Audio Advanced -->
              <div class="space-y-2">
                <div class="flex items-center space-x-1.5 text-xs font-bold text-foreground uppercase tracking-wider bg-muted/30 py-1 px-2 rounded">
                  <Music class="w-3.5 h-3.5 text-success" />
                  <span>Audio Settings</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs text-muted-foreground mb-1">Audio Codec</label>
                    <select
                      v-model="rendition.audioCodec"
                      @change="emitUpdate"
                      class="w-full px-2.5 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option value="aac">AAC</option>
                      <option value="mp3">MP3</option>
                      <option value="opus">Opus</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-muted-foreground mb-1">Audio Bitrate</label>
                    <div class="flex items-center space-x-1">
                      <input
                        v-model.number="rendition.audioBitrate"
                        @input="emitUpdate"
                        type="number"
                        min="32"
                        max="512"
                        class="w-full px-2.5 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50"
                      />
                      <span class="text-[10px] text-muted-foreground font-semibold">kbps</span>
                    </div>
                    <div v-if="validationErrors.some(e => e.index === index && e.field === 'audioBitrate')" class="text-xs text-danger mt-1 flex items-center space-x-1">
                      <AlertCircle class="w-3 h-3 flex-shrink-0" />
                      <span>32 to 512 kbps.</span>
                    </div>
                  </div>
                  <div>
                    <label class="block text-xs text-muted-foreground mb-1">Sample Rate</label>
                    <select
                      v-model.number="rendition.sampleRate"
                      @change="emitUpdate"
                      class="w-full px-2.5 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
                    >
                      <option :value="44100">44,100 Hz</option>
                      <option :value="48000">48,000 Hz</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
