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
  Activity,
  Server,
  Database,
  Clock,
  Cpu,
  BarChart as BarChartIcon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';


/* ───────────────────── Types ───────────────────── */

interface LogEntry {
  id: string | number;
  usuario_nome?: string;
  tabela: string;
  operacao: 'INSERT' | 'UPDATE' | 'DELETE';
  dados_antes?: unknown;   // <--- Trocou de dados_antigos
  dados_depois?: unknown;  // <--- Trocou de dados_novos
  criado_em: string;       // <--- Trocou de created_at
}

interface LogFilters {
  tabela: string;
  operacao: string;
  data_ini: string;
  data_fim: string;
  empresa_id: string;
}

interface APMData {
  resumo_24h: {
    total_requisicoes: number;
    tempo_medio_ms: number;
  };
  top_5_rotas_lentas: {
    rota: string;
    chamadas: number;
    tempo_medio_ms: number;
  }[];
  top_5_rotas_usadas: {
    rota: string;
    chamadas: number;
    tempo_medio_ms: number;
  }[];
  io_banco_de_dados: {
    tabela: string;
    buscas_sequenciais: number;
    buscas_indexadas: number;
    inserts: number;
    updates: number;
    deletes: number;
  }[];
}

const TABELA_OPTIONS = [
  { value: '', label: 'Todas as tabelas' },
  { value: 'os', label: 'OS' },
  { value: 'clientes', label: 'Clientes' },
  { value: 'veiculos', label: 'Veículos' },
  { value: 'estoque', label: 'Estoque' },
  { value: 'usuarios', label: 'Usuários' },
  { value: 'empresas', label: 'Empresas' },
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

/* Tabela color map (colored dot + name) */
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
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
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

const selectClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer';
const inputClass = 'w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all';
const filterLabelClass = 'text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 block';

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-lg shadow-xl">
        <p className="text-zinc-300 text-xs mb-1 font-mono">{payload[0].payload.rota}</p>
        <p className="text-emerald-400 font-bold text-sm">
          {payload[0].value} {payload[0].name === 'tempo_medio_ms' ? 'ms' : 'chamadas'}
        </p>
      </div>
    );
  }
  return null;
};

/* ───────────────────── Skeletons & Guard ───────────────────── */

function LogsPageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-pulse flex-shrink-0" />
          <div className="space-y-2.5">
            <div className="w-48 h-7 rounded-lg bg-zinc-800 animate-pulse" />
            <div className="w-64 h-4 rounded bg-zinc-800/60 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="h-64 bg-zinc-900/50 border border-zinc-800 rounded-xl animate-pulse" />
    </div>
  );
}

function AccessDenied() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-500">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 md:p-10 text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Shield className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-white font-bold text-xl mb-3">Acesso Restrito</h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-5">
          O módulo de logs é exclusivo para administradores. Somente usuários <span className="text-amber-400 font-bold">Dono</span> ou <span className="text-red-400 font-bold">Master</span> possuem acesso.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Seu cargo:</span>
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded border bg-zinc-700/10 text-zinc-300 border-zinc-600/30">{user?.cargo || ''}</span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────── Main Component ───────────────────── */

export default function Logs() {
  const user = useAuthStore((s) => s.user);
  const isMaster = user?.cargo === 'master';

  // Tabs (Only Master sees APM)
  const [activeTab, setActiveTab] = useState<'logs' | 'apm'>('logs');

  // Logs State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportBtnRef = useRef<HTMLButtonElement>(null);

  // Empresas List (For Master Filter)
  const [empresasList, setEmpresasList] = useState<{id: string; nome_fantasia: string}[]>([]);

  // Filters State (Draft vs Applied to prevent spamming requests)
  const [filters, setFilters] = useState<LogFilters>({
    tabela: '',
    operacao: '',
    data_ini: '',
    data_fim: '',
    empresa_id: user?.empresa_id || '',
  });
  const [appliedFilters, setAppliedFilters] = useState<LogFilters>(filters);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // APM State
  const [apmData, setApmData] = useState<APMData | null>(null);
  const [apmLoading, setApmLoading] = useState(false);

  /* ──────── Load Empresas (Master only) ──────── */
  useEffect(() => {
    if (isMaster) {
      apiGet<any[]>('/empresas')
        .then(res => setEmpresasList(res))
        .catch(() => {});
    }
  }, [isMaster]);

  /* ──────── Build Query String (based on APPLIED filters) ──────── */
  const buildQueryString = useCallback((extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (appliedFilters.tabela) params.set('tabela', appliedFilters.tabela);
    if (appliedFilters.operacao) params.set('operacao', appliedFilters.operacao);
    if (appliedFilters.data_ini) params.set('data_ini', appliedFilters.data_ini);
    if (appliedFilters.data_fim) params.set('data_fim', appliedFilters.data_fim);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, [appliedFilters]);

  /* ──────── Load Logs ──────── */
  const loadLogs = useCallback(async () => {
    const targetEmpresa = appliedFilters.empresa_id;
    if (!targetEmpresa) return;
    
    setLoading(true);
    setError('');
    try {
      const qs = buildQueryString({ page: String(page), limit: String(PAGE_SIZE) });
      const data = await apiGet<LogEntry[] | { logs: LogEntry[]; total: number }>(
        `/logs/${targetEmpresa}${qs}`
      );

      if (Array.isArray(data)) {
        setLogs(data);
        setTotalPages(Math.max(1, Math.ceil(data.length / PAGE_SIZE)));
      } else {
        setLogs(data.logs || []);
        setTotalPages(Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE)));
      }
    } catch {
      setError('Erro ao carregar logs de atividade. Verifique a conexão.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters.empresa_id, page, buildQueryString]);

  /* ──────── Load APM (Master only) ──────── */
  const loadApm = useCallback(async () => {
    if (!isMaster) return;
    setApmLoading(true);
    try {
      // Endpoint requires x-cargo: master (handled by token/backend or explicit)
      const data = await apiGet<APMData>('/monitoramento/');
      setApmData(data);
    } catch {
      toast.error('Erro ao carregar métricas do APM.');
    } finally {
      setApmLoading(false);
    }
  }, [isMaster]);

  // Handle Tab Switching & Initial Load
  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    } else if (activeTab === 'apm') {
      loadApm();
    }
  }, [activeTab, loadLogs, loadApm]);

  /* ──────── RBAC check ──────── */
  if (user && user.cargo !== 'DONO' && user.cargo !== 'master') {
    return <AccessDenied />;
  }

  /* ──────── Actions ──────── */
  const applyFilters = () => {
    setAppliedFilters(filters);
    setPage(1);
  };

  const clearFilters = () => {
    const reset = { tabela: '', operacao: '', data_ini: '', data_fim: '', empresa_id: user?.empresa_id || '' };
    setFilters(reset);
    setAppliedFilters(reset);
    setPage(1);
  };

  const hasActiveFilters = appliedFilters.tabela || appliedFilters.operacao || appliedFilters.data_ini || appliedFilters.data_fim || (isMaster && appliedFilters.empresa_id !== user?.empresa_id);

  const handleExport = async () => {
    const targetEmpresa = appliedFilters.empresa_id;
    if (!targetEmpresa || exporting) return;
    setExporting(true);

    if (exportBtnRef.current) {
      exportBtnRef.current.classList.add('animate-bounce');
      setTimeout(() => exportBtnRef.current?.classList.remove('animate-bounce'), 600);
    }

    try {
      const qs = buildQueryString();
      const a = document.createElement('a');
      a.href = `https://autotec-backend.onrender.com/api/v1/logs/${targetEmpresa}/exportar${qs}`;
      a.target = '_blank';
      a.download = `logs-autotec-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error("Falha ao exportar logs.");
    } finally {
      setExporting(false);
    }
  };

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

  if (loading && activeTab === 'logs') return <LogsPageSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* ─── TABS PARA MASTER ────────────────────────────────────────────── */}
      {isMaster && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-1 flex gap-1 mb-2 max-w-sm">
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'logs' ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" /> Auditoria
          </button>
          <button
            onClick={() => setActiveTab('apm')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'apm' ? 'bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Grafana APM
          </button>
        </div>
      )}

      {/* ================================================================================= */}
      {/* ABA DE LOGS DE AUDITORIA                                                          */}
      {/* ================================================================================= */}
      <div className={activeTab === 'logs' ? 'block' : 'hidden'}>
        
        {/* Header */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <ScrollText className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Logs de Atividade</h1>
                <p className="text-zinc-400 text-sm mt-0.5">Rastreabilidade total das operações</p>
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
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Exportar
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 mb-6">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-zinc-800"><Filter className="w-4 h-4 text-zinc-400" /></div>
              <h2 className="text-white font-bold text-sm">Filtros</h2>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs font-medium transition-colors px-3 py-1.5 rounded-xl hover:bg-zinc-800/50">
                <X className="w-3 h-3" /> Limpar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {isMaster && (
              <div>
                <label className={filterLabelClass}>Empresa (Master)</label>
                <select value={filters.empresa_id} onChange={(e) => setFilters({...filters, empresa_id: e.target.value})} className={selectClass}>
                  <option value="" disabled>Selecione uma empresa</option>
                  {empresasList.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={filterLabelClass}>Tabela</label>
              <select value={filters.tabela} onChange={(e) => setFilters({...filters, tabela: e.target.value})} className={selectClass}>
                {TABELA_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <div>
              <label className={filterLabelClass}>Operação</label>
              <select value={filters.operacao} onChange={(e) => setFilters({...filters, operacao: e.target.value})} className={selectClass}>
                {OPERACAO_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
              </select>
            </div>
            <div>
              <label className={filterLabelClass}>Data Início</label>
              <input type="date" value={filters.data_ini} onChange={(e) => setFilters({...filters, data_ini: e.target.value})} className={inputClass} />
            </div>
            <div>
              <label className={filterLabelClass}>Data Fim</label>
              <input type="date" value={filters.data_fim} onChange={(e) => setFilters({...filters, data_fim: e.target.value})} className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-zinc-800/50">
            <button onClick={applyFilters} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-6 py-2.5 text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.98]">
              <Filter className="w-4 h-4" /> Aplicar Filtros
            </button>
          </div>
        </div>

        {/* Tabela de Logs */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 mb-5 rounded-2xl bg-zinc-800/30 border border-zinc-800 flex items-center justify-center">
                <FileX className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Nenhum log encontrado</h3>
              <p className="text-zinc-500 text-sm text-center max-w-sm mb-5">
                Nenhum registro corresponde aos filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-950/80 sticky top-0 z-10 border-b border-zinc-800/50 shadow-sm shadow-black/20">
                    <th className="text-left text-[10px] md:text-xs uppercase font-bold text-zinc-500 px-5 py-4">Data/Hora</th>
                    <th className="text-left text-[10px] md:text-xs uppercase font-bold text-zinc-500 px-5 py-4 hidden sm:table-cell">Usuário</th>
                    <th className="text-left text-[10px] md:text-xs uppercase font-bold text-zinc-500 px-5 py-4">Tabela</th>
                    <th className="text-left text-[10px] md:text-xs uppercase font-bold text-zinc-500 px-5 py-4">Operação</th>
                    <th className="text-left text-[10px] md:text-xs uppercase font-bold text-zinc-500 px-5 py-4 hidden md:table-cell">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {logs.map((log) => {
                    const opBadge = OP_BADGE[log.operacao] || { label: log.operacao, classes: 'bg-zinc-700/10 text-zinc-400 border border-zinc-700/20' };
                    const opBorder = OP_BORDER[log.operacao] || '';
                    const OpIcon = OP_ICON[log.operacao];
                    const tabelaStyle = getTabelaStyle(log.tabela);
                    const dt = formatDateTime(log.criado_em);

                    return (
                      <tr key={log.id} className={`hover:bg-zinc-800/40 transition-colors group ${opBorder}`}>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="text-xs text-zinc-300 tabular-nums font-medium" title={relativeTimeLog(log.criado_em)}>{dt.date}</div>
                          <div className="text-[10px] text-zinc-600 font-mono tabular-nums mt-0.5">{dt.time}</div>
                        </td>
                        <td className="px-5 py-3 text-zinc-400 text-xs hidden sm:table-cell font-medium">{log.usuario_nome || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg border whitespace-nowrap ${tabelaStyle.bg} ${tabelaStyle.text} ${tabelaStyle.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tabelaStyle.dot} flex-shrink-0`} /> {log.tabela}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] md:text-xs rounded-lg font-bold border ${opBadge.classes}`}>
                            {OpIcon && <OpIcon className="w-3 h-3 flex-shrink-0" />} {opBadge.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell">
                          <div className="text-[10px] text-zinc-500 font-mono max-w-xs truncate bg-zinc-950 px-2 py-1 rounded border border-zinc-800/50">
                            {truncateDetails(log.dados_depois || log.dados_antes)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          {totalPages > 1 && (
            <div className="bg-zinc-900/80 border-t border-zinc-800 p-3">
              <div className="flex items-center justify-between px-2">
                <p className="text-zinc-500 text-xs tabular-nums">
                  Mostrando página <span className="text-zinc-300 font-medium">{page}</span> de <span className="text-zinc-300 font-medium">{totalPages}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => goPage(page - 1)} disabled={page <= 1} className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  {getPageNumbers().map((p, idx) =>
                    p === '...' ? (
                      <span key={`dots-${idx}`} className="px-2 text-zinc-600 text-xs">...</span>
                    ) : (
                      <button key={p} onClick={() => goPage(p as number)} className={`min-w-[36px] h-9 rounded-lg text-xs font-bold transition-all tabular-nums px-3 py-1.5 border ${page === p ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}>
                        {p}
                      </button>
                    )
                  )}
                  <button onClick={() => goPage(page + 1)} disabled={page >= totalPages} className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================================================================================= */}
      {/* ABA DE MONITORAMENTO APM (Grafana Style)                                          */}
      {/* ================================================================================= */}
      <div className={activeTab === 'apm' ? 'block' : 'hidden'}>
        
        <div className="bg-gradient-to-r from-zinc-950 to-zinc-900 border border-cyan-500/20 rounded-2xl p-5 md:p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight">Monitoramento APM</h1>
              <p className="text-cyan-500/60 text-xs font-mono mt-1 uppercase tracking-widest">Application Performance Monitoring</p>
            </div>
          </div>
        </div>

        {apmLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 border border-zinc-800/50 rounded-2xl bg-zinc-950/50">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            <p className="text-cyan-500/50 font-mono text-xs uppercase tracking-widest">Coletando telemetria...</p>
          </div>
        ) : apmData ? (
          <div className="space-y-6">
            
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex items-center gap-5 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500" />
                <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center">
                  <Server className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Requisições (24h)</p>
                  <p className="text-3xl font-black text-white tabular-nums">{apmData.resumo_24h.total_requisicoes.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex items-center gap-5 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Tempo Médio Resposta</p>
                  <p className="text-3xl font-black text-white tabular-nums">{apmData.resumo_24h.tempo_medio_ms.toFixed(1)} <span className="text-base text-zinc-600 font-normal">ms</span></p>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rotas Lentas */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
                <h3 className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-6">
                  <AlertTriangle className="w-4 h-4 text-red-500" /> Top 5 Rotas Lentas (ms)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={apmData.top_5_rotas_lentas} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="rota" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={120} axisLine={false} tickLine={false} tickFormatter={(v) => v.split('?')[0].slice(0, 20)} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                      <Bar dataKey="tempo_medio_ms" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Rotas Usadas */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
                <h3 className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider mb-6">
                  <BarChartIcon className="w-4 h-4 text-emerald-500" /> Rotas Mais Chamadas
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={apmData.top_5_rotas_usadas} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="rota" tick={{ fill: '#a1a1aa', fontSize: 10 }} width={120} axisLine={false} tickLine={false} tickFormatter={(v) => v.split('?')[0].slice(0, 20)} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                      <Bar dataKey="chamadas" fill="#10b981" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* DB I/O Table */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">I/O Banco de Dados (PostgreSQL)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-900/50">
                      <th className="text-left text-[10px] uppercase font-bold text-zinc-500 px-5 py-3">Tabela</th>
                      <th className="text-center text-[10px] uppercase font-bold text-zinc-500 px-5 py-3">Escritas (I/U/D)</th>
                      <th className="text-left text-[10px] uppercase font-bold text-zinc-500 px-5 py-3">Leituras (Index vs Seq)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {apmData.io_banco_de_dados.map((db, i) => {
                      const totalReads = db.buscas_indexadas + db.buscas_sequenciais;
                      const seqPct = totalReads > 0 ? (db.buscas_sequenciais / totalReads) * 100 : 0;
                      const idxPct = totalReads > 0 ? (db.buscas_indexadas / totalReads) * 100 : 0;
                      // Vermelho se leitura sequencial for maior que 20% do total
                      const isDanger = seqPct > 20 && db.buscas_sequenciais > 100;

                      return (
                        <tr key={i} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="px-5 py-4 font-mono text-cyan-400/80 font-semibold">{db.tabela}</td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-[10px] font-mono">
                              <span className="text-emerald-400" title="Inserts">+{db.inserts}</span>
                              <span className="text-blue-400" title="Updates">~{db.updates}</span>
                              <span className="text-red-400" title="Deletes">-{db.deletes}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                              <span className="text-zinc-400">Total: {totalReads.toLocaleString()}</span>
                              <span className={isDanger ? 'text-red-400 font-bold' : 'text-zinc-500'}>Seq: {db.buscas_sequenciais.toLocaleString()} ({seqPct.toFixed(1)}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                              <div className="h-full bg-emerald-500" style={{ width: `${idxPct}%` }} title="Buscas Indexadas (Rápidas)" />
                              <div className="h-full bg-red-500" style={{ width: `${seqPct}%` }} title="Buscas Sequenciais (Lentas)" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <Cpu className="w-10 h-10 mb-4 opacity-20" />
            <p className="text-sm">Nenhum dado de telemetria disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}