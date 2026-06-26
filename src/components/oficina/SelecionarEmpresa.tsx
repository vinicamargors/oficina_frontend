'use client';

import { useEffect, useState } from 'react';
import { 
  Building2, 
  Search, 
  ArrowRight, 
  LogOut, 
  RefreshCw, 
  CheckCircle2, 
  MapPin, 
  Hash,
  Plus,
  X,
  Save,
  Loader2,
  AlertTriangle,
  Briefcase,
  EyeOff,
  Eye
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useMasterStore } from '@/stores/master';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';

// ─── Masks & Helpers ──────────────

const maskCNPJ = (value: string) => {
  const digits = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
};

const cleanDocument = (v: string) => v.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

// ─── Modal de Criação ────────────────────────────────────────────────────────

function NovaEmpresaModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void; }) {
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [nomeDono, setNomeDono] = useState('');
  const [emailDono, setEmailDono] = useState('');
  const [senhaDono, setSenhaDono] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSave = async () => {
    if (!nomeFantasia.trim() || !razaoSocial.trim() || !cnpj.trim() || !nomeDono.trim() || !emailDono.trim() || !senhaDono.trim()) {
      setError('A burocracia exige que todos os campos sejam preenchidos.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await apiPost('/empresas', {
        nome_fantasia: nomeFantasia.trim(),
        razao_social: razaoSocial.trim(),
        cnpj: cleanDocument(cnpj),
        nome_dono: nomeDono.trim(),
        email_dono: emailDono.trim(),
        senha_dono: senhaDono.trim()
      });
      
      toast.success('Operação e acesso do dono criados com sucesso!');
      
      setNomeFantasia(''); setRazaoSocial(''); setCnpj('');
      setNomeDono(''); setEmailDono(''); setSenhaDono('');
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar a empresa. Verifique os dados fornecidos.');
      toast.error('Falha na criação da operação.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400" />
        
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-white font-bold text-base">Nova Operação e Dono</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 md:p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-800/50 pb-2">1. Dados da Empresa</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Razão Social *</label>
                <input type="text" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} placeholder="João Silva Serviços Automotivos LTDA" className={inputClass} autoFocus />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Nome Fantasia *</label>
                <input type="text" value={nomeFantasia} onChange={(e) => setNomeFantasia(e.target.value)} placeholder="Auto Mecânica do João" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">CNPJ (Alfanumérico) *</label>
                <input type="text" value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))} placeholder="00.000.000/0001-00" maxLength={18} className={`${inputClass} font-mono uppercase`} />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-800/50 pb-2">2. Acesso do Dono</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Nome Completo do Dono *</label>
                <input type="text" value={nomeDono} onChange={(e) => setNomeDono(e.target.value)} placeholder="João da Silva" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">E-mail de Acesso *</label>
                <input type="email" value={emailDono} onChange={(e) => setEmailDono(e.target.value)} placeholder="dono@empresa.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Senha Provisória *</label>
                <div className="relative">
                  <input type={showSenha ? 'text' : 'password'} value={senhaDono} onChange={(e) => setSenhaDono(e.target.value)} placeholder="Mínimo 6 caracteres" className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 md:px-6 py-4 bg-zinc-900/20 border-t border-zinc-800/50">
          <button onClick={onClose} className="flex-1 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-4 py-2.5 text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-4 py-2.5 text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Criar Operação
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function SelecionarEmpresa() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [selecionando, setSelecionando] = useState<string | null>(null);

  const setEmpresaSelecionada = useMasterStore((s) => s.setEmpresaSelecionada);
  const navigate = useAppStore((s) => s.navigate);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const [modalOpen, setModalOpen] = useState(false);
  const isMaster = user?.cargo === 'master';

  useEffect(() => {
    carregarEmpresas();
  }, []);

  async function carregarEmpresas() {
    setLoading(true);
    try {
      const data = await apiGet<any[]>('/empresas');
      setEmpresas(Array.isArray(data) ? data : []);
    } catch {
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  }

  async function entrarNaEmpresa(empresa: any) {
    setSelecionando(empresa.id);
    
    // Fallback pra garantir que o store tenha algo pra chamar de nome
    const fallbackName = empresa.nome_fantasia || empresa.razao_social || empresa.nome || 'Operação Sem Nome';
    
    setEmpresaSelecionada({
      ...empresa,
      nome: fallbackName
    });
    
    await new Promise((r) => setTimeout(r, 400));
    navigate('dashboard');
  }

  const empresasFiltradas = empresas.filter((e) => {
    const nomeParaBusca = (e.nome_fantasia || e.razao_social || e.nome || '').toLowerCase();
    const cnpjParaBusca = e.cnpj || '';
    const cidadeParaBusca = (e.cidade || '').toLowerCase();
    const q = busca.toLowerCase();
    
    return (
      nomeParaBusca.includes(q) ||
      cnpjParaBusca.includes(busca) ||
      cidadeParaBusca.includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Briefcase className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Selecionar Empresa</h1>
              <p className="text-zinc-500 text-sm">
                Olá, <span className="text-emerald-400 font-bold">{user?.nome || 'Usuário'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-zinc-500 hover:text-red-400 text-sm transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>

      <div className="w-full max-w-3xl mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ ou cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-3.5 pl-10 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
          />
        </div>
        {isMaster && (
          <button 
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-5 py-3.5 text-sm transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] shrink-0"
          >
            <Plus className="w-4 h-4" /> Nova Empresa
          </button>
        )}
      </div>

      <div className="w-full max-w-3xl">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : empresasFiltradas.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-white">Nenhuma empresa encontrada</p>
            <p className="text-xs mt-1 mb-4">O mercado está aberto para novas expansões.</p>
            {isMaster ? (
              <button onClick={() => setModalOpen(true)} className="inline-flex items-center gap-2 mx-auto text-emerald-400 text-sm font-bold hover:underline">
                <Plus className="w-4 h-4" /> Criar a primeira operação
              </button>
            ) : (
              <button onClick={carregarEmpresas} className="inline-flex items-center gap-2 mx-auto text-emerald-400 text-sm font-bold hover:underline">
                <RefreshCw className="w-3.5 h-3.5" /> Recarregar
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {empresasFiltradas.map((empresa) => {
              const nomeExibicao = empresa.nome_fantasia || empresa.razao_social || empresa.nome || 'Operação Sem Nome';
              
              return (
                <button
                  key={empresa.id}
                  onClick={() => entrarNaEmpresa(empresa)}
                  disabled={!!selecionando}
                  className="group relative text-left p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:border-emerald-500/30 hover:bg-zinc-900 transition-all duration-200 disabled:opacity-50"
                >
                  <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${empresa.ativo !== false ? 'bg-emerald-500' : 'bg-zinc-600'}`} />

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 border border-transparent transition-all">
                      <Building2 className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-emerald-400 font-semibold text-sm truncate">{nomeExibicao}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                        {empresa.cnpj && (
                          <span className="flex items-center gap-1 text-zinc-500 text-xs">
                            <Hash className="w-3 h-3" /> {maskCNPJ(empresa.cnpj)}
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

                  <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {selecionando === empresa.id ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-bounce" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-emerald-400/50" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-center text-zinc-700 text-xs mt-6">
          {empresas.length} empresa{empresas.length !== 1 ? 's' : ''} encontrada{empresas.length !== 1 ? 's' : ''}
        </p>
      </div>

      {isMaster && (
        <NovaEmpresaModal 
          open={modalOpen} 
          onClose={() => setModalOpen(false)} 
          onSuccess={() => {
            setModalOpen(false);
            carregarEmpresas();
          }} 
        />
      )}
    </div>
  );
}