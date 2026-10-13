import { apiClient } from '@/lib/api-client';

const uploadFile = (path: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post(path, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const uploadApi = {
  uploadAvatar: async (file: File) => uploadFile('/upload/avatar', file),
  uploadPetImage: async (file: File) => uploadFile('/upload/pet-image', file),
};
