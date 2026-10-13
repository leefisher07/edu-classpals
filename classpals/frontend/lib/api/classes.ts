import { apiClient } from '@/lib/api-client';

export const classesApi = {
  list: () => apiClient.get('/classes'),
  get: (id: string) => apiClient.get(`/classes/${id}`),
  create: (data: { name: string; teacherName?: string }) => apiClient.post('/classes', data),
  update: (id: string, data: any) => apiClient.patch(`/classes/${id}`, data),
  delete: (id: string) => apiClient.delete(`/classes/${id}`),
  activate: (id: string) => apiClient.post(`/classes/${id}/activate`),
};
