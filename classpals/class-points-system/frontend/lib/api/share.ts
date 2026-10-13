import { apiClient } from '@/lib/api-client';

export type ShareLinkItem = {
  id: string;
  token: string;
  shareUrl: string;
  expiresAt: string;
  allowViewRanking: boolean;
  hidePointRecords: boolean;
  hideDeductions: boolean;
  isActive: boolean;
  createdAt?: string;
};

export type ShareLinksResponse = {
  currentLink: ShareLinkItem | null;
  historyLinks: ShareLinkItem[];
  historyCount: number;
  totalCount: number;
};

export const shareApi = {
  create: (studentId: string, data: any) =>
    apiClient.post(`/students/${studentId}/share`, data),
  get: (studentId: string) => apiClient.get<ShareLinksResponse>(`/students/${studentId}/share`),
  update: (id: string, data: any) => apiClient.patch(`/share/${id}`, data),
  delete: (id: string) => apiClient.delete(`/share/${id}`),

  verifyToken: (token: string, data: { phone: string }) =>
    apiClient.post(`/parent/${token}/verify`, data),
  getByToken: (token: string, phone: string) =>
    apiClient.get(`/parent/${token}`, { params: { phone } }),
};
