import { apiClient } from './client.ts'
import type { Task, TaskStatus } from '../types/index.ts'

export const tasksApi = {
  getByPlan: (planId: number) =>
    apiClient.get<Task[]>(`/plans/${planId}/tasks`).then(r => r.data),
  getById: (id: number) => apiClient.get<Task>(`/tasks/${id}`).then(r => r.data),
  create: (planId: number, data: { title: string; description?: string; status?: TaskStatus; insertAfter?: number | null }) =>
    apiClient.post<Task>(`/plans/${planId}/tasks`, data).then(r => r.data),
  update: (id: number, data: { title?: string; description?: string; status?: TaskStatus }) =>
    apiClient.put<Task>(`/tasks/${id}`, data).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/tasks/${id}`).then(r => r.data),
  reorder: (planId: number, id: number, newOrder: number) =>
    apiClient.patch(`/plans/${planId}/tasks/${id}/order`, { newOrder }).then(r => r.data),
}
