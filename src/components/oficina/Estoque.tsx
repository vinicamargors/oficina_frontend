'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Plus, Search, Loader2, AlertTriangle, ChevronDown, Pencil, Trash2, X,
  Package, AlertCircle, BarChart3, Tag, DollarSign, TrendingDown
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EstoqueItem {
  id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  custo: number;
  venda: number;
  minimo_alerta: number;
  codigo: string;
  empresa_id: string;
}

// ─── Constants & Helpers ─────────────────────────────────────────────────────

const inputClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-colors';
const selectClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-colors appearance-none cursor-pointer';

const CATEGORIA_OPTIONS = [
  { value: 'PECAS', label: 'Peças' },
  { value: 'FLUIDOS', label: 'Fluidos' },
  { value: 'PNEUS', label: 'Pneus' },
  { value: 'ELETRICA', label: 'Elétrica' },
  { value: 'MAO_OBRA', label: 'Mão de Obra' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function EstoqueCardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2 flex-1">
          <div className="w-32 h-5 rounded bg-zinc-800" />
          <div className="w-20 h-4 rounded bg-zinc-800/60" />
        </div>
        <div className="w-8 h-8 rounded-lg bg-zinc-800/50" />
      </div>
      <div className="w-full h-px bg-zinc-800/50 my-3" />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><div className="w-12 h-3 rounded bg-zinc-800/40" /><div className="w-16 h-4 rounded bg-zinc-800" /></div>
        <div className="space-y-1"><div className="w-12 h-3 rounded bg-zinc-800/40" /><div className="w-16 h-4 rounded bg-zinc-800" /></div>
      </div>
    </div>
  );
}

// ─── MODAL INDEPENDENTE (Fim do engasgo) ────────────────────────────────────

function EstoqueModal({
  onClose,
  editingItem,
  user,
  onSuccess
}: {
  onClose: () => void;
  editingItem: EstoqueItem | null;
  user: any;
  onSuccess: () => void;
}) {
  const [formNome, setFormNome] = useState(editingItem?.nome || '');
  // A burocracia do backend exige que a categoria seja um desses valores exatos
  const [formCategoria, setFormCategoria] = useState(editingItem?.categoria || 'PECAS');
  const [formQuantidade, setFormQuantidade] = useState(editingItem?.quantidade ? String(editingItem.quantidade) : '');
  const [formCusto, setFormCusto] = useState(editingItem?.custo ? editingItem.custo.toFixed(2) : '');
  const [formVenda, setFormVenda] = useState(editingItem?.venda ? editingItem.venda.toFixed(2) : '');
  const [formMinimoAlerta, setFormMinimoAlerta] = useState(editingItem?.minimo_alerta ? String(editingItem.minimo_alerta) : '5');
  const [formCodigo, setFormCodigo] = useState(editingItem?.codigo || '');

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSave = async () => {
    if (!formNome.trim()) {
      setFormError('O nome do item é obrigatório.');
      return;
    }
    if (!formCategoria) {
      setFormError('Selecione uma categoria válida.');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const payload = {
        nome: formNome.trim(),
        categoria: formCategoria, // Enviando a categoria estrita validada
        quantidade: Number(formQuantidade) || 0,
        custo: Number(formCusto) || 0,
        venda: Number(formVenda) || 0,
        minimo_alerta: Number(formMinimoAlerta) || 0,
        codigo: formCodigo.trim(),
        empresa_id: user.empresa_id,
      };

      if (editingItem) {
        await apiPut(`/estoque/${user.empresa_id}/${editingItem.id}`, payload);
      } else {
        await apiPost('/estoque/', payload);
      }

      toast.success(editingItem ? 'Item atualizado!' : 'Item cadastrado!');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar o item.';
      setFormError(msg);
      toast.error('Erro ao salvar item.');
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
                {editingItem ? <Pencil className="w-4 h-4 text-emerald-400" /> : <Package className="w-4 h-4 text-emerald-400" />}
              </div>
              <h2 className="text-white font-bold text-lg">{editingItem ? 'Editar Item' : 'Novo Item'}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}

          <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 space-y-4">
            <div>
              <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Nome do Item *</label>
              <input type="text" placeholder="Ex: Filtro de Óleo" value={formNome} onChange={(e) => setFormNome(e.target.value)} className={inputClass} autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Código / SKU</label>
                <input type="text" placeholder="Ex: FLT-001" value={formCodigo} onChange={(e) => setFormCodigo(e.target.value)} className={`${inputClass} font-mono text-xs`} />
              </div>
              <div>
                <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Categoria *</label>
                <div className="relative">
                  <select value={formCategoria} onChange={(e) => setFormCategoria(e.target.value)} className={selectClass}>
                    {CATEGORIA_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Quantidade em Estoque</label>
                <input type="text" placeholder="0" value={formQuantidade} onChange={(e) => setFormQuantidade(e.target.value.replace(/\D/g, ''))} className={`${inputClass} tabular-nums`} />
              </div>
              <div>
                <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Alerta de Estoque Mínimo</label>
                <input type="text" placeholder="5" value={formMinimoAlerta} onChange={(e) => setFormMinimoAlerta(e.target.value.replace(/\D/g, ''))} className={`${inputClass} tabular-nums`} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Preço de Custo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={formCusto}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      setFormCusto(v ? (Number(v) / 100).toFixed(2) : '');
                    }}
                    className={`${inputClass} pl-9 tabular-nums`}
                  />
                </div>
              </div>
              <div>
                <label className="uppercase tracking-wider text-[10px] text-zinc-500 font-bold mb-1.5 block">Preço de Venda</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={formVenda}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '');
                      setFormVenda(v ? (Number(v) / 100).toFixed(2) : '');
                    }}
                    className={`${inputClass} pl-9 tabular-nums`}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-800/50 sticky bottom-0 bg-zinc-900">
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-sm font-medium px-4 py-2.5 transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl px-5 py-3 text-sm transition-all disabled:opacity-50 active:scale-[0.98]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {editingItem ? 'Salvar Alterações' : 'Cadastrar Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Estoque() {
  const user = useAuthStore((s) => s.user);
  
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EstoqueItem | null>(null);

  // Delete State
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadEstoque = useCallback(async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    setError('');
    try {
      // Fim do Erro 405: Passando o ID direto na URL como Path Parameter!
      const data = await apiGet<{ itens: EstoqueItem[] }>(`/estoque/${user.empresa_id}`);
      
      setEstoque(data?.itens || []);
    } catch {
      setError('Não foi possível carregar o estoque.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id]);

  useEffect(() => {
    loadEstoque();
  }, [loadEstoque]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  const filteredEstoque = estoque.filter((item) => {
    if (filterCategory && item.categoria !== filterCategory) return false;
    if (filterLowStock && item.quantidade > item.minimo_alerta) return false;
    if (!debouncedSearch) return true;
    const term = debouncedSearch.toLowerCase();
    return (
      (item.nome || '').toLowerCase().includes(term) ||
      (item.codigo || '').toLowerCase().includes(term)
    );
  });

  const totalItems = estoque.length;
  const totalValue = estoque.reduce((acc, item) => acc + (item.custo * item.quantidade), 0);
  const lowStockCount = estoque.filter((i) => i.quantidade <= i.minimo_alerta).length;

  const openNewModal = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEditModal = (item: EstoqueItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await apiDelete(`/estoque/${user!.empresa_id}/${id}`);
      toast.success('Item removido do estoque.');
      loadEstoque();
    } catch (err: unknown) {
      toast.error('Erro ao excluir item.');
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2"><div className="w-48 h-7 rounded-lg bg-zinc-800 animate-pulse" /><div className="w-32 h-4 rounded bg-zinc-800/60 animate-pulse" /></div>
            <div className="w-36 h-11 rounded-xl bg-zinc-800 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-zinc-900/50 border border-zinc-800/60 rounded-xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <EstoqueCardSkeleton key={i} />)}
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
              <Package className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Estoque de Peças</h1>
              <p className="text-zinc-400 text-sm mt-1">Gerencie seu inventário e alertas</p>
            </div>
          </div>
          <button onClick={openNewModal} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all">
            <Plus className="w-4 h-4" /> Novo Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover:-translate-y-1 transition-transform">
          <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Package className="w-4 h-4 text-emerald-400" /></div></div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total de Itens Cadastrados</p>
          <p className="text-white text-xl font-bold mt-1 tabular-nums">{totalItems}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover:-translate-y-1 transition-transform">
          <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><DollarSign className="w-4 h-4 text-blue-400" /></div></div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Valor em Estoque (Custo)</p>
          <p className="text-white text-xl font-bold mt-1 tabular-nums">{formatCurrency(totalValue)}</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4 hover:-translate-y-1 transition-transform">
          <div className="flex items-center gap-2 mb-2"><div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${lowStockCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-800/50 border-zinc-700/50'}`}><AlertCircle className={`w-4 h-4 ${lowStockCount > 0 ? 'text-red-400' : 'text-zinc-500'}`} /></div></div>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Itens em Alerta Mínimo</p>
          <p className={`text-xl font-bold mt-1 tabular-nums ${lowStockCount > 0 ? 'text-red-400' : 'text-white'}`}>{lowStockCount}</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-1.5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/40" />
            <input type="text" placeholder="Buscar por nome ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 pl-11 pr-10 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"><X className="w-4 h-4" /></button>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={`${selectClass} sm:w-[200px]`}>
                <option value="">Todas as categorias</option>
                {CATEGORIA_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            </div>
            <button onClick={() => setFilterLowStock(!filterLowStock)} className={`px-4 py-3.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 border ${filterLowStock ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}>
              <AlertCircle className="w-4 h-4" /> Estoque Crítico
            </button>
          </div>
        </div>
      </div>

      {filteredEstoque.length === 0 ? (
        <div className="text-center py-20 relative">
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.06)_0%,_transparent_70%)]" />
          <div className="relative z-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center glow-emerald">
              <Package className="w-12 h-12 text-emerald-500/60" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">{estoque.length === 0 ? 'Estoque vazio' : 'Nenhum item encontrado'}</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-8">{estoque.length === 0 ? 'Cadastre as peças, fluidos e serviços que sua oficina oferece.' : 'Tente ajustar os filtros ou limpar a busca.'}</p>
            {estoque.length === 0 && (
              <button onClick={openNewModal} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all">
                <Plus className="w-4 h-4" /> Cadastrar Item
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEstoque.map((item) => {
            const isLowStock = item.quantidade <= item.minimo_alerta;
            const margin = item.venda - item.custo;
            const marginPct = item.venda > 0 ? (margin / item.venda) * 100 : 0;
            const catLabel = CATEGORIA_OPTIONS.find(c => c.value === item.categoria)?.label || item.categoria;

            return (
              <div key={item.id} className={`group bg-zinc-900/50 border rounded-xl p-4 md:p-5 transition-all duration-200 hover:-translate-y-1 ${isLowStock ? 'border-red-500/30 bg-red-500/5' : 'border-zinc-800 hover:border-emerald-500/30'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm truncate">{item.nome}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[10px] font-mono font-bold">{item.codigo || 'S/N'}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[10px] uppercase font-bold">{catLabel}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(item)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {deleteConfirm === item.id && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
                    <p className="text-red-300 text-xs font-medium mb-2">Excluir este item?</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleDelete(item.id)} disabled={deleting} className="flex-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded py-1.5 transition-colors text-center disabled:opacity-50">{deleting ? '...' : 'Sim'}</button>
                      <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold rounded py-1.5 transition-colors text-center">Não</button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 mb-4">
                  <div className={`flex flex-col items-center justify-center p-3 rounded-xl border w-20 ${isLowStock ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-950 border-zinc-800'}`}>
                    <span className={`text-xl font-bold tabular-nums leading-none ${isLowStock ? 'text-red-400' : 'text-white'}`}>{item.quantidade}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${isLowStock ? 'text-red-500/70' : 'text-zinc-500'}`}>QTD</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1"><span className="text-zinc-500">Mínimo ideal</span><span className="text-zinc-300 font-bold">{item.minimo_alerta}</span></div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden"><div className={`h-full rounded-full ${isLowStock ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((item.quantidade / (item.minimo_alerta || 1)) * 100, 100)}%` }} /></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800/50">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-0.5">Custo</span>
                    <span className="text-zinc-300 font-mono text-sm">{formatCurrency(item.custo)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block mb-0.5">Venda</span>
                    <span className="text-emerald-400 font-mono text-sm font-bold">{formatCurrency(item.venda)}</span>
                  </div>
                  <div className="col-span-2 flex items-center justify-between bg-zinc-950 rounded-lg p-2 mt-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Margem</span>
                    <span className={`font-mono text-xs font-bold ${margin >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(margin)} <span className="opacity-50 text-[10px] font-sans">({marginPct.toFixed(0)}%)</span></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <EstoqueModal
          onClose={closeModal}
          editingItem={editingItem}
          user={user}
          onSuccess={() => { closeModal(); loadEstoque(); }}
        />
      )}
    </div>
  );
}