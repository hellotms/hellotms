import { supabase } from './supabase';
import { toast } from '@/components/Toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://hellotms-api.info-tms2021.workers.dev';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const authHeaders = await getAuthHeader();

  const headers: Record<string, string> = {
    ...authHeaders,
  };

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as any ?? {}),
      },
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error ?? `Server error (${res.status})`;
      toast(msg, 'error');
      throw new Error(msg);
    }
    return data as T;
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      toast('API সার্ভারে সংযোগ করা যাচ্ছে না। ইন্টারনেট এবং সার্ভার স্ট্যাটাস চেক করুন।', 'error');
    }
    throw err;
  }
}


// ─── Leads ───────────────────────────────────────────────────────────────────
export const leadsApi = {
  submit: (payload: unknown) => apiFetch('/leads', { method: 'POST', body: JSON.stringify(payload) }),
  list: () => apiFetch<{ data: unknown[] }>('/leads'),
};

// ─── Staff ───────────────────────────────────────────────────────────────────
export const staffApi = {
  invite: (payload: unknown) => apiFetch('/staff/invite', { method: 'POST', body: JSON.stringify(payload) }),
  list: () => apiFetch<{ data: unknown[] }>('/staff'),
  changeRole: (id: string, role_id: string) =>
    apiFetch(`/staff/${id}/role`, { method: 'PUT', body: JSON.stringify({ role_id }) }),
  deactivate: (id: string) => apiFetch(`/staff/${id}/deactivate`, { method: 'PUT', body: '{}' }),
  activate: (id: string) => apiFetch(`/staff/${id}/activate`, { method: 'PUT', body: '{}' }),
  resetPassword: (id: string) => apiFetch<{ tempPassword: string; message: string }>(`/staff/${id}/reset-password`, { method: 'PUT', body: '{}' }),
};

// ─── Invoices ────────────────────────────────────────────────────────────────
export const invoicesApi = {
  send: (id: string, recipientEmail: string, recipientName: string) =>
    apiFetch(`/invoices/${id}/send`, { method: 'POST', body: JSON.stringify({ recipientEmail, recipientName }) }),
  getPdf: (id: string) => apiFetch<{ pdfUrl: string | null }>(`/invoices/${id}/pdf`),
};

// ─── Media ───────────────────────────────────────────────────────────────────
export const mediaApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<{ success: true; url: string; key: string }>('/media/upload', {
      method: 'POST',
      body: formData,
    });
  },
  delete: (key: string) => apiFetch('/media/' + key, { method: 'DELETE' }),
};
