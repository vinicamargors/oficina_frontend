'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Package,
  Wrench,
  UserCog,
  FileText,
  AlertCircle,
  DollarSign,
  TrendingDown,
  X,
  Check,
  Clock,
  Phone,
  Gauge,
  CarFront,
  Search,
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { toast } from 'sonner';
import PrintReceiptButton from './PrintReceiptButton';
import { openPrintWindow, type PrintReceiptData } from './PrintReceipt';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Usuario {
  id: string;
  nome: string;
  cargo: string;
}

interface EstoqueItem {
  id: string;
  nome: string;
  preco_custo?: number;
  preco_venda?: number;
  quantidade?: number;
}

interface OSItem {
  id: string;
  tipo: string;
  nome: string;
  quantidade: number;
  preco_custo: number;
  preco_venda: number;
  subtotal: number;
}

interface EmpresaDetails {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  logo_b64?: string;
}

interface OSDetail {
  id: string;
  status: string;
  descricao_problema?: string;
  km_atual?: number;
  forma_pagamento?: string;
  mecanico_responsavel_id?: string;
  desconto?: number;
  total_geral?: number;
  data_abertura?: string;
  clientes?: { nome: string; telefone: string; cpf_cnpj?: string; endereco?: string } | null;
  veiculos?: { placa: string; modelo: string; marca?: string; cor?: string; km_atual?: number; ano?: number } | null;
  itens?: OSItem[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'ORCAMENTO', label: 'Orçamento' },
  { value: 'EXECUCAO', label: 'Execução' },
  { value: 'AGUARDANDO_PECA', label: 'Aguardando Peça' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'PAGO', label: 'Pago' },
];

const PAGAMENTO_OPTIONS = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
];

const ITEM_TYPES = [
  { value: 'PECA', label: 'Peça', icon: Package },
  { value: 'MAO_DE_OBRA', label: 'Mão de Obra', icon: Wrench },
  { value: 'TERCEIRIZADO', label: 'Terceirizado', icon: UserCog },
];

const tipoLabels: Record<string, string> = {
  PECA: 'Peça',
  MAO_DE_OBRA: 'Mão de Obra',
  TERCEIRIZADO: 'Terceirizado',
  SERVICO: 'Serviço',
};

const tipoColors: Record<string, { bg: string; text: string; border: string }> = {
  PECA: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  MAO_DE_OBRA: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  SERVICO: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  TERCEIRIZADO: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
};

const statusConfig: Record<string, { label: string; color: string; borderColor: string; bgColor: string }> = {
  ORCAMENTO: { label: 'Orçamento', color: 'text-yellow-500', borderColor: 'border-yellow-500/20', bgColor: 'bg-yellow-500/10' },
  EXECUCAO: { label: 'Execução', color: 'text-blue-500', borderColor: 'border-blue-500/20', bgColor: 'bg-blue-500/10' },
  AGUARDANDO_PECA: { label: 'Aguard. Peça', color: 'text-orange-500', borderColor: 'border-orange-500/20', bgColor: 'bg-orange-500/10' },
  FINALIZADO: { label: 'Finalizado', color: 'text-emerald-500', borderColor: 'border-emerald-500/20', bgColor: 'bg-emerald-500/10' },
  PAGO: { label: 'Pago', color: 'text-emerald-400', borderColor: 'border-emerald-500/30', bgColor: 'bg-emerald-600/20' },
};

function getStatusConfig(status: string) {
  return statusConfig[status] || { label: status, color: 'text-zinc-400', borderColor: 'border-zinc-700/30', bgColor: 'bg-zinc-700/10' };
}

const pagamentoLabels: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  BOLETO: 'Boleto',
  TRANSFERENCIA: 'Transferência',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value?: number) {
  if (value == null) return 'R$ 0,00';
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

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return 'agora mesmo';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}min atrás`;
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const statusDotColor: Record<string, string> = {
  ORCAMENTO: 'bg-yellow-500',
  EXECUCAO: 'bg-blue-500',
  AGUARDANDO_PECA: 'bg-orange-500',
  FINALIZADO: 'bg-emerald-500',
  PAGO: 'bg-emerald-400',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function DetalhesOS() {
  const user = useAuthStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);
  const screenParams = useAppStore((s) => s.screenParams);
  const osId = screenParams?.id || '';

  // ── Data ─────────────────────────────────────────────────────────────────

  const [osData, setOsData] = useState<OSDetail | null>(null);
  const [mecanicos, setMecanicos] = useState<Usuario[]>([]);
  const [estoque, setEstoque] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Edit state ───────────────────────────────────────────────────────────

  const [editStatus, setEditStatus] = useState('');
  const [editMecanico, setEditMecanico] = useState('');
  const [editPagamento, setEditPagamento] = useState('');
  const [editKM, setEditKM] = useState('');
  const [editDescricao, setEditDescricao] = useState('');

  // ── Save state ───────────────────────────────────────────────────────────

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Add item modal ───────────────────────────────────────────────────────

  const [showAddItem, setShowAddItem] = useState(false);
  const [itemTipo, setItemTipo] = useState('PECA');
  const [itemNome, setItemNome] = useState('');
  const [itemQtd, setItemQtd] = useState('1');
  const [itemCusto, setItemCusto] = useState('');
  const [itemVenda, setItemVenda] = useState('');
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemError, setItemError] = useState('');
  const [itemEstoqueSearch, setItemEstoqueSearch] = useState('');
  const [estoqueLoading, setEstoqueLoading] = useState(false);

  // ── Delete state ─────────────────────────────────────────────────────────

  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // ── Status history (session-based audit trail) ─────────────────────────

  const [statusHistory, setStatusHistory] = useState<Array<{
    status: string;
    timestamp: Date;
    changedBy: string;
  }>>([]);

    // ── Computed ─────────────────────────────────────────────────────────────

  const items = osData?.itens || [];
  const totalCusto = items.reduce((sum, i) => sum + (i.preco_custo * i.quantidade), 0);
  const totalVenda = items.reduce((sum, i) => sum + i.subtotal, 0);
  const marginValue = totalVenda - totalCusto;
  const marginPercent = totalVenda > 0 ? ((marginValue / totalVenda) * 100) : 0;
  const negativeMargin = itemVenda && itemCusto && Number(itemVenda) < Number(itemCusto);

  // Show toast once when negative margin is detected while adding item
  const prevNegativeMargin = useRef(false);
  useEffect(() => {
    if (negativeMargin && !prevNegativeMargin.current && showAddItem) {
      toast.warning('Margem negativa detectada!', { description: 'O preço de venda está abaixo do custo.' });
    }
    prevNegativeMargin.current = !!negativeMargin;
  }, [negativeMargin, showAddItem]);

  const filteredEstoque = itemEstoqueSearch
    ? estoque.filter((e) => e.nome.toLowerCase().includes(itemEstoqueSearch.toLowerCase()))
    : estoque;


  // ── Empresa data for receipt ─────────────────────────────────────────────

  const [empresaData, setEmpresaData] = useState<EmpresaDetails | null>(null);

  useEffect(() => {
    if (!user?.empresa_id) return;
    apiGet<EmpresaDetails>(`/empresas/${user.empresa_id}/detalhes`).then(setEmpresaData).catch(() => {});
  }, [user?.empresa_id]);

  const handlePrint = useCallback(() => {
    if (!osData) return;
    const selectedMec = mecanicos.find((m) => m.id === editMecanico);
    const receiptData: PrintReceiptData = {
      id: osData.id,
      data_abertura: osData.data_abertura || '',
      status: osData.status,
      descricao: osData.descricao_problema,
      forma_pagamento: editPagamento || osData.forma_pagamento,
      mecanico_nome: selectedMec?.nome,
      desconto: osData.desconto,
      total_geral: osData.total_geral || totalVenda,
      clientes: osData.clientes
        ? { nome: osData.clientes.nome, telefone: osData.clientes.telefone, cpf_cnpj: osData.clientes.cpf_cnpj, endereco: osData.clientes.endereco }
        : null,
      veiculos: osData.veiculos
        ? { placa: osData.veiculos.placa, modelo: osData.veiculos.modelo, marca: osData.veiculos.marca || '', cor: osData.veiculos.cor || '', km_atual: osData.veiculos.km_atual || osData.km_atual || 0, ano: osData.veiculos.ano || 0 }
        : null,
      itens: (osData.itens || []).map((i) => ({ descricao: i.nome, quantidade: i.quantidade, valor_unitario: i.preco_venda, valor_total: i.subtotal })),
      empresa: empresaData
        ? { nome_fantasia: empresaData.nome_fantasia, razao_social: empresaData.razao_social, cnpj: empresaData.cnpj, endereco: empresaData.endereco, telefone: empresaData.telefone, logo_b64: empresaData.logo_b64 }
        : null,
    };
    openPrintWindow(receiptData);
  }, [osData, mecanicos, editMecanico, editPagamento, totalVenda, empresaData]);


  // ── Fetch data ───────────────────────────────────────────────────────────

  const fetchOSData = useCallback(async () => {
    if (!user?.empresa_id || !osId) return;
    setLoading(true);
    setError('');
    try {
      // Since there's no GET single OS endpoint, we fetch dashboard and find the OS
      const dashboardData = await apiGet<{ ultimas_os: OSDetail[] }>(`/dashboards/${user.empresa_id}`);
      const found = dashboardData?.ultimas_os?.find((o) => o.id === osId);

      if (found) {
        // Also try to fetch items
        try {
          const itemsData = await apiPost<OSItem[]>(`/os/${user.empresa_id}/${osId}/itens`, {});
          setOsData({ ...found, itens: itemsData || [] });
        } catch {
          setOsData(found);
        }

        // Set edit state
        setEditStatus(found.status || '');
        setEditMecanico(found.mecanico_responsavel_id || '');
        setEditPagamento(found.forma_pagamento || '');
        setEditKM(found.km_atual != null ? String(found.km_atual) : '');
        setEditDescricao(found.descricao_problema || '');
      } else {
        // OS not in dashboard — create placeholder
        setOsData({ id: osId, status: '', itens: [] });
      }

      // Fetch mecanicos
      try {
        const mecs = await apiGet<Usuario[]>(`/usuarios/${user.empresa_id}`);
        setMecanicos(mecs || []);
      } catch { /* ignore */ }
    } catch {
      setError('Não foi possível carregar os dados da OS.');
      // Still set placeholder
      setOsData({ id: osId, status: '', itens: [] });
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id, osId]);

  useEffect(() => {
    fetchOSData();
  }, [fetchOSData]);

  // ── Fetch estoque when adding PEÇA ───────────────────────────────────────

  useEffect(() => {
    if (showAddItem && itemTipo === 'PECA' && estoque.length === 0 && user?.empresa_id) {
      setEstoqueLoading(true);
      apiGet<EstoqueItem[]>(`/estoque/${user.empresa_id}`)
        .then((data) => setEstoque(data || []))
        .catch(() => { /* ignore */ })
        .finally(() => setEstoqueLoading(false));
    }
  }, [showAddItem, itemTipo, estoque.length, user?.empresa_id]);

  // ── Save OS info ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user?.empresa_id || !osId) return;

    // Validation: PAGO requires forma_pagamento
    if (editStatus === 'PAGO' && !editPagamento) {
      setError('Para marcar como PAGO, selecione a forma de pagamento.');
      return;
    }

    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      await apiPut(`/os/${user.empresa_id}/${osId}`, {
        status: editStatus,
        mecanico_responsavel_id: editMecanico || undefined,
        descricao_problema: editDescricao || undefined,
        km_atual: editKM ? Number(editKM) : undefined,
        forma_pagamento: editPagamento || undefined,
      });

      // Track status change in history before updating
      if (osData && editStatus && editStatus !== osData.status) {
        setStatusHistory(prev => [{
          status: osData.status,
          timestamp: new Date(),
          changedBy: user?.nome || 'Sistema',
        }, ...prev]);
      }

      // Update local state
      setOsData((prev) => prev ? {
        ...prev,
        status: editStatus,
        mecanico_responsavel_id: editMecanico || undefined,
        descricao_problema: editDescricao,
        km_atual: editKM ? Number(editKM) : undefined,
        forma_pagamento: editPagamento || undefined,
      } : prev);

      toast.success('Informações salvas!');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar.';
      toast.error('Erro ao salvar alterações.');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Add item ─────────────────────────────────────────────────────────────

  const handleAddItem = async () => {
    if (!user?.empresa_id || !osId) return;

    if (!itemNome.trim()) {
      setItemError('Nome do item é obrigatório.');
      return;
    }
    const qtd = Number(itemQtd);
    if (!qtd || qtd <= 0) {
      setItemError('Quantidade deve ser maior que zero.');
      return;
    }

    setItemSubmitting(true);
    setItemError('');

    try {
      const newItem = await apiPost<OSItem>(`/os/${user.empresa_id}/${osId}/itens`, {
        tipo: itemTipo,
        nome: itemNome.trim(),
        quantidade: qtd,
        preco_custo: Number(itemCusto) || 0,
        preco_venda: Number(itemVenda) || 0,
      });

      setOsData((prev) => prev ? {
        ...prev,
        itens: [...(prev.itens || []), newItem],
        total_geral: (prev.total_geral || 0) + newItem.subtotal,
      } : prev);

      setShowAddItem(false);
      resetItemForm();
      toast.success('Item adicionado à OS!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao adicionar item.';
      toast.error('Erro ao salvar alterações.');
      setItemError(msg);
    } finally {
      setItemSubmitting(false);
    }
  };

  // ── Delete item ──────────────────────────────────────────────────────────

  const handleDeleteItem = async (itemId: string) => {
    if (!user?.empresa_id || !osId) return;
    setDeletingItemId(itemId);
    try {
      await apiDelete(`/os/${user.empresa_id}/${osId}/itens/${itemId}`);
      setOsData((prev) => {
        if (!prev) return prev;
        const removed = (prev.itens || []).find((i) => i.id === itemId);
        return {
          ...prev,
          itens: (prev.itens || []).filter((i) => i.id !== itemId),
          total_geral: removed ? (prev.total_geral || 0) - removed.subtotal : prev.total_geral,
        };
      });
      toast.success('Item removido da OS.');
    } catch { /* ignore — item might already be gone */ }
    finally {
      setDeletingItemId(null);
    }
  };

  // ── Select estoque item ──────────────────────────────────────────────────

  const handleSelectEstoque = (e: EstoqueItem) => {
    setItemNome(e.nome);
    if (e.preco_custo != null) setItemCusto(String(e.preco_custo));
    if (e.preco_venda != null) setItemVenda(String(e.preco_venda));
    setItemEstoqueSearch('');
  };

  const resetItemForm = () => {
    setItemTipo('PECA');
    setItemNome('');
    setItemQtd('1');
    setItemCusto('');
    setItemVenda('');
    setItemError('');
    setItemEstoqueSearch('');
  };

  // ── Render: Loading ──────────────────────────────────────────────────────

  if (loading) {
    const sc = getStatusConfig('EXECUCAO');
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Back button skeleton */}
        <div className="w-24 h-10 rounded-xl bg-zinc-800 animate-pulse" />

        {/* Header skeleton */}
        <div className="relative bg-linear-to-brrom-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-zinc-800" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-48 h-7 rounded-lg bg-zinc-800" />
                <div className="w-16 h-5 rounded-md bg-zinc-800" />
                <div className="w-20 h-5 rounded-md bg-zinc-800" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-3 rounded bg-zinc-800/60" />
                <div className="w-28 h-3 rounded bg-zinc-800/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Client/Vehicle info skeleton */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/50">
            <div className="w-8 h-8 rounded-lg bg-zinc-800" />
            <div className="h-4 bg-zinc-800 rounded w-24" />
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800" />
              <div className="space-y-2 flex-1">
                <div className="w-40 h-4 bg-zinc-800 rounded" />
                <div className="w-28 h-3 bg-zinc-800/60 rounded" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-800" />
              <div className="space-y-2 flex-1">
                <div className="w-48 h-4 bg-zinc-800 rounded" />
                <div className="w-20 h-3 bg-zinc-800/60 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Gestão da OS skeleton */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/50">
            <div className="w-8 h-8 rounded-lg bg-zinc-800" />
            <div className="h-4 bg-zinc-800 rounded w-28" />
          </div>
          <div className="p-5 space-y-4">
            <div className="h-3 bg-zinc-800/60 rounded w-16" />
            <div className="h-11 bg-zinc-800 rounded-xl" />
            <div className="h-3 bg-zinc-800/60 rounded w-36" />
            <div className="h-11 bg-zinc-800 rounded-xl" />
          </div>
        </div>

        {/* Items table skeleton */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
          <div className="flex items-center gap-2.5 px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/50">
            <div className="w-8 h-8 rounded-lg bg-zinc-800" />
            <div className="h-4 bg-zinc-800 rounded w-28" />
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-5 py-3 border-t border-zinc-800/50 flex gap-3">
              <div className="h-5 bg-zinc-800/60 rounded w-14" />
              <div className="h-4 bg-zinc-800/60 rounded w-32 flex-1" />
              <div className="h-4 bg-zinc-800/60 rounded w-12" />
              <div className="h-4 bg-zinc-800/60 rounded w-20" />
              <div className="h-4 bg-zinc-800/60 rounded w-20" />
            </div>
          ))}
        </div>

        {/* Totals skeleton */}
        <div className="bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6 space-y-3 animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-36" />
          <div className="flex justify-between"><div className="h-3 bg-zinc-800/60 rounded w-24" /><div className="h-4 bg-zinc-800 rounded w-28" /></div>
          <div className="flex justify-between"><div className="h-3 bg-zinc-800/60 rounded w-24" /><div className="h-4 bg-zinc-800 rounded w-28" /></div>
          <div className="h-px bg-zinc-800/50 my-2" />
          <div className="text-center pt-2"><div className="h-8 bg-zinc-800 rounded w-40 mx-auto" /></div>
        </div>
      </div>
    );
  }

  if (!osData) {
    return (
      <div className="text-center py-16 animate-in fade-in duration-500">
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-zinc-700" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">Ordem de serviço não encontrada</h3>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6">
          A OS solicitada não foi encontrada ou pode ter sido removida.
        </p>
        <button
          onClick={() => navigate('ordens-servico')}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Ordens
        </button>
      </div>
    );
  }

  const sc = getStatusConfig(osData.status);
  const selectedMecanico = mecanicos.find((m) => m.id === editMecanico);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="relative bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <button
              onClick={() => navigate('ordens-servico')}
              className="p-2.5 rounded-xl border border-transparent text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold text-white">Detalhes da OS</h1>
                <span className="inline-flex items-center px-2.5 py-1 text-[10px] md:text-xs font-mono font-bold rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                  #{osId.slice(0, 8)}
                </span>
                {osData.status && (
                  <span className={`inline-flex items-center px-3 py-1.5 text-xs md:text-sm rounded-lg font-bold border-l-[3px] whitespace-nowrap ${sc.bgColor} ${sc.color} ${sc.borderColor}`}>
                    {sc.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                {osData.data_abertura && (
                  <span className="text-zinc-500 text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(osData.data_abertura)}
                  </span>
                )}
                {osData.clientes?.nome && (
                  <span className="text-zinc-400 text-xs">{osData.clientes.nome}</span>
                )}
                {osData.veiculos?.placa && (
                  <span className="text-zinc-500 text-xs font-mono">{osData.veiculos.placa}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PrintReceiptButton onPrint={handlePrint} />
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 text-sm"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Salvar</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto hover:text-red-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          Informações salvas com sucesso!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: Info + Totals ─────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Client & Vehicle Info */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Informações</h3>
              <p className="text-[10px] text-zinc-500">Cliente e veículo</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Client */}
              {osData.clientes?.nome && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                    {osData.clientes.nome[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm">{osData.clientes.nome}</p>
                    {osData.clientes.telefone && (
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-zinc-400 text-xs">{osData.clientes.telefone}</span>
                        <a
                          href={`https://wa.me/55${osData.clientes.telefone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors"
                        >
                          WhatsApp
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vehicle */}
              {osData.veiculos && (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center shrink-0">
                    <CarFront className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-zinc-300 text-sm font-medium">{osData.veiculos.modelo || 'Veículo não informado'}</p>
                    {osData.veiculos.placa && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold uppercase tracking-wider mt-1">
                        {osData.veiculos.placa}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* KM */}
              {editKM && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Gauge className="w-4 h-4 text-zinc-500" />
                  <span>{Number(editKM).toLocaleString('pt-BR')} km</span>
                </div>
              )}
            </div>
          </div>

          {/* Status / Mechanic / Payment Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white">Gestão da OS</h3>
              <p className="text-[10px] text-zinc-500">Status, mecânico e pagamento</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 appearance-none pr-10"
                  >
                    <option value="">Selecione...</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {editStatus && (() => {
                  const esc = getStatusConfig(editStatus);
                  return (
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`w-2 h-2 rounded-full ${esc.bgColor.replace('/10', '/50').replace('/20', '/50')}`} />
                      <span className={`text-xs font-medium ${esc.color}`}>{esc.label}</span>
                    </div>
                  );
                })()}
                {editStatus === 'PAGO' && !editPagamento && (
                  <p className="text-yellow-500 text-xs mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Selecione a forma de pagamento
                  </p>
                )}
              </div>

              {/* Mecânico */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Mecânico Responsável
                </label>
                <div className="relative">
                  <select
                    value={editMecanico}
                    onChange={(e) => setEditMecanico(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 appearance-none pr-10"
                  >
                    <option value="">Selecione...</option>
                    {mecanicos.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {selectedMecanico && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-5 h-5 rounded-full bg-linear-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-bold">
                      {selectedMecanico.nome[0]?.toUpperCase()}
                    </div>
                    <span className="text-zinc-400 text-xs">{selectedMecanico.nome} · {selectedMecanico.cargo}</span>
                  </div>
                )}
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Forma de Pagamento
                </label>
                <div className="relative">
                  <select
                    value={editPagamento}
                    onChange={(e) => setEditPagamento(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 appearance-none pr-10"
                  >
                    <option value="">Selecione...</option>
                    {PAGAMENTO_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {editPagamento && (
                  <div className="flex items-center gap-2 mt-2">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-xs font-medium">
                      {pagamentoLabels[editPagamento]}
                    </span>
                  </div>
                )}
              </div>

              {/* KM */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Quilometragem Atual
                </label>
                <input
                  type="text"
                  placeholder="Ex: 50000"
                  value={editKM}
                  onChange={(e) => setEditKM(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 tabular-nums"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Descrição do Problema
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva o problema..."
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 resize-none"
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Informações
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Status History (Audit Trail) */}
          {(statusHistory.length > 0 || osData.status !== 'ORCAMENTO') && (
            <div className="bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden animate-slide-in-right">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/50">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Histórico de Status</h3>
                  <p className="text-[10px] text-zinc-500">Alterações nesta sessão</p>
                </div>
              </div>
              <div className="p-5">
                {statusHistory.length === 0 ? (
                  <p className="text-zinc-600 text-xs italic">Nenhuma alteração registrada nesta sessão</p>
                ) : (
                  <div className="relative pl-5">
                    {/* Vertical line */}
                    <div className="absolute left-1.75 top-2 bottom-2 w-px bg-zinc-800/80" />
                    <div className="space-y-4">
                      {statusHistory.map((entry, idx) => {
                        const esc = getStatusConfig(entry.status);
                        const dotClass = statusDotColor[entry.status] || 'bg-zinc-500';
                        const isLast = idx === statusHistory.length - 1;
                        return (
                          <div key={idx} className="relative flex items-start gap-3 animate-slide-in-right" style={{ animationDelay: `${idx * 80}ms` }}>
                            {/* Dot */}
                            <div className={`absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 ${dotClass} ${!isLast ? '' : 'ring-2 ring-offset-1 ring-offset-zinc-900 ' + dotClass.replace('bg-', 'ring-')}/30`} />
                            <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-xs font-bold ${esc.color} whitespace-nowrap`}>{esc.label}</span>
                                <span className="text-zinc-500 text-xs truncate">{entry.changedBy}</span>
                              </div>
                              <span className="text-zinc-600 text-[10px] whitespace-nowrap tabular-nums">{formatRelativeTime(entry.timestamp)}</span>
                            </div>
                          </div>
                        );
                      })}
                      {/* Current status (the latest, not in history yet) */}
                      <div className="relative flex items-start gap-3 animate-slide-in-right" style={{ animationDelay: `${statusHistory.length * 80}ms` }}>
                        <div className="absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-zinc-900 animate-badge-pulse" style={{ backgroundColor: sc.color.includes('yellow') ? '#eab308' : sc.color.includes('blue') ? '#3b82f6' : sc.color.includes('orange') ? '#f97316' : sc.color.includes('emerald-400') ? '#34d399' : '#10b981' }} />
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`text-xs font-bold ${sc.color} whitespace-nowrap`}>{sc.label}</span>
                            <span className="text-zinc-500 text-xs truncate">{user?.nome || 'Sistema'}</span>
                          </div>
                          <span className="text-zinc-600 text-[10px] whitespace-nowrap tabular-nums">atual</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Totals Section */}
          <div className="bg-linear-to-br from-zinc-900/80 to-zinc-900/40 border border-emerald-500/20 rounded-2xl p-5 md:p-6 space-y-3">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Resumo Financeiro
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">Total Custo</span>
                <span className="text-zinc-300 font-semibold text-sm tabular-nums">{formatCurrency(totalCusto)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">Total Venda</span>
                <span className="text-white font-bold tabular-nums">{formatCurrency(totalVenda)}</span>
              </div>
              <div className="border-t border-zinc-800/50 pt-3 flex justify-between items-center">
                <span className="text-zinc-400 text-sm flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  Margem
                </span>
                <span className={`font-bold text-sm tabular-nums ${marginValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(marginValue)} ({marginPercent.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Hero total */}
            <div className="mt-4 pt-4 border-t border-zinc-800/50 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">Total da OS</span>
              <span className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-emerald-400 to-emerald-300 tabular-nums">
                {formatCurrency(totalVenda)}
              </span>
              {osData.forma_pagamento && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-lg bg-zinc-800/50 text-zinc-300 border border-zinc-700/30">
                    {pagamentoLabels[osData.forma_pagamento] || osData.forma_pagamento}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right column: Items ────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            {/* Items header strip */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/30 border-b border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Package className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Itens da OS
                    <span className="text-zinc-500 font-normal ml-2">({items.length})</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500">Peças, serviços e terceirizados</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetItemForm();
                  setShowAddItem(true);
                }}
                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Adicionar Item</span>
                <span className="sm:hidden">Adicionar</span>
              </button>
            </div>

            {/* Items list */}
            {items.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center">
                  <Package className="w-8 h-8 text-zinc-700" />
                </div>
                <h3 className="text-white font-bold text-sm mb-1">Nenhum item adicionado</h3>
                <p className="text-zinc-500 text-xs">Adicione peças, mão de obra ou serviços terceirizados</p>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm text-zinc-400">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-zinc-950/50">
                      <th className="text-left text-xs uppercase text-zinc-500 font-semibold px-4 py-3">Tipo</th>
                      <th className="text-left text-xs uppercase text-zinc-500 font-semibold px-4 py-3">Item</th>
                      <th className="text-center text-xs uppercase text-zinc-500 font-semibold px-4 py-3 hidden sm:table-cell">Qtd</th>
                      <th className="text-right text-xs uppercase text-zinc-500 font-semibold px-4 py-3 hidden md:table-cell">Custo</th>
                      <th className="text-right text-xs uppercase text-zinc-500 font-semibold px-4 py-3">Venda</th>
                      <th className="text-right text-xs uppercase text-zinc-500 font-semibold px-4 py-3 hidden sm:table-cell">Subtotal</th>
                      <th className="px-3 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {items.map((item) => {
                      const tc = tipoColors[item.tipo] || { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' };
                      const isNegMargin = item.preco_venda < item.preco_custo;
                      return (
                        <tr key={item.id} className={`group hover:bg-zinc-800/30 transition-all duration-200 card-hover ${isNegMargin ? 'bg-red-500/5' : ''}`}>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 text-[10px] md:text-xs rounded-lg font-bold border whitespace-nowrap ${tc.bg} ${tc.text} ${tc.border}`}>
                              {tipoLabels[item.tipo] || item.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white font-medium truncate max-w-50">
                            {item.nome}
                          </td>
                          <td className="px-4 py-3 text-center tabular-nums hidden sm:table-cell">
                            {item.quantidade}
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-500 tabular-nums hidden md:table-cell">
                            {formatCurrency(item.preco_custo)}
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-300 tabular-nums">
                            {formatCurrency(item.preco_venda)}
                          </td>
                          <td className="px-4 py-3 text-right text-white font-semibold tabular-nums hidden sm:table-cell">
                            {formatCurrency(item.subtotal)}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deletingItemId === item.id}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            >
                              {deletingItemId === item.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {/* Negative margin summary warning */}
            {items.some((item) => item.preco_venda < item.preco_custo) && (
              <div className="mx-5 mb-5 p-3.5 rounded-xl bg-linear-to-r from-red-500/10 to-red-500/5 border border-red-500/20 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <p className="text-red-400 text-xs font-bold">Margem negativa detectada</p>
                  <p className="text-red-400/60 text-[10px] mt-0.5">Um ou mais itens têm preço de venda abaixo do custo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Add Item Modal ────────────────────────────────────────────────── */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 glass"
            onClick={() => !itemSubmitting && setShowAddItem(false)}
          />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl animate-in fade-in duration-300 zoom-in-95">
            {/* Modal header strip */}
            <div className="flex items-center gap-2.5 px-5 py-4 bg-zinc-900/30 border-b border-zinc-800/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Plus className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Adicionar Item</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Selecione o tipo e preencha os dados</p>
              </div>
              <button
                onClick={() => !itemSubmitting && setShowAddItem(false)}
                className="ml-auto p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {itemError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {itemError}
                </div>
              )}

              {/* Type selector as pill buttons */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">
                  Tipo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ITEM_TYPES.map((t) => {
                    const Icon = t.icon;
                    const isActive = itemTipo === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => {
                          setItemTipo(t.value);
                          setItemNome('');
                          setItemEstoqueSearch('');
                        }}
                        className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stock lookup for PEÇA */}
              {itemTipo === 'PECA' && (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Buscar no Estoque
                  </label>
                  {estoqueLoading ? (
                    <div className="flex items-center gap-2 text-zinc-500 text-sm py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando estoque...
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        placeholder="Buscar peça no estoque..."
                        value={itemEstoqueSearch}
                        onChange={(e) => setItemEstoqueSearch(e.target.value)}
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 pl-11 pr-10 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                      />
                      {itemEstoqueSearch && filteredEstoque.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl max-h-40 overflow-y-auto custom-scrollbar">
                          {filteredEstoque.map((e) => (
                            <button
                              key={e.id}
                              onClick={() => handleSelectEstoque(e)}
                              className="w-full text-left px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                            >
                              <p className="text-white text-sm font-medium">{e.nome}</p>
                              <p className="text-zinc-500 text-xs">
                                Estoque: {e.quantidade ?? '—'} · Venda: {formatCurrency(e.preco_venda)}
                              </p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Item name */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Nome do Item *
                </label>
                <input
                  type="text"
                  placeholder="Nome do item"
                  value={itemNome}
                  onChange={(e) => setItemNome(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              {/* Quantity + prices */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Quantidade *
                  </label>
                  <input
                    type="text"
                    placeholder="1"
                    value={itemQtd}
                    onChange={(e) => setItemQtd(e.target.value.replace(/\D/g, ''))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Preço Custo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={itemCusto}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '');
                        setItemCusto(v ? (Number(v) / 100).toFixed(2) : '');
                      }}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 pl-9 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Preço Venda
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={itemVenda}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '');
                        setItemVenda(v ? (Number(v) / 100).toFixed(2) : '');
                      }}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 pl-9 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Negative margin warning */}
              {negativeMargin && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  MARGEM NEGATIVA! Preço de venda menor que o custo.
                </div>
              )}

              {/* Subtotal preview */}
              {itemVenda && itemQtd && Number(itemQtd) > 0 && (
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Subtotal</span>
                  <span className="text-white font-bold tabular-nums">
                    {formatCurrency(Number(itemVenda) * Number(itemQtd))}
                  </span>
                </div>
              )}

              {/* Modal actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => !itemSubmitting && setShowAddItem(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 text-zinc-400 font-semibold text-sm hover:bg-zinc-800/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={itemSubmitting}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {itemSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}