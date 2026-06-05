<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { usePublishAuth } from '@/composables/usePublishAuth'
import type { PublishToken } from '@/types/auth'
import {
  X,
  Key,
  Copy,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-vue-next'

const props = defineProps<{
  show: boolean
  vhosts: string[]
  apps: string[]
  vhost: string
  app: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', token: PublishToken): void
  (e: 'vhost-change', vhost: string): void
}>()

const { generateToken, copyToClipboard, isLoading, error } = usePublishAuth()

// Form State
const form = reactive({
  name: '',
  vhost: '',
  app: '',
  streamName: '',
  neverExpire: true,
  expiresInDays: 30
})

// UI State
const generatedToken = ref<PublishToken | null>(null)
const copied = ref(false)

// Reset form to defaults
function resetForm() {
  form.name = ''
  form.vhost = props.vhost || props.vhosts[0] || ''
  form.app = props.app || props.apps[0] || ''
  form.streamName = ''
  form.neverExpire = true
  form.expiresInDays = 30
  generatedToken.value = null
  copied.value = false
}

// Watch for modal visibility changes
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      resetForm()
      // Emit initial vhost change to make sure apps are loaded if needed
      if (form.vhost) {
        emit('vhost-change', form.vhost)
      }
    }
  },
  { immediate: true }
)

// Watch props.vhost and props.app to update local selection
watch(
  () => props.vhost,
  (newVal) => {
    if (newVal && !form.vhost) {
      form.vhost = newVal
    }
  }
)

watch(
  () => props.app,
  (newVal) => {
    if (newVal && !form.app) {
      form.app = newVal
    }
  }
)

// Watch vhost dropdown changes to trigger app reload in parent
function handleVHostChange() {
  form.app = ''
  emit('vhost-change', form.vhost)
}

// Watch apps prop to auto-select the first app when the list updates
watch(
  () => props.apps,
  (newApps) => {
    if (newApps.length > 0 && (!form.app || !newApps.includes(form.app))) {
      form.app = newApps[0]
    }
  }
)

// Expiry Presets
const presets = [1, 7, 30, 90, 365]

function setPreset(days: number) {
  form.neverExpire = false
  form.expiresInDays = days
}

// Submit Form
async function handleSubmit() {
  if (!form.name.trim() || !form.vhost || !form.app) return

  try {
    const token = await generateToken({
      name: form.name,
      vhost: form.vhost,
      app: form.app,
      streamName: form.streamName,
      expiresInDays: form.neverExpire ? null : form.expiresInDays
    })
    generatedToken.value = token
    emit('created', token)
  } catch (err) {
    // Error is handled by usePublishAuth error ref
  }
}

// Copy raw token
async function handleCopy() {
  if (!generatedToken.value) return
  try {
    await copyToClipboard(generatedToken.value.token)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (err) {
    // Handled internally
  }
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      @click.self="handleClose"
    >
      <div
        class="bg-card border border-subtle rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-subtle bg-muted/30">
          <h2 class="text-lg font-bold text-foreground flex items-center space-x-2">
            <Key class="w-5 h-5 text-primary" />
            <span>{{ generatedToken ? 'Token Details' : 'Generate Publish Token' }}</span>
          </h2>
          <button
            @click="handleClose"
            class="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Success/Token Display State -->
        <div v-if="generatedToken" class="p-6 space-y-6">
          <div class="flex flex-col items-center text-center space-y-3">
            <div class="w-12 h-12 rounded-full bg-success/10 text-success flex items-center justify-center animate-bounce">
              <ShieldCheck class="w-6 h-6" />
            </div>
            <h3 class="text-lg font-bold text-foreground">Token Generated Successfully</h3>
            <p class="text-sm text-muted-foreground max-w-md">
              Please copy the token now. For security reasons, it cannot be displayed again after closing this window.
            </p>
          </div>

          <!-- Token Box -->
          <div class="bg-muted p-4 rounded-xl border border-subtle space-y-3">
            <div class="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              <span>Publish Token</span>
              <span v-if="copied" class="text-success font-medium flex items-center space-x-1">
                <span>Copied!</span>
              </span>
            </div>
            <div class="flex items-center space-x-3 bg-card p-3 rounded-lg border border-subtle">
              <code class="text-sm font-mono text-primary select-all break-all flex-1">{{ generatedToken.token }}</code>
              <button
                @click="handleCopy"
                class="p-2 bg-muted hover:bg-muted/80 hover:text-foreground text-muted-foreground rounded-lg transition-colors cursor-pointer border border-subtle flex-shrink-0"
                title="Copy Token"
              >
                <Copy class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Details Summary -->
          <div class="grid grid-cols-2 gap-4 text-sm bg-muted/40 p-4 rounded-xl border border-subtle">
            <div>
              <span class="text-xs text-muted-foreground block">Name</span>
              <span class="font-semibold text-foreground">{{ generatedToken.name }}</span>
            </div>
            <div>
              <span class="text-xs text-muted-foreground block">Virtual Host</span>
              <span class="font-semibold text-foreground">{{ generatedToken.vhost }}</span>
            </div>
            <div>
              <span class="text-xs text-muted-foreground block">Application</span>
              <span class="font-semibold text-foreground">{{ generatedToken.app }}</span>
            </div>
            <div>
              <span class="text-xs text-muted-foreground block">Stream Scope</span>
              <span class="font-semibold text-foreground">{{ generatedToken.streamName || 'All Streams (App-wide)' }}</span>
            </div>
            <div class="col-span-2">
              <span class="text-xs text-muted-foreground block">Expires</span>
              <span class="font-semibold text-foreground">
                {{ generatedToken.expiresAt ? new Date(generatedToken.expiresAt).toLocaleString() : 'Never' }}
              </span>
            </div>
          </div>

          <!-- Close Button -->
          <div class="flex justify-end pt-2">
            <button
              @click="handleClose"
              class="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer w-full sm:w-auto text-center"
            >
              Done
            </button>
          </div>
        </div>

        <!-- Form Input State -->
        <form v-else @submit.prevent="handleSubmit" class="p-6 space-y-5">
          <!-- Error banner -->
          <div v-if="error" class="p-3 bg-danger/10 border border-danger/20 rounded-xl flex items-center space-x-2 text-danger">
            <AlertCircle class="w-4 h-4 flex-shrink-0" />
            <span class="text-xs font-medium">{{ error }}</span>
          </div>

          <!-- Token Name -->
          <div class="space-y-1.5">
            <label for="tokenName" class="text-sm font-semibold text-foreground">Token Name *</label>
            <input
              id="tokenName"
              v-model="form.name"
              type="text"
              required
              placeholder="e.g. OBS Publisher Session"
              class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <!-- VHost and App Dropdowns -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label for="tokenVHost" class="text-sm font-semibold text-foreground">Virtual Host *</label>
              <select
                id="tokenVHost"
                v-model="form.vhost"
                @change="handleVHostChange"
                required
                class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
              >
                <option v-for="v in vhosts" :key="v" :value="v">{{ v }}</option>
              </select>
            </div>

            <div class="space-y-1.5">
              <label for="tokenApp" class="text-sm font-semibold text-foreground">Application *</label>
              <select
                id="tokenApp"
                v-model="form.app"
                required
                class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors cursor-pointer"
              >
                <option v-if="apps.length === 0" value="">No apps available</option>
                <option v-for="a in apps" :key="a" :value="a">{{ a }}</option>
              </select>
            </div>
          </div>

          <!-- Stream Name -->
          <div class="space-y-1.5">
            <label for="tokenStream" class="text-sm font-semibold text-foreground">
              Stream Name <span class="text-xs text-muted-foreground font-normal">(Optional)</span>
            </label>
            <input
              id="tokenStream"
              v-model="form.streamName"
              type="text"
              placeholder="e.g. live-stream-1 (leave blank for app-wide access)"
              class="w-full px-3 py-2 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <!-- Expiry Settings -->
          <div class="space-y-3 bg-muted/40 p-4 rounded-xl border border-subtle">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2 text-sm font-semibold text-foreground">
                <Clock class="w-4 h-4 text-muted-foreground" />
                <span>Token Expiration</span>
              </div>
              <label class="inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  v-model="form.neverExpire"
                  class="sr-only peer"
                />
                <span class="text-xs font-semibold mr-2" :class="form.neverExpire ? 'text-primary' : 'text-muted-foreground'">
                  Never Expire
                </span>
                <span class="relative w-9 h-5 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></span>
              </label>
            </div>

            <!-- Custom Days & Presets -->
            <div v-if="!form.neverExpire" class="space-y-3 pt-2 border-t border-subtle/50 animate-in slide-in-from-top-1 duration-200">
              <div class="flex items-center space-x-3">
                <input
                  v-model.number="form.expiresInDays"
                  type="number"
                  min="1"
                  max="3650"
                  class="w-24 px-3 py-1.5 bg-muted border border-subtle rounded-lg text-foreground text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
                <span class="text-sm text-muted-foreground">Days</span>
              </div>

              <!-- Presets -->
              <div class="flex flex-wrap gap-2 pt-1">
                <button
                  v-for="days in presets"
                  :key="days"
                  type="button"
                  @click="setPreset(days)"
                  class="px-2.5 py-1 text-xs border rounded-lg transition-colors cursor-pointer font-medium"
                  :class="form.expiresInDays === days
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted border-subtle text-muted-foreground hover:bg-muted/80 hover:text-foreground'"
                >
                  {{ days }} {{ days === 1 ? 'day' : 'days' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex items-center justify-end space-x-3 pt-3 border-t border-subtle">
            <button
              type="button"
              @click="handleClose"
              :disabled="isLoading"
              class="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground border border-subtle rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="isLoading || !form.name.trim() || !form.vhost || !form.app || (!form.neverExpire && !form.expiresInDays)"
              class="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center space-x-1.5 shadow-sm"
            >
              <Loader2 v-if="isLoading" class="w-4 h-4 animate-spin" />
              <span>{{ isLoading ? 'Generating...' : 'Generate Token' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
