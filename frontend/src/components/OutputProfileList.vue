<script setup lang="ts">
interface EncodeItem {
  name?: string
  codec?: string
  [key: string]: any
}

interface LocalOutputProfile {
  name: string
  outputStreamName: string
  encodes?: EncodeItem[]
}

defineProps<{
  profiles: LocalOutputProfile[]
}>()
</script>

<template>
  <div class="bg-card rounded-xl border border-subtle p-6">
    <h3 class="text-sm font-semibold text-foreground mb-4">Output Profiles</h3>
    <div v-if="profiles.length === 0" class="text-sm text-muted-foreground py-4 text-center">
      No output profiles configured
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="profile in profiles"
        :key="profile.name"
        class="border border-subtle rounded-lg p-4"
      >
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <span class="text-sm font-semibold text-foreground">{{ profile.name }}</span>
            <span class="text-xs text-muted-foreground">&rarr; {{ profile.outputStreamName }}</span>
          </div>
        </div>
        <div v-if="profile.encodes?.length" class="flex flex-wrap gap-1.5">
          <span
            v-for="(enc, idx) in profile.encodes"
            :key="idx"
            class="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground"
          >
            {{ enc.name || enc.codec || 'encode' }}
          </span>
        </div>
        <div v-else class="text-xs text-muted-foreground">
          No encodes defined
        </div>
      </div>
    </div>
  </div>
</template>
