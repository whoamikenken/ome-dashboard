export interface StreamHistoryEntry {
  id: string
  streamName: string
  vhost: string
  app: string
  sourceType: string
  sourceUrl: string
  startTime: string
  endTime: string | null
  duration: number
  status: 'live' | 'completed' | 'error'
  sourceIp: string
  recordedAt: string
}

export interface HistoryFilter {
  vhost: string
  app: string
  streamName: string
  dateFrom: string
  dateTo: string
  status: 'live' | 'completed' | 'error' | ''
}

export interface HistoryStats {
  totalSessions: number
  totalDuration: number
  avgDuration: number
  mostActiveVHost: string
  mostActiveApp: string
}
