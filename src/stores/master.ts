import { create } from 'zustand';

export interface EmpresaResumida {
  id: string;
  nome: string | null;   // ← pode vir null do backend
  cnpj?: string | null;
  cidade?: string | null;
  ativo: boolean;
}

interface MasterStore {
  empresaSelecionada: EmpresaResumida | null;
  setEmpresaSelecionada: (empresa: EmpresaResumida | null) => void;
}

export const useMasterStore = create<MasterStore>((set) => ({
  empresaSelecionada: null,
  setEmpresaSelecionada: (empresa) => set({ empresaSelecionada: empresa }),
}));