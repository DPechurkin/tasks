import { apiClient } from './client.ts'
import type { Idea } from '../types/index.ts'

export const ideasApi = {
  getAll: () => apiClient.get<Idea[]>('/ideas').then(r => r.data),
  getById: (id: number) => apiClient.get<Idea>(`/ideas/${id}`).then(r => r.data),
  create: (data: { title: string; description?: string; insertAfter?: number | null }) =>
    apiClient.post<Idea>('/ideas', data).then(r => r.data),
  update: (id: number, data: { title?: string; description?: string }) =>
    apiClient.put<Idea>(`/ideas/${id}`, data).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/ideas/${id}`).then(r => r.data),
  reorder: (id: number, newOrder: number) =>
    apiClient.patch(`/ideas/${id}/order`, { newOrder }).then(r => r.data),
  linkPlan: (ideaId: number, planId: number) =>
    apiClient.post(`/ideas/${ideaId}/plans`, { planId }).then(r => r.data),
  unlinkPlan: (ideaId: number, planId: number) =>
    apiClient.delete(`/ideas/${ideaId}/plans/${planId}`).then(r => r.data),
}
