import { create } from 'zustand';
import { apiRequest } from '@/lib/queryClient';
import type { User, UserRoleType, InsertUser } from '@shared/schema';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (userData: Partial<InsertUser>) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  signIn: async (email, password, rememberMe = false) => {
    const res = await apiRequest('POST', '/api/auth/login', { email, password, rememberMe });
    const user = await res.json();
    set({ user });
  },
  signUp: async (userData) => {
    await apiRequest('POST', '/api/auth/register', userData);
  },
  signOut: async () => {
    await apiRequest('POST', '/api/auth/logout', {});
    set({ user: null });
  }
}));