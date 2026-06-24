'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  User,
  Users,
  Plus,
  Search,
  Loader2,
  AlertTriangle,
  Phone,
  MapPin,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  X,
  Car,
  Bell,
  UserPlus,
  CarFront,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { toast } from 'sonner';

/* ─── Types ─── */
interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cpf_cnpj: string;
  endereco: string;
  empresa_id: string;
  created_at?: string;
}

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  cor: string;
  km_atual: number;
  ano: number;
  chassi: string;
  cliente_id: string;
  empresa_id: string;
}

/* ─── Masks ─── */
const maskPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const maskCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

const maskCNPJ = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
};

const maskDocument = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) return maskCPF(value);
  return maskCNPJ(value);
};

const cleanPhone = (phone: string): string => phone.replace(/\D/g, '');

/* ─── Input styling constant ─── */
const inputClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-colors';

/* ─── Skeleton Components ─── */

function ClientCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-6 animate-pulse border-l-2 border-l-zinc-800">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-zinc-800 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="w-36 h-4 rounded bg-zinc-800" />
          <div className="flex items-center gap-3">
            <div className="w-28 h-3 rounded bg-zinc-800/60" />
            <div className="w-24 h-3 rounded bg-zinc-800/40" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-3 rounded bg-zinc-800/40" />
            <div className="w-14 h-5 rounded-md bg-zinc-800/50" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-zinc-800/50" />
          <div className="w-9 h-9 rounded-xl bg-zinc-800/50" />
          <div className="w-9 h-9 rounded-xl bg-zinc-800/50" />
        </div>
      </div>
    </div>
  );
}

/* ─── Component ─── */
export default function Clientes() {
  const user = useAuthStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Expanded client
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedVeiculos, setExpandedVeiculos] = useState<Veiculo[]>([]);
  const [loadingVeiculos, setLoadingVeiculos] = useState(false);
  const [clientHasVehicles, setClientHasVehicles] = useState<Record<string, boolean>>({});

  // Vehicle count per client
  const [vehicleCounts, setVehicleCounts] = useState<Record<string, number>>({});

  // Form fields
  const [formNome, setFormNome] = useState('');
  const [formTelefone, setFormTelefone] = useState('');
  const [formCpfCnpj, setFormCpfCnpj] = useState('');
  const [formEndereco, setFormEndereco] = useState('');

  // Quick-create modal
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [qcNome, setQcNome] = useState('');
  const [qcTelefone, setQcTelefone] = useState('');
  const [qcCpfCnpj, setQcCpfCnpj] = useState('');
  const [qcEndereco, setQcEndereco] = useState('');
  const [qcSaving, setQcSaving] = useState(false);
  const [qcError, setQcError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ─── Load clients ─── */
  const loadClientes = useCallback(async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<Cliente[]>(`/clientes/${user.empresa_id}`);
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setError('Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  /* ─── Load vehicle counts for all clients ─── */
  const loadVehicleCounts = useCallback(async () => {
    if (!user?.empresa_id) return;
    try {
      const data = await apiGet<Veiculo[]>(`/veiculos/${user.empresa_id}`);
      if (Array.isArray(data)) {
        const counts: Record<string, number> = {};
        const hasVeh: Record<string, boolean> = {};
        data.forEach((v) => {
          counts[v.cliente_id] = (counts[v.cliente_id] || 0) + 1;
          hasVeh[v.cliente_id] = true;
        });
        setVehicleCounts(counts);
        setClientHasVehicles((prev) => ({ ...prev, ...hasVeh }));
      }
    } catch {
      // Silently fail — vehicle counts are supplementary
    }
  }, [user?.empresa_id]);

  useEffect(() => {
    loadVehicleCounts();
  }, [loadVehicleCounts]);

  /* ─── Search debounce ─── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  const term = searchTerm.toLowerCase();
    const filteredClientes = clientes.filter((c) => {
      return (
        (c.nome?.toLowerCase().includes(term)) ||
        (c.telefone?.toLowerCase().includes(term)) ||
        (c.cpf_cnpj?.toLowerCase().includes(term))
      );
    });

  /* ─── Stats ─── */
  const totalClientes = clientes.length;
  const clientesComVeiculos = Object.values(vehicleCounts).filter((c) => c > 0).length;
  const novosEsteMes = clientes.filter((c) => {
    if (!c.created_at) return false;
    try {
      const created = new Date(c.created_at);
      const now = new Date();
      return (
        created.getMonth() === now.getMonth() &&
        created.getFullYear() === now.getFullYear()
      );
    } catch {
      return false;
    }
  }).length;

  /* ─── Expand client & load vehicles ─── */
  const toggleExpand = async (clienteId: string) => {
    if (expandedId === clienteId) {
      setExpandedId(null);
      setExpandedVeiculos([]);
      return;
    }
    setExpandedId(clienteId);
    setLoadingVeiculos(true);
    try {
      const data = await apiGet<Veiculo[]>(`/veiculos/${user?.empresa_id}`);
      const filtered = Array.isArray(data)
        ? data.filter((v) => v.cliente_id === clienteId)
        : [];
      setExpandedVeiculos(filtered);
      setClientHasVehicles((prev) => ({ ...prev, [clienteId]: filtered.length > 0 }));
    } catch {
      setExpandedVeiculos([]);
      setClientHasVehicles((prev) => ({ ...prev, [clienteId]: false }));
    } finally {
      setLoadingVeiculos(false);
    }
  };

  /* ─── Modal open/close ─── */
  const openNewModal = () => {
    setEditingCliente(null);
    setFormNome('');
    setFormTelefone('');
    setFormCpfCnpj('');
    setFormEndereco('');
    setFormError('');
    setDuplicateWarning('');
    setModalOpen(true);
  };

  const openEditModal = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormNome(cliente.nome);
    setFormTelefone(cliente.telefone);
    setFormCpfCnpj(cliente.cpf_cnpj);
    setFormEndereco(cliente.endereco);
    setFormError('');
    setDuplicateWarning('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCliente(null);
    setFormError('');
    setDuplicateWarning('');
  };

  /* ─── Quick-create modal ─── */
  const openQuickCreate = () => {
    setQcNome('');
    setQcTelefone('');
    setQcCpfCnpj('');
    setQcEndereco('');
    setQcError('');
    setShowQuickCreate(true);
  };

  const closeQuickCreate = () => {
    setShowQuickCreate(false);
    setQcError('');
  };

  const handleQuickCreate = async () => {
    if (!qcNome.trim()) {
      setQcError('Nome é obrigatório.');
      return;
    }
    setQcSaving(true);
    setQcError('');
    try {
      await apiPost('/clientes/', {
        nome: qcNome.trim(),
        telefone: cleanPhone(qcTelefone),
        cpf_cnpj: qcCpfCnpj.replace(/\D/g, ''),
        endereco: qcEndereco.trim(),
        empresa_id: user!.empresa_id,
      });
      toast.success('Cliente cadastrado com sucesso!');
      closeQuickCreate();
      loadClientes();
      loadVehicleCounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar cliente.';
      setQcError(msg);
      toast.error('Erro ao cadastrar cliente.');
    } finally {
      setQcSaving(false);
    }
  };

  /* ─── Duplicate check ─── */
  const checkDuplicate = (cpfCnpj: string, currentId?: string): string => {
    const clean = cpfCnpj.replace(/\D/g, '');
    if (clean.length < 11) return '';
    const duplicate = clientes.find(
      (c) => c.cpf_cnpj.replace(/\D/g, '') === clean && c.id !== currentId
    );
    return duplicate ? `Já existe um cliente com este CPF/CNPJ: ${duplicate.nome}` : '';
  };

  /* ─── Save client ─── */
  const handleSave = async () => {
    if (!formNome.trim()) {
      setFormError('Nome é obrigatório.');
      return;
    }

    setSaving(true);
    setFormError('');
    setDuplicateWarning('');

    try {
      const dup = checkDuplicate(formCpfCnpj, editingCliente?.id);
      if (dup) {
        setDuplicateWarning(dup);
        toast.error('CPF/CNPJ já cadastrado!', { description: 'Verifique se o cliente já existe no sistema.' });
        setSaving(false);
        return;
      }

      const payload = {
        nome: formNome.trim(),
        telefone: cleanPhone(formTelefone),
        cpf_cnpj: formCpfCnpj.replace(/\D/g, ''),
        endereco: formEndereco.trim(),
        empresa_id: user!.empresa_id,
      };

      if (editingCliente) {
        await apiPut(`/clientes/${user!.empresa_id}/${editingCliente.id}`, payload);
      } else {
        await apiPost('/clientes/', payload);
      }

      closeModal();
      toast.success('Cliente salvo com sucesso!');
      loadClientes();
    } catch (err: unknown) {
      toast.error('Erro ao salvar cliente.');
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar cliente.');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Delete client ─── */
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiDelete(`/clientes/${user!.empresa_id}/${id}`);
      setDeleteConfirm(null);
      if (expandedId === id) {
        setExpandedId(null);
        setExpandedVeiculos([]);
      }
      toast.success('Cliente removido.');
      loadClientes();
      loadVehicleCounts();
    } catch (err: unknown) {
      toast.error('Erro ao salvar cliente.');
      setFormError(err instanceof Error ? err.message : 'Erro ao excluir cliente.');
    } finally {
      setDeleting(false);
    }
  };

  /* ─── WhatsApp helpers ─── */
  const getWhatsAppLink = (phone: string, message?: string) => {
    const clean = cleanPhone(phone);
    const encoded = message ? encodeURIComponent(message) : '';
    return `https://wa.me/55${clean}${encoded ? `?text=${encoded}` : ''}`;
  };

  const reviewMessage = (nome: string) =>
    `Olá ${nome}! Aqui é da oficina AutoTec. Passamos para lembrar que já se passaram 6 meses desde a última revisão do seu veículo. Que tal agendar uma revisão preventiva? Ficaremos felizes em atendê-lo! 🚗`;

  /* ─── Helper: get initials ─── */
  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || '??';
  };

  /* ─── Loading skeleton state ─── */
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header skeleton */}
        <div className="relative bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="w-52 h-7 rounded-lg bg-zinc-800 animate-pulse" />
              <div className="w-36 h-4 rounded bg-zinc-800/60 animate-pulse" />
            </div>
            <div className="w-36 h-11 rounded-xl bg-zinc-800 animate-pulse" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 mb-2" />
              <div className="w-20 h-3 rounded bg-zinc-800/60" />
              <div className="w-10 h-6 rounded bg-zinc-800/40 mt-1.5" />
            </div>
          ))}
        </div>
        {/* Search skeleton */}
        <div className="bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-1.5">
          <div className="w-full h-11 rounded-xl bg-zinc-800/50 border border-zinc-800 animate-pulse" />
        </div>
        {/* Client card skeletons */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ClientCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with gradient card */}
      <div className="relative bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Gestão de Clientes</h1>
              <p className="text-zinc-400 text-sm mt-1">
                {clientes.length} cliente{clientes.length !== 1 ? 's' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={openNewModal}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </button>
        </div>
      </div>

      {/* ─── Client Stats Summary ─── */}
      <div className="grid grid-cols-3 gap-3">
        {/* Total de Clientes */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover-scale">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total de Clientes</p>
          <p className="text-white text-xl font-bold mt-1 counter-tabular">{totalClientes}</p>
        </div>

        {/* Com Veículos */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover-scale">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <CarFront className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Com Veículos</p>
          <p className="text-white text-xl font-bold mt-1 counter-tabular">{clientesComVeiculos}</p>
        </div>

        {/* Novos Este Mês */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover-scale">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-amber-400" />
            </div>
          </div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Novos Este Mês</p>
          <p className="text-white text-xl font-bold mt-1 counter-tabular">{novosEsteMes}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-1.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 pl-11 pr-10 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {debouncedSearch && (
          <p className="text-[11px] text-zinc-500 mt-2 px-1">
            {filteredClientes.length} cliente{filteredClientes.length !== 1 ? 's' : ''} encontrado{filteredClientes.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Client List */}
      {filteredClientes.length === 0 ? (
        <div className="text-center py-20">
          {/* Emerald glow ring */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl" />
            <div className="absolute inset-0 rounded-full bg-emerald-500/5 blur-2xl" />
            <div className="relative w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-700/50 flex items-center justify-center shadow-lg shadow-emerald-500/5">
              <User className="w-9 h-9 text-emerald-400/70" />
            </div>
          </div>
          <h3 className="text-white font-bold text-lg mb-2">
            {clientes.length === 0
              ? 'Nenhum cliente cadastrado'
              : 'Nenhum cliente encontrado'}
          </h3>
          <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6">
            {clientes.length === 0
              ? 'Adicione seu primeiro cliente para começar'
              : 'Tente ajustar o termo de busca para encontrar o que procura.'}
          </p>
          {clientes.length === 0 && (
            <button
              onClick={openQuickCreate}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
            >
              <UserPlus className="w-4 h-4" />
              Novo Cliente
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClientes.map((cliente) => {
            const isExpanded = expandedId === cliente.id;
            const hasVeh = clientHasVehicles[cliente.id];
            const vCount = vehicleCounts[cliente.id] || 0;
            return (
              <div
                key={cliente.id}
                className={`group bg-zinc-900/50 border border-zinc-800 rounded-xl transition-all duration-300 ease-out hover:border-zinc-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 card-hover ${
                  isExpanded ? 'shadow-lg shadow-emerald-500/5' : ''
                } ${hasVeh ? 'border-l-2 border-l-emerald-500/40' : 'border-l-2 border-l-zinc-800'}`}
              >
                {/* Client Card Header */}
                <div
                  className="p-4 md:p-6 cursor-pointer"
                  onClick={() => toggleExpand(cliente.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        {/* Avatar initials with gradient */}
                        <div className="w-10 h-10 rounded-full bg-linear-to-br from-emerald-500/30 via-emerald-600/15 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/5">
                          <span className="text-emerald-300 font-bold text-sm">
                            {getInitials(cliente.nome)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-semibold text-sm truncate hover:text-emerald-400 transition-colors">
                              {cliente.nome}
                            </h3>
                            {vCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                                <Car className="w-2.5 h-2.5" />
                                {vCount}
                              </span>
                            )}
                            {hasVeh !== undefined && !hasVeh && (
                              <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider shrink-0 bg-zinc-800/50 text-zinc-500 border border-zinc-700/50">
                                Sem veículo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold">Tel</span>
                              <span className="text-zinc-300 text-sm font-mono">
                                {cliente.telefone ? maskPhone(cliente.telefone) : '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold">CPF</span>
                              <span className="text-zinc-400 text-xs font-mono">
                                {cliente.cpf_cnpj ? maskDocument(cliente.cpf_cnpj) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {cliente.endereco && (
                        <div className="flex items-center gap-1.5 mt-2 ml-13">
                          <MapPin className="w-3 h-3 text-zinc-600" />
                          <span className="text-zinc-500 text-xs truncate">{cliente.endereco}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* WhatsApp button */}
                      {cliente.telefone && (
                        <a
                          href={getWhatsAppLink(cliente.telefone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 hover:border-green-500/30 transition-all"
                          title="Ver WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      {/* Edit button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(cliente);
                        }}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {/* Delete button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(cliente.id);
                        }}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {/* Expand chevron */}
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-500 ml-0.5" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-500 ml-0.5" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete confirmation */}
                {deleteConfirm === cliente.id && (
                  <div className="px-4 md:px-6 pb-4">
                    <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                      <p className="text-red-300 text-sm font-medium mb-3">
                        Tem certeza que deseja excluir <strong>{cliente.nome}</strong>?
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(cliente.id)}
                          disabled={deleting}
                          className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
                        >
                          {deleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Sim, Excluir
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-zinc-400 hover:text-white text-xs font-medium px-3 py-2 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-zinc-800/50 px-4 md:px-6 py-4 space-y-4 animate-in fade-in slide-in-from-top-2 transition-all duration-300 ease-out">
                    {/* Full client info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-1">
                          Nome Completo
                        </span>
                        <p className="text-white text-sm mt-0.5">{cliente.nome}</p>
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-1">
                          Telefone
                        </span>
                        <p className="text-white text-sm mt-0.5 font-mono">
                          {cliente.telefone ? maskPhone(cliente.telefone) : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-1">
                          CPF/CNPJ
                        </span>
                        <p className="text-white text-sm mt-0.5 font-mono">
                          {cliente.cpf_cnpj ? maskDocument(cliente.cpf_cnpj) : '—'}
                        </p>
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-1">
                          Endereço
                        </span>
                        <p className="text-white text-sm mt-0.5">{cliente.endereco || '—'}</p>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={getWhatsAppLink(cliente.telefone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-4 py-2.5 text-xs transition-colors active:scale-[0.98]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                      <a
                        href={getWhatsAppLink(cliente.telefone, reviewMessage(cliente.nome))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-amber-600/10 border border-amber-500/20 text-amber-400 hover:bg-amber-600/20 font-bold rounded-xl px-4 py-2.5 text-xs transition-colors"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Lembrar Revisão
                      </a>
                      <button
                        onClick={() => {
                          navigate('veiculos', { cliente_id: cliente.id });
                        }}
                        className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl px-4 py-2.5 text-xs transition-colors"
                      >
                        <Car className="w-3.5 h-3.5" />
                        Ver Veículos
                      </button>
                    </div>

                    {/* Vehicles list */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="uppercase tracking-wider text-[10px] font-bold text-zinc-400 flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5" />
                          Veículos ({expandedVeiculos.length})
                        </h4>
                        <button
                          onClick={() => navigate('veiculos', { action: 'new', cliente_id: cliente.id })}
                          className="text-emerald-400 hover:text-emerald-300 text-xs font-medium flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Adicionar Veículo
                        </button>
                      </div>
                      {loadingVeiculos ? (
                        <div className="space-y-2">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3.5 animate-pulse flex items-center gap-3">
                              <div className="w-20 h-7 rounded bg-zinc-800/60" />
                              <div className="flex-1 space-y-1.5">
                                <div className="w-28 h-3 rounded bg-zinc-800/60" />
                                <div className="w-40 h-2.5 rounded bg-zinc-800/40" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : expandedVeiculos.length === 0 ? (
                        <div className="bg-zinc-800/20 border border-zinc-700/20 rounded-xl p-4 text-center">
                          <Car className="w-5 h-5 text-zinc-600 mx-auto mb-1.5" />
                          <p className="text-zinc-600 text-xs">Nenhum veículo cadastrado</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {expandedVeiculos.map((v) => (
                            <div
                              key={v.id}
                              className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-3.5 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors"
                            >
                              <Car className="w-4 h-4 text-zinc-500 shrink-0" />
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold uppercase tracking-wider shrink-0">
                                {v.placa.toUpperCase()}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-zinc-300 text-xs font-medium truncate">
                                  {v.modelo}
                                </p>
                                <p className="text-zinc-500 text-[11px]">
                                  {v.marca} • {v.ano} • {v.cor}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Floating Action Button (Desktop) ─── */}
      <button
        onClick={openQuickCreate}
        className="hidden lg:flex fixed bottom-6 right-6 z-40 w-14 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white items-center justify-center shadow-xl shadow-emerald-600/30 hover:shadow-emerald-500/40 active:scale-95 transition-all group"
        title="Novo Cliente Rápido"
      >
        <UserPlus className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </button>

      {/* ─── Quick-Create Modal ─── */}
      {showQuickCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeQuickCreate}
          />
          {/* Modal Content */}
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ animation: 'quickCreateIn 0.25s ease-out' }}
          >
            {/* Glass background layer */}
            <div className="absolute inset-0 glass rounded-2xl" />
            {/* Gradient accent line at top */}
            <div className="relative h-1 bg-linear-to-r from-emerald-500 via-emerald-400 to-teal-400" />
            {/* Content */}
            <div className="relative bg-zinc-900/95 rounded-b-2xl border border-zinc-800 border-t-0">
              {/* Header */}
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-base">Novo Cliente</h2>
                    <p className="text-zinc-500 text-[11px]">Cadastro rápido</p>
                  </div>
                </div>
                <button
                  onClick={closeQuickCreate}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <div className="px-5 pb-5 space-y-3">
                {qcError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {qcError}
                  </div>
                )}

                <div>
                  <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">
                    Nome *
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={qcNome}
                    onChange={(e) => { setQcNome(e.target.value); setQcError(''); }}
                    className={inputClass}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') handleQuickCreate(); }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      placeholder="(00) 90000-0000"
                      value={qcTelefone}
                      onChange={(e) => setQcTelefone(maskPhone(e.target.value))}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">
                      CPF / CNPJ
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={qcCpfCnpj}
                      onChange={(e) => setQcCpfCnpj(maskDocument(e.target.value))}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                </div>

                <div>
                  <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">
                    Endereço
                  </label>
                  <input
                    type="text"
                    placeholder="Rua, número, bairro, cidade"
                    value={qcEndereco}
                    onChange={(e) => setQcEndereco(e.target.value)}
                    className={inputClass}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleQuickCreate(); }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={closeQuickCreate}
                    className="text-zinc-400 hover:text-white text-sm font-medium px-3 py-2.5 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleQuickCreate}
                    disabled={qcSaving}
                    className="inline-flex items-center gap-2 bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl px-5 py-2.5 text-sm transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-emerald-600/20"
                  >
                    {qcSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Cadastrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Add/Edit Modal (Enhanced) ─── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm glass"
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Gradient accent line at top */}
            <div className="h-1 bg-linear-to-r from-emerald-500 via-emerald-400 to-teal-400 rounded-t-xl" />

            {/* Modal Header Strip */}
            <div className="px-5 py-4 bg-zinc-900/30 border-b border-zinc-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    {editingCliente ? (
                      <Pencil className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <UserPlus className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <h2 className="text-white font-bold text-lg">
                    {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
                  </h2>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              {duplicateWarning && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {duplicateWarning}
                </div>
              )}

              {/* Dados do Cliente section */}
              <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 px-1 mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  Dados do Cliente
                </div>
                <div className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">
                      Nome *
                    </label>
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={formNome}
                      onChange={(e) => setFormNome(e.target.value)}
                      className={inputClass}
                      autoFocus
                    />
                  </div>

                  {/* CPF/CNPJ */}
                  <div>
                    <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">
                      CPF / CNPJ
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={formCpfCnpj}
                      onChange={(e) => {
                        const val = maskDocument(e.target.value);
                        setFormCpfCnpj(val);
                        setDuplicateWarning('');
                      }}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                </div>
              </div>

              {/* Section divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800/60" />
              </div>

              {/* Contato section */}
              <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 px-1 mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  Contato
                </div>
                <div className="space-y-4">
                  {/* Telefone */}
                  <div>
                    <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">
                      Telefone
                    </label>
                    <input
                      type="tel"
                      placeholder="(00) 90000-0000"
                      value={formTelefone}
                      onChange={(e) => setFormTelefone(maskPhone(e.target.value))}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                </div>
              </div>

              {/* Section divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800/60" />
              </div>

              {/* Endereço section */}
              <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 px-1 mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Endereço
                </div>
                <div>
                  <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">
                    Endereço
                  </label>
                  <input
                    type="text"
                    placeholder="Rua, número, bairro, cidade"
                    value={formEndereco}
                    onChange={(e) => setFormEndereco(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-800/50">
              <button
                onClick={closeModal}
                className="text-zinc-400 hover:text-white text-sm font-medium px-4 py-2.5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl px-5 py-3 text-sm transition-all disabled:opacity-50 active:scale-[0.98]"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {editingCliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}