'use client';

import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, ChevronRight, Loader2, AlertTriangle, Briefcase } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Empresa {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SelecionarEmpresa() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useAppStore((s) => s.navigate);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEmpresas = async () => {
      setLoading(true);
      try {
        // IMPORTANTE: Ajuste a rota '/empresas' conforme o seu backend. 
        // Se a sua API usa algo como '/usuarios/empresas', altere aqui.
        const data = await apiGet<Empresa[]>('/empresas');
        setEmpresas(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('O estado falhou em fornecer a lista. Erro de comunicação com o servidor.');
      } finally {
        setLoading(false);
      }
    };
    fetchEmpresas();
  }, []);

  const handleSelect = (empresa: Empresa) => {
    if (!user) return;
    
    // A MÁGICA ACONTECE AQUI: Atualiza o estado global na marra
    // Isso avisa todas as outras telas (Estoque, Financeiro, etc) que o ID mudou.
    setUser({ ...user, empresa_id: empresa.id });
    
    // Puxa o nome real que veio do banco, sem campos nulos fantasiados
    const nomeExibicao = empresa.nome_fantasia || empresa.razao_social || 'Operação';
    toast.success(`Acessando: ${nomeExibicao}`);
    
    // Redireciona pro dashboard pra forçar a re-renderização das rotas
    navigate('dashboard');
  };

  // ─── Render: Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-zinc-400 font-medium">Mapeando suas operações...</p>
      </div>
    );
  }

  // ─── Render: Error ─────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-white font-bold text-lg mb-2">Erro na busca</p>
        <p className="text-zinc-500 text-sm max-w-sm text-center">{error}</p>
      </div>
    );
  }

  // ─── Render: Main ──────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-10 mt-6 md:mt-10 px-4">
      <div className="text-center space-y-2 mb-10">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/5">
          <Briefcase className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Selecione a Operação</h1>
        <p className="text-zinc-400 text-sm">Escolha qual CNPJ ou filial você vai administrar agora.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {empresas.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-zinc-900/50 border border-zinc-800/60 rounded-2xl">
            <Building2 className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-white font-bold text-lg mb-1">Nenhuma empresa encontrada</p>
            <p className="text-zinc-500 text-sm">Você ainda não possui empresas vinculadas ao seu usuário.</p>
          </div>
        ) : (
          empresas.map((empresa) => {
            const isSelected = user?.empresa_id === empresa.id;
            const nomeExibicao = empresa.nome_fantasia || empresa.razao_social || 'Unidade Sem Nome';

            return (
              <button
                key={empresa.id}
                onClick={() => handleSelect(empresa)}
                className={`group relative text-left p-6 rounded-2xl transition-all duration-300 overflow-hidden outline-none ${
                  isSelected
                    ? 'bg-emerald-500/5 border-2 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.1)] -translate-y-1'
                    : 'bg-zinc-900/40 border-2 border-zinc-800/60 hover:border-emerald-500/30 hover:bg-zinc-800/50 hover:-translate-y-1'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-zinc-950 text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10 uppercase tracking-wider">
                    Em Uso
                  </div>
                )}
                
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <h3 className={`text-lg font-bold truncate transition-colors ${isSelected ? 'text-emerald-400' : 'text-zinc-100 group-hover:text-white'}`}>
                      {nomeExibicao}
                    </h3>
                    
                    <div className="space-y-1.5">
                      {empresa.cnpj && (
                        <p className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-zinc-400 text-xs font-mono">
                          {empresa.cnpj}
                        </p>
                      )}
                      {empresa.razao_social && empresa.nome_fantasia && (
                        <p className="text-zinc-500 text-[10px] uppercase tracking-wider truncate mt-1">
                          {empresa.razao_social}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    isSelected 
                      ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/30 scale-110' 
                      : 'bg-zinc-800/50 text-zinc-500 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 border border-zinc-700/50 group-hover:border-emerald-500/30'
                  }`}>
                    {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 ml-0.5" />}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}