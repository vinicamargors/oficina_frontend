'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowUpDown,
  Download,
  X,
  Loader2,
  BoxIcon,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';

// ─── Data Types ────────────────────────────────────────────────────────────────

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

interface EstoqueStats {
  total_itens: number;
  estoque_baixo: number;
  valor_total_custo: number;
  valor_total_venda: number;
}

interface EstoqueResponse {
  itens: EstoqueItem[];
  stats: EstoqueStats;
}

interface ItemFormData {
  nome: string;
  categoria: string;
  codigo: string;
  quantidade: number;
  custo: number;
  venda: number;
  minimo_alerta: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function calcMargin(custo: number, venda: number): string {
  if (custo === 0) return '—';
  return ((venda - custo) / custo * 100).toFixed(1) + '%';
}

function calcMarginNumber(custo: number, venda: number): number {
  if (custo === 0) return 0;
  return (venda - custo) / custo * 100;
}

const emptyForm: ItemFormData = {
  nome: '',
  categoria: '',
  codigo: '',
  quantidade: 0,
  custo: 0,
  venda: 0,
  minimo_alerta: 0,
};

function getCategoryStyle(cat: string) {
  const n = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('peca')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' };
  if (n.includes('oleo')) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' };
  if (n.includes('filtro')) return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-400' };
  return { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20', dot: 'bg-zinc-400' };
}

// Generate a fake sparkline data (static/visual only)
function generateSparkline(seed: number): string {
  const points: string[] = [];
  let val = 20 + (seed % 30);
  for (let i = 0; i < 8; i++) {
    val += (Math.sin(seed * 0.7 + i * 1.3) * 8);
    val = Math.max(5, Math.min(95, val));
    points.push(`${i * 14},${val}`);
  }
  return points.join(' ');
}

// Stock level bar config
const STOCK_MAX_REFERENCE = 50; // reference max for the stock bar

function getStockBarColor(item: EstoqueItem): { bar: string; bg: string } {
  const min = item.minimo_alerta || 1;
  if (item.quantidade < min) return { bar: 'bg-red-500/70', bg: 'bg-red-500/10' };
  if (item.quantidade <= min * 2) return { bar: 'bg-amber-500/70', bg: 'bg-amber-500/10' };
  return { bar: 'bg-emerald-500/70', bg: 'bg-emerald-500/10' };
}

function getStockBarWidth(item: EstoqueItem): number {
  const max = Math.max(item.minimo_alerta * 3, STOCK_MAX_REFERENCE);
  return Math.min((item.quantidade / max) * 100, 100);
}

function getMarginColor(margin: number): string {
  if (margin < 0) return 'text-red-400 font-bold';
  if (margin < 20) return 'text-red-400';
  if (margin < 50) return 'text-amber-400';
  return 'text-emerald-400';
}

// ─── Sparkline SVG Component ──────────────────────────────────────────────────

function MiniSparkline({ points, color }: { points: string; color: string }) {
  return (
    <svg viewBox="0 0 98 100" className="w-full h-8 opacity-30" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Skeleton Components ──────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="relative bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5 overflow-hidden animate-pulse">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 bg-zinc-800 rounded w-24" />
            <div className="w-8 h-8 rounded-lg bg-zinc-800" />
          </div>
          <div className="h-8 bg-zinc-800 rounded w-32 mb-3" />
          <div className="h-2.5 bg-zinc-800 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/50">
        <div className="h-4 bg-zinc-800 rounded w-40" />
      </div>
      <div className="px-5 py-3 bg-zinc-950/50">
        <div className="flex gap-5">
          <div className="h-3 bg-zinc-800 rounded w-16" />
          <div className="h-3 bg-zinc-800 rounded w-28" />
          <div className="h-3 bg-zinc-800 rounded w-20" />
          <div className="h-3 bg-zinc-800 rounded w-12" />
          <div className="h-3 bg-zinc-800 rounded w-20" />
          <div className="h-3 bg-zinc-800 rounded w-20" />
          <div className="h-3 bg-zinc-800 rounded w-14" />
          <div className="h-3 bg-zinc-800 rounded w-16" />
        </div>
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="px-5 py-3.5 border-t border-zinc-800/50">
          <div className="flex gap-5 items-center">
            <div className="h-3 bg-zinc-800/60 rounded w-16" />
            <div className="h-3 bg-zinc-800/60 rounded w-28" />
            <div className="h-3 bg-zinc-800/60 rounded w-20" />
            <div className="h-3 bg-zinc-800/60 rounded w-12" />
            <div className="h-3 bg-zinc-800/60 rounded w-20" />
            <div className="h-3 bg-zinc-800/60 rounded w-20" />
            <div className="h-3 bg-zinc-800/60 rounded w-14" />
            <div className="h-3 bg-zinc-800/60 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Estoque() {
  const user = useAuthStore((s) => s.user);
  const empresaId = user?.empresa_id || '';

  // Data state
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [stats, setStats] = useState<EstoqueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EstoqueItem | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<EstoqueItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState<ItemFormData>(emptyForm);
  const [formError, setFormError] = useState('');

  // Adjust state
  const [adjustTipo, setAdjustTipo] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [adjustQtd, setAdjustQtd] = useState(1);
  const [adjustSaving, setAdjustSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // ─── Load Data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const query = activeCategory !== 'Todos' ? `?categoria=${activeCategory}` : '';
      const data = await apiGet<EstoqueResponse>(`/estoque/${empresaId}${query}`);
      setItems(data.itens || []);
      setStats(data.stats || null);
    } catch {
      setError('Não foi possível carregar os dados do estoque.');
    } finally {
      setLoading(false);
    }
  }, [empresaId, activeCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Derived Data ──────────────────────────────────────────────────────────

  const categories = ['Todos', ...Array.from(new Set(items.map((i) => i.categoria).filter(Boolean)))];

  // Category count map
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: items.length };
    for (const item of items) {
      const cat = item.categoria || 'Sem categoria';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [items]);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !debouncedSearch ||
      item.nome.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      item.codigo.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchesSearch;
  });

  // ─── CRUD Handlers ────────────────────────────────────────────────────────

  const openAddModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (item: EstoqueItem) => {
    setEditingItem(item);
    setForm({
      nome: item.nome,
      categoria: item.categoria,
      codigo: item.codigo,
      quantidade: item.quantidade,
      custo: item.custo,
      venda: item.venda,
      minimo_alerta: item.minimo_alerta,
    });
    setFormError('');
    setShowFormModal(true);
  };

  const openAdjustModal = (item: EstoqueItem) => {
    setAdjustingItem(item);
    setAdjustTipo('ENTRADA');
    setAdjustQtd(1);
    setShowAdjustModal(true);
  };

  const handleSaveItem = async () => {
    if (!form.nome.trim()) {
      setFormError('Nome é obrigatório.');
      return;
    }
    if (form.venda < form.custo) {
      setFormError('Preço de venda menor que o custo! Margem negativa.');
      toast.error('Preço de venda menor que o custo! Margem negativa.', { description: 'Ajuste o preço de venda para acima do custo.' });
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, empresa_id: empresaId };
      if (editingItem) {
        await apiPut(`/estoque/${empresaId}/${editingItem.id}`, payload);
      } else {
        await apiPost('/estoque/', payload);
      }
      setShowFormModal(false);
      toast.success('Peça salva com sucesso!');
      loadData();
    } catch (err: unknown) {
      toast.error('Erro ao comunicar com o servidor.');
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar item.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustingItem || adjustQtd <= 0) return;
    setAdjustSaving(true);
    try {
      await apiPatch(`/estoque/${empresaId}/${adjustingItem.id}/ajustar`, {
        tipo: adjustTipo,
        quantidade: adjustQtd,
      });
      setShowAdjustModal(false);
      toast.success('Estoque ajustado.');
      loadData();
    } catch (err: unknown) {
      toast.error('Erro ao comunicar com o servidor.');
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiDelete(`/estoque/${empresaId}/${id}`);
      toast.success('Peça removida do estoque.');
      loadData();
    } catch (err: unknown) {
      toast.error('Erro ao comunicar com o servidor.');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Export ────────────────────────────────────────────────────────────────

  const handleExport = () => {
    const lowStock = items.filter((item) => item.quantidade <= item.minimo_alerta);
    if (lowStock.length === 0) {
      toast.error('Nenhum item abaixo do mínimo para exportar.');
      return;
    }

    const header = 'NOME;CÓDIGO;QTD ATUAL;QTD MÍNIMA;NECESSIDADE;PREÇO CUSTO';
    const rows = lowStock.map((item) => {
      const necessidade = item.minimo_alerta - item.quantidade;
      return `${item.nome};${item.codigo};${item.quantidade};${item.minimo_alerta};${necessidade > 0 ? necessidade : 0};${item.custo.toFixed(2)}`;
    });
    const csv = [header, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lista-compras-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Lista de compras exportada!');
  };

  // ─── Render: Loading ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header skeleton */}
        <div className="relative bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="w-64 h-7 rounded-lg bg-zinc-800 animate-pulse" />
              <div className="w-48 h-4 rounded bg-zinc-800/60 animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="w-48 h-11 rounded-xl bg-zinc-800 animate-pulse" />
              <div className="w-36 h-11 rounded-xl bg-zinc-800 animate-pulse" />
            </div>
          </div>
        </div>
        <KpiSkeleton />
        {/* Search/filter skeleton */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 md:p-6 space-y-3">
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-20 h-8 rounded-xl bg-zinc-800 animate-pulse flex-shrink-0" />
            ))}
          </div>
          <div className="w-full h-11 rounded-xl bg-zinc-800/50 border border-zinc-800 animate-pulse" />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Controle de Estoque e Insumos</h1>
            <p className="text-zinc-400 text-sm mt-1">
              {items.length} item{items.length !== 1 ? 's' : ''} cadastrado{items.length !== 1 ? 's' : ''} no estoque
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Lista de Compras</span>
              <span className="sm:hidden">Exportar</span>
            </button>
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-5 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              Novo Item
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* KPI Stats Row with gradient backgrounds, trend arrows, sparklines */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {/* Total de Itens */}
          <div className="group relative bg-gradient-to-br from-zinc-900/80 via-zinc-900/50 to-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 overflow-hidden card-hover">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            {/* Sparkline */}
            <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30 pointer-events-none">
              <MiniSparkline points={generateSparkline(42)} color="#34d399" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Total de Itens
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    +12%
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Package className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                </div>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white leading-tight tabular-nums">{stats.total_itens}</div>
              <div className="text-zinc-500 text-xs mt-1">Cadastrados no estoque</div>
            </div>
          </div>

          {/* Itens em Estoque Baixo */}
          <div className={`group relative bg-gradient-to-br from-zinc-900/80 via-zinc-900/50 to-zinc-900/80 border rounded-xl p-4 md:p-5 overflow-hidden card-hover ${
            stats.estoque_baixo > 0 ? 'border-red-500/30' : 'border-zinc-800'
          }`}>
            <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
              stats.estoque_baixo > 0 ? 'via-red-500/30' : 'via-emerald-500/30'
            } to-transparent`} />
            {/* Sparkline */}
            <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30 pointer-events-none">
              <MiniSparkline points={generateSparkline(17)} color={stats.estoque_baixo > 0 ? '#f87171' : '#34d399'} />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Estoque Baixo
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${stats.estoque_baixo > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {stats.estoque_baixo > 0 ? <><TrendingUp className="w-3 h-3" />+{stats.estoque_baixo}</> : <><TrendingDown className="w-3 h-3" />0</>}
                  </span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 ${stats.estoque_baixo > 0 ? 'bg-red-500/10' : 'bg-zinc-800'}`}>
                    <AlertTriangle className={`w-3.5 h-3.5 ${stats.estoque_baixo > 0 ? 'text-red-400' : 'text-zinc-400'}`} />
                  </div>
                </div>
              </div>
              <div className={`text-2xl md:text-3xl font-bold leading-tight tabular-nums ${stats.estoque_baixo > 0 ? 'text-red-400' : 'text-white'}`}>
                {stats.estoque_baixo}
              </div>
              <div className="text-zinc-500 text-xs mt-1">Abaixo do mínimo</div>
            </div>
          </div>

          {/* Valor em Custo */}
          <div className="group relative bg-gradient-to-br from-orange-950/20 via-zinc-900/50 to-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 overflow-hidden card-hover">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
            {/* Sparkline */}
            <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30 pointer-events-none">
              <MiniSparkline points={generateSparkline(73)} color="#fb923c" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Valor em Custo
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-400">
                    <TrendingUp className="w-3 h-3" />
                    +8%
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center transition-transform group-hover:scale-110">
                    <TrendingDown className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                </div>
              </div>
              <div className="text-xl md:text-2xl font-bold text-orange-300 leading-tight tabular-nums">
                {formatCurrency(stats.valor_total_custo)}
              </div>
              <div className="text-zinc-500 text-xs mt-1">Custo total em estoque</div>
            </div>
          </div>

          {/* Valor em Venda */}
          <div className="group relative bg-gradient-to-br from-emerald-950/20 via-zinc-900/50 to-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-5 overflow-hidden card-hover">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
            {/* Sparkline */}
            <div className="absolute bottom-0 left-0 right-0 h-10 opacity-30 pointer-events-none">
              <MiniSparkline points={generateSparkline(91)} color="#34d399" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Valor em Venda
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    +15%
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center transition-transform group-hover:scale-110">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              </div>
              <div className="text-xl md:text-2xl font-bold text-emerald-300 leading-tight tabular-nums">
                {formatCurrency(stats.valor_total_venda)}
              </div>
              <div className="text-zinc-500 text-xs mt-1">Valor potencial de venda</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div className="relative bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 md:p-6 space-y-4">
        {/* Category Pills with colored dots and count badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <Filter className="w-4 h-4 text-zinc-500 flex-shrink-0 mt-2" />
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            const count = categoryCounts[cat] ?? 0;
            const isTodos = cat === 'Todos';
            const style = !isTodos ? getCategoryStyle(cat) : null;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`relative flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? isTodos
                      ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                      : `${style?.bg || ''} ${style?.text || ''} ${style?.border || ''}`
                    : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                }`}
              >
                {/* Colored dot */}
                {!isTodos && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? (style?.dot || 'bg-emerald-400') : 'bg-zinc-600'}`} />
                )}
                {isTodos && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                )}
                {cat}
                <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/10' : 'opacity-70'}`}>
                  {count}
                </span>
                {/* Sliding indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-emerald-400/40 animate-slide-indicator" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
          <input
            type="text"
            placeholder="Buscar por nome ou código..."
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
      </div>

      {/* Content */}
      {filteredItems.length === 0 ? (
        /* Empty State — polished with emerald glow */
        <div className="text-center py-20 relative">
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.06)_0%,_transparent_70%)]" />
          <div className="relative z-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center glow-emerald">
              <Package className="w-12 h-12 text-emerald-500/60" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">
              {items.length === 0 ? 'Estoque vazio' : 'Nenhum item encontrado'}
            </h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-8">
              {items.length === 0
                ? 'Comece adicionando peças e insumos ao seu estoque.'
                : 'Nenhum item corresponde à sua busca ou filtro atual.'}
            </p>
            {items.length === 0 && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                Adicionar Item
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: Card Layout */}
          <div className="space-y-3 md:hidden">
            {filteredItems.map((item) => {
              const isLow = item.quantidade <= item.minimo_alerta;
              const isNegMargin = item.venda < item.custo;
              const margin = calcMargin(item.custo, item.venda);
              const marginNum = calcMarginNumber(item.custo, item.venda);
              const barColor = getStockBarColor(item);
              const barWidth = getStockBarWidth(item);
              const marginColorClass = getMarginColor(marginNum);

              return (
                <div
                  key={item.id}
                  className={`bg-zinc-900/50 border rounded-xl p-4 space-y-3 transition-all duration-200 card-hover ${
                    isLow ? 'border-red-500/30 animate-pulse-border' : 'border-zinc-800 hover:border-l-2 hover:border-l-emerald-500/50'
                  }`}
                >
                  {/* Top row: Name + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-zinc-500 text-[10px] uppercase font-semibold tracking-wider font-mono">{item.codigo}</p>
                      <p className="text-white font-semibold text-sm truncate">{item.nome}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isLow && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30">
                            ABAIXO DO MÍNIMO
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category */}
                  {item.categoria ? (
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-lg border ${getCategoryStyle(item.categoria).bg} ${getCategoryStyle(item.categoria).text} ${getCategoryStyle(item.categoria).border}`}>
                      {item.categoria}
                    </span>
                  ) : (
                    <p className="text-zinc-500 text-xs">—</p>
                  )}

                  {/* Stock Level Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Estoque</span>
                      <span className={`text-xs font-bold tabular-nums ${isLow ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                        {item.quantidade}
                        {item.minimo_alerta > 0 && <span className="text-zinc-600 ml-1">/ mín {item.minimo_alerta}</span>}
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full ${barColor.bg} overflow-hidden`}>
                      <div
                        className={`h-full rounded-full animate-stock-fill ${barColor.bar}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Quantity + Prices */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Qtd</p>
                      <p className={`text-sm font-bold tabular-nums ${isLow ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                        {item.quantidade}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Custo</p>
                      <p className="text-sm text-zinc-300 tabular-nums">{formatCurrency(item.custo)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider">Venda</p>
                      <p className="text-sm text-zinc-300 tabular-nums">{formatCurrency(item.venda)}</p>
                    </div>
                  </div>

                  {/* Margin with color coding */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Margem: <span className={marginColorClass}>{margin}</span></span>
                    {isNegMargin && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400"><TrendingDown className="w-3 h-3" />MARGEM NEGATIVA!</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                    <button
                      onClick={() => openEditModal(item)}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-medium transition-colors p-2 rounded-lg hover:bg-zinc-800"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => openAdjustModal(item)}
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-emerald-400 text-xs font-medium transition-colors p-2 rounded-lg hover:bg-zinc-800"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      Ajustar
                    </button>
                    {/* Repor quick action for low stock */}
                    {isLow && (
                      <button
                        onClick={() => openAdjustModal(item)}
                        className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 text-xs font-bold transition-colors p-2 rounded-lg hover:bg-amber-500/10 ml-auto"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Repor
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className={`flex items-center gap-1.5 text-red-400 hover:text-white hover:bg-red-600 text-xs font-medium transition-colors p-2 rounded-lg ${isLow ? '' : 'ml-auto'} disabled:opacity-50`}
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: Table Layout */}
          <div className="hidden md:block bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Table header strip */}
            <div className="flex items-center gap-2 px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-sm font-bold text-white">
                Itens em Estoque
                <span className="text-zinc-500 font-normal ml-2">({filteredItems.length})</span>
              </h2>
            </div>

            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-zinc-950/50">
                    <th className="text-left text-xs uppercase text-zinc-500 font-semibold px-5 py-3">Código</th>
                    <th className="text-left text-xs uppercase text-zinc-500 font-semibold px-5 py-3">Nome</th>
                    <th className="text-left text-xs uppercase text-zinc-500 font-semibold px-5 py-3">Categoria</th>
                    <th className="text-center text-xs uppercase text-zinc-500 font-semibold px-5 py-3">Estoque</th>
                    <th className="text-right text-xs uppercase text-zinc-500 font-semibold px-5 py-3">Preço Custo</th>
                    <th className="text-right text-xs uppercase text-zinc-500 font-semibold px-5 py-3">Preço Venda</th>
                    <th className="text-right text-xs uppercase text-zinc-500 font-semibold px-5 py-3">Margem %</th>
                    <th className="text-center text-xs uppercase text-zinc-500 font-semibold px-5 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredItems.map((item) => {
                    const isLow = item.quantidade <= item.minimo_alerta;
                    const isNegMargin = item.venda < item.custo;
                    const margin = calcMargin(item.custo, item.venda);
                    const marginNum = calcMarginNumber(item.custo, item.venda);
                    const barColor = getStockBarColor(item);
                    const barWidth = getStockBarWidth(item);
                    const marginColorClass = getMarginColor(marginNum);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-all duration-200 hover:bg-zinc-800/30 ${isLow ? 'bg-red-500/5 animate-pulse-border' : 'hover:border-l-2 hover:border-l-emerald-500/50'}`}
                      >
                        <td className="px-5 py-3 text-zinc-400 font-mono text-xs">{item.codigo || '—'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="text-white font-medium">{item.nome}</div>
                            {isLow && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />}
                          </div>
                          {isLow && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 mt-0.5">
                              ABAIXO DO MÍNIMO
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {item.categoria ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-lg border whitespace-nowrap ${getCategoryStyle(item.categoria).bg} ${getCategoryStyle(item.categoria).text} ${getCategoryStyle(item.categoria).border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${getCategoryStyle(item.categoria).dot}`} />
                              {item.categoria}
                            </span>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`font-bold tabular-nums ${isLow ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                              {item.quantidade}
                            </span>
                            {/* Stock level bar in table */}
                            <div className={`w-16 h-1 rounded-full ${barColor.bg} overflow-hidden`}>
                              <div
                                className={`h-full rounded-full animate-stock-fill ${barColor.bar}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right text-zinc-300 tabular-nums">{formatCurrency(item.custo)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`tabular-nums ${isNegMargin ? 'text-red-400' : 'text-zinc-300'}`}>{formatCurrency(item.venda)}</span>
                          {isNegMargin && (
                            <div className="text-[10px] font-bold text-red-400">MARGEM NEGATIVA!</div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 tabular-nums ${isNegMargin ? 'text-red-400 font-bold' : marginColorClass}`}>
                            {(isLow || isNegMargin) && <TrendingDown className="w-3.5 h-3.5" />}
                            {margin}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openAdjustModal(item)}
                              className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Ajustar estoque"
                            >
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                            {/* Repor quick action for low stock items */}
                            {isLow && (
                              <button
                                onClick={() => openAdjustModal(item)}
                                className="p-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                                title="Repor estoque"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              className="p-2 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                              title="Excluir"
                            >
                              {deletingId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── Add/Edit Modal ──────────────────────────────────────────────────── */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 glass"
            onClick={() => setShowFormModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Section card header strip */}
            <div className="flex items-center gap-2.5 px-5 py-4 bg-zinc-900/30 border-b border-zinc-800/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">
                  {editingItem ? 'Editar Peça' : 'Adicionar Peça'}
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Preencha os dados do item de estoque</p>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-0">
              {formError && (
                <div className="mx-5 mt-4 mb-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Section: Identificação */}
              <div className="px-5 py-4 bg-zinc-900/30 border-b border-zinc-800/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Identificação</h3>
                </div>
              </div>
              <div className="px-5 py-5 space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Nome da peça ou insumo"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>

                {/* Categoria + Código */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Categoria
                    </label>
                    <input
                      type="text"
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      placeholder="Ex: Motor, Freio..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Código / SKU
                    </label>
                    <input
                      type="text"
                      value={form.codigo}
                      onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                      placeholder="Ex: FR-0042"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Estoque e Preços */}
              <div className="px-5 py-4 bg-zinc-900/30 border-b border-zinc-800/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Estoque e Preços</h3>
                </div>
              </div>
              <div className="px-5 py-5 space-y-4">
                {/* Quantidade + Mínimo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={form.quantidade}
                      onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Estoque Mínimo (alerta)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={form.minimo_alerta}
                      onChange={(e) => setForm({ ...form, minimo_alerta: Number(e.target.value) || 0 })}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>

                {/* Preço Custo + Preço Venda */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Preço de Custo *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.custo}
                        onChange={(e) => setForm({ ...form, custo: Number(e.target.value) || 0 })}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 pl-10 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 tabular-nums"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Preço de Venda *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.venda}
                        onChange={(e) => {
                          const newVenda = Number(e.target.value) || 0;
                          setForm({ ...form, venda: newVenda });
                          if (newVenda > 0 && newVenda < form.custo) {
                            setFormError('Preço de venda menor que o custo! Margem negativa.');
                          } else {
                            setFormError('');
                          }
                        }}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 pl-10 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Negative margin warning */}
                {form.venda > 0 && form.venda < form.custo && (
                  <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    MARGEM NEGATIVA! Preço de venda menor que o custo.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-800/50">
              <button
                onClick={() => setShowFormModal(false)}
                className="px-4 py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors rounded-xl hover:bg-zinc-800/50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveItem}
                disabled={saving}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {editingItem ? 'Salvar Alterações' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Adjust Stock Modal ──────────────────────────────────────────────── */}
      {showAdjustModal && adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 glass"
            onClick={() => setShowAdjustModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Section card header strip */}
            <div className="flex items-center gap-2.5 px-5 py-4 bg-zinc-900/30 border-b border-zinc-800/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ArrowUpDown className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Ajustar Estoque</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Registre entrada ou saída de itens</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              <div className="text-center">
                <p className="text-white font-semibold">{adjustingItem.nome}</p>
                <p className="text-zinc-500 text-sm">
                  Estoque atual: <span className="text-white font-bold tabular-nums">{adjustingItem.quantidade}</span>
                </p>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Tipo de Movimentação
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAdjustTipo('ENTRADA')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 border ${
                      adjustTipo === 'ENTRADA'
                        ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Entrada
                  </button>
                  <button
                    onClick={() => setAdjustTipo('SAIDA')}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 border ${
                      adjustTipo === 'SAIDA'
                        ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Saída
                  </button>
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Quantidade
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={adjustQtd}
                  onChange={(e) => setAdjustQtd(Number(e.target.value) || 1)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 tabular-nums"
                />
              </div>

              {/* Preview */}
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-center">
                <span className="text-xs text-zinc-500">Novo saldo: </span>
                <span className={`text-sm font-bold tabular-nums ${
                  adjustTipo === 'ENTRADA' ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {adjustingItem.quantidade + (adjustTipo === 'ENTRADA' ? adjustQtd : -adjustQtd)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-zinc-800/50">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="px-4 py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors rounded-xl hover:bg-zinc-800/50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdjustStock}
                disabled={adjustSaving || adjustQtd <= 0}
                className={`inline-flex items-center gap-2 font-bold py-3 px-6 rounded-xl shadow-lg text-sm transition-all duration-200 disabled:opacity-50 active:scale-[0.98] ${
                  adjustTipo === 'ENTRADA'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                    : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                }`}
              >
                {adjustSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : adjustTipo === 'ENTRADA' ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Confirmar {adjustTipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}