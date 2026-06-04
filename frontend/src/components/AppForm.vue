<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/50" @click="emit('close')"></div>

        <!-- Modal content -->
        <div class="bg-card rounded-2xl border border-subtle shadow-2xl w-full max-w-lg z-10 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-foreground">Create Application</h2>
            <button @click="emit('close')" class="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors">
              <X class="w-5 h-5" />
            </button>
          </div>

          <p class="text-sm text-muted-foreground mb-4">
            Virtual Host: <span class="font-semibold text-foreground">{{ vhostName }}</span>
          </p>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div v-if="formError" class="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">
              {{ formError }}
            </div>

            <div>
              <label class="block text-sm font-medium text-foreground mb-1">Name *</label>
              <input v-model="form.name" placeholder="e.g. app" class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50" />
            </div>

            <div>
              <label class="block text-sm font-medium text-foreground mb-1">Type</label>
              <select v-model="form.type" class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50">
                <option value="live">Live</option>
                <option value="vod">VOD</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-foreground mb-2">Providers</label>
              <div class="grid grid-cols-2 gap-2">
                <div v-for="p in providerOptions" :key="p.id" @click="toggleProvider(p.id)" class="flex items-center space-x-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors" :class="form.enabledProviders.includes(p.id) ? 'border-primary/50 bg-primary/5 text-primary' : 'border-subtle text-muted-foreground hover:border-primary/30'">
                  <div class="w-4 h-4 rounded border flex items-center justify-center animate-none" :class="form.enabledProviders.includes(p.id) ? 'border-primary bg-primary' : 'border-muted-foreground'">
                    <span v-if="form.enabledProviders.includes(p.id)" class="text-white text-[10px] leading-none select-none">✓</span>
                  </div>
                  <span class="text-sm font-medium">{{ p.label }}</span>
                </div>
              </div>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button type="button" @click="emit('close')" class="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors">Cancel</button>
              <button type="submit" :disabled="isSubmitting" class="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors disabled:opacity-50">
                {{ isSubmitting ? 'Creating...' : 'Create Application' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { createApp } from '@/api/apps'
import { X } from 'lucide-vue-next'

const props = defineProps<{ show: boolean; vhostName: string }>()
const emit = defineEmits<{ (e: 'close'): void; (e: 'created'): void }>()

const form = ref({
  name: '',
  type: 'live',
  providers: {
    rtmp: { blockDuplicateStreamName: false, passthroughOutputProfile: false },
    srt: { blockDuplicateStreamName: false },
    webrtc: { timeout: 0 },
    rtspPull: { blockDuplicateStreamName: false },
    file: { rootPath: '', streamMap: { stream: [{ name: '', port: '' }] } },
  } as Record<string, any>,
  enabledProviders: ['rtmp'] as string[],
})

const isSubmitting = ref(false)
const formError = ref<string | null>(null)

const providerOptions = [
  { id: 'rtmp', label: 'RTMP' },
  { id: 'srt', label: 'SRT' },
  { id: 'webrtc', label: 'WebRTC' },
  { id: 'rtspPull', label: 'RTSP Pull' },
  { id: 'file', label: 'File' },
  { id: 'mpegts', label: 'MPEG-TS' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'multiplex', label: 'Multiplex' },
]

function toggleProvider(id: string) {
  const idx = form.value.enabledProviders.indexOf(id)
  if (idx >= 0) {
    form.value.enabledProviders.splice(idx, 1)
  } else {
    form.value.enabledProviders.push(id)
  }
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    formError.value = 'Application name is required'
    return
  }

  isSubmitting.value = true
  formError.value = null

  // Build providers payload with only enabled providers
  const providers: Record<string, any> = {}
  for (const id of form.value.enabledProviders) {
    providers[id] = form.value.providers[id] || {}
  }

  const payload = {
    name: form.value.name,
    type: form.value.type,
    providers,
    publishers: {},
  }

  try {
    await createApp(props.vhostName, payload)
    emit('created')
    resetForm()
  } catch (err: any) {
    formError.value = err.response?.data?.message || err.message || 'Failed to create application'
  } finally {
    isSubmitting.value = false
  }
}

function resetForm() {
  form.value = {
    name: '',
    type: 'live',
    providers: {
      rtmp: { blockDuplicateStreamName: false, passthroughOutputProfile: false },
      srt: { blockDuplicateStreamName: false },
      webrtc: { timeout: 0 },
      rtspPull: { blockDuplicateStreamName: false },
      file: { rootPath: '', streamMap: { stream: [{ name: '', port: '' }] } },
    },
    enabledProviders: ['rtmp'],
  }
  formError.value = null
}
</script>
