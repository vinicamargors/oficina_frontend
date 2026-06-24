'use client';

import { useEffect, useState, useCallback } from 'react';
import { Command, X } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['⌘/Ctrl', 'K'], description: 'Busca Global' },
  { keys: ['⌘/Ctrl', 'N'], description: 'Nova Ordem de Serviço' },
  { keys: ['Escape'], description: 'Voltar ao Dashboard' },
  { keys: ['?'], description: 'Atalhos de Teclado' },
] as const;

// Module-level open/close via custom events
export function openHelp() {
  window.dispatchEvent(new CustomEvent('open-help'));
}

export function closeHelp() {
  window.dispatchEvent(new CustomEvent('close-help'));
}

export default function HelpOverlay() {
  const [visible, setVisible] = useState(false);

  const handleOpen = useCallback(() => setVisible(true), []);
  const handleClose = useCallback(() => setVisible(false), []);

  useEffect(() => {
    window.addEventListener('open-help', handleOpen);
    window.addEventListener('close-help', handleClose);
    return () => {
      window.removeEventListener('open-help', handleOpen);
      window.removeEventListener('close-help', handleClose);
    };
  }, [handleOpen, handleClose]);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, handleClose]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Command className="w-4.5 h-4.5 text-emerald-400" />
            </div>
            <h2 className="text-white text-lg font-semibold">Atalhos de Teclado</h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div>
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between py-3 border-b border-zinc-800/50 last:border-0"
            >
              <span className="text-zinc-300 text-sm">{shortcut.description}</span>
              <div className="flex items-center gap-1.5">
                {shortcut.keys.map((key, i) => (
                  <span key={i} className="contents">
                    <kbd className="inline-flex items-center px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-mono font-bold">
                      {key}
                    </kbd>
                    {i < shortcut.keys.length - 1 && (
                      <span className="text-zinc-600 text-xs">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-zinc-600 text-xs text-center mt-4">Pressione ? para fechar</p>
      </div>
    </div>
  );
}