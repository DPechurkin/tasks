import { apiClient } from './client.ts'
import type { Plan } from '../types/index.ts'

export const plansApi = {
  getAll: () => apiClient.get<Plan[]>('/plans').then(r => r.data),
  getById: (id: number) => apiClient.get<Plan>(`/plans/${id}`).then(r => r.data),
  create: (data: { title: string; description?: string; ideaId?: number | null; insertAfter?: number | null }) =>
    apiClient.post<Plan>('/plans', data).then(r => r.data),
  update: (id: number, data: { title?: string; description?: string; ideaId?: number | null }) =>
    apiClient.put<Plan>(`/plans/${id}`, data).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/plans/${id}`).then(r => r.data),
  reorder: (id: number, newOrder: number) =>
    apiClient.put('/plans/reorder', { id, newOrder }).then(r => r.data),
}
