import { ref } from 'vue'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DashboardHome from '@/pages/DashboardHome.vue'

const mockStats = ref({
  totalVHosts: 0,
  totalApps: 0,
  totalStreams: 0,
  activeStreams: 0,
  pushJobs: 0,
  activeRecordings: 0,
  vhostStreams: [] as any[],
  isLoading: true,
  error: null as string | null,
  lastUpdated: null as Date | null,
})
const mockFetchStats = vi.fn()

vi.mock('@/composables/useOmeStatus', () => {
  return {
    useOmeStatus: () => ({
      stats: mockStats,
      fetchStats: mockFetchStats,
    })
  }
})

vi.mock('@/components/charts/StreamsBarChart.vue', () => ({
  default: {
    name: 'StreamsBarChart',
    template: '<div data-testid="streams-bar-chart">StreamsBarChart</div>',
    props: ['data', 'loading']
  }
}))
vi.mock('@/components/charts/ActiveVsIdleChart.vue', () => ({
  default: {
    name: 'ActiveVsIdleChart',
    template: '<div data-testid="active-vs-idle-chart">ActiveVsIdleChart</div>',
    props: ['active', 'idle', 'loading']
  }
}))

describe('DashboardHome Component', () => {
  beforeEach(() => {
    mockStats.value = {
      totalVHosts: 0,
      totalApps: 0,
      totalStreams: 0,
      activeStreams: 0,
      pushJobs: 0,
      activeRecordings: 0,
      vhostStreams: [],
      isLoading: true,
      error: null,
      lastUpdated: null,
    }
    mockFetchStats.mockClear()
  })

  it('renders loading skeleton when stats are loading', () => {
    mockStats.value.isLoading = true
    const wrapper = mount(DashboardHome)
    
    expect(wrapper.findAll('.animate-skeleton').length).toBe(6)
  })

  it('renders error banner when stats.error is set', async () => {
    mockStats.value.isLoading = false
    mockStats.value.error = 'Failed to fetch OME stats'
    const wrapper = mount(DashboardHome)

    expect(wrapper.text()).toContain('Failed to fetch OME stats')

    const retryBtn = wrapper.find('button')
    expect(retryBtn.exists()).toBe(true)
    await retryBtn.trigger('click')
    expect(mockFetchStats).toHaveBeenCalledTimes(1)
  })

  it('renders stat cards when stats are loaded', () => {
    mockStats.value.isLoading = false
    mockStats.value.totalVHosts = 5
    mockStats.value.totalApps = 10
    mockStats.value.totalStreams = 15
    mockStats.value.activeStreams = 12
    mockStats.value.pushJobs = 3
    mockStats.value.activeRecordings = 2
    mockStats.value.lastUpdated = new Date()

    const wrapper = mount(DashboardHome)

    expect(wrapper.findAll('.animate-skeleton').length).toBe(0)

    expect(wrapper.text()).toContain('5')
    expect(wrapper.text()).toContain('10')
    expect(wrapper.text()).toContain('15')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('2')
  })
})
