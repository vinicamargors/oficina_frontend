'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  Users,
  Loader2,
  Lock,
  Save,
  Upload,
  Plus,
  Pencil,
  Trash2,
  X,
  Shield,
  Crown,
  Wrench,
  Headphones,
  DollarSign,
  Eye,
  EyeOff,
  Check,
  Settings,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { UsuarioProfile } from '@/stores/auth';
import { toast } from 'sonner';

/* ───────────────────── Types ───────────────────── */

interface EmpresaDetails {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
  nome_exibicao?: string;
  cor_primaria?: string;
  cor_secundaria?: string;
  logo_b64?: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: 'master' | 'DONO' | 'MECANICO' | 'ATENDENTE' | 'FINANCEIRO';
  ativo: boolean;
  empresa_id: string;
}

type TabKey = 'empresa' | 'time';

const CARGO_BADGE: Record<string, { label: string; classes: string }> = {
  DONO: { label: 'Dono', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  MECANICO: { label: 'Mecânico', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  ATENDENTE: { label: 'Atendente', classes: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  FINANCEIRO: { label: 'Financeiro', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  master: { label: 'Master', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const CARGO_AVATAR: Record<string, string> = {
  DONO: 'bg-gradient-to-br from-amber-500/30 to-amber-600/5 border-amber-500/30',
  MECANICO: 'bg-gradient-to-br from-blue-500/30 to-blue-600/5 border-blue-500/30',
  ATENDENTE: 'bg-gradient-to-br from-purple-500/30 to-purple-600/5 border-purple-500/30',
  FINANCEIRO: 'bg-gradient-to-br from-emerald-500/30 to-emerald-600/5 border-emerald-500/30',
  master: 'bg-gradient-to-br from-red-500/30 to-red-600/5 border-red-500/30',
};

const CARGO_BORDER: Record<string, string> = {
  DONO: 'border-l-amber-500',
  MECANICO: 'border-l-blue-500',
  ATENDENTE: 'border-l-purple-500',
  FINANCEIRO: 'border-l-emerald-500',
  master: 'border-l-red-500',
};

const CARGO_OPTIONS: { value: Usuario['cargo']; label: string }[] = [
  { value: 'DONO', label: 'Dono' },
  { value: 'MECANICO', label: 'Mecânico' },
  { value: 'ATENDENTE', label: 'Atendente' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
];

const RBAC_INFO = [
  {
    cargo: 'DONO',
    icon: <Crown className="w-5 h-5 text-amber-400" />,
    desc: 'Acesso total. Pode ver financeiro, configurar time, exportar logs.',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  {
    cargo: 'MECÂNICO',
    icon: <Wrench className="w-5 h-5 text-blue-400" />,
    desc: 'Vê pátio (OS), adiciona itens. Não vê financeiro nem configurações.',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  {
    cargo: 'ATENDENTE',
    icon: <Headphones className="w-5 h-5 text-purple-400" />,
    desc: 'Abre OS, gerencia clientes. Não vê financeiro.',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  {
    cargo: 'FINANCEIRO',
    icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
    desc: 'Vê financeiro e dashboards. Não altera OS.',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
];

/* ───────────────────── Skeleton ───────────────────── */

function ConfigSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header skeleton */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-pulse flex-shrink-0" />
          <div className="space-y-2.5 flex-1">
            <div className="w-48 h-7 rounded-lg bg-zinc-800 animate-pulse" />
            <div className="w-64 h-4 rounded bg-zinc-800/60 animate-pulse" />
          </div>
          <div className="w-20 h-6 rounded-lg bg-zinc-800 animate-pulse" />
        </div>
      </div>
      {/* Tab bar skeleton */}
      <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-1">
        <div className="flex-1 h-10 rounded-lg bg-zinc-700/30 animate-pulse" />
        <div className="flex-1 h-10 rounded-lg bg-zinc-700/30 animate-pulse" />
      </div>
      {/* Section card skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl overflow-hidden animate-pulse">
          <div className="flex items-center gap-2.5 px-4 md:px-5 py-4 mb-4">
            <div className="w-8 h-8 rounded-lg bg-zinc-800" />
            <div className="space-y-1.5">
              <div className="h-4 bg-zinc-800 rounded w-36" />
            </div>
          </div>
          <div className="px-4 md:px-5 pb-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="w-24 h-3 rounded bg-zinc-800/60" />
                <div className="w-full h-12 rounded-xl bg-zinc-800/50 border border-zinc-800" />
              </div>
              <div className="space-y-2">
                <div className="w-20 h-3 rounded bg-zinc-800/60" />
                <div className="w-full h-12 rounded-xl bg-zinc-800/50 border border-zinc-800" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────────────────── RBAC Guard ───────────────────── */

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-64 animate-in fade-in duration-500">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center max-w-md">
        <Lock className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-white font-bold text-lg mb-2">Acesso Negado</h2>
        <p className="text-zinc-400 text-sm">
          Somente usuários com cargo <span className="text-amber-400 font-semibold">Dono</span> ou{' '}
          <span className="text-red-400 font-semibold">Master</span> podem acessar as configurações.
        </p>
      </div>
    </div>
  );
}

/* ───────────────────── User Modal ───────────────────── */

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { nome: string; email: string; cargo: Usuario['cargo']; senha: string; ativo: boolean }) => void;
  initial?: Usuario | null;
  loading: boolean;
}

function UserModal({ open, onClose, onSave, initial, loading }: UserModalProps) {
  const isEdit = !!initial;
  const [nome, setNome] = useState(initial?.nome || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [cargo, setCargo] = useState<Usuario['cargo']>(initial?.cargo || 'ATENDENTE');
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [ativo, setAtivo] = useState(initial?.ativo ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = 'Nome é obrigatório';
    if (!email.trim()) e.email = 'Email é obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Email inválido';
    if (!initial && senha.length < 6) e.senha = 'Mínimo 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ nome: nome.trim(), email: email.trim(), cargo, senha, ativo });
  };

  if (!open) return null;

  const selectedBadge = CARGO_BADGE[cargo] || { label: cargo, classes: 'bg-zinc-700/10 text-zinc-300 border-zinc-700/30' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Gradient bar at top */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-white font-bold text-base">{isEdit ? 'Editar Membro' : 'Novo Membro'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 md:p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Section: Informações Pessoais */}
          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-zinc-800/50">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Informações Pessoais</h4>
            </div>
            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Nome *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome do membro"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
                {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Section: Permissões */}
          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-zinc-800/50">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Permissões</h4>
            </div>
            <div className="space-y-4">
              {/* Cargo select with colored preview */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Cargo *
                </label>
                <div className="relative">
                  <select
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value as Usuario['cargo'])}
                    className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 pr-10 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all cursor-pointer"
                  >
                    {CARGO_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full font-bold border ${selectedBadge.classes}`}>
                      {selectedBadge.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ativo toggle */}
              {isEdit && (
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
                      Status
                    </label>
                    <p className="text-zinc-500 text-xs">Membro ativo no sistema</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAtivo(!ativo)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      ativo ? 'bg-emerald-600' : 'bg-zinc-700'
                    }`}
                    aria-label={ativo ? 'Desativar' : 'Ativar'}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        ativo ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Section: Segurança — only for new users */}
          {!isEdit && (
            <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-zinc-800/50">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Segurança</h4>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Senha *
                </label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.senha && <p className="text-red-400 text-xs mt-1">{errors.senha}</p>}
              </div>
            </div>
          )}

          {/* Password change for edit mode */}
          {isEdit && (
            <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-zinc-800/50">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Segurança</h4>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Nova Senha <span className="normal-case tracking-normal font-normal text-zinc-600">(deixe vazio para manter)</span>
                </label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.senha && <p className="text-red-400 text-xs mt-1">{errors.senha}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 px-5 md:px-6 py-4 bg-zinc-900/20 border-t border-zinc-800/50">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-4 py-2.5 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-4 py-2.5 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Salvar Alterações' : 'Adicionar Membro'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Input Helper ───────────────────── */

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
      />
    </div>
  );
}

/* ───────────────────── Main Component ───────────────────── */

export default function Configuracoes() {
  const user = useAuthStore((s) => s.user);
  const empresaId = user?.empresa_id || '';

  const [tab, setTab] = useState<TabKey>('empresa');

  /* Company state */
  const [empresa, setEmpresa] = useState<EmpresaDetails | null>(null);
  const [empresaLoading, setEmpresaLoading] = useState(true);
  const [empresaSaving, setEmpresaSaving] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  /* Users state */
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [userSaving, setUserSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* Toast (using sonner) */

  /* ──────── Load company data ──────── */
  const loadEmpresa = useCallback(async () => {
    if (!empresaId) return;
    setEmpresaLoading(true);
    try {
      const data = await apiGet<EmpresaDetails>(`/empresas/${empresaId}/detalhes`);
      setEmpresa(data);
    } catch {
      toast.error('Erro ao salvar alterações.');
    } finally {
      setEmpresaLoading(false);
    }
  }, [empresaId]);

  /* ──────── Load users ──────── */
  const loadUsers = useCallback(async () => {
    if (!empresaId) return;
    setUsersLoading(true);
    try {
      const data = await apiGet<Usuario[]>(`/usuarios/${empresaId}`);
      setUsuarios(data);
    } catch {
      toast.error('Erro ao salvar alterações.');
    } finally {
      setUsersLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    loadEmpresa();
    loadUsers();
  }, [loadEmpresa, loadUsers]);

  /* ──────── Save company data ──────── */
  const handleSaveEmpresa = async () => {
    if (!empresa) return;
    setEmpresaSaving(true);
    try {
      await apiPut(`/empresas/${empresaId}`, {
        nome_fantasia: empresa.nome_fantasia,
        razao_social: empresa.razao_social,
        cnpj: empresa.cnpj,
        email: empresa.email,
        telefone: empresa.telefone,
        endereco: empresa.endereco,
      });
      toast.success('Dados da empresa atualizados!');
    } catch {
      toast.error('Erro ao salvar alterações.');
    } finally {
      setEmpresaSaving(false);
    }
  };

  /* ──────── Save appearance config ──────── */
  const handleSaveConfig = async () => {
    if (!empresa) return;
    setConfigSaving(true);
    try {
      await apiPut(`/empresas/${empresaId}/configuracoes`, {
        nome_exibicao: empresa.nome_exibicao || '',
        cor_primaria: empresa.cor_primaria || '#10b981',
        cor_secundaria: empresa.cor_secundaria || '#1f2937',
        logo_b64: empresa.logo_b64 || '',
      });
      toast.success('Configurações salvas!');
    } catch {
      toast.error('Erro ao salvar alterações.');
    } finally {
      setConfigSaving(false);
    }
  };

  /* ──────── User CRUD ──────── */
  const handleToggleActive = async (u: Usuario) => {
    try {
      await apiPut(`/usuarios/${empresaId}/${u.id}`, { ativo: !u.ativo });
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, ativo: !u.ativo } : x)));
      toast.success('Status do membro atualizado!');
    } catch {
      toast.error('Erro ao salvar alterações.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeletingId(userId);
    try {
      await apiDelete(`/usuarios/${empresaId}/${userId}`);
      setUsuarios((prev) => prev.filter((x) => x.id !== userId));
      toast.success('Membro removido do sistema.');
    } catch {
      toast.error('Erro ao salvar alterações.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveUser = async (data: { nome: string; email: string; cargo: Usuario['cargo']; senha: string; ativo: boolean }) => {
    setUserSaving(true);
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = { nome: data.nome, email: data.email, cargo: data.cargo, ativo: data.ativo };
        if (data.senha) payload.senha = data.senha;
        await apiPut(`/usuarios/${empresaId}/${editingUser.id}`, payload);
        toast.success('Dados do membro atualizados.');
      } else {
        await apiPost(`/usuarios/${empresaId}`, data);
        toast.success('Membro adicionado ao time!');
      }
      setModalOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar membro.';
      toast.error('Erro ao salvar alterações.');
    } finally {
      setUserSaving(false);
    }
  };

  /* ──────── RBAC check ──────── */
  if (user && user.cargo !== 'DONO' && user.cargo !== 'master') {
    return <AccessDenied />;
  }

  /* ──────── Render: Loading ──────── */
  if (empresaLoading) {
    return <ConfigSkeleton />;
  }

  const userCargoBadge = CARGO_BADGE[user?.cargo || ''] || { label: user?.cargo || '', classes: 'bg-zinc-700/10 text-zinc-400 border-zinc-700/20' };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Settings className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Configurações</h1>
              <p className="text-zinc-400 text-sm mt-0.5">Gerencie sua empresa e equipe</p>
            </div>
          </div>
          <span className={`hidden sm:inline-flex items-center px-2.5 py-1 text-[10px] rounded-full font-bold border ${userCargoBadge.classes}`}>
            {userCargoBadge.label}
          </span>
        </div>
      </div>

      {/* ─── Tab Navigation — Segmented Control ──────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-1 flex gap-1">
        <button
          onClick={() => setTab('empresa')}
          className={`flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'empresa'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              : 'text-zinc-500 hover:text-zinc-300 rounded-lg px-4 py-2.5 transition-colors border border-transparent'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span className="hidden sm:inline">Empresa</span>
        </button>
        <button
          onClick={() => setTab('time')}
          className={`flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'time'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              : 'text-zinc-500 hover:text-zinc-300 rounded-lg px-4 py-2.5 transition-colors border border-transparent'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Time</span>
        </button>
      </div>

      {/* ──────── Tab: Empresa ──────── */}
      {tab === 'empresa' && empresa && (
        <div className="space-y-6">
          {/* Section: Dados da Empresa */}
          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 md:p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-zinc-800/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Dados da Empresa</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FieldInput
                label="Nome Fantasia"
                value={empresa.nome_fantasia}
                onChange={(v) => setEmpresa({ ...empresa, nome_fantasia: v })}
                placeholder="Nome fantasia"
              />
              <FieldInput
                label="Razão Social"
                value={empresa.razao_social}
                onChange={(v) => setEmpresa({ ...empresa, razao_social: v })}
                placeholder="Razão social"
              />
              <FieldInput
                label="CNPJ"
                value={empresa.cnpj}
                onChange={(v) => setEmpresa({ ...empresa, cnpj: v })}
                placeholder="00.000.000/0001-00"
              />
            </div>
          </div>

          {/* Section: Contato */}
          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 md:p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-zinc-800/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Phone className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Contato</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldInput
                label="Email"
                type="email"
                value={empresa.email}
                onChange={(v) => setEmpresa({ ...empresa, email: v })}
                placeholder="contato@empresa.com"
              />
              <FieldInput
                label="Telefone"
                value={empresa.telefone}
                onChange={(v) => setEmpresa({ ...empresa, telefone: v })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {/* Section: Endereço */}
          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 md:p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-zinc-800/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Endereço</h2>
            </div>
            <FieldInput
              label="Endereço Completo"
              value={empresa.endereco}
              onChange={(v) => setEmpresa({ ...empresa, endereco: v })}
              placeholder="Rua, número, bairro, cidade - UF"
            />
          </div>

          {/* Section: Logo */}
          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 md:p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-zinc-800/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Upload className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Logo da Empresa</h2>
            </div>
            <div className="border-2 border-dashed border-zinc-700/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-zinc-600 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-zinc-500" />
              <p className="text-zinc-400 text-sm">Clique ou arraste a logo aqui</p>
              <p className="text-zinc-600 text-xs">PNG, JPG ou SVG (máx. 2MB)</p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveEmpresa}
              disabled={empresaSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 py-3 px-6 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.98]"
            >
              {empresaSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </button>
          </div>

          {/* Section: Aparência */}
          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 md:p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-zinc-800/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Aparência</h2>
            </div>

            <div className="space-y-4">
              <FieldInput
                label="Nome de Exibição"
                value={empresa.nome_exibicao || ''}
                onChange={(v) => setEmpresa({ ...empresa, nome_exibicao: v })}
                placeholder="Nome exibido no sistema"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Cor Primária
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={empresa.cor_primaria || '#10b981'}
                      onChange={(e) => setEmpresa({ ...empresa, cor_primaria: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-950 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={empresa.cor_primaria || '#10b981'}
                      onChange={(e) => setEmpresa({ ...empresa, cor_primaria: e.target.value })}
                      placeholder="#10b981"
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Cor Secundária
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={empresa.cor_secundaria || '#1f2937'}
                      onChange={(e) => setEmpresa({ ...empresa, cor_secundaria: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-950 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={empresa.cor_secundaria || '#1f2937'}
                      onChange={(e) => setEmpresa({ ...empresa, cor_secundaria: e.target.value })}
                      placeholder="#1f2937"
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={handleSaveConfig}
                disabled={configSaving}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 py-3 px-6 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-[0.98]"
              >
                {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Aparência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────── Tab: Time ──────── */}
      {tab === 'time' && (
        <div className="space-y-6">
          {/* Header + Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-zinc-400 text-sm">
              {usuarios.length} membro{usuarios.length !== 1 ? 's' : ''} no time
            </p>
            <button
              onClick={() => {
                setEditingUser(null);
                setModalKey((k) => k + 1);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Adicionar Membro
            </button>
          </div>

          {/* Users List */}
          {usersLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            </div>
          ) : usuarios.length === 0 ? (
            /* Empty State */
            <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-8 md:p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-white font-bold text-base mb-1.5">Nenhum membro na equipe</h3>
              <p className="text-zinc-500 text-sm mb-5">Adicione membros para gerenciar o acesso</p>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setModalKey((k) => k + 1);
                  setModalOpen(true);
                }}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-5 py-2.5 text-sm transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Adicionar Primeiro Membro
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
              {usuarios.map((u) => {
                const badge = CARGO_BADGE[u.cargo] || { label: u.cargo, classes: 'bg-zinc-700/10 text-zinc-400 border-zinc-700/20' };
                const avatarClass = CARGO_AVATAR[u.cargo] || 'bg-zinc-800 border-zinc-700';
                const borderClass = CARGO_BORDER[u.cargo] || 'border-l-zinc-700';
                const initials = u.nome
                  .split(' ')
                  .filter((_, i, arr) => i === 0 || i === arr.length - 1)
                  .map((n) => n.charAt(0).toUpperCase())
                  .join('')
                  .slice(0, 2);
                return (
                  <div
                    key={u.id}
                    className={`group relative bg-zinc-900/50 border border-zinc-800 border-l-[3px] ${borderClass} rounded-xl p-4 md:p-5 card-hover transition-all duration-300 ${!u.ativo ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar with 2-letter initials */}
                      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${avatarClass}`}>
                        <span className="text-white font-bold text-sm">
                          {initials}
                        </span>
                      </div>

                      {/* Name + Email + Cargo Badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium text-sm truncate">{u.nome}</span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 text-[10px] rounded-full font-bold border ${badge.classes}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${u.ativo ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                          <p className="text-zinc-500 text-xs truncate">{u.email}</p>
                        </div>
                      </div>

                      {/* Status + Actions — hover reveal */}
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {/* Status badge */}
                        <span
                          className={`hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg font-bold border ${
                            u.ativo
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-700/30 text-zinc-500 border-zinc-700/30'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>

                        {/* Toggle switch */}
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            u.ativo ? 'bg-emerald-600' : 'bg-zinc-700'
                          }`}
                          aria-label={u.ativo ? 'Desativar' : 'Ativar'}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                              u.ativo ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        {/* Edit — hover reveal */}
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setModalKey((k) => k + 1);
                            setModalOpen(true);
                          }}
                          className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          aria-label="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Delete — hover reveal */}
                        {u.cargo !== 'DONO' && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={deletingId === u.id}
                            className="p-2 text-zinc-500 hover:text-white hover:bg-red-600 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            aria-label="Remover"
                          >
                            {deletingId === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* RBAC Info Card */}
          <div className="relative bg-gradient-to-br from-zinc-900/80 to-emerald-950/20 border border-emerald-500/10 rounded-xl p-4 md:p-6 shadow-lg shadow-emerald-500/5 overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Permissões por Cargo</h3>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Controle de acesso RBAC</p>
                </div>
              </div>

              {/* Role badges row */}
              <div className="flex flex-wrap gap-2 mb-4 mt-3">
                {RBAC_INFO.map((info) => (
                  <span
                    key={info.cargo}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] rounded-lg font-bold border ${info.badge}`}
                  >
                    {info.icon}
                    {info.cargo}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {RBAC_INFO.map((info) => (
                  <div
                    key={info.cargo}
                    className={`bg-zinc-950/50 border ${info.borderColor} rounded-lg p-3.5`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {info.icon}
                      <span className={`text-sm font-bold ${info.color}`}>{info.cargo}</span>
                    </div>
                    <p className="text-zinc-400 text-xs leading-relaxed">{info.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      <UserModal
        key={modalKey}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        initial={editingUser}
        loading={userSaving}
      />

    </div>
  );
}