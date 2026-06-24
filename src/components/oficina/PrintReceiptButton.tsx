'use client';

import { Printer } from 'lucide-react';

interface PrintReceiptButtonProps {
  onPrint: () => void;
  disabled?: boolean;
}

export default function PrintReceiptButton({ onPrint, disabled }: PrintReceiptButtonProps) {
  return (
    <button
      onClick={onPrint}
      disabled={disabled}
      className="bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-300 text-xs font-medium px-3 py-2 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
      title="Imprimir recibo"
    >
      <Printer className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="hidden sm:inline">Imprimir</span>
    </button>
  );
}