'use client';
import { useEffect } from 'react';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';

export default function KeyboardShortcuts() {
  const navigate = useAppStore((s) => s.navigate);
  const user = useAuthStore((s) => s.user);
  const currentScreen = useAppStore((s) => s.currentScreen);

  // Cmd+K / Ctrl+K: Open global search (works even from inputs)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (user) window.dispatchEvent(new CustomEvent('open-global-search'));
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [user]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Ctrl+N or Cmd+N: Nova OS
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (user) navigate('nova-os');
      }

      // ? (Shift+/): Toggle help overlay
      if (e.key === '?') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('open-help'));
        return;
      }

      // Escape: Go back to dashboard (or ordens-servico from nova-os)
      if (e.key === 'Escape') {
        if (currentScreen === 'nova-os') navigate('ordens-servico');
        else if (currentScreen === 'detalhes-os') navigate('ordens-servico');
        else if (currentScreen !== 'dashboard') navigate('dashboard');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, user, currentScreen]);

  return null; // No UI
}