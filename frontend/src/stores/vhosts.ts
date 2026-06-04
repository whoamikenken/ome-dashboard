import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createVHost, listVHosts, deleteVHost, getVHost } from '@/api/vhosts'
import type { VHost } from '@/types/ome'

export const useVHostStore = defineStore('vhosts', () => {
  const vhosts = ref<string[]>([])
  const vhostDetails = ref<Record<string, VHost>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  const vhostNames = computed(() => vhosts.value)

  const filteredVHosts = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) {
      return vhosts.value
    }
    return vhosts.value.filter(name => name.toLowerCase().includes(query))
  })

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function getVHostDetail(name: string): VHost | undefined {
    return vhostDetails.value[name]
  }

  async function fetchVHosts() {
    isLoading.value = true
    error.value = null
    try {
      const data = await listVHosts()
      const names = data.response || []
      vhosts.value = names

      // Fetch details for all vhosts in parallel
      const details: Record<string, VHost> = {}
      await Promise.all(
        names.map(async (name) => {
          try {
            const detailRes = await getVHost(name)
            if (detailRes.response) {
              details[name] = detailRes.response
            }
          } catch (err) {
            console.error(`Failed to fetch details for vhost ${name}:`, err)
          }
        })
      )
      vhostDetails.value = details
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to fetch virtual hosts'
    } finally {
      isLoading.value = false
    }
  }

  async function addVHost(payload: Partial<VHost>) {
    isLoading.value = true
    error.value = null
    try {
      await createVHost(payload)
      await fetchVHosts()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to create virtual host'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function removeVHost(name: string) {
    isLoading.value = true
    error.value = null
    try {
      await deleteVHost(name)
      await fetchVHosts()
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || 'Failed to delete virtual host'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    vhosts,
    vhostNames,
    vhostDetails,
    isLoading,
    error,
    searchQuery,
    filteredVHosts,
    fetchVHosts,
    addVHost,
    removeVHost,
    setSearchQuery,
    getVHostDetail,
  }
})

