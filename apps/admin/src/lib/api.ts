import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://api.hellotms.com.bd';

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers ?? {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  }
  return data as T;
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
};

// ─── Invoices ────────────────────────────────────────────────────────────────
export const invoicesApi = {
  send: (id: string, recipientEmail: string, recipientName: string) =>
    apiFetch(`/invoices/${id}/send`, { method: 'POST', body: JSON.stringify({ recipientEmail, recipientName }) }),
  getPdf: (id: string) => apiFetch<{ pdfUrl: string | null }>(`/invoices/${id}/pdf`),
};
