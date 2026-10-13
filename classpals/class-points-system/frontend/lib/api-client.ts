import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface RefreshAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

let refreshPromise: Promise<RefreshAuthResult | null> | null = null;

export async function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      return null;
    }

    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, {
        headers: { 'Content-Type': 'application/json' },
      })
      .then((response) => {
        const payload = response.data?.data ?? response.data;
        const nextAccessToken = payload?.accessToken;
        const nextRefreshToken = payload?.refreshToken;
        const expiresIn = payload?.expiresIn;

        if (!nextAccessToken || !nextRefreshToken || !expiresIn) {
          throw new Error('刷新登录状态失败');
        }

        const state = useAuthStore.getState();
        if (!state.user) {
          throw new Error('用户状态不存在');
        }

        state.setAuth(state.user, nextAccessToken, nextRefreshToken, expiresIn);
        return {
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
          expiresIn,
        } satisfies RefreshAuthResult;
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    return response.data?.data ?? response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshResult = await refreshAccessToken();

      if (refreshResult?.accessToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${refreshResult.accessToken}`;
        return apiClient(originalRequest);
      }
    }

    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }

    return Promise.reject(error.response?.data || error);
  }
);
