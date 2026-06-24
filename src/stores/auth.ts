import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { apiGet } from '@/lib/api';

export interface UsuarioProfile {
  id: string;
  nome: string;
  email: string;
  cargo: 'master' | 'DONO' | 'MECANICO' | 'ATENDENTE' | 'FINANCEIRO';
  empresa_id: string;
}

interface AuthStore {
  user: UsuarioProfile | null;
  loading: boolean;
  initialized: boolean;
  initAuth: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UsuarioProfile | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,

  setUser: (user) => {
    set({ user });
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('autotec-user', JSON.stringify(user));
      } else {
        localStorage.removeItem('autotec-user');
      }
    }
  },

  initAuth: async () => {
    set({ loading: true });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        try {
          const profile = await apiGet<UsuarioProfile>('/usuarios/me');
          get().setUser(profile);
        } catch {
          // If profile fetch fails, clear session
          await supabase.auth.signOut();
          get().setUser(null);
        }
      } else {
        get().setUser(null);
      }
    } catch {
      get().setUser(null);
    } finally {
      set({ loading: false, initialized: true });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        get().setUser(null);
        set({ loading: false, initialized: true });
      } else if (event === 'SIGNED_IN') {
        try {
          const profile = await apiGet<UsuarioProfile>('/usuarios/me');
          get().setUser(profile);
        } catch {
          get().setUser(null);
        }
        set({ loading: false, initialized: true });
      }
    });
  },

  logout: async () => {
    await supabase.auth.signOut();
    get().setUser(null);
    set({ loading: false, initialized: true });
  },
}));