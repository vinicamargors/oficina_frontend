'use client';

import { useEffect, useState } from 'react';
import { Building2, Search, ArrowRight, LogOut, RefreshCw, CheckCircle2, MapPin, Hash } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useMasterStore, EmpresaResumida } from '@/stores/master';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';

export default function SelecionarEmpresa() {
  const [empresas, setEmpresas] = useState<EmpresaResumida[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [selecionando, setSelecionando] = useState<string | null>(null);

  const setEmpresaSelecionada = useMasterStore((s) => s.setEmpresaSelecionada);
  const navigate = useAppStore((s) => s.navigate);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    carregarEmpresas();
  }, []);

  async function carregarEmpresas() {
    setLoading(true);
    try {
      const data = await apiGet<EmpresaResumida[]>('/empresas');
      setEmpresas(data);
    } catch {
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  }

  async function entrarNaEmpresa(empresa: EmpresaResumida) {
    setSelecionando(empresa.id);
    setEmpresaSelecionada(empresa);
    // Pequeno delay para feedback visual
    await new Promise((r) => setTimeout(r, 400));
    navigate('dashboard');
  }

    const empresasFiltradas = empresas.filter((e) => {
    const nome = e.nome ?? '';
    const cnpj = e.cnpj ?? '';
    const cidade = e.cidade ?? '';
    const q = busca.toLowerCase();
    return (
        nome.toLowerCase().includes(q) ||
        cnpj.includes(busca) ||
        cidade.toLowerCase().includes(q)
    );
    });

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Building2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Selecionar Empresa</h1>
              <p className="text-zinc-500 text-sm">
                Olá, <span className="text-emerald-400">{user?.nome}</span> — escolha uma empresa para acessar
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-zinc-500 hover:text-red-400 text-sm transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      {/* Busca */}
      <div className="w-full max-w-3xl mb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ ou cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5 pl-10 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
          />
        </div>
      </div>

      {/* Lista de empresas */}
      <div className="w-full max-w-3xl">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : empresasFiltradas.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma empresa encontrada</p>
            <button onClick={carregarEmpresas} className="mt-4 flex items-center gap-2 mx-auto text-emerald-400 text-sm hover:underline">
              <RefreshCw className="w-3.5 h-3.5" /> Recarregar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {empresasFiltradas.map((empresa) => (
              <button
                key={empresa.id}
                onClick={() => entrarNaEmpresa(empresa)}
                disabled={!!selecionando}
                className="group relative text-left p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/30 hover:bg-zinc-900 transition-all duration-200 disabled:opacity-50"
              >
                {/* Status dot */}
                <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${empresa.ativo ? 'bg-emerald-500' : 'bg-zinc-600'}`} />

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 border border-transparent transition-all">
                    <Building2 className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-white font-semibold text-sm truncate">{empresa.nome}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                      {empresa.cnpj && (
                        <span className="flex items-center gap-1 text-zinc-500 text-xs">
                          <Hash className="w-3 h-3" /> {empresa.cnpj}
                        </span>
                      )}
                      {empresa.cidade && (
                        <span className="flex items-center gap-1 text-zinc-500 text-xs">
                          <MapPin className="w-3 h-3" /> {empresa.cidade}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Loading/confirm state */}
                <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {selecionando === empresa.id ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-emerald-400/50" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="text-center text-zinc-700 text-xs mt-6">
          {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} cadastrada{empresas.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}