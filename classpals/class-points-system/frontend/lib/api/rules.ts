import { apiClient } from '@/lib/api-client';

export const rulesApi = {
  list: (classId: string) => apiClient.get(`/classes/${classId}/rules`),
  get: (id: string) => apiClient.get(`/rules/${id}`),
  create: (classId: string, data: any) => apiClient.post(`/classes/${classId}/rules`, data),
  update: (id: string, data: any) => apiClient.patch(`/rules/${id}`, data),
  delete: (id: string) => apiClient.delete(`/rules/${id}`),
  toggle: (id: string) => apiClient.post(`/rules/${id}/toggle`),
  sort: (classId: string, data: { ruleIds: string[] }) =>
    apiClient.patch(`/classes/${classId}/rules/sort`, data),
};
