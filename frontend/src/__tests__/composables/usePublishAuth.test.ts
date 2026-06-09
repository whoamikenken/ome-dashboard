import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { usePublishAuth } from '@/composables/usePublishAuth'

describe('usePublishAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should generate token with no expiration', async () => {
    const { generateToken } = usePublishAuth()

    const generatePromise = generateToken({
      name: 'Test Token',
      vhost: 'default',
      app: 'app'
    })

    // Advance the timers to skip the 800ms delay
    vi.advanceTimersByTime(800)

    const token = await generatePromise

    expect(token.expiresAt).toBeNull()
  })
})
