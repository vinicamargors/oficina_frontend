'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wrench,
  Home,
  Package,
  CircleDollarSign,
  Users,
  CarFront,
  Settings,
  FileText,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  CheckCircle2,
  GitBranch,
} from 'lucide-react';
import { useAuthStore, type UsuarioProfile } from '@/stores/auth';
import { useAppStore, type Screen } from '@/stores/app';
import { apiGet } from '@/lib/api';
import { useMasterStore } from '@/stores/master';

// ── Types ──────────────────────────────────────────────────────────────────

interface NavItem {
  screen: Screen;
  label: string;
  icon: React.ReactNode;
  roles: UsuarioProfile['cargo'][];
  group?: string;
}

// ── Navigation Config ──────────────────────────────────────────────────────

const navItems: NavItem[] = [
  { screen: 'dashboard', label: 'Visão Geral', icon: <Home className="w-4.5 h-4.5" />, roles: ['master', 'DONO', 'MECANICO', 'ATENDENTE', 'FINANCEIRO'], group: 'Operação' },
  { screen: 'ordens-servico', label: 'Oficina / OS', icon: <Wrench className="w-4.5 h-4.5" />, roles: ['master', 'DONO', 'MECANICO', 'ATENDENTE', 'FINANCEIRO'], group: 'Operação' },
  { screen: 'os-pipeline', label: 'Pipeline OS', icon: <GitBranch className="w-4.5 h-4.5" />, roles: ['master', 'DONO', 'MECANICO', 'ATENDENTE', 'FINANCEIRO'], group: 'Operação' },
  { screen: 'estoque', label: 'Estoque', icon: <Package className="w-4.5 h-4.5" />, roles: ['master', 'DONO', 'MECANICO', 'ATENDENTE', 'FINANCEIRO'], group: 'Operação' },
  { screen: 'financeiro', label: 'Financeiro', icon: <CircleDollarSign className="w-4.5 h-4.5" />, roles: ['master', 'DONO', 'FINANCEIRO'], group: 'Operação' },
  { screen: 'clientes', label: 'Clientes', icon: <Users className="w-4.5 h-4.5" />, roles: ['master', 'DONO', 'MECANICO', 'ATENDENTE', 'FINANCEIRO'], group: 'Cadastro' },
  { screen: 'veiculos', label: 'Veículos', icon: <CarFront className="w-4.5 h-4.5" />, roles: ['master', 'DONO', 'MECANICO', 'ATENDENTE', 'FINANCEIRO'], group: 'Cadastro' },
  { screen: 'configuracoes', label: 'Configurações', icon: <Settings className="w-4.5 h-4.5" />, roles: ['master', 'DONO'], group: 'Admin' },
  { screen: 'logs', label: 'Logs', icon: <FileText className="w-4.5 h-4.5" />, roles: ['master', 'DONO'], group: 'Admin' },
];

const cargoLabel: Record<string, string> = {
  master: 'Master',
  DONO: 'Dono',
  MECANICO: 'Mecânico',
  ATENDENTE: 'Atendente',
  FINANCEIRO: 'Financeiro',
};

const cargoBadgeColor: Record<string, string> = {
  master: 'bg-red-500/10 text-red-400 border-red-500/20',
  DONO: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  MECANICO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  ATENDENTE: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  FINANCEIRO: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

// ── Sidebar Content ────────────────────────────────────────────────────────

interface SidebarContentProps {
  onClose?: () => void;
  osCount: number | null;
  stockAlert: number | null;
  criticalItems: Array<{ id: string; nome: string; quantidade: number; minimo_alerta: number }>;
}

function SidebarContent({ onClose, osCount, stockAlert, criticalItems }: SidebarContentProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const currentScreen = useAppStore((s) => s.currentScreen);
  const navigate = useAppStore((s) => s.navigate);
  const empresaSelecionada = useMasterStore((s) => s.empresaSelecionada);

  {user?.cargo === 'master' && empresaSelecionada && (
    <div className="mx-3 mb-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
      <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Master</p>
      <p className="text-white text-xs font-medium truncate">{empresaSelecionada.nome}</p>
      <button
        onClick={() => navigate('selecionar-empresa')}
        className="text-zinc-500 hover:text-emerald-400 text-[10px] mt-1 transition-colors"
      >
        Trocar empresa →
      </button>
    </div>
  )}

  const handleNavigate = (screen: Screen) => {
    navigate(screen);
    onClose?.();
  };

  const handleLogout = async () => {
    await logout();
    onClose?.();
  };

  const filteredItems = navItems.filter((item) => user && item.roles.includes(user.cargo));

  // Group items
  const groups = filteredItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const g = item.group || 'Outros';
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const initials = user?.nome?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';

  // Desktop notification panel state
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const handleNotifClickAway = useCallback((e: MouseEvent) => {
    if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
      setNotifOpen(false);
    }
  }, [setNotifOpen]);

  useEffect(() => {
    if (notifOpen) {
      document.addEventListener('mousedown', handleNotifClickAway);
      return () => document.removeEventListener('mousedown', handleNotifClickAway);
    }
  }, [notifOpen, handleNotifClickAway]);

  const handleNotifNavigate = (screen: Screen) => {
    setNotifOpen(false);
    navigate(screen);
  };

  const alertCount = (stockAlert || 0) + (osCount && osCount > 0 ? 1 : 0);

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-800/60">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
          <Wrench className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-black text-[15px] tracking-tight">
            AutoTec <span className="text-emerald-400">PRO</span>
          </h1>
          <p className="text-zinc-600 text-[9px] uppercase tracking-[0.2em] font-medium">
            Sistema de Gestão
          </p>
          {user?.email && (
            <p className="text-[8px] text-zinc-700 font-mono truncate mt-0.5">{user.email}</p>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-2.5 py-3 space-y-5 overflow-y-auto custom-scrollbar">
        {Object.entries(groups).map(([groupName, items]) => (
          <div key={groupName}>
            <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600">
              {groupName}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const isActive = currentScreen === item.screen;
                return (
                  <button
                    key={item.screen}
                    onClick={() => handleNavigate(item.screen)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ease-out relative group border-l-2 border-l-transparent
                      ${isActive
                        ? 'text-emerald-400 bg-emerald-500/8 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 hover:border-l-zinc-600/30'}
                    `}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-400 rounded-r-full" />
                    )}
                    <span className={isActive ? 'text-emerald-400' : 'text-zinc-500'}>{item.icon}</span>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {/* Badge: OS count */}
                    {item.screen === 'ordens-servico' && osCount !== null && osCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-zinc-800 text-zinc-400 tabular-nums">
                        {osCount}
                      </span>
                    )}
                    {/* Badge: Stock alert */}
                    {item.screen === 'estoque' && stockAlert !== null && stockAlert > 0 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-red-500/15 text-red-400 border border-red-500/20 tabular-nums animate-pulse">
                        {stockAlert}
                      </span>
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 transition-opacity ${isActive ? 'text-emerald-500/60 opacity-100' : 'text-zinc-600 opacity-0 group-hover:opacity-100'}`} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Desktop Notification Bell ── */}
      <div className="px-2.5 pb-1" ref={notifRef}>
        {(osCount !== null && osCount > 0 || stockAlert !== null && stockAlert > 0) ? (
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-all duration-200 border-l-2 border-l-transparent hover:border-l-zinc-600/30"
              aria-label="Notificações"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="flex-1 text-left">Notificações</span>
              {alertCount > 0 && (
                <span className="min-w-4.5 h-4.5 px-1 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                  {alertCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {notifOpen && (
              <div className="absolute left-full top-0 ml-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 z-50 animate-in fade-in slide-in-from-left-2 duration-200 overflow-hidden">
                {/* Arrow */}
                <div className="absolute -left-[6px] top-4 w-3 h-3 bg-zinc-900 border-t border-l border-zinc-800 -rotate-45" />

                {/* Gradient accent bar */}
                <div className="h-[2px] bg-linear-to-r from-emerald-400 via-emerald-400/40 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
                  <h3 className="text-white font-bold text-sm">Notificações</h3>
                  <span className="text-[10px] text-zinc-500 font-medium">Agora</span>
                </div>

                {/* Notification list */}
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  {criticalItems.length === 0 && (!osCount || osCount === 0) ? (
                    <div className="flex flex-col items-center py-8 gap-2">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-full" />
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 relative" />
                      </div>
                      <p className="text-zinc-400 text-sm font-medium">Tudo tranquilo!</p>
                      <p className="text-zinc-600 text-xs">Nenhum alerta no momento</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/30">
                      {criticalItems.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer border-l-2 border-l-red-500"
                          onClick={() => handleNotifNavigate('estoque')}
                        >
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mt-0.5">
                            <Package className="w-4 h-4 text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{item.nome}</p>
                            <p className="text-zinc-500 text-xs mt-0.5">
                              Estoque: <span className="text-red-400 font-semibold">{item.quantidade}</span> / mín {item.minimo_alerta}
                            </p>
                            <p className="text-zinc-600 text-[10px] mt-1">agora</p>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-semibold whitespace-nowrap mt-1">Ver Estoque</span>
                        </div>
                      ))}
                      {osCount !== null && osCount > 0 && (
                        <div
                          className="flex items-start gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer border-l-2 border-l-emerald-400"
                          onClick={() => handleNotifNavigate('ordens-servico')}
                        >
                          <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mt-0.5">
                            <Wrench className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">{osCount} ordens abertas</p>
                            <p className="text-zinc-500 text-xs mt-0.5">Ordens de serviço em andamento</p>
                            <p className="text-zinc-600 text-[10px] mt-1">2min atrás</p>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-semibold whitespace-nowrap mt-1">Ver Ordens</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ver tudo link */}
                <div className="px-4 py-2.5 border-t border-zinc-800/50">
                  <button
                    onClick={() => handleNotifNavigate('dashboard')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    Ver tudo
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ── Version Badge ── */}
      <div className="px-2.5 py-2 flex justify-center">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/50 border border-zinc-800 text-zinc-600 text-[9px] font-mono">
          <span className="w-1 h-1 rounded-full bg-emerald-500/60" />
          v1.0.0
        </span>
      </div>

      {/* ── User Section ── */}
      <div className="px-2.5 py-3 border-t border-zinc-800/60">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-lg bg-zinc-800/30">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <p className="text-white text-sm font-semibold truncate">{user.nome}</p>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-flex items-center px-1.5 py-px text-[9px] font-bold rounded border ${cargoBadgeColor[user.cargo] || 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {cargoLabel[user.cargo] || user.cargo}
                </span>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 group"
        >
          <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
          <span>Sair do Sistema</span>
        </button>
      </div>
    </div>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────────────

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Fetch quick stats for badges (lifted up for mobile top bar access)
  const [osCount, setOsCount] = useState<number | null>(null);
  const [stockAlert, setStockAlert] = useState<number | null>(null);
  const [criticalItems, setCriticalItems] = useState<Array<{ id: string; nome: string; quantidade: number; minimo_alerta: number }>>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const navigate = useAppStore((s) => s.navigate);

  useEffect(() => {
    if (!user?.empresa_id) return;
    apiGet<{ total_abertas: number; estoque_critico_count: number; itens_criticos?: Array<{ id: string; nome: string; quantidade: number; minimo_alerta: number }> }>(`/dashboards/${user.empresa_id}`)
      .then((d) => {
        setOsCount(d.total_abertas);
        setStockAlert(d.estoque_critico_count);
        setCriticalItems(d.itens_criticos || []);
      })
      .catch(() => {});
  }, [user?.empresa_id]);

  // Close notification panel on click-away
  const handleClickAway = useCallback((e: MouseEvent) => {
    if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
      setNotifOpen(false);
    }
  }, []);

  useEffect(() => {
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickAway);
      return () => document.removeEventListener('mousedown', handleClickAway);
    }
  }, [notifOpen, handleClickAway]);

  const handleNotifNavigate = (screen: Screen) => {
    setNotifOpen(false);
    navigate(screen);
  };

  const alertCount = (stockAlert || 0) + (osCount && osCount > 0 ? 1 : 0);

  return (
    <>
      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-zinc-950/90 backdrop-blur-lg border-b border-zinc-800/50">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-emerald-400" />
          <span className="text-white font-black text-sm tracking-tight">
            AutoTec <span className="text-emerald-400">PRO</span>
          </span>
        </div>
        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          {(osCount !== null && osCount > 0 || stockAlert !== null && stockAlert > 0) ? (
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 -mr-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
              aria-label="Notificações"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 bg-red-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
                {alertCount > 0 ? alertCount : ''}
              </span>
            </button>
          ) : (
            <div className="w-8" />
          )}

          {/* Notification Dropdown Panel */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
              {/* Gradient accent bar */}
              <div className="h-[2px] bg-linear-to-r from-emerald-400 via-emerald-400/40 to-transparent" />
              {/* Arrow */}
              <div className="absolute -top-[6px] right-3 w-3 h-3 bg-zinc-900 border-t border-l border-zinc-800 rotate-45" />

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/50">
                <h3 className="text-white font-bold text-sm">Notificações</h3>
                <span className="text-[10px] text-zinc-500 font-medium">Agora</span>
              </div>

              {/* Notification list */}
              <div className="max-h-[80vh] overflow-y-auto custom-scrollbar">
                {criticalItems.length === 0 && (!osCount || osCount === 0) ? (
                  <div className="flex flex-col items-center py-8 gap-2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-400/20 blur-xl rounded-full" />
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 relative" />
                    </div>
                    <p className="text-zinc-400 text-sm font-medium">Tudo tranquilo!</p>
                    <p className="text-zinc-600 text-xs">Nenhum alerta no momento</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/30">
                    {/* Stock alerts */}
                    {criticalItems.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer border-l-2 border-l-red-500"
                        onClick={() => handleNotifNavigate('estoque')}
                      >
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center mt-0.5">
                          <Package className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{item.nome}</p>
                          <p className="text-zinc-500 text-xs mt-0.5">
                            Estoque: <span className="text-red-400 font-semibold">{item.quantidade}</span> / mín {item.minimo_alerta}
                          </p>
                          <p className="text-zinc-600 text-[10px] mt-1">agora</p>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold whitespace-nowrap mt-1">Ver Estoque</span>
                      </div>
                    ))}
                    {/* OS count */}
                    {osCount !== null && osCount > 0 && (
                      <div
                        className="flex items-start gap-3 p-3 hover:bg-zinc-800/50 transition-colors cursor-pointer border-l-2 border-l-emerald-400"
                        onClick={() => handleNotifNavigate('ordens-servico')}
                      >
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mt-0.5">
                          <Wrench className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{osCount} ordens abertas</p>
                          <p className="text-zinc-500 text-xs mt-0.5">Ordens de serviço em andamento</p>
                          <p className="text-zinc-600 text-[10px] mt-1">2min atrás</p>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold whitespace-nowrap mt-1">Ver Ordens</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Ver tudo link */}
              <div className="px-4 py-2.5 border-t border-zinc-800/50">
                <button
                  onClick={() => handleNotifNavigate('dashboard')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Ver tudo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className={`
          md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-zinc-900 border-r border-zinc-800
          transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="absolute top-3.5 right-3.5 z-10">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <SidebarContent onClose={() => setMobileOpen(false)} osCount={osCount} stockAlert={stockAlert} criticalItems={criticalItems} />
      </aside>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-zinc-900/95 backdrop-blur-sm border-r border-zinc-800/80">
        <SidebarContent osCount={osCount} stockAlert={stockAlert} criticalItems={criticalItems} />
      </aside>
    </>
  );
}
