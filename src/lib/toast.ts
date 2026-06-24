import { toast } from 'sonner';

// Success toast with emerald styling
export function toastSuccess(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

// Error toast with red styling
export function toastError(message: string, description?: string) {
  toast.error(message, {
    description,
    duration: 5000,
  });
}

// Info toast
export function toastInfo(message: string, description?: string) {
  toast.info(message, {
    description,
    duration: 3000,
  });
}

// Warning toast
export function toastWarning(message: string, description?: string) {
  toast.warning(message, {
    description,
    duration: 4000,
  });
}

// API error helper — extracts user-friendly message from error
export function toastApiError(error: unknown, fallbackMessage = 'Erro inesperado. Tente novamente.') {
  let message = fallbackMessage;
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      message = 'Erro de conexão. Verifique sua internet.';
    } else if (msg.includes('401') || msg.includes('Unauthorized')) {
      message = 'Sessão expirada. Faça login novamente.';
    } else if (msg.includes('403') || msg.includes('Forbidden')) {
      message = 'Você não tem permissão para esta ação.';
    } else if (msg.includes('404') || msg.includes('Not Found')) {
      message = 'Recurso não encontrado.';
    } else if (msg.includes('409') || msg.includes('Conflict')) {
      message = 'Este registro já existe ou está em conflito.';
    } else if (msg.includes('422') || msg.includes('Unprocessable')) {
      message = 'Dados inválidos. Verifique os campos.';
    } else {
      message = msg || fallbackMessage;
    }
  }
  toastError(message);
  return message;
}