import { apiClient } from './client.ts'
import type { ScheduledSlot, DaySchedule, FeedDay } from '../types/index.ts'

export const scheduleApi = {
  getRange: (dateFrom: string, dateTo: string) =>
    apiClient.get<DaySchedule>('/schedule', { params: { dateFrom, dateTo } }).then(r => r.data),
  getDay: (date: string) =>
    apiClient.get<ScheduledSlot[]>(`/schedule/day/${date}`).then(r => r.data),
  getFeed: (from: string, limit = 90) =>
    apiClient.get<FeedDay[]>('/schedule/feed', { params: { from, limit } }).then(r => r.data),
  create: (data: { taskId: number; date: string; timeFrom: string; timeTo: string }) =>
    apiClient.post<ScheduledSlot>('/schedule', data).then(r => r.data),
  update: (id: number, data: { timeFrom?: string; timeTo?: string; comment?: string }) =>
    apiClient.put<ScheduledSlot>(`/schedule/${id}`, data).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/schedule/${id}`).then(r => r.data),
}
