<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import Sidebar from '@/components/Sidebar.vue'
import Header from '@/components/Header.vue'
import { useOmeStatus } from '@/composables/useOmeStatus'
import { theme } from '@/composables/useOmeConfig'

const isSidebarOpen = ref(false)
const { connected } = useOmeStatus(10000)
const activeRoute = ref('')

onMounted(() => {
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  theme.value = savedTheme || 'light'
  
  if (theme.value === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})

const handleToggleTheme = () => {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('theme', theme.value)
  if (theme.value === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

provide('theme', theme)
provide('handleToggleTheme', handleToggleTheme)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}
</script>

<template>
  <div class="flex h-screen bg-background text-foreground overflow-hidden transition-colors duration-200">
    <!-- Sidebar component -->
    <Sidebar
      v-model="activeRoute"
      :is-open="isSidebarOpen"
      @close="isSidebarOpen = false"
    />

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Header component -->
      <Header
        :theme="theme"
        :connected="connected"
        @toggle-sidebar="toggleSidebar"
        @toggle-theme="handleToggleTheme"
      />

      <!-- Main view container with fade transitions -->
      <main class="flex-1 overflow-auto p-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>
