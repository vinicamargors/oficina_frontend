'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  FileText,
  Clock,
  CarFront,
  AlertTriangle,
  Filter,
  X,
  ArrowRight,
  GitBranch,
  Download,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OSItem {
  id: string;
  status: string;
  data_abertura: string;
  total_geral: number;
  clientes: { nome: string; telefone: string } | null;
  veiculos: { placa: string; modelo: string } | null;
}

interface OSListResponse {
  items: OSItem[];
  total: number;
  skip: number;
  limit: number;
}

type ViewMode = 'cards' | 'list';

const PAGE_SIZE = 18;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { key: 'Todos', label: 'Todos' },
  { key: 'ORCAMENTO', label: 'Orçamento' },
  { key: 'EXECUCAO', label: 'Execução' },
  { key: 'AGUARDANDO_PECA', label: 'Aguard. Peça' },
  { key: 'FINALIZADO', label: 'Finalizado' },
  { key: 'PAGO', label: 'Pago' },
];

const statusAccentLine: Record<string, string> = {
  ORCAMENTO: 'via-yellow-500/30',
  EXECUCAO: 'via-blue-400/30',
  AGUARDANDO_PECA: 'via-orange-400/30',
  FINALIZADO: 'via-emerald-400/30',
  PAGO: 'via-emerald-300/30',
};

const statusDotColor: Record<string, string> = {
  ORCAMENTO: 'bg-yellow-500',
  EXECUCAO: 'bg-blue-500',
  AGUARDANDO_PECA: 'bg-orange-500',
  FINALIZADO: 'bg-emerald-500',
  PAGO: 'bg-emerald-400',
};

const statusConfig: Record<string, { label: string; color: string; borderColor: string; bgColor: string; dotColor: string; pulse?: boolean }> = {
  ORCAMENTO: {
    label: 'Orçamento',
    color: 'text-yellow-500',
    borderColor: 'border-yellow-500/20',
    bgColor: 'bg-yellow-500/10',
    dotColor: 'bg-yellow-500',
  },
  EXECUCAO: {
    label: 'Execução',
    color: 'text-blue-500',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/10',
    dotColor: 'bg-blue-500',
  },
  AGUARDANDO_PECA: {
    label: 'Aguard. Peça',
    color: 'text-orange-500',
    borderColor: 'border-orange-500/20',
    bgColor: 'bg-orange-500/10',
    dotColor: 'bg-orange-500',
    pulse: true,
  },
  FINALIZADO: {
    label: 'Finalizado',
    color: 'text-emerald-500',
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-500/10',
    dotColor: 'bg-emerald-500',
  },
  PAGO: {
    label: 'Pago',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-600/20',
    dotColor: 'bg-emerald-400',
  },
};

function getStatusConfig(status: string) {
  return statusConfig[status] || {
    label: status,
    color: 'text-zinc-400',
    borderColor: 'border-zinc-700/30',
    bgColor: 'bg-zinc-700/10',
    dotColor: 'bg-zinc-500',
  };
}

function formatCurrency(value?: number) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

function isOverdue(status: string, dataAbertura: string): boolean {
  if (status !== 'EXECUCAO') return false;
  try {
    const open = new Date(dataAbertura);
    const now = new Date();
    const diffDays = (now.getTime() - open.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 5;
  } catch {
    return false;
  }
}

function getDaysOpen(dataAbertura: string): number {
  try {
    const open = new Date(dataAbertura);
    const now = new Date();
    return Math.floor((now.getTime() - open.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

function getDaysOpenColor(days: number): { text: string; bg: string; border: string } {
  if (days > 14) return { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' };
  if (days > 7) return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
  return { text: 'text-zinc-400', bg: 'bg-zinc-500/10', border: 'border-zinc-700/30' };
}

function getClientInitials(nome?: string | null): string {
  if (!nome) return '?';
  return nome
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ─── CardSkeleton ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-6 animate-pulse">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-sm bg-zinc-800" />
          <div className="w-20 h-3.5 rounded bg-zinc-800" />
        </div>
        <div className="w-16 h-5 rounded-md bg-zinc-800" />
      </div>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-zinc-800 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="w-32 h-3.5 rounded bg-zinc-800" />
          <div className="w-24 h-3 rounded bg-zinc-800/60" />
        </div>
      </div>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-zinc-800 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="w-36 h-3.5 rounded bg-zinc-800" />
          <div className="w-16 h-3 rounded bg-zinc-800/60" />
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
        <div className="w-10 h-3 rounded bg-zinc-800/60" />
        <div className="w-24 h-5 rounded bg-zinc-800" />
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function OrdensServico() {
  const user = useAuthStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);

  // detecta mobile para definir viewMode padrão
  const defaultView: ViewMode =
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'list';

  const [ordens, setOrdens] = useState<OSItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async (page: number, statusFilter: string, search: string) => {
    if (!user?.empresa_id) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        empresa_id: user.empresa_id,
        skip: String(page * PAGE_SIZE),
        limit: String(PAGE_SIZE),
        order_by: 'data_abertura',
        order_dir: 'desc',
      });

      if (statusFilter !== 'Todos') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const raw = await apiGet<OSListResponse | OSItem[]>(`/os/?${params.toString()}`);

      if (Array.isArray(raw)) {
        // fallback: array simples sem paginação do backend
        const sorted = [...raw].sort(
          (a, b) => new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime()
        );
        setOrdens(sorted);
        setTotalCount(sorted.length);
      } else {
        setOrdens(raw.items ?? []);
        setTotalCount(raw.total ?? 0);
      }
    } catch {
      setError('Não foi possível carregar as ordens de serviço.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id]);

  // reset página ao mudar filtro ou busca
  useEffect(() => {
    setCurrentPage(0);
  }, [activeFilter, debouncedSearch]);

  useEffect(() => {
    fetchData(currentPage, activeFilter, debouncedSearch);
  }, [fetchData, currentPage, activeFilter, debouncedSearch]);

  // ── Debounce search ─────────────────────────────────────────────────────

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchTerm]);

  // ── Status counts — contagem local para pills (baseada na página atual) ─

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { Todos: totalCount };
    for (const os of ordens) {
      counts[os.status] = (counts[os.status] || 0) + 1;
    }
    return counts;
  }, [ordens, totalCount]);

  // ── Pagination derived ───────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = currentPage > 0;
  const hasNext = currentPage < totalPages - 1;

  // ── Render: Loading ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="relative bg-linear-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="w-56 h-7 rounded-lg bg-zinc-800 animate-pulse" />
              <div className="w-48 h-4 rounded bg-zinc-800/60 animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="w-36 h-11 rounded-xl bg-zinc-800 animate-pulse" />
              <div className="w-40 h-11 rounded-xl bg-zinc-800 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="w-full h-11 rounded-xl bg-zinc-800/50 border border-zinc-800 animate-pulse" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-20 h-8 rounded-lg bg-zinc-800 animate-pulse shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Render: Main ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative bg-linear-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Central de Ordens de Serviço
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Acompanhe e gerencie todas as ordens
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle: list / cards / pipeline */}
            <div className="inline-flex items-center bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-700/50'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => navigate('os-pipeline')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-all"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pipeline</span>
              </button>
            </div>
            {/* Exportar */}
            <button
              className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold py-3 px-4 rounded-xl border border-zinc-700/50 active:scale-[0.98] transition-all"
              title="Exportar ordens"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            {/* Nova OS */}
            <button
              onClick={() => navigate('nova-os')}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              Abrir Nova OS
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchTerm ? 'text-emerald-500/60' : 'text-zinc-500'}`} />
        <input
          type="text"
          placeholder="Buscar por cliente, placa ou número da OS..."
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
        {debouncedSearch && (
          <p className="text-zinc-500 text-xs mt-1.5 ml-1">
            {totalCount} resultado{totalCount !== 1 ? 's' : ''} encontrado{totalCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        <Filter className="w-4 h-4 text-zinc-500 shrink-0 mt-2" />
        {STATUS_FILTERS.map((f) => {
          const isActive = activeFilter === f.key;
          const count = statusCounts[f.key] ?? 0;
          const hasZero = count === 0;
          const isTodos = f.key === 'Todos';

          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`relative flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 whitespace-nowrap ${
                isActive
                  ? isTodos
                    ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30 py-2 px-4 text-[13px]'
                    : 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
              } ${hasZero && !isActive ? 'opacity-60' : ''}`}
            >
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-emerald-400/60 animate-slide-indicator" />
              )}
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : (statusDotColor[f.key] || 'bg-zinc-600')}`} />
              {f.label}
              <span className={`ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-emerald-500/20 text-emerald-300' : 'opacity-70'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* OS List / Cards / Empty */}
      {ordens.length === 0 ? (
        <div className="text-center py-20 relative">
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06)_0%,transparent_70%)]" />
          <div className="relative z-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center glow-emerald">
              <FileText className="w-12 h-12 text-emerald-500/60" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">Nenhuma ordem de serviço encontrada</h3>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-8">
              {debouncedSearch || activeFilter !== 'Todos'
                ? 'Tente ajustar os filtros ou o termo de busca para encontrar o que procura.'
                : 'Comece abrindo uma nova ordem de serviço para seu primeiro cliente.'}
            </p>
            <button
              onClick={() => navigate('nova-os')}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 hover:shadow-xl active:scale-[0.98] transition-all"
            >
              <Plus className="w-4 h-4" />
              Criar Nova OS
            </button>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* ── MODO LISTA ── */
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          {/* Header da tabela */}
          <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1.2fr_130px] gap-4 px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
            <span>Cliente / Veículo</span>
            <span>Placa</span>
            <span>Abertura</span>
            <span>Status</span>
            <span className="text-right">Total</span>
          </div>
          {/* Rows */}
          {ordens.map((os) => {
            const sc = getStatusConfig(os.status);
            const overdue = isOverdue(os.status, os.data_abertura);
            const initials = getClientInitials(os.clientes?.nome);
            const daysOpen = getDaysOpen(os.data_abertura);

            return (
              <div
                key={os.id}
                onClick={() => navigate('detalhes-os', { id: os.id })}
                className="grid grid-cols-1 md:grid-cols-[2fr_1.2fr_1fr_1.2fr_130px] gap-2 md:gap-4 px-4 py-3 border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/60 cursor-pointer group transition-colors"
              >
                {/* Cliente + Veículo */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate group-hover:text-emerald-400 transition-colors">
                      {os.clientes?.nome || '—'}
                    </p>
                    <p className="text-zinc-500 text-xs truncate">
                      {os.veiculos?.modelo || '—'}
                    </p>
                  </div>
                </div>
                {/* Placa */}
                <div className="flex items-center">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                    {os.veiculos?.placa || '—'}
                  </span>
                </div>
                {/* Data */}
                <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                  <Clock className="w-3 h-3 shrink-0" />
                  {formatDate(os.data_abertura)}
                  {daysOpen > 0 && !['FINALIZADO', 'PAGO'].includes(os.status) && (
                    <span className={`text-[10px] font-bold ${getDaysOpenColor(daysOpen).text}`}>
                      ({daysOpen}d)
                    </span>
                  )}
                </div>
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] rounded font-bold border ${sc.bgColor} ${sc.color} ${sc.borderColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dotColor} ${sc.pulse ? 'animate-pulse' : ''}`} />
                    {sc.label}
                  </span>
                  {overdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                </div>
                {/* Total */}
                <div className="flex items-center md:justify-end">
                  <span className="text-emerald-400 font-bold text-sm tabular-nums">
                    {formatCurrency(os.total_geral)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── MODO CARDS ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ordens.map((os) => {
            const sc = getStatusConfig(os.status);
            const overdue = isOverdue(os.status, os.data_abertura);
            const isPeca = os.status === 'AGUARDANDO_PECA';
            const daysOpen = getDaysOpen(os.data_abertura);
            const daysColor = getDaysOpenColor(daysOpen);
            const initials = getClientInitials(os.clientes?.nome);

            return (
              <div
                key={os.id}
                onClick={() => navigate('detalhes-os', { id: os.id })}
                className={`relative bg-zinc-900/50 border rounded-xl p-4 md:p-6 cursor-pointer transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/80 group card-hover ${
                  isPeca ? 'animate-pulse-border' : 'border-zinc-800'
                }`}
              >
                {/* Top accent line */}
                <div className={`absolute top-0 left-4 right-4 h-px bg-linear-to-r from-transparent ${statusAccentLine[os.status] || 'via-zinc-600/30'} to-transparent ${isPeca ? 'animate-pulse-dot' : ''}`} />

                {/* Card top: date + days + status + arrow */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(os.data_abertura)}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {daysOpen > 0 && !['FINALIZADO', 'PAGO'].includes(os.status) && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md font-bold border whitespace-nowrap ${daysColor.bg} ${daysColor.text} ${daysColor.border}`}>
                        <Clock className="w-3 h-3" />
                        {daysOpen}d
                      </span>
                    )}
                    {overdue && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] md:text-xs rounded-md font-bold border whitespace-nowrap bg-red-500/10 text-red-500 border-red-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        ATRASADO
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] md:text-xs rounded-md font-bold border whitespace-nowrap ${sc.bgColor} ${sc.color} ${sc.borderColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${sc.dotColor} ${sc.pulse ? 'animate-pulse-ring' : ''}`} />
                      {sc.label}
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {/* Client */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate group-hover:text-emerald-400 transition-colors">
                      {os.clientes?.nome || 'Cliente não informado'}
                    </p>
                    {os.clientes?.telefone && (
                      <p className="text-zinc-500 text-xs mt-0.5">{os.clientes.telefone}</p>
                    )}
                  </div>
                </div>

                {/* Vehicle */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="bg-zinc-800/80 rounded-lg p-2 shrink-0">
                    <CarFront className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-300 text-sm truncate">
                      {os.veiculos?.modelo || 'Veículo não informado'}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold uppercase tracking-wider mt-1">
                      {os.veiculos?.placa || '—'}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Total
                  </span>
                  <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-emerald-300 group-hover:from-emerald-300 group-hover:to-emerald-200 font-bold text-lg tabular-nums transition-all">
                    {formatCurrency(os.total_geral)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500 tabular-nums">
            Página{' '}
            <span className="text-zinc-300 font-semibold">{currentPage + 1}</span>{' '}
            de{' '}
            <span className="text-zinc-300 font-semibold">{totalPages}</span>
            {' · '}
            <span className="text-zinc-300 font-semibold">{totalCount}</span> OS no total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={!hasPrev}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!hasNext}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Próxima
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
