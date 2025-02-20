import { create } from 'zustand';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@shared/schema';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  signIn: async (email, password) => {
    const res = await apiRequest('POST', '/api/auth/login', { email, password });
    const user = await res.json();
    set({ user });
  },
  signUp: async (email, password, name) => {
    await apiRequest('POST', '/api/auth/register', { 
      email, 
      password,
      name
    });
  },
  signOut: async () => {
    await apiRequest('POST', '/api/auth/logout', {});
    set({ user: null });
  }
}));