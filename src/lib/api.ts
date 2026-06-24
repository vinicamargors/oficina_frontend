import { supabase } from './supabase';
import { toastApiError } from './toast';
import { useMasterStore } from '@/stores/master';



const BASE_URL = 'https://autotec-backend.onrender.com/api/v1';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('autotec-user');
      if (cached) {
        try {
          const user = JSON.parse(cached);
          if (user?.cargo) headers['x-cargo'] = user.cargo;
        } catch { /* ignore */ }
      }
    }

    // Master: injeta empresa selecionada no header
    const empresaSelecionada = useMasterStore.getState().empresaSelecionada;
    if (empresaSelecionada?.id) {
      headers['x-empresa-id'] = empresaSelecionada.id;
    }

  } catch { /* ignore */ }

  return headers;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeaders();
  const config: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.message || errorData?.error || `Erro ${response.status}: ${response.statusText}`
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  return request<T>('GET', path);
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body);
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

// Convenience functions that auto-toast on error
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