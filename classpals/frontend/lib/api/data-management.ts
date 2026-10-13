import axios from 'axios';
import { apiClient } from '@/lib/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const dataManagementApi = {
  listSnapshots: (classId: string) => apiClient.get(`/classes/${classId}/data-management/snapshots`),
  clearClassPoints: (classId: string) => apiClient.post(`/classes/${classId}/data-management/clear-points`),
  restoreSnapshot: (snapshotId: string) => apiClient.post(`/data-management/snapshots/${snapshotId}/restore`),
  deleteStudentWithSnapshot: (studentId: string) => apiClient.delete(`/data-management/students/${studentId}`),
  importClassPreview: (classId: string, file: File, mode: 'append' | 'replace' = 'append') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    return apiClient.post(`/classes/${classId}/data-management/import/preview`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  importClassData: (classId: string, file: File, mode: 'append' | 'replace' = 'append') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);

    return apiClient.post(`/classes/${classId}/data-management/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  downloadImportTemplate: async (classId: string) => {
    const token = localStorage.getItem('token');

    return axios.get(`${API_BASE_URL}/classes/${classId}/data-management/import-template`, {
      responseType: 'blob',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });
  },
  exportImportableClassData: async (classId: string) => {
    const token = localStorage.getItem('token');

    return axios.get(`${API_BASE_URL}/classes/${classId}/data-management/export-importable`, {
      responseType: 'blob',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });
  },
  exportClassData: async (classId: string) => {
    const token = localStorage.getItem('token');

    return axios.get(`${API_BASE_URL}/classes/${classId}/data-management/export`, {
      responseType: 'blob',
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    });
  },
};
