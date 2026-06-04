<script setup lang="ts">
import { ref, inject, type Ref } from 'vue'
import {
  config,
  testConnection,
  saveConfig,
  isTesting,
  testResult
} from '@/composables/useOmeConfig'
import {
  Sun,
  Moon,
  Info,
  ExternalLink,
  Loader2,
  CheckCircle2,
  XCircle,
  Save,
  Settings
} from 'lucide-vue-next'

// Inject theme and handleToggleTheme from DashboardLayout (with fallback)
const theme = inject<Ref<'light' | 'dark'>>('theme') || ref('light')
const handleToggleTheme = inject<() => void>('handleToggleTheme') || (() => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  if (theme.value === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})

// Local states for success indicators
const showSavedAlert = ref(false)

const handleSaveSettings = () => {
  saveConfig()
  showSavedAlert.value = true
  setTimeout(() => {
    showSavedAlert.value = false
  }, 3000)
}

const handleTestConnection = async () => {
  await testConnection()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-foreground">Settings</h1>
        <p class="text-sm text-muted-foreground mt-1">Configure your OvenMediaEngine REST API connection and dashboard preferences</p>
      </div>
    </div>

    <!-- Centered Form Container -->
    <div class="max-w-2xl mx-auto space-y-6">
      
      <!-- OME Connection Settings Card -->
      <div class="bg-card text-card-foreground rounded-xl border border-subtle p-6 shadow-sm">
        <div class="flex items-center space-x-3 mb-6">
          <Settings class="w-5 h-5 text-primary" />
          <h2 class="text-xl font-bold text-foreground">OME Connection Settings</h2>
        </div>

        <form @submit.prevent="handleSaveSettings" class="space-y-4">
          <!-- Host & Port inputs -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="sm:col-span-2">
              <label for="host" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                API Host
              </label>
              <input
                id="host"
                v-model="config.host"
                type="text"
                placeholder="192.168.88.202"
                required
                class="w-full px-3 py-2 border border-subtle rounded-md bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
              />
            </div>
            <div>
              <label for="port" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                API Port
              </label>
              <input
                id="port"
                v-model.number="config.port"
                type="number"
                placeholder="8081"
                required
                class="w-full px-3 py-2 border border-subtle rounded-md bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
              />
            </div>
          </div>

          <!-- TLS Checkbox -->
          <div class="flex items-center space-x-2">
            <input
              id="useTls"
              v-model="config.useTls"
              type="checkbox"
              class="rounded border-subtle bg-background text-primary focus:ring-primary/40 focus:ring-2 h-4 w-4 cursor-pointer"
            />
            <label for="useTls" class="text-sm font-medium text-foreground cursor-pointer select-none">
              Use TLS (HTTPS)
            </label>
          </div>

          <!-- Username & Password -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="username" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                API Username
              </label>
              <input
                id="username"
                v-model="config.username"
                type="text"
                placeholder="admin"
                class="w-full px-3 py-2 border border-subtle rounded-md bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
              />
            </div>
            <div>
              <label for="password" class="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                API Password
              </label>
              <input
                id="password"
                v-model="config.password"
                type="password"
                placeholder="password"
                class="w-full px-3 py-2 border border-subtle rounded-md bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-150"
              />
            </div>
          </div>

          <!-- Test Connection result banner -->
          <div v-if="testResult" class="mt-4">
            <div
              v-if="testResult.success"
              class="flex items-center space-x-2 p-3 bg-success/10 border border-success/20 text-success rounded-lg text-sm font-medium"
            >
              <CheckCircle2 class="w-5 h-5 flex-shrink-0" />
              <span>Connected</span>
            </div>
            <div
              v-else
              class="flex items-start space-x-2 p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm font-medium"
            >
              <XCircle class="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div class="flex-1">
                <p class="font-semibold">Connection failed</p>
                <p class="text-xs opacity-90 mt-0.5">{{ testResult.message }}</p>
              </div>
            </div>
          </div>

          <!-- Settings Saved alert -->
          <div v-if="showSavedAlert" class="mt-4">
            <div class="flex items-center space-x-2 p-3 bg-success/10 border border-success/20 text-success rounded-lg text-sm font-medium">
              <CheckCircle2 class="w-5 h-5 flex-shrink-0" />
              <span>Settings saved successfully!</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-subtle pt-6 mt-6">
            <button
              type="button"
              :disabled="isTesting"
              @click="handleTestConnection"
              class="px-4 py-2 border border-subtle hover:bg-muted text-foreground font-medium rounded-md shadow-sm transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Loader2 v-if="isTesting" class="w-4 h-4 animate-spin text-muted-foreground" />
              <span>Test Connection</span>
            </button>
            
            <button
              type="submit"
              class="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-md shadow-sm transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Save class="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Theme Preference Card -->
      <div class="bg-card text-card-foreground rounded-xl border border-subtle p-6 shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold text-foreground">Theme Settings</h2>
            <p class="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <span>Current theme:</span>
              <span class="font-medium capitalize inline-flex items-center gap-1">
                <Sun v-if="theme === 'light'" class="w-4 h-4 text-warning" />
                <Moon v-else class="w-4 h-4 text-primary" />
                {{ theme }}
              </span>
            </p>
          </div>
          
          <button
            type="button"
            @click="handleToggleTheme"
            class="px-4 py-2 border border-subtle hover:bg-muted font-medium rounded-md shadow-sm transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Sun v-slot:default v-if="theme === 'dark'" class="w-4 h-4" />
            <Moon v-else class="w-4 h-4" />
            <span>Switch to {{ theme === 'light' ? 'Dark' : 'Light' }}</span>
          </button>
        </div>
      </div>

      <!-- About Card -->
      <div class="bg-card text-card-foreground rounded-xl border border-subtle p-6 shadow-sm">
        <div class="flex items-start space-x-3 mb-4">
          <Info class="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h2 class="text-xl font-bold text-foreground">About</h2>
            <p class="text-sm text-muted-foreground">Information about the application and stack</p>
          </div>
        </div>
        
        <div class="space-y-3 mt-4 text-sm">
          <div class="flex justify-between border-b border-subtle/50 pb-2">
            <span class="text-muted-foreground">App Name</span>
            <span class="font-semibold text-foreground">OME Dashboard</span>
          </div>
          <div class="flex justify-between border-b border-subtle/50 pb-2">
            <span class="text-muted-foreground">Version</span>
            <span class="font-mono font-semibold text-foreground">1.0.0</span>
          </div>
          <div class="flex justify-between border-b border-subtle/50 pb-2">
            <span class="text-muted-foreground">Stack</span>
            <span class="font-semibold text-foreground text-right">Vue 3 + Vite 6 + TypeScript + Tailwind CSS 4</span>
          </div>
          <div class="flex justify-between pt-1">
            <span class="text-muted-foreground">API Reference</span>
            <a
              href="https://ovenmedialabs.com/docs/ome/rest-api"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline flex items-center space-x-1 font-medium transition-colors duration-150"
            >
              <span>OvenMediaEngine REST API Docs</span>
              <ExternalLink class="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
