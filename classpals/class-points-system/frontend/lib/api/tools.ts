import { apiClient } from '@/lib/api-client';

export const toolsApi = {
  randomPick: (classId: string, data?: { excludeIds?: string[]; count?: number }) =>
    apiClient.post(`/classes/${classId}/tools/random-pick`, data),
  pickHistory: (classId: string, params?: { limit?: number }) =>
    apiClient.get(`/classes/${classId}/tools/pick-history`, { params }),
};
