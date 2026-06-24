'use client';

import { useEffect, useRef } from 'react';
import { Loader2, Wrench } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import Login from '@/components/oficina/Login';
import Sidebar from '@/components/oficina/Sidebar';
import KeyboardShortcuts from '@/components/oficina/KeyboardShortcuts';
import GlobalSearch from '@/components/oficina/GlobalSearch';
import Dashboard from '@/components/oficina/Dashboard';
import Financeiro from '@/components/oficina/Financeiro';
import OrdensServico from '@/components/oficina/OrdensServico';
import NovaOS from '@/components/oficina/NovaOS';
import DetalhesOS from '@/components/oficina/DetalhesOS';
import Estoque from '@/components/oficina/Estoque';
import Clientes from '@/components/oficina/Clientes';
import Veiculos from '@/components/oficina/Veiculos';
import Configuracoes from '@/components/oficina/Configuracoes';
import OSPipelines from '@/components/oficina/OSPipelines';
import Logs from '@/components/oficina/Logs';
import MobileFAB from '@/components/oficina/MobileFAB';
import HelpOverlay from '@/components/oficina/HelpOverlay';
import { Toaster } from 'sonner';
import SelecionarEmpresa from '@/components/oficina/SelecionarEmpresa';

function ScreenRenderer() {
  const currentScreen = useAppStore((s) => s.currentScreen);
  const screenParams = useAppStore((s) => s.screenParams);
  const prevScreenRef = useRef(currentScreen);

  useEffect(() => {
    if (prevScreenRef.current !== currentScreen) {
      prevScreenRef.current = currentScreen;
      const main = document.getElementById('main-content');
      if (main) {
        main.classList.remove('page-enter');
        // Force reflow
        void main.offsetWidth;
        main.classList.add('page-enter');
        const timer = setTimeout(() => main.classList.remove('page-enter'), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentScreen]);

  switch (currentScreen) {
    case 'selecionar-empresa':
      return <SelecionarEmpresa />;
    case 'dashboard':
      return <Dashboard />;
    case 'ordens-servico':
      return <OrdensServico />;
    case 'os-pipeline':
      return <OSPipelines />;
    case 'nova-os':
      return <NovaOS />;
    case 'detalhes-os':
      return <DetalhesOS key={screenParams.id || 'new'} />;
    case 'estoque':
      return <Estoque />;
    case 'financeiro':
      return <Financeiro />;
    case 'clientes':
      return <Clientes />;
    case 'veiculos':
      return <Veiculos />;
    case 'configuracoes':
      return <Configuracoes />;
    case 'logs':
      return <Logs />;
    default:
      return <Dashboard />;
  }
}

export default function Home() {
  const { user, loading, initialized, initAuth } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initAuth();
    }
  }, [initialized, initAuth]);

  // Loading state — branded spinner
  if (loading || !initialized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Wrench className="w-8 h-8 text-emerald-500 animate-pulse" />
            </div>
            <div className="absolute -inset-2 rounded-3xl bg-emerald-500/5 animate-ping" style={{ animationDuration: '2s' }} />
          </div>
          <div className="text-center">
            <p className="text-zinc-300 text-sm font-medium">Carregando sistema</p>
            <p className="text-zinc-600 text-xs mt-1">Verificando credenciais...</p>
          </div>
          <Loader2 className="w-5 h-5 text-zinc-600 animate-spin" />
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Login />;
  }

  // Logged in — main layout
  return (
    <div className="min-h-screen bg-zinc-950">
      <KeyboardShortcuts />
      <GlobalSearch />
      <HelpOverlay />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#18181b',
            border: '1px solid #27272a',
            color: '#fafafa',
          },
        }}
        richColors
        closeButton
      />
      <Sidebar />
      <MobileFAB />
      <main
        id="main-content"
        className="md:ml-64 min-h-screen pt-14 md:pt-0 overflow-y-auto"
      >
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto pb-20">
          <ScreenRenderer />
        </div>
      </main>
    </div>
  );
}