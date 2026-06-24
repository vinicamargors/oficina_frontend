'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  Receipt,
  Lock,
  RefreshCw,
  AlertTriangle,
  Info,
  Wallet,
  Calendar,
  Activity,
  ArrowUp,
  ArrowDown,
  PlusCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';

// ── Types ───────────────────────────────────────────────────────────────────

interface SerieTemporalMes {
  mes_ano: string;
  faturamento: number;
  lucro: number;
}

interface FinanceiroResponse {
  faturamento_pago: number;
  faturamento_projetado: number;
  lucro_realizado: number;
  ticket_medio: number;
  historico_6_meses: SerieTemporalMes[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

function formatMonthLabel(mesAno: string) {
  const parts = mesAno.split('-');
  if (parts.length === 2) {
    return `${MONTH_LABELS[parts[1]] || parts[1]} ${parts[0]}`;
  }
  return mesAno;
}

// ── Sparkline SVG ───────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 72;
  const h = 28;
  const pad = 2;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  // Build filled area path for subtle gradient fill under the line
  const areaPath = `M${pad},${h} ` +
    data
      .map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = h - pad - ((v - min) / range) * (h - pad * 2);
        return `L${x},${y}`;
      })
      .join(' ') +
    ` L${w - pad},${h} Z`;

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-fill-${color.replace('#', '')})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Trend Arrow ─────────────────────────────────────────────────────────────

function TrendArrow({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null;
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = change >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
      {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

// ── Health Gauge (SVG circular) ─────────────────────────────────────────────

const GAUGE_RADIUS = 48;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;

function HealthGauge({ margin }: { margin: number }) {
  const percent = Math.min(Math.max(margin, 0), 100);
  const offset = GAUGE_CIRCUMFERENCE * (1 - percent / 100);

  let color1 = '#10b981';
  let color2 = '#34d399';
  let gaugeLabel = 'Excelente';
  let gaugeDesc = 'Margem saudável e consistente';

  if (margin < 20) {
    color1 = '#ef4444';
    color2 = '#f87171';
    gaugeLabel = 'Crítico';
    gaugeDesc = 'Requer atenção imediata';
  } else if (margin < 40) {
    color1 = '#eab308';
    color2 = '#facc15';
    gaugeLabel = 'Atenção';
    gaugeDesc = 'Margem abaixo do ideal';
  }

  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="130" viewBox="0 0 130 130">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx="65" cy="65" r={GAUGE_RADIUS}
          fill="none"
          stroke="#27272a"
          strokeWidth="8"
        />
        {/* Glow track */}
        <circle
          cx="65" cy="65" r={GAUGE_RADIUS}
          fill="none"
          stroke={color1}
          strokeWidth="8"
          strokeOpacity={0.08}
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 65 65)"
        />
        {/* Progress arc */}
        <circle
          cx="65" cy="65" r={GAUGE_RADIUS}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={GAUGE_CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.5s ease' }}
        />
        {/* Center score */}
        <text
          x="65" y="60"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="26"
          fontWeight="bold"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {margin.toFixed(0)}%
        </text>
        <text
          x="65" y="82"
          textAnchor="middle"
          fill="#71717a"
          fontSize="9"
          fontWeight="600"
          letterSpacing="0.05em"
        >
          MARGEM
        </text>
      </svg>
      <div className="mt-1.5 text-center">
        <span className="text-sm font-bold" style={{ color: color1 }}>{gaugeLabel}</span>
        <p className="text-zinc-500 text-[11px] mt-0.5 leading-snug">{gaugeDesc}</p>
      </div>
    </div>
  );
}

// ── Tooltip style ───────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '12px',
  },
  itemStyle: { color: '#a1a1aa' },
  labelStyle: { color: '#fff', fontWeight: 'bold' },
};

function CurrencyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle.contentStyle}>
      <p style={tooltipStyle.labelStyle}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, fontSize: '12px' }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ── Pie label renderer ─────────────────────────────────────────────────────

const RADIAN = Math.PI / 180;

function renderPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number }) {
  const radius = innerRadius + (outerRadius - innerRadius) * 1.45;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="#a1a1aa" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

// ── Pie placeholder data ───────────────────────────────────────────────────

const PAYMENT_DATA = [
  { name: 'PIX', value: 60, color: '#10b981', comparison: 5 },
  { name: 'Cartão', value: 25, color: '#3b82f6', comparison: -2 },
  { name: 'Dinheiro', value: 15, color: '#eab308', comparison: -3 },
];

// ── Skeleton components ─────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-3 animate-pulse">
          <div className="h-3 bg-zinc-800 rounded w-24" />
          <div className="h-8 bg-zinc-800 rounded w-32" />
          <div className="h-2.5 bg-zinc-800 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 space-y-4 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded w-40" />
      <div className="h-64 bg-zinc-800/50 rounded-lg" />
    </div>
  );
}

// ── Filter type ─────────────────────────────────────────────────────────────

type FilterOption = '6meses' | 'esteMes' | 'mesPassado';

// ── Component ───────────────────────────────────────────────────────────────

export default function Financeiro() {
  const user = useAuthStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);

  const [data, setData] = useState<FinanceiroResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterOption>('6meses');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const allowedRoles = ['master', 'DONO', 'FINANCEIRO'];

  const loadData = useCallback(async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    setError('');

    try {
      const result = await apiGet<FinanceiroResponse>(`/financeiro/${user.empresa_id}`);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados financeiros.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── RBAC guard ──────────────────────────────────────────────────────────

  if (user && !allowedRoles.includes(user.cargo)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
        <div className="w-24 h-24 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <Lock className="w-12 h-12 text-red-400/60" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
        <p className="text-zinc-500 text-sm max-w-md text-center leading-relaxed">
          Esta tela contém dados financeiros sensíveis da empresa.
          Apenas o <span className="text-amber-400 font-semibold">Dono</span> ou o <span className="text-emerald-400 font-semibold">Financeiro</span> possuem permissão para visualizá-la.
        </p>
        <div className="mt-6 px-4 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-xs">
          Cargo atual: <span className="font-semibold text-zinc-300">{user?.cargo}</span>
        </div>
      </div>
    );
  }

  // ── Filtered chart data ─────────────────────────────────────────────────

  const getFilteredData = (): SerieTemporalMes[] => {
    if (!data?.historico_6_meses) return [];

    const hist = data.historico_6_meses;

    if (filter === '6meses') return hist;

    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const lastMonth = now.getMonth() === 0
      ? { year: (now.getFullYear() - 1).toString(), month: '12' }
      : { year: currentYear, month: (now.getMonth()).toString().padStart(2, '0') };

    const targetKey = filter === 'esteMes'
      ? `${currentYear}-${currentMonth}`
      : `${lastMonth.year}-${lastMonth.month}`;

    return hist.filter((item) => item.mes_ano === targetKey);
  };

  // ── Sparkline & trend helpers ───────────────────────────────────────────

  const historico = data?.historico_6_meses || [];

  function getSparkData(key: 'faturamento' | 'lucro'): number[] {
    return historico.map((h) => h[key]);
  }

  function getTrend(key: 'faturamento' | 'lucro'): { change: number; isUp: boolean } | null {
    if (historico.length < 2) return null;
    const last = historico[historico.length - 1][key];
    const prev = historico[historico.length - 2][key];
    if (prev === 0 && last === 0) return null;
    if (prev === 0) return last > 0 ? { change: 100, isUp: true } : null;
    const change = ((last - prev) / Math.abs(prev)) * 100;
    return { change, isUp: change >= 0 };
  }

  // ── KPI definitions ─────────────────────────────────────────────────────

  const kpiCards = data
    ? [
        {
          label: 'Faturamento Pago',
          value: formatCurrency(data.faturamento_pago),
          icon: <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
          accentColor: 'via-emerald-500/30',
          sparkColor: '#10b981',
          gradientClass: 'from-emerald-500/[0.04]',
          sparkKey: 'faturamento' as const,
        },
        {
          label: 'Faturamento Projetado',
          value: formatCurrency(data.faturamento_projetado),
          icon: <BarChart3 className="w-5 h-5 md:w-6 md:h-6" />,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
          accentColor: 'via-blue-500/30',
          sparkColor: '#3b82f6',
          gradientClass: 'from-blue-500/[0.04]',
          sparkKey: 'faturamento' as const,
        },
        {
          label: 'Lucro Realizado',
          value: formatCurrency(data.lucro_realizado),
          icon: <DollarSign className="w-5 h-5 md:w-6 md:h-6" />,
          color: 'text-emerald-300',
          bgColor: 'bg-emerald-400/10',
          borderColor: 'border-emerald-400/20',
          accentColor: 'via-emerald-400/30',
          sparkColor: '#34d399',
          gradientClass: 'from-emerald-400/[0.04]',
          sparkKey: 'lucro' as const,
        },
        {
          label: 'Ticket Médio',
          value: formatCurrency(data.ticket_medio),
          icon: <Receipt className="w-5 h-5 md:w-6 md:h-6" />,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20',
          accentColor: 'via-yellow-500/30',
          sparkColor: '#eab308',
          gradientClass: 'from-yellow-500/[0.04]',
          sparkKey: 'faturamento' as const,
        },
      ]
    : [];

  // ── DRE calc ────────────────────────────────────────────────────────────

  const custos = data ? data.faturamento_pago - data.lucro_realizado : 0;
  const marginPercent = data && data.faturamento_pago > 0
    ? (data.lucro_realizado / data.faturamento_pago) * 100
    : 0;

  // ── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-zinc-800/60 rounded-lg animate-pulse" />
        </div>
        <KpiSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-500">
        <div className="bg-zinc-900/50 border border-red-500/20 rounded-xl p-8 md:p-12 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Erro ao carregar dados</h2>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg px-5 py-2.5 text-sm transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
        <div className="relative mb-8">
          {/* Emerald glow rings */}
          <div className="absolute inset-0 -m-4 rounded-full bg-emerald-500/5 blur-xl" />
          <div className="absolute inset-0 -m-8 rounded-full bg-emerald-500/[0.03] blur-2xl" />
          <div className="relative w-24 h-24 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Wallet className="w-12 h-12 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Nenhum dado financeiro disponível</h2>
        <p className="text-zinc-500 text-sm max-w-sm text-center leading-relaxed mb-8">
          Comece criando ordens de serviço para ver seus números aqui
        </p>
        <button
          onClick={() => navigate('nova-os')}
          className="inline-flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl px-6 py-3 text-sm transition-all duration-200 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
        >
          <PlusCircle className="w-5 h-5" />
          Criar Primeira OS
        </button>
      </div>
    );
  }

  // ── Chart data ──────────────────────────────────────────────────────────

  const chartData = getFilteredData().map((item) => ({
    name: formatMonthLabel(item.mes_ano),
    Faturamento: item.faturamento,
    Lucro: item.lucro,
  }));

  const areaData = getFilteredData().map((item) => ({
    name: formatMonthLabel(item.mes_ano),
    Lucro: item.lucro,
  }));

  // ── DRE rows ─────────────────────────────────────────────────────────────

  const dreRows = [
    {
      icon: <Receipt className="w-4 h-4 text-emerald-400" />,
      prefix: '(+)',
      label: 'Receita Bruta',
      value: formatCurrency(data.faturamento_pago),
      valueClass: 'text-emerald-400',
      desc: 'Faturamento pago no período',
    },
    {
      icon: <DollarSign className="w-4 h-4 text-orange-400" />,
      prefix: '(–)',
      label: 'Custos e Despesas',
      value: formatCurrency(custos),
      valueClass: 'text-orange-400',
      desc: 'Deduzido da receita bruta',
    },
    {
      icon: <TrendingUp className="w-4 h-4 text-emerald-300" />,
      prefix: '(=)',
      label: 'Lucro Líquido',
      value: formatCurrency(data.lucro_realizado),
      valueClass: 'text-emerald-300',
      desc: 'Resultado após custos e despesas',
    },
  ];

  // ── Pie active shape for hover scale ────────────────────────────────────

  const renderActiveShape = (props: Record<string, unknown>) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props as {
      cx: number; cy: number; innerRadius: number; outerRadius: number;
      startAngle: number; endAngle: number; fill: string; payload: { name: string }; percent: number;
    };
    return (
      <g>
        <Cell
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={(outerRadius as number) + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          stroke="none"
          style={{ transition: 'all 0.2s ease-out' }}
        />
      </g>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0 mt-0.5">
              <Wallet className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">Fluxo de Caixa</h1>
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] md:text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                  <Lock className="w-3 h-3" />
                  Acesso Restrito
                </span>
              </div>
              <p className="text-zinc-400 text-sm mt-1">
                O coração financeiro da sua oficina.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {kpiCards.map((card) => {
          const sparkData = getSparkData(card.sparkKey);
          const trend = getTrend(card.sparkKey);
          return (
            <div
              key={card.label}
              className={`relative bg-zinc-900/50 border rounded-xl p-4 md:p-5 overflow-hidden card-hover group ${card.borderColor}`}
            >
              {/* Gradient background overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br from-transparent ${card.gradientClass} to-transparent pointer-events-none`} />
              {/* Dynamic top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${card.accentColor} to-transparent`} />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {card.label}
                  </span>
                  <div className={`${card.bgColor} p-2 rounded-lg`}>
                    <span className={card.color}>{card.icon}</span>
                  </div>
                </div>
                <div className="flex items-end gap-2 flex-wrap">
                  <div className={`text-xl md:text-2xl lg:text-3xl font-bold ${card.color} leading-tight`}>
                    {card.value}
                  </div>
                  {trend && (
                    <TrendArrow current={historico[historico.length - 1]?.[card.sparkKey] ?? 0} previous={historico[historico.length - 2]?.[card.sparkKey] ?? 0} />
                  )}
                </div>
              </div>

              {/* SVG Sparkline */}
              <div className="absolute bottom-2 right-2 opacity-40 group-hover:opacity-70 transition-opacity duration-300">
                <Sparkline data={sparkData} color={card.sparkColor} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Financial Health Indicator (Circular Gauge) ────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
          <HealthGauge margin={marginPercent} />
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Saúde Financeira</span>
              <p className="text-zinc-400 text-sm mt-1 leading-relaxed">
                Indicador baseado na margem de contribuição.{' '}
                {marginPercent > 40
                  ? 'Sua oficina está com uma margem excelente e saudável.'
                  : marginPercent >= 20
                    ? 'A margem está em nível aceitável, mas pode ser melhorada.'
                    : 'A margem está crítica. Revise custos e precificação.'}
              </p>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[11px] text-zinc-500">Excelente (&gt;40%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-[11px] text-zinc-500">Atenção (20-40%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[11px] text-zinc-500">Crítico (&lt;20%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Competência Filter ─────────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Período</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: '6meses' as FilterOption, label: 'Últimos 6 meses' },
              { key: 'esteMes' as FilterOption, label: 'Este Mês' },
              { key: 'mesPassado' as FilterOption, label: 'Mês Passado' },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 border ${
                  filter === opt.key
                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {filter === opt.key && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DRE Simplificado ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-5 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-400" />
          DRE Simplificado
        </h3>

        {/* DRE Table Rows */}
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          {dreRows.map((row, i) => (
            <div
              key={row.label}
              className={`border-l-2 border-l-transparent hover:border-l-emerald-500/40 hover:bg-zinc-800/30 transition-all duration-150 px-4 md:px-5 py-3.5 flex items-center justify-between gap-4 ${
                i % 2 === 1 ? 'bg-zinc-900/30' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center">
                  {row.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-500">{row.prefix}</span>
                    <span className="text-sm font-semibold text-zinc-200">{row.label}</span>
                  </div>
                  <span className="text-[11px] text-zinc-600">{row.desc}</span>
                </div>
              </div>
              <span className={`text-sm md:text-base font-bold ${row.valueClass} flex-shrink-0 tabular-nums`}>
                {row.value}
              </span>
            </div>
          ))}

          {/* Margin Row with progress bar */}
          <div className="border-t border-zinc-800 px-4 md:px-5 py-4 bg-zinc-900/40">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Margem de Contribuição
              </span>
              <span
                className={`text-2xl md:text-3xl font-black leading-none ${
                  marginPercent > 0
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300'
                    : 'text-white'
                }`}
              >
                {formatPercent(marginPercent)}
              </span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full animate-progress"
                style={{ width: `${Math.min(Math.max(marginPercent, 1), 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-zinc-600">0%</span>
              <span className="text-[10px] text-zinc-600">Lucro / Receita</span>
              <span className="text-[10px] text-zinc-600">100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts Row ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-zinc-950/50 to-transparent">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {/* Bar Chart: Faturamento vs Lucro */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Faturamento vs Lucro
              </h3>
            </div>
            <div className="p-4">
              {chartData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <BarChart3 className="w-10 h-10 text-zinc-700" />
                  <p className="text-zinc-600 text-sm">Dados insuficientes para este período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} barGap={4} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={{ stroke: '#27272a' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={{ stroke: '#27272a' }}
                      tickLine={false}
                      tickFormatter={(v: number) => {
                        if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                        return v.toString();
                      }}
                      width={50}
                    />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Bar dataKey="Faturamento" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Lucro" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Area Chart: Evolução do Lucro */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/50">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Evolução do Lucro
              </h3>
            </div>
            <div className="p-4">
              {areaData.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                  <BarChart3 className="w-10 h-10 text-zinc-700" />
                  <p className="text-zinc-600 text-sm">Dados insuficientes para este período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={areaData}>
                    <defs>
                      <linearGradient id="lucroGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={{ stroke: '#27272a' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#71717a', fontSize: 11 }}
                      axisLine={{ stroke: '#27272a' }}
                      tickLine={false}
                      tickFormatter={(v: number) => {
                        if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
                        return v.toString();
                      }}
                      width={50}
                    />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="Lucro"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#lucroGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment Method Breakdown ───────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/50">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-yellow-400" />
            Formas de Pagamento
          </h3>
        </div>
        <div className="p-5">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Pie chart with center label */}
            <div className="relative w-full md:w-1/2">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={PAYMENT_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    label={renderPieLabel}
                    labelLine={false}
                    activeIndex={activePieIndex ?? undefined}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => {
                      setActivePieIndex(index);
                      setHoveredSlice(PAYMENT_DATA[index].name);
                    }}
                    onMouseLeave={() => {
                      setActivePieIndex(null);
                      setHoveredSlice(null);
                    }}
                  >
                    {PAYMENT_DATA.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={hoveredSlice && hoveredSlice !== entry.name ? 0.3 : 1}
                        style={{ transition: 'opacity 0.2s ease' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    {...tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label overlay */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-lg font-bold text-white tabular-nums">100%</p>
                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Total</p>
              </div>
            </div>

            {/* Legend — enhanced with colored left border + percentage bar + comparison */}
            <div className="w-full md:w-1/2 space-y-2.5">
              {PAYMENT_DATA.map((item) => (
                <div
                  key={item.name}
                  className={`flex items-center gap-3 p-3 rounded-lg border-l-[3px] transition-all duration-200 cursor-default ${
                    hoveredSlice === item.name
                      ? 'bg-zinc-800/60'
                      : 'bg-zinc-900/40 hover:bg-zinc-800/40'
                  }`}
                  style={{ borderLeftColor: hoveredSlice === item.name ? item.color : `${item.color}60` }}
                  onMouseEnter={() => {
                    setHoveredSlice(item.name);
                    setActivePieIndex(PAYMENT_DATA.findIndex((p) => p.name === item.name));
                  }}
                  onMouseLeave={() => {
                    setHoveredSlice(null);
                    setActivePieIndex(null);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform duration-200"
                          style={{
                            backgroundColor: item.color,
                            transform: hoveredSlice === item.name ? 'scale(1.3)' : 'scale(1)',
                          }}
                        />
                        <span className={`text-sm font-medium transition-colors duration-200 ${
                          hoveredSlice === item.name ? 'text-white' : 'text-zinc-300'
                        }`}>
                          {item.name}
                        </span>
                      </div>
                      <span className={`text-sm font-bold tabular-nums transition-colors duration-200 ${
                        hoveredSlice === item.name ? 'text-white' : 'text-white/80'
                      }`}>
                        {item.value}%
                      </span>
                    </div>
                    {/* Percentage bar */}
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-1.5">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.value}%`, backgroundColor: item.color }}
                      />
                    </div>
                    {/* Comparison indicator */}
                    <span className={`text-[10px] font-semibold ${item.comparison >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {item.comparison >= 0 ? '↑' : '↓'} {Math.abs(item.comparison)}% vs mês anterior
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800/50">
            <p className="text-zinc-500 text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              Dados baseados nas formas de pagamento registradas nas OS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}