import { api } from './client'
import type { StreamRecord, StreamRecorded, OmeResponse } from '@/types/ome'

export async function startRecord(vhost: string, app: string, data: StreamRecord) {
  const res = await api.post<OmeResponse<StreamRecorded>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}:startRecord`, data)
  return res.data
}

export async function stopRecord(vhost: string, app: string, data: { id: string }) {
  const res = await api.post<OmeResponse<null>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}:stopRecord`, data)
  return res.data
}

export async function getRecordState(vhost: string, app: string, data: { id: string }) {
  const res = await api.post<OmeResponse<StreamRecorded>>(`/vhosts/${encodeURIComponent(vhost)}/apps/${encodeURIComponent(app)}:records`, data)
  return res.data
}
