<script setup lang="ts">
import { ref, computed } from 'vue'
import { X, Check, FileDiff } from 'lucide-vue-next'

const props = defineProps<{
  original: string
  modified: string
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'apply'): void
}>()

const diffMode = ref<'unified' | 'side-by-side'>('side-by-side')

// Diff implementation
interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  value: string
  originalLineNum?: number
  modifiedLineNum?: number
}

interface SideBySideRow {
  original?: {
    lineNum: number
    value: string
    type: 'removed' | 'unchanged'
  }
  modified?: {
    lineNum: number
    value: string
    type: 'added' | 'unchanged'
  }
}

const diffLines = computed<DiffLine[]>(() => {
  const A = props.original.split('\n')
  const B = props.modified.split('\n')
  const n = A.length
  const m = B.length

  // LCS DP table
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (A[i - 1] === B[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to assemble diff lines
  const diff: DiffLine[] = []
  let i = n
  let j = m

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && A[i - 1] === B[j - 1]) {
      diff.unshift({
        type: 'unchanged',
        value: A[i - 1],
        originalLineNum: i,
        modifiedLineNum: j
      })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({
        type: 'added',
        value: B[j - 1],
        modifiedLineNum: j
      })
      j--
    } else {
      diff.unshift({
        type: 'removed',
        value: A[i - 1],
        originalLineNum: i
      })
      i--
    }
  }

  return diff
})

const sbsRows = computed<SideBySideRow[]>(() => {
  const rows: SideBySideRow[] = []
  const list = diffLines.value
  let k = 0

  while (k < list.length) {
    if (list[k].type === 'unchanged') {
      rows.push({
        original: {
          lineNum: list[k].originalLineNum!,
          value: list[k].value,
          type: 'unchanged'
        },
        modified: {
          lineNum: list[k].modifiedLineNum!,
          value: list[k].value,
          type: 'unchanged'
        }
      })
      k++
    } else {
      // Collect contiguous blocks of additions/removals
      const removals: DiffLine[] = []
      const additions: DiffLine[] = []
      while (k < list.length && list[k].type !== 'unchanged') {
        if (list[k].type === 'removed') {
          removals.push(list[k])
        } else {
          additions.push(list[k])
        }
        k++
      }

      const maxLen = Math.max(removals.length, additions.length)
      for (let idx = 0; idx < maxLen; idx++) {
        const rem = removals[idx]
        const add = additions[idx]
        rows.push({
          original: rem ? {
            lineNum: rem.originalLineNum!,
            value: rem.value,
            type: 'removed'
          } : undefined,
          modified: add ? {
            lineNum: add.modifiedLineNum!,
            value: add.value,
            type: 'added'
          } : undefined
        })
      }
    }
  }

  return rows
})

function lineClass(type: 'added' | 'removed' | 'unchanged') {
  if (type === 'added') {
    return 'bg-success/10 text-success border-l-2 border-success font-medium'
  }
  if (type === 'removed') {
    return 'bg-danger/10 text-danger border-l-2 border-danger font-medium'
  }
  return 'text-muted-foreground'
}
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="show" class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60">
        <!-- Backdrop -->
        <div class="fixed inset-0 cursor-default" @click="emit('close')"></div>

        <!-- Modal Content -->
        <div class="bg-card rounded-2xl border border-subtle shadow-2xl w-full max-w-5xl z-10 flex flex-col max-h-[90vh]">
          <!-- Header -->
          <div class="flex items-center justify-between p-5 border-b border-subtle bg-muted/5">
            <div class="flex items-center space-x-2.5">
              <div class="p-2 bg-primary/10 text-primary rounded-lg">
                <FileDiff class="w-5 h-5" />
              </div>
              <div>
                <h2 class="text-lg font-bold text-foreground">Review Configuration Changes</h2>
                <p class="text-xs text-muted-foreground">Compare the original and modified configuration JSON.</p>
              </div>
            </div>
            <button @click="emit('close')" class="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Diff Mode Switcher -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-subtle bg-muted/10">
            <div class="flex items-center space-x-2 bg-muted p-1 rounded-lg">
              <button
                type="button"
                @click="diffMode = 'unified'"
                class="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer select-none"
                :class="diffMode === 'unified' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
              >
                Unified
              </button>
              <button
                type="button"
                @click="diffMode = 'side-by-side'"
                class="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer select-none"
                :class="diffMode === 'side-by-side' ? 'bg-card text-foreground shadow' : 'text-muted-foreground hover:text-foreground'"
              >
                Side-by-Side
              </button>
            </div>
            <div class="text-xs text-muted-foreground flex items-center space-x-3">
              <span class="flex items-center space-x-1">
                <span class="w-2.5 h-2.5 rounded-sm bg-success/20 border border-success/40 inline-block"></span>
                <span>Added</span>
              </span>
              <span class="flex items-center space-x-1">
                <span class="w-2.5 h-2.5 rounded-sm bg-danger/20 border border-danger/40 inline-block"></span>
                <span>Removed</span>
              </span>
            </div>
          </div>

          <!-- Body / Diff Output -->
          <div class="flex-1 overflow-y-auto p-5 bg-card">
            <!-- Unified View -->
            <div
              v-if="diffMode === 'unified'"
              class="border border-subtle rounded-xl overflow-hidden bg-card font-mono text-xs max-h-[55vh] overflow-y-auto"
            >
              <div class="min-w-full divide-y divide-subtle/10">
                <div
                  v-for="(line, idx) in diffLines"
                  :key="idx"
                  class="flex items-stretch select-text leading-relaxed hover:bg-muted/20"
                  :class="lineClass(line.type)"
                >
                  <div class="w-12 text-right pr-3 pl-1 py-0.5 border-r border-subtle/30 text-muted-foreground select-none shrink-0 bg-muted/20">
                    {{ line.originalLineNum || '' }}
                  </div>
                  <div class="w-12 text-right pr-3 pl-1 py-0.5 border-r border-subtle/30 text-muted-foreground select-none shrink-0 bg-muted/20">
                    {{ line.modifiedLineNum || '' }}
                  </div>
                  <div class="w-6 text-center py-0.5 font-bold select-none shrink-0">
                    {{ line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' ' }}
                  </div>
                  <div class="flex-1 px-3 py-0.5 whitespace-pre-wrap break-all">
                    {{ line.value || '\u200B' }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Side-by-Side View -->
            <div
              v-else
              class="border border-subtle rounded-xl overflow-hidden bg-card font-mono text-xs max-h-[55vh] overflow-y-auto"
            >
              <div class="grid grid-cols-2 divide-x divide-subtle border-b border-subtle bg-muted/30 text-muted-foreground select-none font-sans font-bold">
                <div class="px-4 py-2 text-center text-xs uppercase tracking-wider">Original Configuration</div>
                <div class="px-4 py-2 text-center text-xs uppercase tracking-wider">Modified Configuration</div>
              </div>
              
              <div class="min-w-full divide-y divide-subtle/10">
                <div
                  v-for="(row, idx) in sbsRows"
                  :key="idx"
                  class="grid grid-cols-2 divide-x divide-subtle items-stretch leading-relaxed"
                >
                  <!-- Left: Original -->
                  <div
                    class="flex items-stretch select-text hover:bg-muted/10"
                    :class="row.original ? lineClass(row.original.type) : 'bg-muted/5'"
                  >
                    <div class="w-12 text-right pr-3 pl-1 py-0.5 border-r border-subtle/30 text-muted-foreground select-none shrink-0 bg-muted/20">
                      {{ row.original?.lineNum || '' }}
                    </div>
                    <div class="w-6 text-center py-0.5 font-bold select-none shrink-0">
                      {{ row.original ? '-' : ' ' }}
                    </div>
                    <div class="flex-1 px-3 py-0.5 whitespace-pre-wrap break-all">
                      {{ row.original?.value || '\u200B' }}
                    </div>
                  </div>

                  <!-- Right: Modified -->
                  <div
                    class="flex items-stretch select-text hover:bg-muted/10"
                    :class="row.modified ? lineClass(row.modified.type) : 'bg-muted/5'"
                  >
                    <div class="w-12 text-right pr-3 pl-1 py-0.5 border-r border-subtle/30 text-muted-foreground select-none shrink-0 bg-muted/20">
                      {{ row.modified?.lineNum || '' }}
                    </div>
                    <div class="w-6 text-center py-0.5 font-bold select-none shrink-0">
                      {{ row.modified ? '+' : ' ' }}
                    </div>
                    <div class="flex-1 px-3 py-0.5 whitespace-pre-wrap break-all">
                      {{ row.modified?.value || '\u200B' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end items-center space-x-3 p-4 border-t border-subtle bg-muted/10">
            <button
              type="button"
              @click="emit('close')"
              class="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors cursor-pointer select-none"
            >
              Back to Editor
            </button>
            <button
              type="button"
              @click="emit('apply')"
              class="flex items-center space-x-1.5 px-5 py-2 text-sm font-semibold text-white bg-success hover:bg-success-hover rounded-lg transition-colors cursor-pointer select-none"
            >
              <Check class="w-4 h-4" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
