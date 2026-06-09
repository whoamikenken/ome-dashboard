import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { usePublishAuth } from '@/composables/usePublishAuth'
import { getVHost } from '@/api/vhosts'

vi.mock('@/api/vhosts', () => {
  return {
    getVHost: vi.fn(),
  }
})

describe('usePublishAuth composable', () => {
  const TOKENS_KEY = 'ome_publish_tokens'

  let localStorageMock: Record<string, string> = {}

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Mock localStorage
    localStorageMock = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
      clear: vi.fn(() => {
        localStorageMock = {}
      })
    })

    // Mock clipboard
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('initialization', () => {
    it('loads initial tokens from localStorage correctly', () => {
      const mockTokens = [{ id: '1', name: 'Test Token' }]
      localStorageMock[TOKENS_KEY] = JSON.stringify(mockTokens)

      const { tokens, isLoading, error } = usePublishAuth()

      expect(localStorage.getItem).toHaveBeenCalledWith(TOKENS_KEY)
      expect(tokens.value).toEqual(mockTokens)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('handles empty localStorage', () => {
      const { tokens } = usePublishAuth()

      expect(localStorage.getItem).toHaveBeenCalledWith(TOKENS_KEY)
      expect(tokens.value).toEqual([])
    })

    it('handles corrupted localStorage', () => {
      localStorageMock[TOKENS_KEY] = 'invalid-json'
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { tokens } = usePublishAuth()

      expect(tokens.value).toEqual([])
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load tokens from localStorage',
        expect.any(SyntaxError)
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('generateToken', () => {
    it('generates a token successfully, updates state, and saves to localStorage', async () => {
      const { generateToken, tokens, isLoading, error } = usePublishAuth()

      const generatePromise = generateToken({
        name: 'New Token',
        vhost: 'default',
        app: 'app',
        streamName: 'stream1',
        expiresInDays: 7
      })

      // Simulate API lag
      expect(isLoading.value).toBe(true)
      vi.advanceTimersByTime(800)

      const newToken = await generatePromise

      expect(newToken.name).toBe('New Token')
      expect(newToken.vhost).toBe('default')
      expect(newToken.app).toBe('app')
      expect(newToken.streamName).toBe('stream1')
      expect(newToken.token).toMatch(/^ps_[a-z0-9]+$/)
      expect(newToken.id).toMatch(/^[a-z0-9]+$/)
      expect(newToken.expiresAt).not.toBeNull()

      const expiresDate = new Date(newToken.expiresAt!)
      const expectedExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      // Checking that expiresAt is reasonably close
      expect(expiresDate.getTime()).toBeCloseTo(expectedExpiresDate.getTime(), -3)

      expect(tokens.value[0]).toEqual(newToken)
      expect(localStorage.setItem).toHaveBeenCalledWith(TOKENS_KEY, JSON.stringify(tokens.value))
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('throws if token name is missing', async () => {
      const { generateToken, error } = usePublishAuth()

      const generatePromise = generateToken({
        name: '   ',
        vhost: 'default',
        app: 'app'
      })

      vi.advanceTimersByTime(800)

      await expect(generatePromise).rejects.toThrow('Token name is required')
      expect(error.value).toBe('Token name is required')
    })
  })

  describe('revokeToken, deleteToken, and getTokenById', () => {
    it('revokes a token successfully', async () => {
      const mockToken = { id: '123', name: 'To Revoke', isRevoked: false }
      localStorageMock[TOKENS_KEY] = JSON.stringify([mockToken])

      const { revokeToken, tokens, isLoading, error } = usePublishAuth()

      const revokePromise = revokeToken('123')

      expect(isLoading.value).toBe(true)
      vi.advanceTimersByTime(300)

      await revokePromise

      expect(tokens.value[0].isRevoked).toBe(true)
      expect(localStorage.setItem).toHaveBeenCalledWith(TOKENS_KEY, JSON.stringify(tokens.value))
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('throws when revoking a non-existent token', async () => {
      const { revokeToken, error } = usePublishAuth()

      const revokePromise = revokeToken('nonexistent')
      vi.advanceTimersByTime(300)

      await expect(revokePromise).rejects.toThrow('Token not found')
      expect(error.value).toBe('Token not found')
    })

    it('deletes a token successfully', async () => {
      const mockToken = { id: '123', name: 'To Delete' }
      localStorageMock[TOKENS_KEY] = JSON.stringify([mockToken])

      const { deleteToken, tokens, isLoading, error } = usePublishAuth()

      const deletePromise = deleteToken('123')

      expect(isLoading.value).toBe(true)
      vi.advanceTimersByTime(300)

      await deletePromise

      expect(tokens.value).toHaveLength(0)
      expect(localStorage.setItem).toHaveBeenCalledWith(TOKENS_KEY, JSON.stringify([]))
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('throws when deleting a non-existent token', async () => {
      const { deleteToken, error } = usePublishAuth()

      const deletePromise = deleteToken('nonexistent')
      vi.advanceTimersByTime(300)

      await expect(deletePromise).rejects.toThrow('Token not found')
      expect(error.value).toBe('Token not found')
    })

    it('retrieves a token by id', async () => {
      const mockToken = { id: '123', name: 'To Retrieve' }
      localStorageMock[TOKENS_KEY] = JSON.stringify([mockToken])

      const { getTokenById } = usePublishAuth()

      const token = await getTokenById('123')
      expect(token).toEqual(mockToken)

      const nonExistent = await getTokenById('nonexistent')
      expect(nonExistent).toBeUndefined()
    })
  })

  describe('utility functions', () => {
    it('refresh reloads tokens from localStorage', async () => {
      const mockTokens = [{ id: '1', name: 'Token 1' }]
      localStorageMock[TOKENS_KEY] = JSON.stringify(mockTokens)

      const { refresh, tokens, isLoading, error } = usePublishAuth()

      // Change localStorage to simulate external change
      const newMockTokens = [{ id: '1', name: 'Token 1' }, { id: '2', name: 'Token 2' }]
      localStorageMock[TOKENS_KEY] = JSON.stringify(newMockTokens)

      const refreshPromise = refresh()

      expect(isLoading.value).toBe(true)
      vi.advanceTimersByTime(500)

      await refreshPromise

      expect(tokens.value).toEqual(newMockTokens)
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('copyToClipboard delegates to navigator.clipboard.writeText', async () => {
      const { copyToClipboard } = usePublishAuth()

      await copyToClipboard('my_secret_token')

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('my_secret_token')
    })

    it('copyToClipboard throws error when clipboard fails', async () => {
      const { copyToClipboard } = usePublishAuth()

      vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('Clipboard error'))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(copyToClipboard('my_secret_token')).rejects.toThrow('Failed to copy token to clipboard')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to copy to clipboard', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })

    it('getStats calculates stats correctly', () => {
      const now = Date.now()
      const future = new Date(now + 24 * 60 * 60 * 1000).toISOString()
      const past = new Date(now - 24 * 60 * 60 * 1000).toISOString()

      const mockTokens = [
        { id: '1', isRevoked: false, expiresAt: null, useCount: 5 }, // Active
        { id: '2', isRevoked: false, expiresAt: future, useCount: 2 }, // Active
        { id: '3', isRevoked: true, expiresAt: future, useCount: 0 }, // Revoked
        { id: '4', isRevoked: false, expiresAt: past, useCount: 10 }, // Revoked (Expired)
      ]

      localStorageMock[TOKENS_KEY] = JSON.stringify(mockTokens)

      const { getStats } = usePublishAuth()
      const stats = getStats()

      expect(stats).toEqual({
        total: 4,
        active: 2,
        revoked: 2,
        totalUses: 17
      })
    })
  })

  describe('fetchAuthConfig and pruneExpired', () => {
    it('fetchAuthConfig fetches vhost and returns correct config', async () => {
      const { fetchAuthConfig, isLoading, error } = usePublishAuth()

      const mockVHostData = {
        response: {
          signedPolicy: { enabled: true },
          admissionWebhooks: { enabled: false }
        }
      }

      vi.mocked(getVHost).mockResolvedValueOnce(mockVHostData as any)

      const configPromise = fetchAuthConfig('my-vhost', 'my-app')

      expect(isLoading.value).toBe(true)

      const config = await configPromise

      expect(getVHost).toHaveBeenCalledWith('my-vhost')
      expect(config).toEqual({
        vhost: 'my-vhost',
        app: 'my-app',
        signedPolicy: mockVHostData.response.signedPolicy,
        admissionWebhooks: mockVHostData.response.admissionWebhooks
      })
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('fetchAuthConfig handles missing appName and null response fields', async () => {
      const { fetchAuthConfig } = usePublishAuth()

      vi.mocked(getVHost).mockResolvedValueOnce({} as any) // No response field

      const config = await fetchAuthConfig('my-vhost')

      expect(config).toEqual({
        vhost: 'my-vhost',
        app: null,
        signedPolicy: null,
        admissionWebhooks: null
      })
    })

    it('fetchAuthConfig handles errors properly', async () => {
      const { fetchAuthConfig, isLoading, error } = usePublishAuth()

      vi.mocked(getVHost).mockRejectedValueOnce({
        response: { data: { message: 'API Error' } }
      })

      const configPromise = fetchAuthConfig('my-vhost')

      await expect(configPromise).rejects.toThrow('API Error')
      expect(error.value).toBe('API Error')
      expect(isLoading.value).toBe(false)
    })

    it('pruneExpired updates isRevoked for expired tokens and saves', async () => {
      const now = Date.now()
      const past = new Date(now - 24 * 60 * 60 * 1000).toISOString()
      const future = new Date(now + 24 * 60 * 60 * 1000).toISOString()

      const mockTokens = [
        { id: '1', name: 'Valid', isRevoked: false, expiresAt: future },
        { id: '2', name: 'Expired', isRevoked: false, expiresAt: past },
        { id: '3', name: 'Already Revoked', isRevoked: true, expiresAt: past },
        { id: '4', name: 'No Expiry', isRevoked: false, expiresAt: null },
      ]

      localStorageMock[TOKENS_KEY] = JSON.stringify(mockTokens)

      const { pruneExpired, tokens } = usePublishAuth()

      await pruneExpired()

      expect(tokens.value[0].isRevoked).toBe(false) // Valid
      expect(tokens.value[1].isRevoked).toBe(true)  // Expired -> Revoked
      expect(tokens.value[2].isRevoked).toBe(true)  // Already Revoked -> Revoked
      expect(tokens.value[3].isRevoked).toBe(false) // No Expiry -> Not Revoked

      expect(localStorage.setItem).toHaveBeenCalledWith(TOKENS_KEY, JSON.stringify(tokens.value))
    })

    it('pruneExpired does not save if no tokens were changed', async () => {
      const mockTokens = [
        { id: '1', name: 'Valid', isRevoked: false, expiresAt: null }
      ]
      localStorageMock[TOKENS_KEY] = JSON.stringify(mockTokens)

      const { pruneExpired } = usePublishAuth()

      localStorage.setItem = vi.fn() // reset spy

      await pruneExpired()

      expect(localStorage.setItem).not.toHaveBeenCalled()
    })
  })
})
