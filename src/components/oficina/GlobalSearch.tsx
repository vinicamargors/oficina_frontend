'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  X,
  FileText,
  Users,
  CarFront,
  Package,
  Loader2,
  Clock,
  ArrowRight,
  Trash2,
  Command,
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useAppStore, type Screen } from '@/stores/app';

interface SearchResult {
  id: string;
  name: string;
  secondary: string;
  category: 'os' | 'clientes' | 'veiculos' | 'estoque';
  screen: Screen;
  params: Record<string, string>;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

interface OSItem {
  id: string;
  status: string;
  data_abertura: string;
  total_geral: number;
  clientes: { nome: string; telefone: string } | null;
  veiculos: { placa: string; modelo: string } | null;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cpf_cnpj: string;
  endereco: string;
  empresa_id: string;
}

interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  marca: string;
  cor: string;
  km_atual: number;
  ano: number;
  chassi: string;
  cliente_id: string;
  empresa_id: string;
  clientes?: Cliente;
}

interface EstoqueItem {
  id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  custo: number;
  venda: number;
  minimo_alerta: number;
  codigo: string;
  empresa_id: string;
}

const STORAGE_KEY = 'autotec-recent-searches';
const MAX_RECENT = 5;

const categoryConfig = {
  os: {
    label: 'Ordem de Serviço',
    icon: FileText,
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  clientes: {
    label: 'Cliente',
    icon: Users,
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  veiculos: {
    label: 'Veículo',
    icon: CarFront,
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-400',
  },
  estoque: {
    label: 'Estoque',
    icon: Package,
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
  },
} as const;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getRecentSearches(): RecentSearch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (!query.trim()) return;
  const searches = getRecentSearches().filter(
    (s) => s.query.toLowerCase() !== query.toLowerCase()
  );
  searches.unshift({ query: query.trim(), timestamp: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(searches.slice(0, MAX_RECENT)));
}

function clearRecentSearches() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [visible, setVisible] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CACHE PERSISTENTE NA MEMÓRIA DA SESSÃO
  const allItemsRef = useRef<SearchResult[]>([]);
  const user = useAuthStore((s) => s.user);

  const fetchData = useCallback(async () => {
    if (!user?.empresa_id || dataLoaded) return;
    setLoading(true);

    try {
      const [dashboardRes, clientesRes, veiculosRes, estoqueRes] = await Promise.allSettled([
        apiGet<{ ultimas_os: OSItem[] }>(`/dashboards/${user.empresa_id}`),
        apiGet<Cliente[]>(`/clientes?empresa_id=${user.empresa_id}`),
        apiGet<Veiculo[]>(`/veiculos?empresa_id=${user.empresa_id}`),
        apiGet<{ itens: EstoqueItem[] }>(`/estoque/${user.empresa_id}`),
      ]);

      const items: SearchResult[] = [];

      const osList = dashboardRes.status === 'fulfilled' ? dashboardRes.value?.ultimas_os || [] : [];
      for (const os of osList) {
        items.push({
          id: os.id,
          name: `OS #${os.id.slice(0, 8)}`,
          secondary: [os.veiculos?.modelo, os.clientes?.nome].filter(Boolean).join(' · ') || os.status,
          category: 'os',
          screen: 'detalhes-os',
          params: { id: os.id },
        });
      }

      const clientesList = clientesRes.status === 'fulfilled' ? clientesRes.value || [] : [];
      for (const c of clientesList) {
        items.push({
          id: c.id,
          name: c.nome,
          secondary: c.telefone || c.cpf_cnpj || '',
          category: 'clientes',
          screen: 'clientes',
          params: {},
        });
      }

      const veiculosList = veiculosRes.status === 'fulfilled' ? veiculosRes.value || [] : [];
      for (const v of veiculosList) {
        items.push({
          id: v.id,
          name: `${v.marca} ${v.modelo}`,
          secondary: `${v.placa} · ${v.ano}${v.clientes?.nome ? ` · ${v.clientes.nome}` : ''}`,
          category: 'veiculos',
          screen: 'veiculos',
          params: {},
        });
      }

      const estoqueList = estoqueRes.status === 'fulfilled' ? estoqueRes.value?.itens || [] : [];
      for (const e of estoqueList) {
        items.push({
          id: e.id,
          name: e.nome,
          secondary: `${e.categoria} · Qtd: ${e.quantidade} · ${formatCurrency(e.venda)}`,
          category: 'estoque',
          screen: 'estoque',
          params: {},
        });
      }

      allItemsRef.current = items;
      setDataLoaded(true);
    } catch {
      // Falha silenciosa
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id, dataLoaded]);

  // DEBOUNCE OTIMIZADO PARA 100ms (Mais fluido e agressivo)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      setActiveIndex(-1);
    }, 100);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const filteredResults = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q || !dataLoaded) return allItemsRef.current;

    return allItemsRef.current.filter((item) => {
      return (
        item.name.toLowerCase().includes(q) ||
        item.secondary.toLowerCase().includes(q)
      );
    });
  }, [debouncedQuery, dataLoaded]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const r of filteredResults) {
      if (!groups[r.category]) groups[r.category] = [];
      groups[r.category].push(r);
    }
    return groups;
  }, [filteredResults]);

  const flatResults = useMemo(() => filteredResults, [filteredResults]);

  const openModal = useCallback(() => {
    setOpen(true);
    setQuery('');
    setDebouncedQuery('');
    setActiveIndex(-1);
    setRecentSearches(getRecentSearches());
    requestAnimationFrame(() => {
      setVisible(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    });
  }, []);

  const closeModal = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      setQuery('');
      setDebouncedQuery('');
      setActiveIndex(-1);
      // Fim do confisco: Os dados em cache (allItemsRef) SÃO MANTIDOS para a próxima busca.
    }, 200);
  }, []);

  useEffect(() => {
    const handler = () => openModal();
    window.addEventListener('open-global-search', handler);
    return () => window.removeEventListener('open-global-search', handler);
  }, [openModal]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeModal();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < flatResults.length) {
            handleSelect(flatResults[activeIndex]);
          } else if (query.trim()) {
            saveRecentSearch(query.trim());
            closeModal();
          }
          break;
      }
    },
    [flatResults, activeIndex, query, closeModal]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      saveRecentSearch(query.trim() || result.name);
      useAppStore.getState().navigate(result.screen, result.params);
      closeModal();
    },
    [query, closeModal]
  );

  const handleRecentClick = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-search-item]');
    const el = items[activeIndex] as HTMLElement | undefined;
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  const showRecent = !debouncedQuery.trim() && !loading && recentSearches.length > 0;
  const showEmpty = debouncedQuery.trim() && !loading && flatResults.length === 0;
  const showLoading = loading;
  const showResults = !loading && flatResults.length > 0;

  let resultIndex = -1;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] md:pt-[15vh] transition-all duration-200 ${
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
      <div
        className={`relative w-[94vw] max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden transition-all duration-200 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800/80">
          <Search className="w-5 h-5 text-zinc-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar ordens, clientes, veículos, estoque..."
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/60 border border-zinc-700/50">
            <Command className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-500 font-medium">K</span>
          </div>
        </div>

        <div ref={listRef} className="max-h-[50vh] md:max-h-[60vh] overflow-y-auto custom-scrollbar">
          {showLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
              <p className="text-zinc-400 text-sm font-medium">Buscando dados...</p>
              <p className="text-zinc-600 text-xs">Carregando ordens, clientes, veículos e estoque</p>
            </div>
          )}

          {showRecent && (
            <div className="p-2">
              <div className="flex items-center justify-between px-3 pt-2 pb-1.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600">Buscas recentes</span>
                </div>
                <button
                  onClick={handleClearRecent}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /><span>Limpar</span>
                </button>
              </div>
              <div className="space-y-0.5 mt-1">
                {recentSearches.map((recent) => (
                  <button
                    key={recent.timestamp}
                    onClick={() => handleRecentClick(recent.query)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors group"
                  >
                    <Clock className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                    <span className="flex-1 text-left truncate">{recent.query}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {showEmpty && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center">
                <Search className="w-6 h-6 text-zinc-700" />
              </div>
              <p className="text-zinc-400 text-sm font-medium">Nenhum resultado encontrado</p>
              <p className="text-zinc-600 text-xs text-center max-w-[280px]">
                Tente buscar por nome, placa, CPF/CNPJ ou número da ordem de serviço
              </p>
            </div>
          )}

          {showResults && (
            <div className="p-2">
              {Object.entries(grouped).map(([category, items]) => {
                const config = categoryConfig[category as keyof typeof categoryConfig];
                if (!config) return null;
                const CategoryIcon = config.icon;

                return (
                  <div key={category} className="mb-1 last:mb-0">
                    <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                      <CategoryIcon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{config.label}</span>
                      <span className="text-[10px] text-zinc-700 font-medium tabular-nums">{items.length}</span>
                    </div>
                    <div className="space-y-0.5">
                      {items.map((item) => {
                        resultIndex++;
                        const idx = resultIndex;
                        const isActive = idx === activeIndex;

                        return (
                          <button
                            key={`${item.category}-${item.id}`}
                            data-search-item
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setActiveIndex(idx)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
                              isActive ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-zinc-800/50 border border-transparent'
                            }`}
                          >
                            <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${config.iconBg} flex items-center justify-center`}>
                              <CategoryIcon className={`w-4 h-4 ${config.iconColor}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>{item.name}</p>
                              <p className="text-xs text-zinc-500 truncate mt-0.5">{item.secondary}</p>
                            </div>
                            <span className={`flex-shrink-0 hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full border ${config.badge}`}>{config.label}</span>
                            <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-all duration-150 ${isActive ? 'text-emerald-400 opacity-100' : 'text-zinc-700 opacity-0 group-hover:opacity-100'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !debouncedQuery.trim() && recentSearches.length === 0 && dataLoaded && flatResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-800/50 border border-zinc-800 flex items-center justify-center">
                <Search className="w-6 h-6 text-zinc-700" />
              </div>
              <p className="text-zinc-500 text-sm font-medium">Nenhum dado disponível</p>
              <p className="text-zinc-600 text-xs text-center max-w-[280px]">
                Comece a digitar para buscar em ordens de serviço, clientes, veículos e estoque
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/60 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-600"><kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/50 text-[10px] text-zinc-500 font-mono">↑↓</kbd><span>navegar</span></span>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-600"><kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/50 text-[10px] text-zinc-500 font-mono">↵</kbd><span>abrir</span></span>
            <span className="flex items-center gap-1.5 text-[11px] text-zinc-600"><kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/50 text-[10px] text-zinc-500 font-mono">esc</kbd><span>fechar</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-600">
            <Package className="w-3 h-3" />
            <span>{flatResults.length} resultado{flatResults.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}