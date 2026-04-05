import { apiClient } from './client.ts'
import type { ScheduledSlot, DaySchedule, FeedDay, RecurringCreateData } from '../types/index.ts'

export const scheduleApi = {
  getRange: (dateFrom: string, dateTo: string) =>
    apiClient.get<DaySchedule>('/schedule', { params: { dateFrom, dateTo } }).then(r => r.data),
  getDay: (date: string) =>
    apiClient.get<ScheduledSlot[]>(`/schedule/day/${date}`).then(r => r.data),
  getFeed: (from: string, limit = 90) =>
    apiClient.get<FeedDay[]>('/schedule/feed', { params: { from, limit } }).then(r => r.data),
  create: (data: { taskId: number; date: string; timeFrom: string; timeTo: string }) =>
    apiClient.post<ScheduledSlot>('/schedule', data).then(r => r.data),
  createRecurring: (data: RecurringCreateData) =>
    apiClient.post<{ created: number; ruleId: number }>('/schedule/recurring', data).then(r => r.data),
  update: (id: number, data: { timeFrom?: string; timeTo?: string; comment?: string; scope?: 'single' | 'future' }) =>
    apiClient.put<ScheduledSlot>(`/schedule/${id}`, data).then(r => r.data),
  delete: (id: number, scope: 'single' | 'future' = 'single') =>
    apiClient.delete(`/schedule/${id}`, { params: { scope } }).then(r => r.data),
}
