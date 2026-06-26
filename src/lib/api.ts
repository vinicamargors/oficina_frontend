import { supabase } from './supabase';
import { toastApiError } from './toast';
import { useMasterStore } from '@/stores/master';
import { useAuthStore } from '@/stores/auth';

const BASE_URL = 'https://autotec-backend.onrender.com/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    // 1. Pega o token do Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // 2. Recupera o usuário atual direto do estado global
    const user = useAuthStore.getState().user;

    if (user?.cargo) {
      headers['x-cargo'] = user.cargo;
    }

    // 3. Define qual empresa_id enviar (Dono vs Master)
    let empresaIdParaEnviar = user?.empresa_id;

    // Se for master e tiver selecionado uma empresa no lobby, ele assume o controle dela
    const empresaSelecionada = useMasterStore.getState().empresaSelecionada;
    if (user?.cargo === 'master' && empresaSelecionada?.id) {
      empresaIdParaEnviar = empresaSelecionada.id;
    }

    // 4. Só envia o header se for um ID de verdade (evita o erro 422 do backend)
    if (empresaIdParaEnviar && empresaIdParaEnviar !== 'undefined' && empresaIdParaEnviar !== 'null') {
      headers['x-empresa-id'] = empresaIdParaEnviar;
    }

  } catch { /* ignore */ }

  return headers;
}

// O Auto-Retry continua aqui para segurar a onda se o Render dormir
async function request<T>(method: string, path: string, body?: unknown, retries = 1): Promise<T> {
  const headers = await getAuthHeaders();
  const config: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, config);
  } catch (error: any) {
    // Se for erro de rede (Failed to fetch) e for um GET, tentamos de novo silenciosamente
    if (retries > 0 && method === 'GET') {
      console.warn(`[AutoTec API] Falha na rede ao acessar ${path}. O servidor pode estar acordando. Retentando em 1s...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1 segundo
      return request<T>(method, path, body, retries - 1);
    }
    throw new Error('Erro de conexão: O servidor está indisponível ou a rede falhou. Tente novamente em instantes.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    // Mostra o 'detail' do Pydantic se existir, senão vai a mensagem genérica
    throw new Error(
      errorData?.detail || errorData?.message || errorData?.error || `Erro ${response.status}: ${response.statusText}`
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  return request<T>('GET', path);
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body); // POST sem retry pra não duplicar registro
}

export async function apiPut<T = unknown>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body);
}

export async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', path, body);
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}

export async function apiGetWithToast<T = unknown>(path: string, fallbackMsg?: string): Promise<T | undefined> {
  try {
    return await apiGet<T>(path);
  } catch (err) {
    toastApiError(err, fallbackMsg);
    return undefined;
  }
}

export async function apiPostWithToast<T = unknown>(path: string, body?: unknown, fallbackMsg?: string): Promise<T | undefined> {
  try {
    return await apiPost<T>(path, body);
  } catch (err) {
    toastApiError(err, fallbackMsg);
    return undefined;
  }
}

export async function apiPutWithToast<T = unknown>(path: string, body?: unknown, fallbackMsg?: string): Promise<T | undefined> {
  try {
    return await apiPut<T>(path, body);
  } catch (err) {
    toastApiError(err, fallbackMsg);
    return undefined;
  }
}

export async function apiDeleteWithToast<T = unknown>(path: string, fallbackMsg?: string): Promise<T | undefined> {
  try {
    return await apiDelete<T>(path);
  } catch (err) {
    toastApiError(err, fallbackMsg);
    return undefined;
  }
}

export async function apiPatchWithToast<T = unknown>(path: string, body?: unknown, fallbackMsg?: string): Promise<T | undefined> {
  try {
    return await apiPatch<T>(path, body);
  } catch (err) {
    toastApiError(err, fallbackMsg);
    return undefined;
  }
}