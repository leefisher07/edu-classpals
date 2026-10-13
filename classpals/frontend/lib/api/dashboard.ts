import { apiClient } from '@/lib/api-client';

export const dashboardApi = {
  overview: (classId: string) => apiClient.get(`/classes/${classId}/dashboard/overview`),
  studentRanking: (classId: string, params?: {
    period?: 'total' | 'week' | 'month' | 'custom';
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => apiClient.get(`/classes/${classId}/dashboard/ranking/students`, { params }),
  groupRanking: (classId: string, params?: {
    period?: 'total' | 'week' | 'month' | 'custom';
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => apiClient.get(`/classes/${classId}/dashboard/ranking/groups`, { params }),
  trend: (classId: string, params?: { days?: number }) =>
    apiClient.get(`/classes/${classId}/dashboard/trend`, { params }),
  distribution: (classId: string) =>
    apiClient.get(`/classes/${classId}/dashboard/distribution`),
  getClassRecords: (classId: string, params?: {
    studentName?: string;
    startDate?: string;
    endDate?: string;
    type?: 'all' | 'add' | 'deduct';
    page?: number;
    limit?: number;
  }) => apiClient.get(`/classes/${classId}/points/records`, { params }),
};
