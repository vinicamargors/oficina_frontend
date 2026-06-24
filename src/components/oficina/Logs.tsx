'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ScrollText,
  Download,
  Filter,
  X,
  Loader2,
  Shield,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileX,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

/* ───────────────────── Types ───────────────────── */

interface LogEntry {
  id: string;
  usuario_nome?: string;
  tabela: string;
  operacao: 'INSERT' | 'UPDATE' | 'DELETE';
  dados_antigos?: unknown;
  dados_novos?: unknown;
  created_at: string;
}

interface LogFilters {
  tabela: string;
  operacao: string;
  data_ini: string;
  data_fim: string;
}

const TABELA_OPTIONS = [
  { value: '', label: 'Todas as tabelas' },
  { value: 'OS', label: 'OS' },
  { value: 'Clientes', label: 'Clientes' },
  { value: 'Veiculos', label: 'Veículos' },
  { value: 'Estoque', label: 'Estoque' },
  { value: 'Usuarios', label: 'Usuários' },
  { value: 'Empresas', label: 'Empresas' },
];

const OPERACAO_OPTIONS = [
  { value: '', label: 'Todas as operações' },
  { value: 'INSERT', label: 'INSERT' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
];

const OP_BADGE: Record<string, { classes: string; label: string }> = {
  INSERT: { label: 'INSERT', classes: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  UPDATE: { label: 'UPDATE', classes: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  DELETE: { label: 'DELETE', classes: 'bg-red-500/10 text-red-400 border border-red-500/20' },
};

const OP_BORDER: Record<string, string> = {
  INSERT: 'border-l-2 border-l-emerald-500/40',
  UPDATE: 'border-l-2 border-l-blue-400/40',
  DELETE: 'border-l-2 border-l-red-500/40',
};

const OP_ICON: Record<string, React.ElementType> = {
  INSERT: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
};

/* Tabela color map (colored dot + name, like Estoque category badges) */
function getTabelaStyle(tabela: string) {
  const n = tabela.toLowerCase();
  if (n === 'os') return { dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  if (n === 'clientes') return { dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  if (n === 'veiculos') return { dot: 'bg-cyan-400', text: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
  if (n === 'estoque') return { dot: 'bg-violet-400', text: 'text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/20' };
  if (n === 'usuarios') return { dot: 'bg-rose-400', text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
  if (n === 'empresas') return { dot: 'bg-teal-400', text: 'text-teal-300', bg: 'bg-teal-500/10', border: 'border-teal-500/20' };
  return { dot: 'bg-zinc-400', text: 'text-zinc-300', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' };
}

const PAGE_SIZE = 20;

/* ───────────────────── Helpers ───────────────────── */

function formatDateTime(dateStr: string): { date: string; time: string } {
  try {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      time: d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
  } catch {
    return { date: dateStr, time: '' };
  }
}

function relativeTimeLog(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'ontem';
  if (diffD < 7) return `${diffD}d atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function truncateDetails(details: unknown, maxLen = 80): string {
  if (!details) return '—';
  try {
    const str = typeof details === 'string' ? details : JSON.stringify(details);
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '...';
  } catch {
    return '—';
  }
}

const selectClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer';

const inputClass =
  'w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all';

const filterLabelClass = 'text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 block';

/* ───────────────────── Skeleton Components ───────────────────── */

function LogsPageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header skeleton */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-pulse flex-shrink-0" />
          <div className="space-y-2.5">
            <div className="w-48 h-7 rounded-lg bg-zinc-800 animate-pulse" />
            <div className="w-64 h-4 rounded bg-zinc-800/60 animate-pulse" />
          </div>
          <div className="ml-auto w-24 h-7 rounded-full bg-zinc-800/60 animate-pulse hidden sm:block" />
        </div>
      </div>

      {/* Filter card skeleton */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-1.5 rounded-lg bg-zinc-800 animate-pulse" />
          <div className="w-14 h-4 rounded bg-zinc-800 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="w-16 h-3 rounded bg-zinc-800/60 animate-pulse" />
              <div className="w-full h-11 rounded-xl bg-zinc-800/50 border border-zinc-800 animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Table card skeleton */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-pulse" />
            <div className="w-36 h-4 rounded bg-zinc-800 animate-pulse" />
            <div className="w-20 h-5 rounded-full bg-zinc-800/50 animate-pulse" />
          </div>
        </div>
        {/* Header row */}
        <div className="px-5 py-3.5 bg-zinc-950/50 flex gap-5">
          <div className="h-3 bg-zinc-800 rounded w-24" />
          <div className="h-3 bg-zinc-800 rounded w-16 hidden sm:block" />
          <div className="h-3 bg-zinc-800 rounded w-16" />
          <div className="h-3 bg-zinc-800 rounded w-20" />
          <div className="h-3 bg-zinc-800 rounded w-24 hidden md:block" />
        </div>
        {/* 5 Data rows with alternating widths */}
        {[90, 70, 85, 60, 95].map((w, i) => (
          <div key={i} className="px-5 py-3.5 border-t border-zinc-800/50 animate-pulse">
            <div className="flex gap-5 items-center">
              <div className="h-3 bg-zinc-800/60 rounded flex-shrink-0" style={{ width: `${w * 0.35}%` }} />
              <div className="h-3 bg-zinc-800/60 rounded w-20 hidden sm:block flex-shrink-0" />
              <div className="h-5 bg-zinc-800/60 rounded-md w-16 flex-shrink-0" />
              <div className="h-5 bg-zinc-800/60 rounded-md w-16 flex-shrink-0" />
              <div className="h-3 bg-zinc-800/40 rounded flex-1 hidden md:block" style={{ width: `${w}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div className="w-40 h-3 rounded bg-zinc-800/50 animate-pulse" />
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-lg bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── RBAC Guard ───────────────────── */

function AccessDenied() {
  const user = useAuthStore((s) => s.user);
  const cargoLabel = user?.cargo || '';

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-500">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 md:p-10 text-center max-w-md">
        {/* Icon container */}
        <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Shield className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-white font-bold text-xl mb-3">Acesso Restrito</h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-5">
          O módulo de logs é exclusivo para administradores do sistema.
          Somente usuários com cargo{' '}
          <span className="text-amber-400 font-bold">Dono</span> ou{' '}
          <span className="text-red-400 font-bold">Master</span> podem visualizar o histórico de atividades.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Seu cargo:</span>
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded border bg-zinc-700/10 text-zinc-300 border-zinc-600/30">
            {cargoLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Main Component ───────────────────── */

export default function Logs() {
  const user = useAuthStore((s) => s.user);
  const empresaId = user?.empresa_id || '';

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);

  /* Filters */
  const [filters, setFilters] = useState<LogFilters>({
    tabela: '',
    operacao: '',
    data_ini: '',
    data_fim: '',
  });

  /* Pagination */
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /* ──────── Build query string ──────── */
  const buildQueryString = useCallback(
    (extra?: Record<string, string>) => {
      const params = new URLSearchParams();
      if (filters.tabela) params.set('tabela', filters.tabela);
      if (filters.operacao) params.set('operacao', filters.operacao);
      if (filters.data_ini) params.set('data_ini', filters.data_ini);
      if (filters.data_fim) params.set('data_fim', filters.data_fim);
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          params.set(k, v);
        }
      }
      const qs = params.toString();
      return qs ? `?${qs}` : '';
    },
    [filters]
  );

  /* ──────── Load logs ──────── */
  const loadLogs = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    setError('');
    try {
      const qs = buildQueryString({ page: String(page), limit: String(PAGE_SIZE) });
      const data = await apiGet<LogEntry[] | { logs: LogEntry[]; total: number }>(
        `/logs/${empresaId}${qs}`
      );

      // API may return array or { logs, total }
      if (Array.isArray(data)) {
        setLogs(data);
        setTotalPages(Math.max(1, Math.ceil(data.length / PAGE_SIZE)));
      } else {
        setLogs(data.logs || []);
        setTotalPages(Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE)));
      }
    } catch {
      setError('Erro ao carregar logs de atividade.');
    } finally {
      setLoading(false);
    }
  }, [empresaId, page, buildQueryString]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  /* ──────── RBAC check ──────── */
  if (user && user.cargo !== 'DONO' && user.cargo !== 'master') {
    return <AccessDenied />;
  }

  /* Reset page when filters change */
  const updateFilter = (key: keyof LogFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ tabela: '', operacao: '', data_ini: '', data_fim: '' });
    setPage(1);
  };

  const hasActiveFilters = filters.tabela || filters.operacao || filters.data_ini || filters.data_fim;
  const activeFilterCount = [filters.tabela, filters.operacao, filters.data_ini, filters.data_fim].filter(Boolean).length;

  /* ──────── Export ──────── */
  const handleExport = async () => {
    if (!empresaId || exporting) return;
    setExporting(true);

    /* Subtle download animation on the button */
    if (exportBtnRef.current) {
      exportBtnRef.current.classList.add('animate-bounce');
      setTimeout(() => exportBtnRef.current?.classList.remove('animate-bounce'), 600);
    }

    try {
      const qs = buildQueryString();
      const blob = await apiGet<Blob>(`/logs/${empresaId}/exportar${qs}`).catch(async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('autotec-user') : null;
        let cargoHeader = '';
        if (token) {
          try {
            const u = JSON.parse(token);
            if (u?.cargo) cargoHeader = u.cargo;
          } catch { /* ignore */ }
        }

        const supabaseModule = await import('@/lib/supabase');
        const { supabase } = supabaseModule;
        const { data: { session } } = await supabase.auth.getSession();

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
        if (cargoHeader) headers['x-cargo'] = cargoHeader;

        const res = await fetch(
          `https://autotec-backend.onrender.com/api/v1/logs/${empresaId}/exportar${qs}`,
          { headers }
        );
        if (!res.ok) throw new Error('Erro ao exportar');
        return res.blob();
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-autotec-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const qs = buildQueryString();
      const a = document.createElement('a');
      a.href = `/logs/${empresaId}/exportar${qs}`;
      a.download = `logs-autotec-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setExporting(false);
    }
  };

  /* ──────── Pagination helpers ──────── */
  const goPage = (p: number) => {
    if (p >= 1 && p <= totalPages) setPage(p);
  };

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  /* Pagination range display */
  const rangeStart = (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, logs.length + (page - 1) * PAGE_SIZE);

  /* ──────── Loading skeleton state ──────── */
  if (loading) {
    return <LogsPageSkeleton />;
  }

  /* ──────── Render ──────── */
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <ScrollText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Logs de Atividade</h1>
              <p className="text-zinc-400 text-sm mt-0.5">Auditoria de ações do sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1.5 text-[10px] font-bold rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/30 tabular-nums">
              {logs.length} registro{logs.length !== 1 ? 's' : ''}
            </span>
            <button
              ref={exportBtnRef}
              onClick={handleExport}
              disabled={exporting}
              className="bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 font-medium py-2.5 px-4 rounded-xl text-zinc-300 text-xs transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ─── Filters Card ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-zinc-800">
              <Filter className="w-4 h-4 text-zinc-400" />
            </div>
            <h2 className="text-white font-bold text-sm">Filtros</h2>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-medium transition-colors px-3 py-1.5 rounded-xl hover:bg-zinc-800/50"
            >
              <X className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tabela */}
          <div>
            <label className={filterLabelClass}>Tabela</label>
            <select
              value={filters.tabela}
              onChange={(e) => updateFilter('tabela', e.target.value)}
              className={selectClass}
            >
              {TABELA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Operação */}
          <div>
            <label className={filterLabelClass}>Operação</label>
            <select
              value={filters.operacao}
              onChange={(e) => updateFilter('operacao', e.target.value)}
              className={selectClass}
            >
              {OPERACAO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Data Início */}
          <div>
            <label className={filterLabelClass}>Data Início</label>
            <input
              type="date"
              value={filters.data_ini}
              onChange={(e) => updateFilter('data_ini', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Data Fim */}
          <div>
            <label className={filterLabelClass}>Data Fim</label>
            <input
              type="date"
              value={filters.data_fim}
              onChange={(e) => updateFilter('data_fim', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => loadLogs()}
            className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl px-5 py-2.5 text-sm transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Filter className="w-3.5 h-3.5" />
            Filtrar
          </button>
        </div>
      </div>

      {/* ─── Logs Table Card ───────────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ScrollText className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-white font-bold text-sm">Registro de Atividades</h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-zinc-800 text-zinc-400 tabular-nums">
              {logs.length} registro{logs.length !== 1 ? 's' : ''}
            </span>
          </div>
          {totalPages > 1 && (
            <span className="text-[10px] text-zinc-500 font-medium tabular-nums">
              Página {page} de {totalPages}
            </span>
          )}
        </div>

        {logs.length === 0 ? (
          /* ─── Empty State ────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 mb-5 rounded-2xl bg-zinc-800/30 border border-zinc-800 flex items-center justify-center">
              <FileX className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Nenhum log encontrado</h3>
            <p className="text-zinc-500 text-sm text-center max-w-sm mb-5">
              {hasActiveFilters
                ? `Nenhum registro corresponde aos filtros ativos (${activeFilterCount} filtro${activeFilterCount !== 1 ? 's' : ''}). Tente ajustar os critérios.`
                : 'Ainda não há registros de atividade no sistema.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Limpar Filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ─── Table ──────────────────────────────────────────────── */}
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-950/50 sticky top-0 z-10">
                    <th className="text-left text-[10px] md:text-xs uppercase font-semibold text-zinc-500 px-5 py-3.5">
                      Data/Hora
                    </th>
                    <th className="text-left text-[10px] md:text-xs uppercase font-semibold text-zinc-500 px-5 py-3.5 hidden sm:table-cell">
                      Usuário
                    </th>
                    <th className="text-left text-[10px] md:text-xs uppercase font-semibold text-zinc-500 px-5 py-3.5">
                      Tabela
                    </th>
                    <th className="text-left text-[10px] md:text-xs uppercase font-semibold text-zinc-500 px-5 py-3.5">
                      Operação
                    </th>
                    <th className="text-left text-[10px] md:text-xs uppercase font-semibold text-zinc-500 px-5 py-3.5 hidden md:table-cell">
                      Detalhes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {logs.map((log) => {
                    const opBadge = OP_BADGE[log.operacao] || {
                      label: log.operacao,
                      classes: 'bg-zinc-700/10 text-zinc-400 border border-zinc-700/20',
                    };
                    const opBorder = OP_BORDER[log.operacao] || '';
                    const OpIcon = OP_ICON[log.operacao];
                    const tabelaStyle = getTabelaStyle(log.tabela);
                    const dt = formatDateTime(log.created_at);

                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-zinc-800/30 transition-colors group ${opBorder}`}
                      >
                        {/* Data/Hora */}
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="text-xs text-zinc-300 tabular-nums" title={relativeTimeLog(log.created_at)}>
                            {dt.date}
                          </div>
                          <div className="text-[10px] text-zinc-600 font-mono tabular-nums mt-0.5">
                            {dt.time}
                          </div>
                        </td>

                        {/* Usuário */}
                        <td className="px-5 py-3 text-zinc-400 text-xs hidden sm:table-cell">
                          {log.usuario_nome || '—'}
                        </td>

                        {/* Tabela — colored dot + name badge */}
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg border whitespace-nowrap ${tabelaStyle.bg} ${tabelaStyle.text} ${tabelaStyle.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tabelaStyle.dot} flex-shrink-0`} />
                            {log.tabela}
                          </span>
                        </td>

                        {/* Operação — badge with icon */}
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] md:text-xs rounded-lg font-bold border ${opBadge.classes}`}
                          >
                            {OpIcon && <OpIcon className="w-3 h-3 flex-shrink-0" />}
                            {opBadge.label}
                          </span>
                        </td>

                        {/* Detalhes — truncated JSON preview */}
                        <td className="px-5 py-3 hidden md:table-cell">
                          <div className="text-[10px] text-zinc-600 font-mono max-w-xs truncate">
                            {truncateDetails(log.dados_novos || log.dados_antigos)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── Pagination ─────────────────────────────────────────── */}
            {totalPages > 1 && (
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 mx-3 mb-3 mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-zinc-500 text-xs tabular-nums">
                    Mostrando <span className="text-zinc-300 font-medium">{rangeStart}-{rangeEnd}</span> de <span className="text-zinc-300 font-medium">{logs.length + (totalPages - 1) * PAGE_SIZE}</span> registros
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => goPage(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {getPageNumbers().map((p, idx) =>
                      p === '...' ? (
                        <span key={`dots-${idx}`} className="px-1.5 text-zinc-600 text-xs">
                          ...
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => goPage(p)}
                          className={`min-w-[34px] h-8 rounded-lg text-xs font-bold transition-all active:scale-95 tabular-nums px-3 py-1.5 border ${
                            page === p
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => goPage(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Próxima página"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}