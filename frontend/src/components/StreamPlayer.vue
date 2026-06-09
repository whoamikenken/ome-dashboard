<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Info,
  Loader2,
  AlertCircle,
  RefreshCw,
  PictureInPicture2,
  Radio,
} from 'lucide-vue-next'
import { useStreamPlayer } from '@/composables/useStreamPlayer'

const props = defineProps<{
  vhost: string
  app: string
  streamName: string
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const selectedProtocol = ref<'webrtc' | 'hls' | 'llhls'>('llhls')
const showInfo = ref(false)
const videoContainerRef = ref<HTMLDivElement | null>(null)

const {
  isPlaying,
  isFullscreen,
  isPiP,
  isBuffering,
  volume,
  isMuted,
  currentTime,
  duration,
  error,
  streamInfo,
  videoElement,
  play,
  pause,
  stop,
  toggleFullscreen,
  togglePiP,
  setVolume,
  toggleMute,
  seek,
  generateStreamUrl,
} = useStreamPlayer()

// When the player is active and any prop or selection changes, trigger load/play
watch(
  [() => props.show, () => props.vhost, () => props.app, () => props.streamName, selectedProtocol],
  ([show, vhost, app, stream]) => {
    if (show && stream) {
      const url = generateStreamUrl(vhost, app, stream, selectedProtocol.value)
      play(url)
    } else {
      stop()
    }
  },
  { immediate: true }
)

// Watch for videoElement and container to attach them
watch(
  [videoElement, videoContainerRef],
  ([newVideo, container]) => {
    if (container) {
      container.innerHTML = ''
      if (newVideo) {
        container.appendChild(newVideo)
      }
    }
  },
  { immediate: true }
)

function handleClose() {
  stop()
  emit('close')
}

function handlePlayPause() {
  if (isPlaying.value) {
    pause()
  } else if (streamInfo.value) {
    play(streamInfo.value.url)
  }
}

function handleMuteToggle() {
  toggleMute()
}

function handleVolumeInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  setVolume(parseFloat(val))
}

function handleSeek(e: Event) {
  const val = (e.target as HTMLInputElement).value
  seek(parseFloat(val))
}

function handleRetry() {
  if (streamInfo.value) {
    play(streamInfo.value.url)
  }
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === Infinity) return '00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const parts = [m.toString().padStart(2, '0'), s.toString().padStart(2, '0')]
  if (h > 0) {
    parts.unshift(h.toString().padStart(2, '0'))
  }
  return parts.join(':')
}

function formatBitrate(bps: number | null): string {
  if (bps === null) return 'N/A'
  if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`
  return `${(bps / 1000).toFixed(0)} Kbps`
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
  >
    <div
      class="relative flex flex-col w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/40">
        <div class="flex items-center space-x-3">
          <span class="flex h-2.5 w-2.5 relative">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
          </span>
          <h3 class="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
            <Radio class="w-4 h-4 text-primary" />
            <span>{{ vhost }} / {{ app }} / {{ streamName }}</span>
          </h3>
        </div>
        <div class="flex items-center space-x-3">
          <!-- Protocol Dropdown -->
          <div class="flex items-center space-x-1.5">
            <span class="text-xs text-slate-400">Protocol:</span>
            <select
              v-model="selectedProtocol"
              class="bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary hover:bg-slate-700 transition-all cursor-pointer"
            >
              <option value="webrtc">WebRTC</option>
              <option value="hls">HLS</option>
              <option value="llhls">LLHLS</option>
            </select>
          </div>
          <!-- Close Button -->
          <button
            @click="handleClose"
            class="text-slate-400 hover:text-white hover:bg-slate-800/60 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Close player"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Player & Video Area -->
      <div class="relative w-full aspect-video bg-black flex items-center justify-center group overflow-hidden">
        <!-- Video Container -->
        <div ref="videoContainerRef" class="w-full h-full flex items-center justify-center"></div>

        <!-- Buffer Spinner -->
        <div
          v-if="isBuffering && !error"
          class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] transition-all"
        >
          <Loader2 class="w-12 h-12 text-primary animate-spin" />
        </div>

        <!-- Error Screen -->
        <div
          v-if="error"
          class="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-center px-6"
        >
          <AlertCircle class="w-16 h-16 text-danger mb-4 animate-bounce" />
          <h4 class="text-base font-bold text-slate-100 mb-1">Playback Failed</h4>
          <p class="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">{{ error }}</p>
          <button
            @click="handleRetry"
            class="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center space-x-1.5 shadow-lg shadow-primary/20 cursor-pointer"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>

        <!-- Stream Info Overlay -->
        <transition name="fade">
          <div
            v-if="showInfo && streamInfo"
            class="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-xl p-4 text-xs space-y-2.5 text-slate-300 w-60 shadow-xl"
          >
            <div class="flex justify-between items-center border-b border-white/10 pb-1.5">
              <span class="font-bold text-slate-100 flex items-center gap-1">
                <Info class="w-3.5 h-3.5 text-primary" />
                <span>Stream Diagnostics</span>
              </span>
              <span class="px-1.5 py-0.5 bg-primary/20 text-primary rounded text-[10px] font-semibold uppercase">
                {{ streamInfo.protocol }}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-y-1.5 gap-x-2">
              <span class="text-slate-500">Resolution:</span>
              <span class="text-slate-200 font-semibold font-mono text-right">
                {{ streamInfo.resolution || 'Detecting...' }}
              </span>
              
              <span class="text-slate-500">Bitrate:</span>
              <span class="text-slate-200 font-semibold font-mono text-right">
                {{ formatBitrate(streamInfo.bitrate) }}
              </span>

              <span class="text-slate-500">Codec:</span>
              <span class="text-slate-200 font-semibold font-mono text-right uppercase">
                {{ streamInfo.codec || 'N/A' }}
              </span>
            </div>
          </div>
        </transition>

        <!-- Bottom Custom Controls Bar -->
        <div
          class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-10 pb-4 px-6 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-auto"
        >
          <!-- Progress timeline (Only for HLS/LLHLS) -->
          <div v-if="streamInfo?.protocol !== 'WebRTC'" class="flex items-center space-x-3 w-full">
            <span class="text-[10px] font-mono text-white/80 select-none">{{ formatTime(currentTime) }}</span>
            <input
              type="range"
              min="0"
              :max="duration || 100"
              step="0.05"
              :value="currentTime"
              @input="handleSeek"
              class="flex-grow h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary hover:bg-white/30 transition-all focus:outline-none"
            />
            <span class="text-[10px] font-mono text-white/80 select-none">{{ formatTime(duration) }}</span>
          </div>

          <!-- Bottom Control Buttons Row -->
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center space-x-4">
              <!-- Play / Pause -->
              <button
                @click="handlePlayPause"
                class="text-white hover:text-primary transition-colors p-1 rounded hover:bg-white/5 cursor-pointer"
                :title="isPlaying ? 'Pause' : 'Play'"
              >
                <Pause v-if="isPlaying" class="w-5 h-5 fill-current" />
                <Play v-else class="w-5 h-5 fill-current" />
              </button>

              <!-- Mute & Volume -->
              <div class="flex items-center space-x-2 group/volume">
                <button
                  @click="handleMuteToggle"
                  class="text-white hover:text-primary transition-colors p-1 rounded hover:bg-white/5 cursor-pointer"
                  :title="isMuted ? 'Unmute' : 'Mute'"
                >
                  <VolumeX v-if="isMuted || volume === 0" class="w-5 h-5" />
                  <Volume2 v-else class="w-5 h-5" />
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  :value="isMuted ? 0 : volume"
                  @input="handleVolumeInput"
                  class="w-16 md:w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary hover:bg-white/30 transition-all focus:outline-none"
                />
              </div>

              <!-- Live Indicator for WebRTC -->
              <div v-if="streamInfo?.protocol === 'WebRTC'" class="flex items-center space-x-2 pl-2">
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span class="text-[10px] font-bold text-red-500 uppercase tracking-widest select-none">Live WebRTC</span>
              </div>
            </div>

            <!-- Right Controls -->
            <div class="flex items-center space-x-3">
              <!-- Info Toggle -->
              <button
                @click="showInfo = !showInfo"
                class="text-white transition-colors p-1 rounded hover:bg-white/5 cursor-pointer"
                :class="showInfo ? 'text-primary' : 'hover:text-primary'"
                title="Stream details"
              >
                <Info class="w-5 h-5" />
              </button>

              <!-- Picture in Picture -->
              <button
                @click="togglePiP"
                class="transition-colors p-1 rounded hover:bg-white/5 cursor-pointer"
                :class="isPiP ? 'text-primary' : 'text-white hover:text-primary'"
                title="Picture-in-Picture"
              >
                <PictureInPicture2 class="w-5 h-5" />
              </button>

              <!-- Fullscreen -->
              <button
                @click="toggleFullscreen"
                class="text-white hover:text-primary transition-colors p-1 rounded hover:bg-white/5 cursor-pointer"
                title="Fullscreen"
              >
                <Minimize v-if="isFullscreen" class="w-5 h-5" />
                <Maximize v-else class="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer URL Display -->
      <div class="px-6 py-4 bg-slate-950/20 border-t border-slate-800/80">
        <div class="flex items-center space-x-3 bg-slate-950/50 border border-slate-800/80 rounded-xl px-4 py-2 text-xs font-mono text-slate-400 select-all overflow-x-auto">
          <span class="text-slate-500 select-none uppercase font-bold tracking-wider">Stream Url:</span>
          <span class="whitespace-nowrap flex-grow">{{ streamInfo?.url || 'Generating stream URL...' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="range"] {
  outline: none;
}
input[type="range"]::-webkit-slider-runnable-track {
  height: 4px;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-primary, #6366f1);
  cursor: pointer;
  margin-top: -4px;
  transition: transform 0.1s ease;
}
input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}

input[type="range"]::-moz-range-track {
  height: 4px;
}
input[type="range"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: none;
  border-radius: 50%;
  background: var(--color-primary, #6366f1);
  cursor: pointer;
  transition: transform 0.1s ease;
}
input[type="range"]::-moz-range-thumb:hover {
  transform: scale(1.3);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
