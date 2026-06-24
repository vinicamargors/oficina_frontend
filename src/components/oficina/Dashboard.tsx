'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CarFront,
  Wrench,
  FileText,
  Package,
  Plus,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
  BarChart3,
  Users
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';

// ── Types (matching real API response) ───────────────────────────────────────
interface OSListResponse {
  total: number;
}

interface UltimaOS {
  id: string;
  status: string;
  data_abertura: string;
  total_geral: number;
  clientes: { nome: string; telefone: string } | null;
  veiculos: { placa: string; modelo: string } | null;
}

interface DashboardData {
  total_abertas: number;
  estoque_critico_count: number;
  status_counts: Record<string, number>;
  ultimas_os: UltimaOS[];
  itens_criticos?: Array<{ id: string; nome: string; quantidade: number; minimo_alerta: number; categoria: string }>;
}

// ── Status Badge Config ─────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; border: string; bg: string }> = {
  ORCAMENTO: { label: 'Orçamento', color: 'text-zinc-400', border: 'border-zinc-500/20', bg: 'bg-zinc-500/10' },
  EXECUCAO: { label: 'Execução', color: 'text-blue-500', border: 'border-blue-500/20', bg: 'bg-blue-500/10' },
  AGUARDANDO_PECA: { label: 'Ag. Peça', color: 'text-orange-500', border: 'border-orange-500/20', bg: 'bg-orange-500/10' },
  FINALIZADO: { label: 'Pronto', color: 'text-emerald-500', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
  PAGO: { label: 'Pago', color: 'text-yellow-400', border: 'border-yellow-400/30', bg: 'bg-yellow-500/10' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status.toUpperCase()] || { label: status, color: 'text-zinc-400', border: 'border-zinc-700/30', bg: 'bg-zinc-700/10' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 text-[10px] md:text-xs rounded-md font-bold border whitespace-nowrap ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

// ── Animated Value Hook ────────────────────────────────────────────────────

function useAnimatedValue(target: number, duration = 800) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return current;
}

// ── Skeleton Components ────────────────────────────────────────────────────

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-xl p-4 md:p-6 space-y-3 animate-pulse">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-zinc-800 rounded w-20" />
              <div className="h-7 bg-zinc-800 rounded w-12" />
            </div>
            <div className="h-10 w-10 bg-zinc-800 rounded-lg" />
          </div>
          <div className="h-2.5 bg-zinc-800 rounded w-24" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 md:p-5 border-b border-zinc-800">
        <div className="h-5 bg-zinc-800 rounded w-36 animate-pulse" />
        <div className="h-4 bg-zinc-800 rounded w-20 animate-pulse" />
      </div>
      <div className="divide-y divide-zinc-800/50">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
            <div className="h-4 bg-zinc-800 rounded w-20 shrink-0" />
            <div className="h-4 bg-zinc-800 rounded w-28 shrink-0 hidden md:block" />
            <div className="h-4 bg-zinc-800 rounded w-32 flex-1" />
            <div className="h-6 bg-zinc-800 rounded w-20 shrink-0 hidden sm:block" />
            <div className="h-4 bg-zinc-800 rounded w-20 shrink-0 text-right hidden lg:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value?: number) {
  if (value == null) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function relativeTime(dateStr: string): string {
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

function relativeTimeColor(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return 'text-emerald-400';
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return 'text-yellow-500';
  return 'text-zinc-500';
}

const timelineDotColor: Record<string, string> = {
  ORCAMENTO: 'bg-zinc-400',
  EXECUCAO: 'bg-blue-500',
  AGUARDANDO_PECA: 'bg-orange-500',
  FINALIZADO: 'bg-emerald-500',
  PAGO: 'bg-yellow-400',
};

// ── Main Component ─────────────────────────────────────────────────────────

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [veiculosRevisao, setVeiculosRevisao] = useState<Array<{id: string; placa: string; modelo: string; km_atual?: number}>>([]);
  const [barAnimated, setBarAnimated] = useState(false);
  const [metrics, setMetrics] = useState({
    todos: 0,
    orcamento: 0,
    execucao: 0,
    peca: 0,
    finalizado: 0
  });

  const [now, setNow] = useState(new Date());

  // ── Fetch Global Real Metrics ──
  const fetchMetrics = useCallback(async () => {
    if (!user?.empresa_id) return;
    try {
      const endpoints = [
        { key: 'todos', status: 'Todos' },
        { key: 'orcamento', status: 'ORCAMENTO' },
        { key: 'execucao', status: 'EXECUCAO' },
        { key: 'peca', status: 'AGUARDANDO_PECA' },
        { key: 'finalizado', status: 'FINALIZADO' }
      ];

      const promises = endpoints.map(async (ep) => {
        const params = new URLSearchParams({
          empresa_id: user.empresa_id,
          limit: '1',
        });
        if (ep.status !== 'Todos') params.set('status', ep.status);
        const raw = await apiGet<OSListResponse>(`/os/?${params.toString()}`);
        return { key: ep.key, total: raw.total ?? 0 };
      });

      const results = await Promise.all(promises);
      const newMetrics = { todos: 0, orcamento: 0, execucao: 0, peca: 0, finalizado: 0 };
      results.forEach((r) => {
        newMetrics[r.key as keyof typeof newMetrics] = r.total;
      });

      setMetrics(newMetrics);
    } catch (err) {
      console.error('Erro ao buscar métricas da Home:', err);
    }
  }, [user?.empresa_id]);

  // ── Initial Loads ──
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = now.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  useEffect(() => {
    if (!user?.empresa_id) return;
    const load = async () => {
      try {
        const res = await apiGet<DashboardData>(`/dashboards/${user.empresa_id}`);
        setData(res);
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('Não foi possível carregar os dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.empresa_id]);

  useEffect(() => {
    const timer = setTimeout(() => setBarAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const fetchVeiculosRevisao = useCallback(async () => {
    if (!user?.empresa_id) return;
    try {
      const res = await apiGet<Array<{id: string; placa: string; modelo: string; km_atual?: number}>>(`/veiculos?empresa_id=${user.empresa_id}`);
      const filtered = (res || []).filter((v) => v.km_atual != null && v.km_atual > 0).slice(0, 4);
      setVeiculosRevisao(filtered);
    } catch {
      // silently hide the section
    }
  }, [user?.empresa_id]);

  useEffect(() => {
    fetchVeiculosRevisao();
  }, [fetchVeiculosRevisao]);

  const firstName = user?.nome?.split(' ')[0] || 'Usuário';

  // ── Animated KPI values using REAL METRICS ──
  const animTotalAbertas = useAnimatedValue(metrics.todos);
  const animExecucao = useAnimatedValue(metrics.execucao);
  const animOrcamento = useAnimatedValue(metrics.orcamento);
  const animEstoqueCritico = useAnimatedValue(data?.estoque_critico_count ?? 0);

// ── KPI Card definitions ──
  const kpiCards = [
    {
      label: 'OS Abertas',
      value: animTotalAbertas,
      icon: <CarFront className="w-5 h-5" />,
      color: 'text-zinc-100',
      iconColor: 'text-zinc-300',
      bgColor: 'bg-zinc-800/80',
      borderColor: 'hover:border-zinc-600/50',
      sub: 'Volume total ativo',
      progress: metrics.todos / 20,
      progressColor: 'bg-zinc-100',
      accentColor: 'zinc',
      trend: metrics.todos > 10
        ? { type: 'up' as const, text: '↑ Volume alto', colorClass: 'text-yellow-400' }
        : { type: 'neutral' as const, text: '→ Normal', colorClass: 'text-zinc-500' },
    },
    {
      label: 'Em Execução',
      value: animExecucao,
      icon: <Wrench className="w-5 h-5" />,
      color: 'text-blue-500',
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'hover:border-blue-500/30',
      sub: 'Mecânicos trabalhando',
      accentColor: 'blue',
      trend: metrics.execucao > 0
        ? { type: 'neutral' as const, text: '⚡ Em andamento', colorClass: 'text-blue-500' }
        : { type: 'neutral' as const, text: '— Sem atividade', colorClass: 'text-zinc-500' },
    },
    {
      label: 'Orçamentos',
      value: animOrcamento,
      icon: <FileText className="w-5 h-5" />,
      color: 'text-zinc-400',
      iconColor: 'text-zinc-400',
      bgColor: 'bg-zinc-500/10',
      borderColor: 'hover:border-zinc-500/30',
      sub: 'Aguardando aprovação',
      accentColor: 'zinc',
      trend: metrics.orcamento > 0
        ? { type: 'neutral' as const, text: '⏳ Pendente', colorClass: 'text-zinc-400' }
        : { type: 'up' as const, text: '✓ Nenhum pendente', colorClass: 'text-emerald-500' },
    },
    {
      label: 'Estoque Crítico',
      value: animEstoqueCritico,
      icon: data?.estoque_critico_count ? <AlertTriangle className="w-5 h-5" /> : <Package className="w-5 h-5" />,
      color: data?.estoque_critico_count ? 'text-red-400' : 'text-zinc-400',
      iconColor: data?.estoque_critico_count ? 'text-red-500' : 'text-zinc-500',
      bgColor: data?.estoque_critico_count ? 'bg-red-500/10' : 'bg-zinc-800/50',
      borderColor: data?.estoque_critico_count ? 'hover:border-red-500/30 animate-pulse' : 'hover:border-zinc-600/50',
      sub: data?.estoque_critico_count ? 'Compre urgente!' : 'Tudo abastecido',
      progress: (data?.estoque_critico_count ?? 0) / 10,
      progressColor: data?.estoque_critico_count ? 'bg-red-500' : 'bg-emerald-500',
      accentColor: data?.estoque_critico_count ? 'red' : 'emerald',
      trend: (data?.estoque_critico_count ?? 0) > 0
        ? { type: 'down' as const, text: '⚠ Urgente', colorClass: 'text-red-400' }
        : { type: 'up' as const, text: '✓ Abastecido', colorClass: 'text-emerald-400' },
    },
  ];

  // ── Quick Actions ──
  const quickActions = [
    {
      label: 'Nova OS',
      description: 'Abrir ordem de serviço',
      icon: <Wrench className="w-5 h-5" />,
      color: 'emerald',
      action: () => navigate('nova-os'),
    },
    {
      label: 'Novo Cliente',
      description: 'Cadastrar cliente',
      icon: <Users className="w-5 h-5" />,
      color: 'purple',
      action: () => navigate('clientes'),
    },
    {
      label: 'Ver Estoque',
      description: 'Gerenciar peças',
      icon: <Package className="w-5 h-5" />,
      color: 'amber',
      action: () => navigate('estoque'),
    },
    {
      label: 'Relatórios',
      description: 'Financeiro e dados',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'sky',
      action: () => navigate('financeiro'),
    },
  ];

  const quickActionStyles: Record<string, { iconBg: string; iconBorder: string; iconColor: string }> = {
    emerald: { iconBg: 'bg-emerald-500/10', iconBorder: 'border-emerald-500/20', iconColor: 'text-emerald-400' },
    purple: { iconBg: 'bg-purple-500/10', iconBorder: 'border-purple-500/20', iconColor: 'text-purple-400' },
    amber: { iconBg: 'bg-amber-500/10', iconBorder: 'border-amber-500/20', iconColor: 'text-amber-400' },
    sky: { iconBg: 'bg-sky-500/10', iconBorder: 'border-sky-500/20', iconColor: 'text-sky-400' },
  };

  const accentLineColors: Record<string, string> = {
    zinc: 'bg-linear-to-r from-transparent via-zinc-400/30 to-transparent',
    blue: 'bg-linear-to-r from-transparent via-blue-400/30 to-transparent',
    yellow: 'bg-linear-to-r from-transparent via-yellow-400/30 to-transparent',
    red: 'bg-linear-to-r from-transparent via-red-400/30 to-transparent',
    emerald: 'bg-linear-to-r from-transparent via-emerald-400/30 to-transparent',
  };

  const hoverShadowColors: Record<string, string> = {
    zinc: 'hover:shadow-zinc-400/5',
    blue: 'hover:shadow-blue-400/5',
    yellow: 'hover:shadow-yellow-400/5',
    red: 'hover:shadow-red-400/5',
    emerald: 'hover:shadow-emerald-400/5',
  };

  // ── Render ──
  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {getGreeting()}, <span className="text-emerald-400">{firstName}</span>
          </h1>
          <p className="text-sm md:text-base text-zinc-400">
            Aqui está o resumo da sua oficina agora
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-3">
          <button
            onClick={() => navigate('nova-os')}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 active:scale-95 shadow-lg shadow-emerald-600/20 w-full sm:w-auto cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Abrir Nova OS</span>
          </button>
          {/* Live clock — desktop only */}
          <div className="hidden md:flex items-center gap-3 text-right">
            <div>
              <p className="text-zinc-400 text-xs">{formattedDate}</p>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                <p className="text-zinc-500 text-sm font-mono tabular-nums">{formattedTime}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Loading Skeletons ── */}
      {loading && (
        <div className="space-y-6">
          <KPISkeleton />
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5 space-y-3 animate-pulse">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 animate-pulse" />
              <div className="h-4 bg-zinc-800 rounded w-36 animate-pulse" />
            </div>
            <div className="h-3 rounded-full bg-zinc-800 animate-pulse" />
          </div>
          <TableSkeleton />
        </div>
      )}

      {/* ── KPI Cards ── */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 stagger-children">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className={`relative bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800 rounded-xl p-3 md:p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] ${card.borderColor} ${hoverShadowColors[card.accentColor] ?? ''} hover:shadow-lg group`}
            >
              {/* Top accent line */}
              <div className={`absolute top-0 left-4 right-4 h-px ${accentLineColors[card.accentColor] ?? ''}`} />
              <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className="space-y-0.5 md:space-y-1 overflow-hidden pr-2">
                  <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-zinc-500 truncate">
                    {card.label}
                  </p>
                  <p className={`text-2xl md:text-3xl font-bold ${card.color} tabular-nums counter-tabular`}>
                    {card.value}
                  </p>
                  {(card as { trend?: { type: string; text: string; colorClass: string } }).trend && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {((card as { trend: { type: string; text: string; colorClass: string } }).trend.type === 'up') && (
                        <TrendingUp className={`w-3 h-3 ${(card as { trend: { type: string; text: string; colorClass: string } }).trend.colorClass}`} />
                      )}
                      {((card as { trend: { type: string; text: string; colorClass: string } }).trend.type === 'down') && (
                        <TrendingDown className={`w-3 h-3 ${(card as { trend: { type: string; text: string; colorClass: string } }).trend.colorClass}`} />
                      )}
                      <span className={`text-[10px] font-medium ${(card as { trend: { type: string; text: string; colorClass: string } }).trend.colorClass}`}>
                        {(card as { trend: { type: string; text: string; colorClass: string } }).trend.text}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`p-2 md:p-2.5 rounded-lg ${card.bgColor} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${card.accentColor === 'zinc' ? 'group-hover:shadow-zinc-400/10' : card.accentColor === 'blue' ? 'group-hover:shadow-blue-400/10' : card.accentColor === 'yellow' ? 'group-hover:shadow-yellow-400/10' : card.accentColor === 'red' ? 'group-hover:shadow-red-400/10' : 'group-hover:shadow-emerald-400/10'}`}>
                  <span className={card.iconColor}>{card.icon}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="w-3 h-3 text-zinc-600" />
                <p className="text-[10px] md:text-xs text-zinc-500 truncate">{card.sub}</p>
              </div>
              {(card as { progress?: number; progressColor?: string }).progress != null && (
                <div className="h-1 rounded-full bg-zinc-800 mt-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${(card as { progressColor?: string }).progressColor || 'bg-zinc-100'}`}
                    style={{ width: `${Math.min(100, ((card as { progress?: number }).progress ?? 0) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Quick Actions Grid ── */}
      {!loading && (
        <div className="bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 md:p-6 animate-in fade-in slide-in-from-bottom-1 duration-500">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 md:mb-4">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-3 stagger-children">
            {quickActions.map((action) => {
              const styles = quickActionStyles[action.color];
              return (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all cursor-pointer group text-left relative overflow-hidden"
                >
                  <div className={`p-2.5 rounded-lg ${styles.iconBg} border ${styles.iconBorder} inline-flex mb-2.5 transition-transform group-hover:scale-110 ${action.label === 'Nova OS' && metrics.todos > 0 ? 'animate-pulse-dot' : ''}`}>
                    <span className={styles.iconColor}>{action.icon}</span>
                  </div>
                  <p className="text-white font-semibold text-sm">{action.label}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{action.description}</p>
                  {action.label === 'Nova OS' && metrics.todos > 0 && (
                    <span className="absolute top-2.5 right-2.5 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      Mais usado
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Revisões Pendentes ── */}
      {!loading && veiculosRevisao.length > 0 && (
        <div className="bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 md:p-6 animate-in fade-in slide-in-from-bottom-1 duration-500">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="text-white font-bold text-sm">Revisões Pendentes</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 tabular-nums">
                {veiculosRevisao.length}
              </span>
            </div>
            <button
              onClick={() => navigate('veiculos')}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors group cursor-pointer"
            >
              Ver todos
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {veiculosRevisao.map((v) => (
              <button
                key={v.id}
                onClick={() => navigate('veiculos')}
                className="text-left bg-zinc-900/50 border border-zinc-800 rounded-xl p-3.5 border-l-2 border-l-amber-500/70 hover:bg-zinc-800/40 hover:border-l-amber-400 transition-all duration-200 cursor-pointer group"
              >
                <p className="text-white font-mono text-sm font-bold uppercase tracking-wide">
                  {v.placa}
                </p>
                <p className="text-zinc-400 text-xs mt-0.5 truncate">{v.modelo}</p>
                <p className="text-zinc-500 text-[10px] mt-1.5 font-medium">
                  {v.km_atual != null ? `${v.km_atual.toLocaleString('pt-BR')} km` : '—'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Status Distribution ── */}
      {!loading && data?.status_counts && (
        <div className="bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-500">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-zinc-800/50">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-white font-bold text-sm">Distribuição de Status</h2>
          </div>
          <div className="p-4 md:p-5">
            {(() => {
              const counts = data.status_counts;
              const entries = Object.entries(counts).filter(([, v]) => v > 0);
              const total = entries.reduce((s, [, v]) => s + v, 0);
              if (entries.length === 0 || total === 0) {
                return (
                  <div className="h-3 rounded-full bg-zinc-800" />
                );
              }
              const STATUS_BAR_COLORS: Record<string, string> = {
                ORCAMENTO: 'bg-zinc-400',
                EXECUCAO: 'bg-blue-500',
                AGUARDANDO_PECA: 'bg-orange-500',
                FINALIZADO: 'bg-emerald-500',
                PAGO: 'bg-yellow-400',
              };
              const STATUS_GLOW: Record<string, string> = {
                ORCAMENTO: 'shadow-zinc-400/30',
                EXECUCAO: 'shadow-blue-500/30',
                AGUARDANDO_PECA: 'shadow-orange-500/30',
                FINALIZADO: 'shadow-emerald-500/30',
                PAGO: 'shadow-yellow-400/30',
              };
              const STATUS_LABELS: Record<string, string> = {
                ORCAMENTO: 'Orçamento',
                EXECUCAO: 'Execução',
                AGUARDANDO_PECA: 'Ag. Peça',
                FINALIZADO: 'Pronto',
                PAGO: 'Pago',
              };
              return (
                <div className="space-y-3">
                  {/* Percentage labels on top — md+ only */}
                  <div className="hidden md:flex relative h-4 mb-0">
                    {entries.map(([status, count]) => {
                      const pct = (count / total) * 100;
                      return (
                        <div
                          key={status}
                          className="flex items-center justify-center"
                          style={{ width: `${pct}%` }}
                        >
                          {pct > 8 && (
                            <span className="text-[9px] text-zinc-500 font-bold tabular-nums">
                              {pct.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Bar */}
                  <div className="flex h-3 rounded-full bg-zinc-800 overflow-hidden">
                    {entries.map(([status, count]) => {
                      const pct = (count / total) * 100;
                      return (
                        <div
                          key={status}
                          className={`${STATUS_BAR_COLORS[status] || 'bg-zinc-500'} transition-all duration-700 first:rounded-l-full last:rounded-r-full shadow-sm ${STATUS_GLOW[status] || ''}`}
                          style={{ width: barAnimated ? `${pct}%` : '0%' }}
                          title={`${STATUS_LABELS[status] || status}: ${count} (${pct.toFixed(1)}%)`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {entries.map(([status, count]) => {
                      const pct = ((count / total) * 100).toFixed(0);
                      return (
                        <div key={status} className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${STATUS_BAR_COLORS[status] || 'bg-zinc-500'}`} />
                          <span className="text-[10px] text-zinc-400 font-medium">{STATUS_LABELS[status] || status}</span>
                          <span className="text-[10px] text-zinc-500 tabular-nums font-bold">{count}</span>
                          <span className="text-[10px] text-zinc-600 tabular-nums">({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Low Stock Alerts ── */}
      {!loading && data?.itens_criticos && data.itens_criticos.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 md:p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Itens Críticos no Estoque</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.itens_criticos.slice(0, 6).map((item) => (
              <button
                key={item.id}
                onClick={() => navigate('estoque')}
                className="inline-flex cursor-pointer items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/20 transition-colors"
              >
                <Package className="w-3 h-3" />
                {item.nome}
                <span className="text-red-400 font-bold">({item.quantidade}/{item.minimo_alerta})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Latest OS Table ── */}
      {!loading && (
        <div className="bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 md:p-5 border-b border-zinc-800/50">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400" />
              <h2 className="text-base md:text-lg font-bold text-white">Últimas Entradas</h2>
              {data?.ultimas_os && data.ultimas_os.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-zinc-800 text-zinc-400 tabular-nums">
                  {data.ultimas_os.length}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('ordens-servico')}
              className="text-xs md:text-sm font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors group cursor-pointer"
            >
              Ver todas
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          {/* Mobile: Card List */}
          <div className="sm:hidden max-h-96 overflow-y-auto custom-scrollbar">
            {!data?.ultimas_os || data.ultimas_os.length === 0 ? (
              <div className="p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-emerald-500/5 via-zinc-950/0 to-zinc-950/0" />
                <div className="relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Wrench className="w-10 h-10 text-emerald-500/60" />
                  </div>
                  <p className="text-zinc-300 text-sm font-medium mb-1">Nenhuma ordem encontrada</p>
                  <p className="text-zinc-600 text-xs mb-4">O pátio está vazio</p>
                  <button
                    onClick={() => navigate('nova-os')}
                    className="inline-flex cursor-pointer items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-2.5 px-5 rounded-lg transition-all duration-200 active:scale-95 shadow-lg shadow-emerald-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Crie sua primeira OS</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {data.ultimas_os.map((os) => (
                  <button
                    key={os.id}
                    onClick={() => navigate('detalhes-os', { id: os.id })}
                    className="w-full text-left p-4 hover:bg-zinc-800/30 transition-colors active:bg-zinc-800/50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium text-sm">{os.clientes?.nome || 'N/A'}</span>
                      <StatusBadge status={os.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-zinc-400 text-xs">
                        <span className="text-zinc-300">{os.veiculos?.modelo || 'N/A'}</span>
                        <span className="text-zinc-600 ml-1.5 uppercase">{os.veiculos?.placa || ''}</span>
                      </div>
                      <span className="text-emerald-400 font-semibold text-sm">{formatCurrency(os.total_geral)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-zinc-600 text-[10px]">
                      <Clock className="w-3 h-3" />
                      {new Date(os.data_abertura).toLocaleDateString('pt-BR')}
                      <span className="ml-1 font-mono">#{os.id.substring(0, 8)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop: Table */}
          <div className="hidden sm:block overflow-x-auto max-h-96 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-zinc-400 whitespace-nowrap">
              <thead className="bg-zinc-950/50 sticky top-0">
                <tr>
                  <th className="px-5 py-3.5 text-[10px] md:text-xs uppercase font-semibold text-zinc-500">Data / ID</th>
                  <th className="px-5 py-3.5 text-[10px] md:text-xs uppercase font-semibold text-zinc-500">Cliente</th>
                  <th className="px-5 py-3.5 text-[10px] md:text-xs uppercase font-semibold text-zinc-500">Veículo</th>
                  <th className="px-5 py-3.5 text-[10px] md:text-xs uppercase font-semibold text-zinc-500">Status</th>
                  <th className="px-5 py-3.5 text-[10px] md:text-xs uppercase font-semibold text-zinc-500 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {!data?.ultimas_os || data.ultimas_os.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <div className="relative inline-flex flex-col items-center">
                        <div className="absolute -inset-12 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                            <Wrench className="w-10 h-10 text-emerald-500/60" />
                          </div>
                          <p className="text-zinc-300 font-medium mb-1">O pátio está vazio</p>
                          <p className="text-zinc-600 text-xs mb-4">Abra uma nova ordem de serviço</p>
                          <button
                            onClick={() => navigate('nova-os')}
                            className="inline-flex cursor-pointer items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-2.5 px-5 rounded-lg transition-all duration-200 active:scale-95 shadow-lg shadow-emerald-600/20"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Crie sua primeira OS</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.ultimas_os.map((os) => (
                    <tr
                      key={os.id}
                      onClick={() => navigate('detalhes-os', { id: os.id })}
                      className="hover:bg-zinc-800/30 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="text-white font-medium">{new Date(os.data_abertura).toLocaleDateString('pt-BR')}</div>
                        <div className="text-[10px] text-zinc-600 font-mono">#{os.id.substring(0, 8)}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-white font-medium truncate max-w-45">{os.clientes?.nome || 'N/A'}</div>
                        <div className="text-[10px] text-zinc-500">{os.clientes?.telefone || ''}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-white font-medium">{os.veiculos?.modelo || 'N/A'}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{os.veiculos?.placa || ''}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={os.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-white group-hover:text-emerald-400 transition-colors tabular-nums">
                        {formatCurrency(os.total_geral)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Activity Timeline ── */}
      {!loading && data?.ultimas_os && data.ultimas_os.length > 0 && (
        <div className="bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 p-4 md:p-5 border-b border-zinc-800/50">
            <div className="p-1.5 rounded-lg bg-zinc-800">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-base md:text-lg font-bold text-white">Atividade Recente</h2>
          </div>
          <div className="p-4 md:p-5">
            <div className="relative">
              {/* Timeline line with gradient */}
              <div className="absolute left-1.25 top-2 bottom-2 w-0.5 bg-linear-to-b from-emerald-500/40 via-yellow-500/20 to-zinc-800" />
              <div className="space-y-4">
                {data.ultimas_os.slice(0, 6).map((os, i) => {
                  const statusUpper = os.status.toUpperCase();
                  const cfg = statusConfig[statusUpper];
                  const timeColor = relativeTimeColor(os.data_abertura);
                  return (
                    <div
                      key={os.id}
                      className="relative flex items-start gap-4 pl-5 animate-in fade-in slide-in-from-left-2 duration-300"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${timelineDotColor[statusUpper] || 'bg-zinc-500'} animate-pulse-dot`} />
                      {/* Content */}
                      <button
                        onClick={() => navigate('detalhes-os', { id: os.id })}
                        className="flex-1 min-w-0 group cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm font-medium">
                            {os.clientes?.nome || 'N/A'}
                          </span>
                          <span className="text-zinc-600 text-sm">—</span>
                          <span className="text-zinc-300 text-sm">
                            {os.veiculos?.modelo || 'N/A'}
                          </span>
                          {cfg && (
                            <span className="text-zinc-600 text-sm">→</span>
                          )}
                          {cfg && (
                            <span className={`text-xs font-bold ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] mt-0.5 block ${timeColor}`}>
                          {relativeTime(os.data_abertura)}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
              {/* Ver tudo link */}
              <div className="mt-4 pt-3 border-t border-zinc-800/50">
                <button
                  onClick={() => navigate('ordens-servico')}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors group cursor-pointer"
                >
                  Ver tudo
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}