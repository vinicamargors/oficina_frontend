'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FileText,
  Wrench,
  Package,
  CheckCircle2,
  DollarSign,
  GitBranch,
  AlertTriangle,
  List,
  ArrowRight,
  Plus,
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

interface DashboardResponse {
  ultimas_os: OSItem[];
}

// ─── Pipeline Column Config ─────────────────────────────────────────────────

const PIPELINE_COLUMNS = [
  { key: 'ORCAMENTO', label: 'Orçamento', icon: FileText, dotColor: 'bg-yellow-500' },
  { key: 'EXECUCAO', label: 'Execução', icon: Wrench, dotColor: 'bg-blue-400' },
  { key: 'AGUARDANDO_PECA', label: 'Ag. Peça', icon: Package, dotColor: 'bg-orange-400' },
  { key: 'FINALIZADO', label: 'Finalizado', icon: CheckCircle2, dotColor: 'bg-emerald-400' },
  { key: 'PAGO', label: 'Pago', icon: DollarSign, dotColor: 'bg-emerald-300' },
] as const;

// ─── Color Mapping (for inline styles — Tailwind can't dynamic-class) ───────

const DOT_HEX: Record<string, string> = {
  'bg-yellow-500': '#eab308',
  'bg-blue-400': '#60a5fa',
  'bg-orange-400': '#fb923c',
  'bg-emerald-400': '#34d399',
  'bg-emerald-300': '#6ee7b7',
};

function getColumnHex(dotColor: string): string {
  return DOT_HEX[dotColor] || '#71717a';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Pipeline Stats Bar ─────────────────────────────────────────────────────

function PipelineStatsBar({
  groupedOrdens,
  totalCount,
}: {
  groupedOrdens: Record<string, OSItem[]>;
  totalCount: number;
}) {
  const statusCounts = useMemo(() => {
    return PIPELINE_COLUMNS.map((col) => ({
      col,
      count: groupedOrdens[col.key]?.length || 0,
      hex: getColumnHex(col.dotColor),
    }));
  }, [groupedOrdens]);

  const barSegments = useMemo(() => {
    if (totalCount === 0) return [];
    return statusCounts
      .filter((s) => s.count > 0)
      .map((s) => ({
        ...s,
        pct: (s.count / totalCount) * 100,
      }));
  }, [statusCounts, totalCount]);

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 md:p-5 space-y-3">
      {/* Total + label */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
          <FileText className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
        </div>
        <div>
          <span className="text-white font-bold text-sm tabular-nums">{totalCount}</span>
          <span className="text-zinc-400 text-sm ml-1.5">OS no pipeline</span>
        </div>
      </div>

      {/* Horizontal bar chart */}
      {totalCount > 0 && (
        <div className="h-2 rounded-full bg-zinc-800/80 overflow-hidden flex">
          {barSegments.map((seg) => (
            <div
              key={seg.col.key}
              className="h-full transition-all duration-500"
              style={{
                width: `${seg.pct}%`,
                backgroundColor: seg.hex,
                opacity: 0.8,
              }}
            />
          ))}
        </div>
      )}

      {/* Per-status mini pills (desktop only) */}
      <div className="hidden md:flex items-center flex-wrap gap-2 pt-1">
        {statusCounts.map((s) => {
          const Icon = s.col.icon;
          return (
            <div
              key={s.col.key}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                s.count > 0
                  ? 'bg-zinc-800/60 border-zinc-700/50 text-zinc-300'
                  : 'bg-zinc-900/40 border-zinc-800/40 text-zinc-600'
              }`}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: s.hex,
                  opacity: s.count > 0 ? 1 : 0.3,
                }}
              />
              <Icon className="w-3 h-3" style={{ opacity: s.count > 0 ? 0.7 : 0.3 }} />
              <span>{s.col.label}</span>
              <span
                className="font-bold tabular-nums"
                style={{ color: s.count > 0 ? s.hex : undefined }}
              >
                {s.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function PipelineSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats bar skeleton */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-800" />
          <div className="w-32 h-4 rounded bg-zinc-800" />
        </div>
        <div className="h-2 rounded-full bg-zinc-800/80" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-24 h-6 rounded-full bg-zinc-800/50" />
          ))}
        </div>
      </div>

      {/* Columns skeleton */}
      <div className="flex gap-4 overflow-x-auto scrollbar-x pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl flex flex-col min-w-[260px] flex-1"
            style={{ minHeight: '300px' }}
          >
            {/* Column header */}
            <div className="p-4 border-b border-zinc-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-20 h-3.5 rounded bg-zinc-800" />
                </div>
                <div className="w-8 h-5 rounded-full bg-zinc-800/50" />
              </div>
            </div>
            {/* Cards */}
            <div className="flex-1 p-3 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
                  <div className="w-24 h-3.5 rounded bg-zinc-800 mb-2" />
                  <div className="w-32 h-3 rounded bg-zinc-800/60 mb-3" />
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                    <div className="w-16 h-3.5 rounded bg-zinc-800/60" />
                    <div className="w-14 h-3 rounded bg-zinc-800/40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pipeline Column ─────────────────────────────────────────────────────────

function PipelineColumn({
  col,
  items,
  onCardClick,
}: {
  col: typeof PIPELINE_COLUMNS[number];
  items: OSItem[];
  onCardClick: (os: OSItem) => void;
}) {
  const Icon = col.icon;
  const hex = getColumnHex(col.dotColor);
  const count = items.length;
  const hasCount = count > 0;
  const hasHighCount = count > 3;

  return (
    <div className="relative bg-zinc-900/30 border border-zinc-800/60 rounded-2xl flex flex-col min-h-[300px] min-w-[260px] flex-1 overflow-hidden">
      {/* Column top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-px"
        style={{
          background: `linear-gradient(to right, transparent, ${hex}30, transparent)`,
        }}
      />

      {/* Column header with subtle gradient */}
      <div
        className="p-4 border-b border-zinc-800/50"
        style={{
          background: `linear-gradient(to bottom, ${hex}08, transparent)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${col.dotColor}`} />
            <h3 className="text-white text-sm font-bold">{col.label}</h3>
          </div>
          <span
            className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full border transition-all ${
              hasCount
                ? hasHighCount
                  ? 'animate-pulse'
                  : ''
                : ''
            }`}
            style={
              hasCount
                ? {
                    color: hex,
                    backgroundColor: `${hex}12`,
                    borderColor: `${hex}25`,
                    boxShadow: hasHighCount
                      ? `0 0 8px ${hex}20`
                      : `0 0 4px ${hex}10`,
                  }
                : {
                    color: '#52525b',
                    backgroundColor: 'rgba(39,39,42,0.5)',
                    borderColor: 'rgba(39,39,42,0.3)',
                  }
            }
          >
            {count}
          </span>
        </div>
      </div>

      {/* Cards container */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto custom-scrollbar max-h-[calc(100vh-280px)]">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-zinc-800/40 rounded-xl">
            <Icon className="w-6 h-6 text-zinc-800 mb-2" />
            <p className="text-zinc-600 text-xs font-medium">Nenhuma OS</p>
          </div>
        ) : (
          items.map((os) => (
            <div
              key={os.id}
              onClick={() => onCardClick(os)}
              className="group relative bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 pl-4 cursor-pointer hover:bg-zinc-900/80 transition-all duration-200 hover:-translate-y-px"
              style={{
                borderLeftWidth: '2px',
                borderLeftColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderLeftColor = `${hex}60`;
                e.currentTarget.style.boxShadow = `0 4px 12px -2px rgba(0,0,0,0.3)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderLeftColor = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Client name */}
              <p className="text-white text-sm font-medium truncate">
                {os.clientes?.nome || 'Cliente não informado'}
              </p>
              {/* Vehicle */}
              <p className="text-zinc-400 text-xs mt-1">
                {os.veiculos?.modelo || 'Veículo não informado'} ·{' '}
                <span className="font-mono uppercase">
                  {os.veiculos?.placa || '—'}
                </span>
              </p>
              {/* Bottom: value + date + arrow */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/50">
                <span className="text-emerald-400 font-bold text-sm">
                  {formatCurrency(os.total_geral)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-600 text-[10px]">
                    {formatDate(os.data_abertura)}
                  </span>
                  <ArrowRight
                    className="w-3.5 h-3.5 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function PipelineEmptyState({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="relative rounded-2xl border border-zinc-800/60 bg-zinc-900/20 overflow-hidden">
      {/* Radial glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.04)_0%,_transparent_70%)]" />

      <div className="relative z-10 flex flex-col items-center justify-center py-20 px-6">
        {/* Animated GitBranch icon */}
        <div className="relative mb-6">
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: `radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)`,
              animation: 'pulse-dot 3s ease-in-out infinite',
            }}
          />
          <div className="relative w-20 h-20 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center">
            <GitBranch
              className="w-10 h-10 text-emerald-400/60"
              strokeWidth={1.2}
              style={{
                animation: 'pulse-dot 3s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        <h3 className="text-white font-bold text-lg mb-2">
          Nenhuma ordem no pipeline
        </h3>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6 text-center leading-relaxed">
          Crie uma nova ordem de serviço para ver o fluxo aqui
        </p>

        <button
          onClick={onNavigate}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm py-2.5 px-5 rounded-xl transition-all duration-200 active:scale-[0.98]"
          style={{
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <Plus className="w-4 h-4" />
          Criar Nova OS
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OSPipelines() {
  const user = useAuthStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);

  const [ordens, setOrdens] = useState<OSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Fetch data ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<DashboardResponse>(`/dashboards/${user.empresa_id}`);
      setOrdens(data?.ultimas_os || []);
    } catch {
      setError('Não foi possível carregar o pipeline de ordens.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Group OS by status ──────────────────────────────────────────────────

  const groupedOrdens = useMemo(() => {
    const map: Record<string, OSItem[]> = {};
    for (const col of PIPELINE_COLUMNS) {
      map[col.key] = [];
    }
    for (const os of ordens) {
      if (map[os.status]) {
        map[os.status].push(os);
      }
    }
    return map;
  }, [ordens]);

  // ── Total counts ────────────────────────────────────────────────────────

  const totalCount = useMemo(() => ordens.length, [ordens]);

  // ── Card click handler ──────────────────────────────────────────────────

  const handleCardClick = useCallback(
    (os: OSItem) => {
      navigate('detalhes-os', { id: os.id });
    },
    [navigate]
  );

  // ── Empty state CTA handler ─────────────────────────────────────────────

  const handleCreateNew = useCallback(() => {
    navigate('nova-os');
  }, [navigate]);

  // ── Render: Loading ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Header skeleton */}
        <div className="relative bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 animate-pulse" />
                <div className="w-48 h-7 rounded-lg bg-zinc-800 animate-pulse" />
              </div>
              <div className="w-56 h-4 rounded bg-zinc-800/60 animate-pulse ml-[52px]" />
            </div>
            <div className="w-32 h-9 rounded-xl bg-zinc-800 animate-pulse" />
          </div>
        </div>
        <PipelineSkeleton />
      </div>
    );
  }

  // ── Render: Main ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with gradient card */}
      <div className="relative bg-gradient-to-r from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 shadow-lg shadow-emerald-500/5 flex-shrink-0">
              <GitBranch className="w-6 h-6 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Pipeline de Ordens</h1>
              <p className="text-zinc-400 text-sm mt-1">
                Visualize o fluxo das ordens por status
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('ordens-servico')}
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-bold py-2.5 px-5 rounded-xl border border-zinc-700/50 active:scale-[0.98] transition-all"
          >
            <List className="w-4 h-4" />
            Ver Lista
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Pipeline columns or empty state */}
      {totalCount === 0 ? (
        <PipelineEmptyState onNavigate={handleCreateNew} />
      ) : (
        <>
          {/* Pipeline Summary Stats Bar */}
          <PipelineStatsBar
            groupedOrdens={groupedOrdens}
            totalCount={totalCount}
          />

          {/* Pipeline Kanban Columns */}
          <div className="flex gap-4 overflow-x-auto scrollbar-x pb-4">
            {PIPELINE_COLUMNS.map((col) => (
              <PipelineColumn
                key={col.key}
                col={col}
                items={groupedOrdens[col.key] || []}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}