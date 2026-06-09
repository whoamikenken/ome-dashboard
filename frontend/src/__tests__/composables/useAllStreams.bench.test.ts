import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAllStreams } from '@/composables/useAllStreams'
import * as vhostsApi from '@/api/vhosts'
import * as appsApi from '@/api/apps'
import * as streamsApi from '@/api/streams'

describe('useAllStreams benchmark', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
  })

  it('measures execution time for fetching streams', async () => {
    // Mock sleep to simulate network latency
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    vi.spyOn(vhostsApi, 'listVHosts').mockImplementation(async () => {
      await delay(50)
      return { response: ['vhost1', 'vhost2', 'vhost3'] } as any
    })

    vi.spyOn(appsApi, 'listApps').mockImplementation(async (_vhost) => {
      await delay(50)
      return { response: ['app1', 'app2', 'app3'] } as any
    })

    vi.spyOn(streamsApi, 'listStreams').mockImplementation(async (_vhost, _app) => {
      await delay(50)
      return { response: ['stream1', 'stream2', 'stream3'] } as any
    })

    vi.spyOn(streamsApi, 'getStream').mockImplementation(async (_vhost, _app, _stream) => {
      await delay(50)
      return {
        response: {
          input: {
            sourceType: 'test',
            sourceUrl: 'test',
            createdTime: 'test',
            tracks: { video: [], audio: [] }
          }
        }
      } as any
    })

    const { fetchAllStreams, streams } = useAllStreams(0)

    // Not using fake timers for the actual measurement because we want real wall-clock execution time measurement of the async operations
    vi.useRealTimers()

    const start = performance.now()
    await fetchAllStreams()
    const end = performance.now()

    console.log(`Execution time: ${end - start} ms`)
    console.log(`Streams fetched: ${streams.value.length}`)

    expect(streams.value.length).toBe(3 * 3 * 3) // 27 streams
  })
})
