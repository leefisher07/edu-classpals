import { apiClient } from '@/lib/api-client';
import type { LicenseType } from '@/lib/stores/auth-store';

export interface LoginDto {
  phone: string;
  password: string;
}

export interface RegisterDto {
  phone: string;
  password: string;
  username?: string;
  activationCode: string;
}

export interface AuthUser {
  id: string;
  phone: string;
  username?: string | null;
  role: string;
  licenseType?: LicenseType | null;
  licenseName?: string | null;
  accountExpiresAt?: string | null;
  lastLoginAt?: string | null;
  currentClassId?: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RedeemCodeResponse {
  message: string;
  user: AuthUser;
}

export const authApi = {
  login: (dto: LoginDto): Promise<AuthResponse> => apiClient.post('/auth/login', dto),
  register: (dto: RegisterDto): Promise<AuthResponse> => apiClient.post('/auth/register', dto),
  redeemCode: (activationCode: string): Promise<RedeemCodeResponse> =>
    apiClient.post('/auth/redeem-code', { activationCode }),
};
