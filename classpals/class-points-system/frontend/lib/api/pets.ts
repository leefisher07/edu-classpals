import { apiClient } from '@/lib/api-client';

export const petsApi = {
  listGallery: (params?: { includeDisabled?: boolean }) =>
    apiClient.get('/pets/gallery', { params }),
  getGalleryItem: (id: string) => apiClient.get(`/pets/gallery/${id}`),
  createGalleryItem: (data: any) => apiClient.post('/pets/gallery', data),
  updateGalleryItem: (id: string, data: any) => apiClient.patch(`/pets/gallery/${id}`, data),
  deleteGalleryItem: (id: string) => apiClient.delete(`/pets/gallery/${id}`),

  selectPet: (studentId: string, data: { petId: string }) =>
    apiClient.post(`/students/${studentId}/pet/select`, data),
  getStudentPet: (studentId: string) => apiClient.get(`/students/${studentId}/pet`),
  resetStudentPet: (studentId: string) => apiClient.delete(`/students/${studentId}/pet`),
  changePetPoints: (studentId: string, data: any) => apiClient.post(`/students/${studentId}/pet/points`, data),
  petPointHistory: (studentId: string, params?: any) =>
    apiClient.get(`/students/${studentId}/pet/points/history`, { params }),

  getClassPets: (classId: string) => apiClient.get(`/classes/${classId}/pets`),
  getClassPetPointRecords: (classId: string, params?: {
    studentName?: string;
    startDate?: string;
    endDate?: string;
    type?: 'all' | 'add' | 'deduct';
    page?: number;
    limit?: number;
  }) => apiClient.get(`/classes/${classId}/pets/records`, { params }),
  getPetSettings: (classId: string) => apiClient.get(`/classes/${classId}/pet-settings`),
  updatePetSettings: (classId: string, data: any) => apiClient.patch(`/classes/${classId}/pet-settings`, data),
};
