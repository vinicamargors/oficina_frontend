import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface EmpresaResumida {
  id: string;
  nome?: string;
  nome_fantasia?: string;
  razao_social?: string;
  cnpj?: string;
  cidade?: string;
  ativo?: boolean;
}

interface MasterState {
  empresaSelecionada: EmpresaResumida | null;
  setEmpresaSelecionada: (empresa: EmpresaResumida | null) => void;
}

export const useMasterStore = create<MasterState>()(
  persist(
    (set) => ({
      empresaSelecionada: null,
      setEmpresaSelecionada: (empresa) => set({ empresaSelecionada: empresa }),
    }),
    {
      name: 'autotec-master-storage', // O cofre forte que vai salvar a sessão no disco do navegador
    }
  )
);