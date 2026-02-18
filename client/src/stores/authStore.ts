import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateToken: (accessToken: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('qim_user') || 'null'),
  accessToken: localStorage.getItem('qim_access_token'),
  refreshToken: localStorage.getItem('qim_refresh_token'),
  isAuthenticated: !!localStorage.getItem('qim_access_token'),

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('qim_user', JSON.stringify(user));
    localStorage.setItem('qim_access_token', accessToken);
    localStorage.setItem('qim_refresh_token', refreshToken);
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('qim_user');
    localStorage.removeItem('qim_access_token');
    localStorage.removeItem('qim_refresh_token');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  updateToken: (accessToken) => {
    localStorage.setItem('qim_access_token', accessToken);
    set({ accessToken });
  },
}));
