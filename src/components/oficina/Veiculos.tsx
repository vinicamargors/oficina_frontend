'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Plus,
  Search,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  X,
  MessageCircle,
  User,
  Palette,
  Calendar,
  Gauge,
  Wrench,
  CarFront,
  Bell,
  Tag,
  Eye,
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
  clientes?: Cliente;
}

interface PlacaLookup {
  modelo?: string;
  marca?: string;
  cor?: string;
  ano?: number;
  chassi?: string;
}

/* ─── Placa mask ─── */
const maskPlaca = (value: string): string => {
  const raw = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (raw.length <= 3) return raw;
  if (raw.length <= 5) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  if (raw.length <= 7) {
    const alpha = raw.slice(0, 3);
    const fourth = raw.slice(3, 4);
    const rest = raw.slice(4);
    return `${alpha}-${fourth}${rest}`;
  }
  return raw.slice(0, 7).replace(/^(...)(.)/, '$1-$2');
};

const cleanPhone = (phone: string): string => phone.replace(/\D/g, '');

/* ─── Input styling constants ─── */
const inputClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-colors';

/* ─── Color name to CSS color map ─── */
const colorMap: Record<string, string> = {
  branco: '#f5f5f5',
  preto: '#1a1a1a',
  prata: '#a8a9ad',
  cinza: '#71717a',
  vermelho: '#ef4444',
  azul: '#3b82f6',
  verde: '#22c55e',
  amarelo: '#eab308',
  laranja: '#f97316',
  marrom: '#92400e',
  bege: '#d4c5a9',
  dourado: '#d4a017',
  roxo: '#a855f7',
  rosa: '#ec4899',
  bordô: '#7f1d1d',
  cinzaEscuro: '#3f3f46',
  'cinza escuro': '#3f3f46',
  'prata escuro': '#71717a',
};

const getColorDot = (cor: string): string => {
  if (!cor) return '#71717a';
  const lower = cor.toLowerCase().trim();
  return colorMap[lower] || '#71717a';
};

/* ─── Helper: get initials (first 2 letters) ─── */
const getInitials = (name: string) => {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

/* ─── KM reference for progress bar ─── */
const KM_REFERENCE = 50000;


/* ─── O LIVRE MERCADO FUNCIONANDO: COMBOBOX CUSTOMIZADO FLUIDO ─── */
function ComboboxCliente({
  clientes,
  value,
  onChange,
  placeholder = "Buscar cliente...",
  icon = <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
}: {
  clientes: Cliente[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedCliente = clientes.find(c => c.id === value);
  const displayValue = isOpen ? search : (selectedCliente?.nome || '');

  const filtered = clientes.filter(c =>
    (c.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf_cnpj || '').replace(/\D/g, '').includes(search.replace(/\D/g, '')) ||
    (c.telefone || '').replace(/\D/g, '').includes(search.replace(/\D/g, ''))
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      {icon}
      <input
        type="text"
        className={`${inputClass} ${icon ? 'pl-11' : ''} pr-10`}
        placeholder={placeholder}
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
          if (value && e.target.value !== selectedCliente?.nome) onChange('');
        }}
        onClick={() => {
          setIsOpen(true);
          setSearch('');
        }}
      />
      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-zinc-400 text-center">Nenhum cliente encontrado</div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                type="button"
                className={`w-full text-left px-4 py-3 text-sm transition-colors border-b border-zinc-800/50 last:border-0 ${
                  value === c.id ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
                onClick={() => {
                  onChange(c.id);
                  setSearch('');
                  setIsOpen(false);
                }}
              >
                <div className="font-medium">{c.nome}</div>
                {(c.telefone || c.cpf_cnpj) && (
                  <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                    {[c.telefone, c.cpf_cnpj].filter(Boolean).join(' • ')}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}


/* ─── Skeleton Components ─── */
function VehicleCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-6 animate-pulse overflow-hidden">
      <div className="h-0.5 bg-zinc-800 rounded-t-xl mb-4" />
      <div className="flex items-center gap-3 mb-3">
        <div className="w-24 h-7 rounded bg-zinc-800" />
        <div className="w-16 h-5 rounded-md bg-zinc-800/50" />
      </div>
      <div className="w-40 h-4 rounded bg-zinc-800 mb-1.5" />
      <div className="grid grid-cols-2 gap-2.5 mt-3">
        <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-zinc-800/80" /><div className="space-y-1"><div className="w-8 h-2 rounded bg-zinc-800/40" /><div className="w-14 h-3 rounded bg-zinc-800/60" /></div></div>
        <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-zinc-800/80" /><div className="space-y-1"><div className="w-6 h-2 rounded bg-zinc-800/40" /><div className="w-16 h-3 rounded bg-zinc-800/60" /></div></div>
        <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-zinc-800/80" /><div className="space-y-1"><div className="w-6 h-2 rounded bg-zinc-800/40" /><div className="w-12 h-3 rounded bg-zinc-800/60" /></div></div>
        <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-zinc-800/80" /><div className="space-y-1"><div className="w-10 h-2 rounded bg-zinc-800/40" /><div className="w-18 h-3 rounded bg-zinc-800/60" /></div></div>
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-zinc-800/50">
        <div className="w-7 h-7 rounded-full bg-zinc-800" /><div className="w-32 h-3 rounded bg-zinc-800/60" />
      </div>
    </div>
  );
}

/* ─── MODAL INDEPENDENTE ─── */
function VeiculoModal({
  onClose,
  editingVeiculo,
  prefilledClienteId,
  user,
  clientes,
  veiculos,
  onSuccess
}: {
  onClose: () => void;
  editingVeiculo: Veiculo | null;
  prefilledClienteId: string;
  user: any;
  clientes: Cliente[];
  veiculos: Veiculo[];
  onSuccess: () => void;
}) {
  const [formPlaca, setFormPlaca] = useState(editingVeiculo?.placa || '');
  const [formModelo, setFormModelo] = useState(editingVeiculo?.modelo || '');
  const [formMarca, setFormMarca] = useState(editingVeiculo?.marca || '');
  const [formCor, setFormCor] = useState(editingVeiculo?.cor || '');
  const [formAno, setFormAno] = useState(editingVeiculo?.ano ? String(editingVeiculo.ano) : '');
  const [formKm, setFormKm] = useState(editingVeiculo?.km_atual ? String(editingVeiculo.km_atual) : '');
  const [formChassi, setFormChassi] = useState(editingVeiculo?.chassi || '');
  const [formClienteId, setFormClienteId] = useState(editingVeiculo?.cliente_id || prefilledClienteId || '');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [placaLookupLoading, setPlacaLookupLoading] = useState(false);

  const checkDuplicatePlaca = (placa: string, currentId?: string): string => {
    const clean = placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length < 7) return '';
    const dup = veiculos.find(
      (v) => v.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === clean && v.id !== currentId
    );
    return dup ? `Já existe um veículo com esta placa: ${dup.modelo} (${dup.placa})` : '';
  };

  const handlePlacaBlur = async () => {
    const rawPlaca = formPlaca.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (rawPlaca.length < 7) return;
    if (editingVeiculo && formModelo) return;

    setPlacaLookupLoading(true);
    try {
      const data = await apiGet<PlacaLookup>(`/veiculos/consulta-placa/${rawPlaca}`);
      if (data) {
        if (data.modelo) setFormModelo(data.modelo);
        if (data.marca) setFormMarca(data.marca);
        if (data.cor) setFormCor(data.cor);
        if (data.ano) setFormAno(String(data.ano));
        if (data.chassi) setFormChassi(data.chassi);
      }
    } catch {
      // ignore
    } finally {
      setPlacaLookupLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formPlaca.trim() || !formModelo.trim()) {
      setFormError('Placa e Modelo são obrigatórios.');
      return;
    }
    if (!formClienteId) {
      setFormError('Selecione um cliente válido.');
      return;
    }

    setSaving(true);
    setFormError('');
    setDuplicateWarning('');

    try {
      const dup = checkDuplicatePlaca(formPlaca, editingVeiculo?.id);
      if (dup) {
        setDuplicateWarning(dup);
        toast.error('Placa já cadastrada!', { description: 'Um veículo com essa placa já existe.' });
        setSaving(false);
        return;
      }

      const rawPlaca = formPlaca.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

      const payload = {
        placa: rawPlaca,
        modelo: formModelo.trim(),
        marca: formMarca.trim(),
        cor: formCor.trim(),
        km_atual: Number(formKm) || 0,
        ano: Number(formAno) || new Date().getFullYear(),
        chassi: formChassi.trim(),
        cliente_id: formClienteId,
        empresa_id: user.empresa_id,
      };

      if (editingVeiculo) {
        await apiPut(`/veiculos/${user.empresa_id}/${editingVeiculo.id}`, payload);
      } else {
        await apiPost('/veiculos/', payload);
      }

      toast.success('Veículo salvo com sucesso!');
      onSuccess();
    } catch (err: unknown) {
      toast.error('Erro ao salvar veículo.');
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar veículo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm glass" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="px-5 py-4 bg-zinc-900/30 border-b border-zinc-800/50 sticky top-0 bg-zinc-900 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                {editingVeiculo ? <Pencil className="w-4 h-4 text-emerald-400" /> : <CarFront className="w-4 h-4 text-emerald-400" />}
              </div>
              <h2 className="text-white font-bold text-lg">{editingVeiculo ? 'Editar Veículo' : 'Novo Veículo'}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}
          {duplicateWarning && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {duplicateWarning}
            </div>
          )}

          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 px-1 mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400"><CarFront className="w-3.5 h-3.5 text-emerald-400" /> Dados do Veículo</div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Placa *</label>
                  <div className="relative">
                    <input type="text" placeholder="ABC-1D23" value={formPlaca} onChange={(e) => { setFormPlaca(maskPlaca(e.target.value)); setDuplicateWarning(''); }} onBlur={handlePlacaBlur} className={`${inputClass} font-mono uppercase tracking-wider ${placaLookupLoading ? 'pr-10' : ''}`} maxLength={8} autoFocus />
                    {placaLookupLoading && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />}
                  </div>
                </div>
                <div>
                  <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Cliente *</label>
                  <ComboboxCliente 
                    clientes={clientes} 
                    value={formClienteId} 
                    onChange={setFormClienteId} 
                    icon={null} // Sem icone dentro do form para economizar espaço visual
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Modelo *</label>
                  <input type="text" placeholder="Ex: Civic EXL" value={formModelo} onChange={(e) => setFormModelo(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Marca</label>
                  <input type="text" placeholder="Ex: Honda" value={formMarca} onChange={(e) => setFormMarca(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Cor</label>
                <input type="text" placeholder="Ex: Prata" value={formCor} onChange={(e) => setFormCor(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 px-1 mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400"><Gauge className="w-3.5 h-3.5 text-emerald-400" /> Especificações</div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Ano</label>
                  <input type="number" placeholder="2024" value={formAno} onChange={(e) => setFormAno(e.target.value)} className={`${inputClass} tabular-nums`} min={1900} max={2100} />
                </div>
                <div>
                  <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">KM Atual</label>
                  <input type="number" placeholder="0" value={formKm} onChange={(e) => setFormKm(e.target.value)} className={`${inputClass} tabular-nums`} min={0} />
                </div>
              </div>
              <div>
                <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Chassi</label>
                <input type="text" placeholder="Número do chassi" value={formChassi} onChange={(e) => setFormChassi(e.target.value.toUpperCase())} className={`${inputClass} font-mono text-xs`} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-800/50 sticky bottom-0 bg-zinc-900">
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-sm font-medium px-4 py-2.5 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl px-5 py-3 text-sm transition-all disabled:opacity-50 active:scale-[0.98]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {editingVeiculo ? 'Salvar Alterações' : 'Cadastrar Veículo'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
export default function Veiculos() {
  const user = useAuthStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);
  const screenParams = useAppStore((s) => s.screenParams);

  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterClienteId, setFilterClienteId] = useState('');
  const [filterReviewPending, setFilterReviewPending] = useState(false);
  const [filterColor, setFilterColor] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<Veiculo | null>(null);
  const [prefilledClienteId, setPrefilledClienteId] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadVeiculos = useCallback(async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<Veiculo[]>(`/veiculos/${user.empresa_id}`);
      setVeiculos(Array.isArray(data) ? data : []);
    } catch {
      setError('Não foi possível carregar os veículos.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id]);

  const loadClientes = useCallback(async () => {
    if (!user?.empresa_id) return;
    try {
      const data = await apiGet<Cliente[]>(`/clientes/${user.empresa_id}`);
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      // silent fail
    }
  }, [user?.empresa_id]);

  useEffect(() => {
    loadVeiculos();
    loadClientes();
  }, [loadVeiculos, loadClientes]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  const filteredVeiculos = veiculos.filter((v) => {
    if (filterClienteId && v.cliente_id !== filterClienteId) return false;
    if (filterReviewPending && v.km_atual <= 10000) return false;
    if (filterColor && (v.cor || '').toLowerCase().trim() !== filterColor) return false;
    if (!debouncedSearch) return true;
    
    const term = debouncedSearch.toLowerCase();
    return (
      (v.placa || '').toLowerCase().includes(term) ||
      (v.modelo || '').toLowerCase().includes(term) ||
      (v.marca || '').toLowerCase().includes(term)
    );
  });

  const reviewPendingCount = veiculos.filter((v) => v.km_atual > 10000).length;

  const availableColors = useMemo(() => {
    const colorSet = new Set<string>();
    for (const v of veiculos) {
      if (v.cor) {
        const lower = v.cor.toLowerCase().trim();
        if (colorMap[lower]) colorSet.add(lower);
      }
    }
    return Array.from(colorSet);
  }, [veiculos]);

  const getClienteNome = (clienteId: string): string => {
    const veiculoWithCliente = veiculos.find((v) => v.cliente_id === clienteId && v.clientes);
    if (veiculoWithCliente?.clientes) return veiculoWithCliente.clientes.nome;
    const cliente = clientes.find((c) => c.id === clienteId);
    return cliente?.nome || 'Cliente não encontrado';
  };

  const getCliente = (clienteId: string): Cliente | undefined => {
    const veiculoWithCliente = veiculos.find((v) => v.cliente_id === clienteId && v.clientes);
    if (veiculoWithCliente?.clientes) return veiculoWithCliente.clientes;
    return clientes.find((c) => c.id === clienteId);
  };

  const openNewModal = (prefilledId?: string) => {
    setEditingVeiculo(null);
    setPrefilledClienteId(prefilledId || '');
    setModalOpen(true);
  };

  const openEditModal = (veiculo: Veiculo) => {
    setEditingVeiculo(veiculo);
    setPrefilledClienteId('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingVeiculo(null);
    setPrefilledClienteId('');
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiDelete(`/veiculos/${user!.empresa_id}/${id}`);
      setDeleteConfirm(null);
      if (expandedId === id) setExpandedId(null);
      toast.success('Veículo removido.');
      loadVeiculos();
    } catch (err: unknown) {
      toast.error('Erro ao excluir veículo.');
    } finally {
      setDeleting(false);
    }
  };

  const screenParamsRef = useRef(screenParams);
  screenParamsRef.current = screenParams;

  useEffect(() => {
    const params = screenParamsRef.current;
    if (params?.action === 'new' && params?.cliente_id) {
      const timer = setTimeout(() => openNewModal(params.cliente_id), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="w-48 h-7 rounded-lg bg-zinc-800 animate-pulse" />
              <div className="w-40 h-4 rounded bg-zinc-800/60 animate-pulse" />
            </div>
            <div className="w-40 h-11 rounded-xl bg-zinc-800 animate-pulse" />
          </div>
        </div>
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-1.5">
          <div className="flex gap-3">
            <div className="flex-1 h-11 rounded-xl bg-zinc-800/50 border border-zinc-800 animate-pulse" />
            <div className="w-44 h-11 rounded-xl bg-zinc-800/50 border border-zinc-800 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <VehicleCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <CarFront className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Garagem / Veículos</h1>
              <p className="text-zinc-400 text-sm mt-1">Gerencie a frota de clientes</p>
            </div>
          </div>
          <button
            onClick={() => openNewModal()}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" /> Novo Veículo
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-1.5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40" />
            <input
              type="text"
              placeholder="Buscar por placa, marca ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`${inputClass} pl-11 pr-10`}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="w-full sm:w-[300px]">
            <ComboboxCliente 
              clientes={clientes} 
              value={filterClienteId} 
              onChange={setFilterClienteId} 
              placeholder="Filtrar por proprietário..." 
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 overflow-x-auto pb-1 custom-scrollbar">
          {availableColors.length > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-1">Cor</span>
              {availableColors.map((color) => {
                const isActive = filterColor === color;
                return (
                  <button
                    key={color}
                    onClick={() => setFilterColor(isActive ? null : color)}
                    title={color}
                    className={`w-5 h-5 rounded-full border-2 transition-all flex-shrink-0 ${isActive ? 'border-white scale-110 shadow-lg' : 'border-zinc-700 hover:border-zinc-500 opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: colorMap[color] || '#71717a' }}
                  />
                );
              })}
              {filterColor && (
                <button onClick={() => setFilterColor(null)} className="text-[10px] text-zinc-500 hover:text-white font-bold ml-1 flex-shrink-0"><X className="w-3 h-3" /></button>
              )}
            </div>
          )}
          <div className="w-px h-5 bg-zinc-800 flex-shrink-0" />
          <button
            onClick={() => setFilterReviewPending(!filterReviewPending)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 whitespace-nowrap ${filterReviewPending ? 'bg-amber-600/20 text-amber-400 border-amber-500/30' : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'}`}
          >
            <span className="inline-flex items-center gap-1.5"><Bell className="w-3 h-3" /> Revisões Pendentes</span>
            <span className="ml-1.5 text-[10px] opacity-70">({reviewPendingCount})</span>
          </button>
        </div>
      </div>

      {filteredVeiculos.length === 0 ? (
        <div className="text-center py-20 relative">
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.06)_0%,_transparent_70%)]" />
          <div className="relative z-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center glow-emerald">
              <CarFront className="w-12 h-12 text-emerald-500/60" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">{veiculos.length === 0 ? 'Nenhum veículo cadastrado' : 'Nenhum veículo encontrado'}</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-8">{veiculos.length === 0 ? 'Adicione seu primeiro veículo para começar a gerenciar a garagem' : 'Tente ajustar os filtros ou o termo de busca para encontrar o que procura.'}</p>
            {veiculos.length === 0 && (
              <button onClick={() => openNewModal()} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all">
                <Plus className="w-4 h-4" /> Cadastrar Veículo
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredVeiculos.map((veiculo) => {
            const isExpanded = expandedId === veiculo.id;
            const cliente = getCliente(veiculo.cliente_id);
            const needsReview = veiculo.km_atual > 10000;
            const dotColor = getColorDot(veiculo.cor);
            const proximaRevisao = veiculo.km_atual > 0 ? (veiculo.km_atual + 5000).toLocaleString('pt-BR') : 'A verificar';
            const kmPercent = Math.min((veiculo.km_atual / KM_REFERENCE) * 100, 100);
            const kmBarColor = kmPercent > 80 ? 'bg-red-500/60' : kmPercent > 50 ? 'bg-amber-500/60' : 'bg-emerald-500/60';

            return (
              <div key={veiculo.id} className={`group bg-zinc-900/50 border border-zinc-800 rounded-xl transition-all duration-300 ease-out hover:border-zinc-700 card-hover overflow-hidden relative ${isExpanded ? 'shadow-lg shadow-emerald-500/5' : ''}`}>
                <div className={`h-0.5 rounded-t-xl ${needsReview ? 'bg-amber-500/50' : 'bg-emerald-500/50'}`} />
                <div className="p-4 md:p-6 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : veiculo.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold uppercase tracking-wider">{veiculo.placa.toUpperCase()}</span>
                        {needsReview && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase">
                            <Bell className="w-3 h-3" /> Revisão Recomendada
                          </span>
                        )}
                      </div>
                      <h3 className="text-white font-semibold text-sm truncate hover:text-emerald-400 transition-colors">{veiculo.modelo}</h3>
                      <div className="grid grid-cols-2 gap-2.5 mt-3">
                        <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-zinc-800/80 flex items-center justify-center flex-shrink-0"><Tag className="w-3.5 h-3.5 text-zinc-400" /></div><div><span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block leading-none">Marca</span><span className="text-xs text-zinc-300 mt-0.5 block truncate">{veiculo.marca || '—'}</span></div></div>
                        <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-zinc-800/80 flex items-center justify-center flex-shrink-0"><Palette className="w-3.5 h-3.5 text-zinc-400" /></div><div><span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block leading-none">Cor</span><div className="flex items-center gap-1.5 mt-0.5"><span className="w-4 h-4 rounded-full flex-shrink-0 border border-white/20 shadow-sm" style={{ backgroundColor: dotColor }} /><span className="text-xs text-zinc-300 truncate">{veiculo.cor || '—'}</span></div></div></div>
                        <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-zinc-800/80 flex items-center justify-center flex-shrink-0"><Calendar className="w-3.5 h-3.5 text-zinc-400" /></div><div><span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block leading-none">Ano</span><span className="text-xs text-zinc-300 mt-0.5 block tabular-nums">{veiculo.ano}</span></div></div>
                        <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-zinc-800/80 flex items-center justify-center flex-shrink-0"><Gauge className="w-3.5 h-3.5 text-zinc-400" /></div><div className="flex-1 min-w-0"><span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block leading-none">KM</span><span className="text-xs text-zinc-300 mt-0.5 block tabular-nums">{veiculo.km_atual?.toLocaleString('pt-BR') || '0'}</span>{veiculo.km_atual > 0 && (<div className="mt-1 h-1 w-full rounded-full bg-zinc-800 overflow-hidden"><div className={`h-full rounded-full animate-stock-fill ${kmBarColor}`} style={{ width: `${kmPercent}%` }} /></div>)}</div></div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-800/50">
                        <Calendar className="w-3 h-3 text-zinc-600" />
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold">Próx. revisão</span>
                        <span className="text-xs text-zinc-400 font-mono tabular-nums">{proximaRevisao} km</span>
                      </div>
                      <div className="flex items-center gap-2.5 mt-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center flex-shrink-0"><User className="w-3 h-3 text-emerald-400" /></div>
                        <span className="text-zinc-300 text-xs font-medium truncate hover:text-emerald-400 transition-colors">{veiculo.clientes?.nome || getClienteNome(veiculo.cliente_id)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                    </div>
                  </div>
                  {!isExpanded && (
                    <div className="quick-actions-reveal absolute bottom-3 right-3 flex items-center gap-1.5">
                      <button onClick={(e) => { e.stopPropagation(); openEditModal(veiculo); }} className="p-1.5 rounded-lg bg-zinc-800/90 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setExpandedId(veiculo.id); }} className="p-1.5 rounded-lg bg-zinc-800/90 border border-zinc-700/50 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all" title="Detalhes"><Eye className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-800/50 px-4 md:px-6 py-4 space-y-4 animate-in fade-in slide-in-from-top-2 transition-all duration-300 ease-out">
                    <div className="grid grid-cols-2 gap-3">
                      <div><span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-1">Placa</span><span className="inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold uppercase tracking-wider">{veiculo.placa.toUpperCase()}</span></div>
                      <div><span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-1">Modelo</span><p className="text-white text-sm mt-0.5">{veiculo.modelo}</p></div>
                      <div><span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-1">Marca</span><p className="text-white text-sm mt-0.5">{veiculo.marca || '—'}</p></div>
                      <div><span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-1">Ano</span><p className="text-white text-sm mt-0.5 tabular-nums">{veiculo.ano}</p></div>
                      <div><span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-1">Cor</span><div className="flex items-center gap-1.5 mt-0.5"><span className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: dotColor }} /><p className="text-white text-sm">{veiculo.cor || '—'}</p></div></div>
                      <div><span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-1">KM Atual</span><p className="text-white text-sm mt-0.5 tabular-nums">{veiculo.km_atual?.toLocaleString('pt-BR') || '0'} km</p></div>
                      {veiculo.chassi && (
                        <div className="col-span-2"><span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-1">Chassi</span><p className="text-white text-sm mt-0.5 font-mono">{veiculo.chassi}</p></div>
                      )}
                    </div>

                    {cliente && (
                      <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4">
                        <span className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold block mb-2.5">Proprietário</span>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center flex-shrink-0"><span className="text-emerald-400 font-bold text-xs">{getInitials(cliente.nome)}</span></div>
                            <div><p className="text-white text-sm font-medium">{cliente.nome}</p>{cliente.telefone && (<p className="text-zinc-400 text-xs mt-0.5 font-mono">{cliente.telefone}</p>)}</div>
                          </div>
                          {cliente.telefone && (
                            <a href={`https://wa.me/55${cleanPhone(cliente.telefone)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/25 font-bold rounded-xl px-3 py-2 text-xs transition-colors"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</a>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-zinc-500 text-xs">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Veja o histórico completo na tela de <button onClick={() => navigate('ordens-servico')} className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2 transition-colors">Ordens de Serviço</button></span>
                    </div>

                    {deleteConfirm === veiculo.id ? (
                      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                        <p className="text-red-300 text-sm font-medium mb-3">Excluir veículo <strong className="font-mono">{veiculo.placa.toUpperCase()}</strong> ({veiculo.modelo})?</p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDelete(veiculo.id)} disabled={deleting} className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg px-4 py-2 transition-colors disabled:opacity-50">
                            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Sim, Excluir
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="text-zinc-400 hover:text-white text-xs font-medium px-3 py-2 transition-colors">Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditModal(veiculo)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors" title="Editar"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteConfirm(veiculo.id)} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <VeiculoModal
          onClose={closeModal}
          editingVeiculo={editingVeiculo}
          prefilledClienteId={prefilledClienteId}
          user={user}
          clientes={clientes}
          veiculos={veiculos}
          onSuccess={() => { closeModal(); loadVeiculos(); }}
        />
      )}
    </div>
  );
}