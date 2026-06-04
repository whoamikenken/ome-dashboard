import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useVHostStore } from '@/stores/vhosts'
import { listVHosts, getVHost, deleteVHost } from '@/api/vhosts'

vi.mock('@/api/vhosts', () => {
  return {
    listVHosts: vi.fn(),
    getVHost: vi.fn(),
    createVHost: vi.fn(),
    deleteVHost: vi.fn(),
  }
})

describe('VHosts Pinia Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('creates store with Pinia and has correct default state', () => {
    const store = useVHostStore()
    expect(store.vhosts).toEqual([])
    expect(store.vhostDetails).toEqual({})
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.searchQuery).toBe('')
    expect(store.filteredVHosts).toEqual([])
  })

  it('fetchVHosts updates the vhosts list and details', async () => {
    const store = useVHostStore()

    const mockVHostsList = ['default', 'custom']
    const mockVHostDetails = {
      default: { name: 'default', clientLimit: 1000 },
      custom: { name: 'custom', clientLimit: 500 }
    } as any

    vi.mocked(listVHosts).mockResolvedValue({
      statusCode: 200,
      message: 'OK',
      response: mockVHostsList,
    })
    vi.mocked(getVHost).mockImplementation(async (name: string) => {
      return {
        statusCode: 200,
        message: 'OK',
        response: mockVHostDetails[name as keyof typeof mockVHostDetails],
      }
    })

    await store.fetchVHosts()

    expect(listVHosts).toHaveBeenCalledTimes(1)
    expect(getVHost).toHaveBeenCalledTimes(2)
    expect(getVHost).toHaveBeenCalledWith('default')
    expect(getVHost).toHaveBeenCalledWith('custom')

    expect(store.vhosts).toEqual(mockVHostsList)
    expect(store.vhostDetails).toStrictEqual(mockVHostDetails)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('removeVHost removes from list', async () => {
    const store = useVHostStore()

    let mockList = ['default', 'custom']
    vi.mocked(listVHosts).mockImplementation(async () => {
      return {
        statusCode: 200,
        message: 'OK',
        response: mockList,
      }
    })
    vi.mocked(getVHost).mockImplementation(async (name: string) => {
      return {
        statusCode: 200,
        message: 'OK',
        response: { name } as any,
      }
    })
    vi.mocked(deleteVHost).mockImplementation(async (name: string) => {
      mockList = mockList.filter(item => item !== name)
      return {
        statusCode: 200,
        message: 'OK',
        response: null,
      }
    })

    await store.fetchVHosts()
    expect(store.vhosts).toEqual(['default', 'custom'])

    const success = await store.removeVHost('custom')
    expect(success).toBe(true)
    expect(deleteVHost).toHaveBeenCalledWith('custom')
    expect(store.vhosts).toEqual(['default'])
  })

  it('setSearchQuery filters correctly', () => {
    const store = useVHostStore()
    store.vhosts = ['default', 'production', 'staging']

    expect(store.filteredVHosts).toEqual(['default', 'production', 'staging'])

    store.setSearchQuery('prod')
    expect(store.searchQuery).toBe('prod')
    expect(store.filteredVHosts).toEqual(['production'])

    store.setSearchQuery('   STAG   ')
    expect(store.filteredVHosts).toEqual(['staging'])

    store.setSearchQuery('')
    expect(store.filteredVHosts).toEqual(['default', 'production', 'staging'])
  })

  it('getVHostDetail returns correct vhost details', () => {
    const store = useVHostStore()
    const detail = { name: 'default', clientLimit: 1000 } as any
    store.vhostDetails = {
      default: detail
    }

    expect(store.getVHostDetail('default')).toStrictEqual(detail)
    expect(store.getVHostDetail('non-existent')).toBeUndefined()
  })
})
