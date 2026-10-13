import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LicenseType = 'TIME_LIMITED' | 'PERMANENT';

interface User {
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

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (user: User, token: string, refreshToken: string, expiresIn: number) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setCurrentClassId: (classId: string | null) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

function mergeUserState(currentUser: User | null, nextUser: User | Partial<User> | null | undefined) {
  if (!currentUser) return nextUser ? { ...nextUser } as User : null;
  if (!nextUser) return currentUser;

  const mergedUser = { ...currentUser, ...nextUser };
  if ((nextUser.currentClassId === undefined || nextUser.currentClassId === null) && currentUser.currentClassId) {
    mergedUser.currentClassId = currentUser.currentClassId;
  }

  return mergedUser;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      tokenExpiresAt: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuth: (user, token, refreshToken, expiresIn) => {
        const tokenExpiresAt = Date.now() + expiresIn * 1000;
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshToken);
        set((state) => ({
          user: mergeUserState(state.user, user),
          token,
          refreshToken,
          tokenExpiresAt,
          isAuthenticated: true,
        }));
      },
      clearAuth: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({ user: null, token: null, refreshToken: null, tokenExpiresAt: null, isAuthenticated: false });
      },
      updateUser: (userData) =>
        set((state) => ({
          user: mergeUserState(state.user, userData),
        })),
      setCurrentClassId: (classId) =>
        set((state) => ({
          user: state.user ? { ...state.user, currentClassId: classId } : null,
        })),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
