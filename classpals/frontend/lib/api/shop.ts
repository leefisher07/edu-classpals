import { apiClient } from '@/lib/api-client';

export const shopApi = {
  listItems: (classId: string) => apiClient.get(`/classes/${classId}/shop/items`),
  getItem: (id: string) => apiClient.get(`/shop/items/${id}`),
  createItem: (classId: string, data: any) => apiClient.post(`/classes/${classId}/shop/items`, data),
  updateItem: (id: string, data: any) => apiClient.patch(`/shop/items/${id}`, data),
  deleteItem: (id: string) => apiClient.delete(`/shop/items/${id}`),
  sortItems: (classId: string, data: { itemIds: string[] }) =>
    apiClient.patch(`/classes/${classId}/shop/items/sort`, data),

  listExchanges: (classId: string, params?: any) =>
    apiClient.get(`/classes/${classId}/shop/exchanges`, { params }),
  updateExchangeStatus: (id: string, data: { status: string }) =>
    apiClient.patch(`/shop/exchanges/${id}/status`, data),

  exchange: (studentId: string, itemId: string) =>
    apiClient.post(`/students/${studentId}/exchanges`, { itemId }),
  getStudentExchanges: (studentId: string, params?: any) =>
    apiClient.get(`/students/${studentId}/exchanges`, { params }),
};
