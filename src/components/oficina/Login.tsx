'use client';


import { useState } from 'react';
import { Wrench, Loader2, Eye, EyeOff, ShieldCheck, ArrowRight, ClipboardList, Bell, Smartphone, Mail, Lock, Zap, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';


export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  const initAuth = useAuthStore((s) => s.initAuth);
  const navigate = useAppStore((s) => s.navigate);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');


    if (!email.trim() || !password.trim()) {
      setError('Preencha todos os campos.');
      return;
    }


    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        const msg = authError.message || '';
        if (msg === 'Invalid login credentials') {
          setError('E-mail ou senha inválidos.');
        } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
          setError('Erro de conexão. Verifique sua internet e tente novamente.');
        } else {
          setError(msg || 'Erro ao fazer login.');
        }
        return;
      }

      await initAuth();

      const user = useAuthStore.getState().user;
      if (user) {
        if (user.cargo === 'master') {
          navigate('selecionar-empresa');
        } else {
          navigate('dashboard');
        }
      } else {
        setError('Erro ao carregar perfil do usuário. Tente novamente.');
        try { await supabase.auth.signOut(); } catch { /* ignore */ }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        setError(msg || 'Erro ao fazer login.');
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* ── Animated Background Elements ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 bg-emerald-500/3 rounded-full blur-3xl" />


        {/* Floating particles */}
        <div
          className="absolute rounded-full bg-emerald-400"
          style={{ width: '6px', height: '6px', top: '15%', left: '20%', opacity: 0.2, animation: 'particle-drift-1 12s ease-in-out infinite' }}
        />
        <div
          className="absolute rounded-full bg-emerald-500"
          style={{ width: '4px', height: '4px', top: '70%', left: '12%', opacity: 0.15, animation: 'particle-drift-2 16s ease-in-out infinite', animationDelay: '2s' }}
        />
        <div
          className="absolute rounded-full bg-emerald-400"
          style={{ width: '3px', height: '3px', top: '25%', right: '22%', opacity: 0.25, animation: 'particle-drift-3 10s ease-in-out infinite', animationDelay: '4s' }}
        />
        <div
          className="absolute rounded-full bg-emerald-500"
          style={{ width: '5px', height: '5px', top: '60%', right: '18%', opacity: 0.1, animation: 'particle-drift-1 20s ease-in-out infinite', animationDelay: '1s' }}
        />
        <div
          className="absolute rounded-full bg-emerald-400"
          style={{ width: '3.5px', height: '3.5px', top: '45%', left: '8%', opacity: 0.18, animation: 'particle-drift-2 14s ease-in-out infinite', animationDelay: '3s' }}
        />
        <div
          className="absolute rounded-full bg-emerald-500"
          style={{ width: '4.5px', height: '4.5px', top: '80%', right: '35%', opacity: 0.12, animation: 'particle-drift-3 18s ease-in-out infinite', animationDelay: '5s' }}
        />
        <div
          className="absolute rounded-full bg-emerald-400"
          style={{ width: '2px', height: '2px', top: '10%', right: '45%', opacity: 0.3, animation: 'particle-drift-1 9s ease-in-out infinite', animationDelay: '6s' }}
        />


        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Top edge glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-emerald-500/20 to-transparent" />
      </div>


      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">
        {/* ── Logo & Brand ── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-linear-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/20 mb-5 shadow-lg shadow-emerald-500/5">
            <Wrench className="w-10 h-10 text-emerald-500 animate-bounce" style={{ animationDuration: '3s' }} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            AutoTec <span className="text-emerald-400">PRO</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1.5 font-medium inline-flex">
            Gestão inteligente para sua oficina<span className="animate-blink text-emerald-400/60 ml-0.5">|</span>
          </p>
        </div>


        {/* ── Login Card with rotating gradient border ── */}
        <div className="relative p-px rounded-2xl login-border-glow">
          {/* Card top accent */}
          <div className="absolute top-0 left-8 right-8 h-px bg-linear-to-r from-transparent via-emerald-500/30 to-transparent z-10" />


          {/* Inner card with noise texture */}
          <div className="relative rounded-[15px] bg-linear-to-b from-zinc-900/95 to-zinc-900/90 backdrop-blur-xl p-7 shadow-2xl shadow-black/30 noise-overlay overflow-hidden">
            {/* Inner shadow glow at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-emerald-500/5 to-transparent pointer-events-none z-0" />


            {/* Card content (above noise overlay) */}
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">Entrar no Sistema</h2>
                  <p className="text-zinc-500 text-xs">Acesse o painel de controle</p>
                </div>
              </div>


              {/* ── Error Alert ── */}
              {error && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 2l10 18H2L12 2z" />
                  </svg>
                  <span className="leading-snug">{error}</span>
                </div>
              )}


              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    E-mail corporativo
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      disabled={loading}
                      autoComplete="email"
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 pl-10 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 disabled:opacity-50 animate-glow-ring"
                    />
                  </div>
                </div>


                {/* Password */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Senha de acesso
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="current-password"
                      required
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-3.5 pl-10 pr-11 text-sm text-white placeholder-zinc-600 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all duration-200 disabled:opacity-50 animate-glow-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password character count */}
                  {password.length > 0 && (
                    <p className="text-zinc-600 text-[11px] mt-1 text-right tabular-nums">{password.length} caracteres</p>
                  )}
                </div>


                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full cursor-pointer bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 p-3.5 text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 active:scale-[0.98] group btn-shimmer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Autenticando...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Entrar no Sistema
                      <ArrowRight className="w-4 h-4 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
                    </>
                  )}
                </button>
              </form>


              {/* Forgot password */}
              <div className="mt-3 text-center">
                <button
                  type="button"
                  className="text-zinc-600 hover:text-emerald-400 text-xs transition-colors cursor-pointer underline-offset-2 hover:underline"
                  onClick={() => window.open('https://wqedgopjkqmzfgjyliav.supabase.co/auth/v1#/reset-password', '_blank')}
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* ── Separator ── */}
        <div className="w-12 h-px bg-zinc-800 mx-auto mt-8" />


        {/* ── Feature Highlights ── */}
        <div className="mt-6 hidden sm:grid sm:grid-cols-3 gap-3 stagger-children">
          <div className="group flex items-start gap-3 p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/40 hover:border-emerald-500/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <span className="text-emerald-500/40 text-[10px] font-bold tracking-widest">01</span>
              <p className="text-white text-sm font-semibold">Gestão Completa</p>
              <p className="text-zinc-500 text-xs mt-0.5">Ordens de serviço, estoque e financeiro</p>
            </div>
          </div>
          <div className="group flex items-start gap-3 p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/40 hover:border-emerald-500/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <Bell className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <span className="text-emerald-500/40 text-[10px] font-bold tracking-widest">02</span>
              <p className="text-white text-sm font-semibold">Alertas Inteligentes</p>
              <p className="text-zinc-500 text-xs mt-0.5">Notificações em tempo real para estoque baixo</p>
            </div>
          </div>
          <div className="group flex items-start gap-3 p-3 rounded-xl bg-zinc-900/30 border border-zinc-800/40 hover:border-emerald-500/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <Smartphone className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <span className="text-emerald-500/40 text-[10px] font-bold tracking-widest">03</span>
              <p className="text-white text-sm font-semibold">Acesso Mobile</p>
              <p className="text-zinc-500 text-xs mt-0.5">Interface responsiva para qualquer dispositivo</p>
            </div>
          </div>
        </div>


        {/* ── Footer ── */}
        <div className="mt-8 text-center space-y-3">
          {/* Gradient line above footer */}
          <div className="h-px bg-linear-to-r from-transparent via-zinc-700/50 to-transparent" />
          <p className="text-zinc-600 text-xs">
            AutoTec PRO © {new Date().getFullYear()} — Todos os direitos reservados
          </p>
          <p className="flex items-center justify-center gap-1.5 text-zinc-700 text-[10px]">
            Feito com <Heart className="w-3 h-3 text-red-500 fill-red-500" /> no Brasil
          </p>
          <div className="flex items-center justify-center gap-1.5 text-zinc-700 text-[10px]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-pulse" />
            <span>Sistema protegido com criptografia de ponta a ponta</span>
          </div>
        </div>
      </div>
    </div>
  );
}