import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useOmeStatus } from '@/composables/useOmeStatus'
import { listVHosts } from '@/api/vhosts'

vi.mock('@/api/vhosts', () => ({
  listVHosts: vi.fn()
}))

vi.mock('@/api/apps', () => ({
  listApps: vi.fn()
}))

vi.mock('@/api/streams', () => ({
  listStreams: vi.fn()
}))

// Mock Vue's lifecycle hooks to suppress the warnings since we are not testing inside a component
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('vue')
  return {
    ...actual,
    onMounted: vi.fn(),
    onUnmounted: vi.fn()
  }
})

describe('useOmeStatus error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles error with message when fetching stats fails', async () => {
    const errorMessage = 'Test error message'
    vi.mocked(listVHosts).mockRejectedValue(new Error(errorMessage))

    const { stats, connected, fetchStats } = useOmeStatus(10000)

    // We don't want the auto-polling to interfere, but fetchStats is called on startPolling (which happens in onMounted, which we aren't triggering here)
    // We will just call fetchStats directly.
    await fetchStats()

    expect(connected.value).toBe(false)
    expect(stats.value.error).toBe(errorMessage)
    expect(stats.value.isLoading).toBe(false)
  })

  it('handles error without message when fetching stats fails', async () => {
    vi.mocked(listVHosts).mockRejectedValue({})

    const { stats, connected, fetchStats } = useOmeStatus(10000)

    await fetchStats()

    expect(connected.value).toBe(false)
    expect(stats.value.error).toBe('Failed to fetch OME stats')
    expect(stats.value.isLoading).toBe(false)
  })
})
