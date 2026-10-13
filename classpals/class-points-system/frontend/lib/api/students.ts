import { apiClient } from '@/lib/api-client';

export const studentsApi = {
  list: (classId: string, params?: { search?: string; sortBy?: string; sortOrder?: string }) =>
    apiClient.get(`/classes/${classId}/students`, { params }),
  get: (id: string) => apiClient.get(`/students/${id}`),
  create: (classId: string, data: any) => apiClient.post(`/classes/${classId}/students`, data),
  update: (id: string, data: any) => apiClient.patch(`/students/${id}`, data),
  delete: (id: string) => apiClient.delete(`/students/${id}`),
};

export const pointsApi = {
  add: (studentId: string, data: any) => apiClient.post(`/students/${studentId}/points`, data),
  quickAdd: (studentId: string) => apiClient.post(`/students/${studentId}/points/quick`),
  history: (studentId: string, params?: any) =>
    apiClient.get(`/students/${studentId}/points/history`, { params }),
  batch: (classId: string, data: any) => apiClient.post(`/classes/${classId}/points/batch`, data),
  revoke: (recordId: string) => apiClient.delete(`/points/records/${recordId}`),
};
