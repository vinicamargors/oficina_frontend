'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  User,
  Users,
  CarFront,
  FileText,
  Plus,
  Search,
  X,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Wrench,
  Zap,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  cpf?: string;
}

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  cor?: string;
  ano?: string;
  cliente_id: string;
}

interface PlacaConsulta {
  modelo?: string;
  cor?: string;
  ano?: string;
}

interface NovaOSResponse {
  id: string;
}

// ─── Input masks (simple regex, no libraries) ────────────────────────────────

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskPlaca(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 7);
}

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { num: 1, label: 'Veículo', fullLabel: 'Veículo e Cliente' },
  { num: 2, label: 'Problema', fullLabel: 'Descrição do Problema' },
  { num: 3, label: 'Confirmar', fullLabel: 'Confirmar' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function NovaOS() {
  const user = useAuthStore((s) => s.user);
  const navigate = useAppStore((s) => s.navigate);

  // ── Data ─────────────────────────────────────────────────────────────────

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ── Form state ───────────────────────────────────────────────────────────

  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null);
  const [descricaoProblema, setDescricaoProblema] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Quick register modal ─────────────────────────────────────────────────

  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [qrNome, setQrNome] = useState('');
  const [qrTelefone, setQrTelefone] = useState('');
  const [qrCPF, setQrCPF] = useState('');
  const [qrEmail, setQrEmail] = useState('');
  const [qrPlaca, setQrPlaca] = useState('');
  const [qrModelo, setQrModelo] = useState('');
  const [qrCor, setQrCor] = useState('');
  const [qrAno, setQrAno] = useState('');
  const [qrSubmitting, setQrSubmitting] = useState(false);
  const [qrError, setQrError] = useState('');
  const [qrPlacaLoading, setQrPlacaLoading] = useState(false);

  // ── Fetch clients and vehicles ───────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    setError('');
    try {
      const [clientesData, veiculosData] = await Promise.allSettled([
        apiGet<Cliente[]>(`/clientes/${user.empresa_id}`),
        apiGet<Veiculo[]>(`/veiculos/${user.empresa_id}`),
      ]);
      if (clientesData.status === 'fulfilled') setClientes(clientesData.value || []);
      if (veiculosData.status === 'fulfilled') setVeiculos(veiculosData.value || []);
      if (clientesData.status === 'rejected' && veiculosData.status === 'rejected') {
        setError('Não foi possível carregar clientes e veículos.');
      }
    } catch {
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Filtered lists ───────────────────────────────────────────────────────

  const filteredClientes = clienteSearch
    ? clientes.filter(
        (c) =>
          c.nome.toLowerCase().includes(clienteSearch.toLowerCase()) ||
          c.telefone.replace(/\D/g, '').includes(clienteSearch.replace(/\D/g, ''))
      )
    : clientes;

  const clienteVeiculos = selectedCliente
    ? veiculos.filter((v) => v.cliente_id === selectedCliente.id)
    : [];

  // Auto-select vehicle if only 1
  useEffect(() => {
    if (clienteVeiculos.length === 1 && !selectedVeiculo) {
      setSelectedVeiculo(clienteVeiculos[0]);
    }
  }, [clienteVeiculos, selectedVeiculo]);

  // ── Close dropdown on outside click ──────────────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowClienteDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Placa auto-lookup ────────────────────────────────────────────────────

  useEffect(() => {
    const digitsOnly = qrPlaca.replace(/[^A-Z0-9]/g, '');
    if (digitsOnly.length === 7) {
      setQrPlacaLoading(true);
      apiGet<PlacaConsulta>(`/veiculos/consulta-placa/${digitsOnly}`)
        .then((data) => {
          if (data?.modelo) setQrModelo(data.modelo);
          if (data?.cor) setQrCor(data.cor);
          if (data?.ano) setQrAno(String(data.ano));
        })
        .catch(() => {
          // Silently fail - user can fill manually
        })
        .finally(() => setQrPlacaLoading(false));
    }
  }, [qrPlaca]);

  // ── Current step detection ───────────────────────────────────────────────

  const currentStep = (() => {
    if (!selectedCliente) return 1;
    if (!selectedVeiculo) return 1;
    if (!descricaoProblema.trim()) return 2;
    return 3;
  })();

  // ── Submit OS ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!selectedCliente) {
      setError('Selecione um cliente.');
      return;
    }
    if (!selectedVeiculo) {
      setError('Selecione um veículo.');
      return;
    }
    if (!descricaoProblema.trim()) {
      setError('Descreva o problema do veículo.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await apiPost<NovaOSResponse>('/os/', {
        cliente_id: selectedCliente.id,
        veiculo_id: selectedVeiculo.id,
        descricao_problema: descricaoProblema,
        empresa_id: user!.empresa_id,
      });
      toast.success('Ordem de Serviço criada!', { description: 'Redirecionando para os detalhes...' });
      navigate('detalhes-os', { id: result.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar ordem de serviço.';
      toast.error('Erro ao criar a OS.');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Quick register submit ────────────────────────────────────────────────

  const handleQuickRegister = async () => {
    if (!qrNome.trim()) {
      setQrError('Nome do cliente é obrigatório.');
      return;
    }
    if (!qrTelefone.replace(/\D/g, '')) {
      setQrError('Telefone é obrigatório.');
      return;
    }
    if (!qrPlaca.replace(/[^A-Z0-9]/g, '')) {
      setQrError('Placa do veículo é obrigatória.');
      return;
    }

    setQrSubmitting(true);
    setQrError('');

    try {
      // Create client
      const newClient = await apiPost<Cliente>('/clientes/', {
        nome: qrNome.trim(),
        telefone: qrTelefone,
        cpf: qrCPF.replace(/\D/g, '') || undefined,
        email: qrEmail.trim() || undefined,
        empresa_id: user!.empresa_id,
      });

      // Create vehicle
      const newVeiculo = await apiPost<Veiculo>('/veiculos/', {
        placa: qrPlaca.replace(/[^A-Z0-9]/g, ''),
        modelo: qrModelo.trim() || 'Não informado',
        cor: qrCor.trim() || undefined,
        ano: qrAno.trim() || undefined,
        cliente_id: newClient.id,
        empresa_id: user!.empresa_id,
      });

      // Update lists
      setClientes((prev) => [newClient, ...prev]);
      setVeiculos((prev) => [newVeiculo, ...prev]);

      // Auto-select
      setSelectedCliente(newClient);
      setSelectedVeiculo(newVeiculo);

      // Close modal and reset
      setShowQuickRegister(false);
      resetQuickRegisterForm();
      toast.success('Cadastro rápido realizado!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar.';
      toast.error('Erro ao criar a OS.');
      setQrError(msg);
    } finally {
      setQrSubmitting(false);
    }
  };

  const resetQuickRegisterForm = () => {
    setQrNome('');
    setQrTelefone('');
    setQrCPF('');
    setQrEmail('');
    setQrPlaca('');
    setQrModelo('');
    setQrCor('');
    setQrAno('');
    setQrError('');
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-5 animate-in fade-in duration-500 max-w-2xl mx-auto">
        {/* Header skeleton */}
        <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-pulse flex-shrink-0" />
            <div className="space-y-2.5">
              <div className="w-52 h-7 rounded-lg bg-zinc-800 animate-pulse" />
              <div className="w-72 h-4 rounded bg-zinc-800/60 animate-pulse" />
            </div>
          </div>
        </div>
        {/* Step indicator skeleton */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 animate-pulse">
          <div className="flex items-center gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-zinc-800" />
                <div className="w-14 h-3 rounded bg-zinc-800 hidden sm:block" />
                {i < 2 && <div className="w-12 h-0.5 bg-zinc-800 mx-2 hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>
        {/* Section card skeletons */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl overflow-hidden animate-pulse">
            <div className="flex items-center gap-2.5 px-4 md:px-5 py-4 mb-4">
              <div className="w-8 h-8 rounded-lg bg-zinc-800" />
              <div className="space-y-1.5">
                <div className="w-28 h-3.5 rounded bg-zinc-800" />
                <div className="w-40 h-3 rounded bg-zinc-800/60" />
              </div>
            </div>
            <div className="p-4 md:p-5 space-y-3">
              <div className="w-full h-11 rounded-xl bg-zinc-800/60" />
              <div className="w-full h-24 rounded-xl bg-zinc-800/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 max-w-2xl mx-auto">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5 md:p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('ordens-servico')}
            className="p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Wrench className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">Nova Ordem de Serviço</h1>
            <p className="text-zinc-400 text-sm mt-0.5">Preencha os dados para abrir uma nova ordem</p>
          </div>
        </div>
      </div>

      {/* ─── Step Indicator ────────────────────────────────────────────────── */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isCompleted = currentStep > step.num;
            const isCurrent = currentStep === step.num;
            return (
              <div key={step.num} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                        : isCurrent
                          ? 'border-2 border-emerald-500 text-emerald-400 bg-emerald-500/10'
                          : 'border-2 border-zinc-700 text-zinc-600 bg-zinc-900/50'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      step.num
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold transition-colors hidden sm:inline ${
                      isCompleted
                        ? 'text-emerald-400'
                        : isCurrent
                          ? 'text-white'
                          : 'text-zinc-600'
                    }`}
                  >
                    {step.fullLabel}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 sm:mx-4 hidden sm:block">
                    <div className="h-0.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'w-full bg-emerald-600' : 'w-0 bg-emerald-600'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Error Banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Section 1: Dados do Cliente ───────────────────────────────────── */}
      <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 md:p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Dados do Cliente</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-0">
              Cliente
            </label>
            <button
              onClick={() => {
                resetQuickRegisterForm();
                setShowQuickRegister(true);
              }}
              className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Cadastrar Novo Cliente
            </button>
          </div>

          {selectedCliente ? (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0">
                {selectedCliente.nome[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{selectedCliente.nome}</p>
                <p className="text-zinc-400 text-xs">{selectedCliente.telefone}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedCliente(null);
                  setSelectedVeiculo(null);
                  setClienteSearch('');
                }}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Buscar cliente por nome ou telefone..."
                  value={clienteSearch}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    setShowClienteDropdown(true);
                  }}
                  onFocus={() => setShowClienteDropdown(true)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 pl-11 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                />
              </div>
              {showClienteDropdown && filteredClientes.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl shadow-black/30 max-h-48 overflow-y-auto custom-scrollbar">
                  {filteredClientes.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedCliente(c);
                        setSelectedVeiculo(null);
                        setShowClienteDropdown(false);
                        setClienteSearch('');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-800/60 transition-colors cursor-pointer flex items-center gap-3 border-b border-zinc-800/50 last:border-0 hover:border-l-2 hover:border-l-emerald-500"
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-bold flex-shrink-0">
                        {c.nome[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-white truncate">{c.nome}</div>
                        <div className="text-xs opacity-70 text-zinc-500">{c.telefone || 'Sem telefone'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showClienteDropdown && filteredClientes.length === 0 && clienteSearch && (
                <div className="absolute z-20 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl shadow-black/30 p-4 text-center">
                  <p className="text-zinc-500 text-sm">Nenhum cliente encontrado</p>
                  <button
                    onClick={() => {
                      setShowClienteDropdown(false);
                      resetQuickRegisterForm();
                      setShowQuickRegister(true);
                    }}
                    className="mt-2 text-emerald-400 hover:text-emerald-300 text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Cadastrar novo cliente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Section 2: Dados do Veículo ──────────────────────────────────── */}
      <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 md:p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <CarFront className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Dados do Veículo</h2>
        </div>

        {!selectedCliente ? (
          <p className="text-zinc-600 text-sm">Selecione um cliente primeiro</p>
        ) : selectedVeiculo ? (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <CarFront className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{selectedVeiculo.modelo}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-zinc-700/50 text-zinc-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                  {selectedVeiculo.placa}
                </span>
                {selectedVeiculo.cor && (
                  <span className="text-zinc-400 text-xs">{selectedVeiculo.cor}</span>
                )}
                {selectedVeiculo.ano && (
                  <span className="text-zinc-400 text-xs">{selectedVeiculo.ano}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedVeiculo(null)}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : clienteVeiculos.length === 0 ? (
          <p className="text-zinc-600 text-sm">Nenhum veículo cadastrado para este cliente</p>
        ) : (
          <div className="space-y-2">
            {clienteVeiculos.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVeiculo(v)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-emerald-500/50 hover:bg-zinc-900/80 transition-all text-left"
              >
                <div className="w-9 h-9 rounded-full bg-zinc-800/80 border border-zinc-700/30 flex items-center justify-center flex-shrink-0">
                  <CarFront className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium">{v.modelo}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/5 border border-zinc-700/50 text-zinc-400 text-[10px] font-mono font-bold uppercase tracking-wider mt-0.5">
                    {v.placa}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── Section 3: Serviço ────────────────────────────────────────────── */}
      <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 md:p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Serviço</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Descrição do Problema
            </label>
            <textarea
              rows={4}
              placeholder="Descreva o problema relatado pelo cliente..."
              value={descricaoProblema}
              onChange={(e) => setDescricaoProblema(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 resize-none min-h-[100px] transition-all"
            />
          </div>
        </div>
      </div>

      {/* ─── Submit Buttons ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          onClick={() => navigate('ordens-servico')}
          className="flex-1 py-4 px-6 rounded-xl border border-zinc-800 text-zinc-400 font-semibold text-base hover:bg-zinc-800/50 hover:text-zinc-200 transition-all flex items-center justify-center gap-2"
        >
          <X className="w-5 h-5" />
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 sm:flex-[2] bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-4 px-10 rounded-xl shadow-lg shadow-emerald-600/20 text-base flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Criando OS...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              <span>Criar OS e Avaliar</span>
            </>
          )}
        </button>
      </div>

      {/* ─── Quick Register Modal ──────────────────────────────────────────── */}
      {showQuickRegister && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !qrSubmitting && setShowQuickRegister(false)}
          />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in duration-300 zoom-in-95">
            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <h2 className="text-white font-bold text-lg">Cadastro Rápido</h2>
              </div>
              <button
                onClick={() => !qrSubmitting && setShowQuickRegister(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {qrError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {qrError}
              </div>
            )}

            {/* Section: Dados Pessoais */}
            <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 md:p-5 mb-4">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Dados Pessoais</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={qrNome}
                    onChange={(e) => setQrNome(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      Telefone *
                    </label>
                    <input
                      type="tel"
                      placeholder="(00) 90000-0000"
                      value={qrTelefone}
                      onChange={(e) => setQrTelefone(maskPhone(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      CPF
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={qrCPF}
                      onChange={(e) => setQrCPF(maskCPF(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="email@exemplo.com"
                    value={qrEmail}
                    onChange={(e) => setQrEmail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section: Dados do Veículo */}
            <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-4 md:p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CarFront className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Dados do Veículo</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Placa *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ABC1D23"
                      value={qrPlaca}
                      onChange={(e) => setQrPlaca(maskPlaca(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 pr-10 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                    {qrPlacaLoading && (
                      <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Modelo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Honda Civic 2023"
                    value={qrModelo}
                    onChange={(e) => setQrModelo(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      Cor
                    </label>
                    <input
                      type="text"
                      placeholder="Branco"
                      value={qrCor}
                      onChange={(e) => setQrCor(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      Ano
                    </label>
                    <input
                      type="text"
                      placeholder="2023"
                      value={qrAno}
                      onChange={(e) => setQrAno(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex gap-3 mt-5 pt-4 border-t border-zinc-800">
              <button
                onClick={() => !qrSubmitting && setShowQuickRegister(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 text-zinc-400 font-semibold text-sm hover:bg-zinc-800/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleQuickRegister}
                disabled={qrSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {qrSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Cadastrar e Selecionar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}