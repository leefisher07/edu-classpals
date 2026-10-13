import { apiClient } from '@/lib/api-client';

export const groupsApi = {
  list: (classId: string) => apiClient.get(`/classes/${classId}/groups`),
  get: (id: string) => apiClient.get(`/groups/${id}`),
  create: (classId: string, data: any) => apiClient.post(`/classes/${classId}/groups`, data),
  update: (id: string, data: any) => apiClient.patch(`/groups/${id}`, data),
  delete: (id: string) => apiClient.delete(`/groups/${id}`),
  addMembers: (id: string, data: { studentIds: string[] }) =>
    apiClient.post(`/groups/${id}/members`, data),
  removeMembers: (id: string, data: { studentIds: string[] }) =>
    apiClient.delete(`/groups/${id}/members`, { data }),
  sort: (classId: string, data: { groupIds: string[] }) =>
    apiClient.patch(`/classes/${classId}/groups/sort`, data),
  randomize: (classId: string, data: { groupCount?: number; studentsPerGroup?: number }) =>
    apiClient.post(`/classes/${classId}/groups/random`, data),
};
