import { create } from 'zustand';

export type Screen =
  | 'dashboard'
  | 'ordens-servico'
  | 'os-pipeline'
  | 'nova-os'
  | 'detalhes-os'
  | 'estoque'
  | 'financeiro'
  | 'clientes'
  | 'veiculos'
  | 'configuracoes'
  | 'logs';

interface AppStore {
  currentScreen: Screen;
  screenParams: Record<string, string>;
  navigate: (screen: Screen, params?: Record<string, string>) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  currentScreen: 'dashboard',
  screenParams: {},

  navigate: (screen, params = {}) => {
    set({ currentScreen: screen, screenParams: params });
    // Scroll to top on navigation
    if (typeof window !== 'undefined') {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.scrollTo(0, 0);
      }
    }
  },
}));