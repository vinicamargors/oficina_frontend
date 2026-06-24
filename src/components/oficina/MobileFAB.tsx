'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, X, Wrench, UserPlus, Package, CircleDollarSign, Settings } from 'lucide-react';
import { useAppStore, type Screen } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';

// ── Types ──────────────────────────────────────────────────────────────────

interface FabAction {
  screen: Screen;
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
  dotColor: string;
  roles?: string[];
}

// ── Config ─────────────────────────────────────────────────────────────────

const baseFabActions: FabAction[] = [
  {
    screen: 'nova-os',
    icon: <Wrench className="w-4 h-4" />,
    label: 'Nova OS',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15 border-blue-500/20',
    dotColor: 'bg-blue-400',
  },
  {
    screen: 'clientes',
    icon: <UserPlus className="w-4 h-4" />,
    label: 'Novo Cliente',
    color: 'text-purple-400',
    bg: 'bg-purple-500/15 border-purple-500/20',
    dotColor: 'bg-purple-400',
  },
  {
    screen: 'estoque',
    icon: <Package className="w-4 h-4" />,
    label: 'Estoque',
    color: 'text-amber-400',
    bg: 'bg-amber-500/15 border-amber-500/20',
    dotColor: 'bg-amber-400',
  },
  {
    screen: 'financeiro',
    icon: <CircleDollarSign className="w-4 h-4" />,
    label: 'Financeiro',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15 border-emerald-500/20',
    dotColor: 'bg-emerald-400',
    roles: ['DONO', 'FINANCEIRO'],
  },
  {
    screen: 'configuracoes',
    icon: <Settings className="w-4 h-4" />,
    label: 'Configurações',
    color: 'text-zinc-300',
    bg: 'bg-zinc-500/15 border-zinc-500/20',
    dotColor: 'bg-zinc-400',
    roles: ['DONO', 'master'],
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function MobileFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useAppStore((s) => s.navigate);
  const user = useAuthStore((s) => s.user);
  const fabRef = useRef<HTMLDivElement>(null);

  // Filter actions by role
  const fabActions = useMemo(() => {
    const cargo = user?.cargo;
    if (!cargo) return baseFabActions.filter((a) => !a.roles);
    return baseFabActions.filter((a) => !a.roles || a.roles.includes(cargo));
  }, [user?.cargo]);

  const handleAction = (screen: Screen) => {
    setOpen(false);
    navigate(screen);
  };

  // Close on click-away
  const handleClickAway = useCallback((e: MouseEvent) => {
    if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickAway);
      return () => document.removeEventListener('mousedown', handleClickAway);
    }
  }, [open, handleClickAway]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [open]);

  return (
    <div ref={fabRef} className="md:hidden fixed bottom-6 right-5 z-30">
      {/* Backdrop overlay when open */}
      {open && (
        <div
          className="fixed inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(0,0,0,0.4),transparent_70%)] backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action buttons */}
      <div className="absolute bottom-16 right-0 flex flex-col items-end gap-3">
        {fabActions.map((action, i) => (
          <div
            key={action.screen}
            className="flex items-center gap-3 animate-in slide-in-from-right-2 fade-in duration-200"
            style={{ animationDelay: open ? `${i * 50}ms` : '0ms', animationFillMode: 'both' }}
          >
            {/* Label pill — glass card with colored dot */}
            <span className="glass-card px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap text-zinc-200 shadow-lg shadow-black/30">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${action.dotColor} mr-2 align-middle`} />
              {action.label}
            </span>
            {/* Icon button — glass with border glow */}
            <button
              onClick={() => handleAction(action.screen)}
              className={`
                w-12 h-12 rounded-xl border flex items-center justify-center
                backdrop-blur-sm transition-all duration-200 active:scale-95
                shadow-lg shadow-black/30
                ${action.bg} ${action.color}
                hover:scale-105 hover:shadow-xl
              `}
            >
              {action.icon}
            </button>
          </div>
        ))}
      </div>

      {/* Main FAB button — glass morphism */}
      <button
        onClick={() => setOpen(!open)}
        className={`
          relative w-[60px] h-[60px] rounded-2xl flex items-center justify-center
          transition-all duration-300 active:scale-95
          animate-in zoom-in-95 duration-500
          ${open
            ? 'bg-zinc-800/90 backdrop-blur-sm border border-zinc-700/50 text-zinc-300 rotate-45 shadow-xl shadow-black/40'
            : 'bg-emerald-600/90 backdrop-blur-sm border border-emerald-500/30 text-white hover:bg-emerald-500/90 shadow-xl shadow-emerald-600/25 glow-emerald'}
        `}
      >
        {open ? (
          <X className="w-6 h-6" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
        {/* Ping ring when closed */}
        {!open && (
          <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping" style={{ animationDuration: '3s' }} />
        )}
      </button>
    </div>
  );
}