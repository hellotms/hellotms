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

// ─── Audit Logs ──────────────────────────────────────────────────────────────
export const auditApi = {
  log: (payload: { action: string; entity_type: string; entity_id?: string; before?: any; after?: any }) =>
    apiFetch('/audit', { method: 'POST', body: JSON.stringify(payload) }).catch(err => {
      console.warn('[Audit Log Failed]', err);
      // We don't want audit log failures to break the main application flow
    }),
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
  getSessions: () => apiFetch<{ data: any[] }>('/staff/me/sessions'),
  revokeSession: (sessionId: string) => apiFetch(`/staff/me/sessions/${sessionId}`, { method: 'DELETE' }),
  revokeOtherSessions: (currentSessionId: string) => apiFetch('/staff/me/sessions', {
    method: 'DELETE',
    headers: { 'X-Session-Id': currentSessionId }
  }),
};

// ─── Invoices ────────────────────────────────────────────────────────────────
export const invoicesApi = {
  send: (id: string, recipientEmail: string, recipientName: string, force = false) =>
    apiFetch(`/invoices/${id}/send`, {
      method: 'POST',
      body: JSON.stringify({ recipientEmail, recipientName, force })
    }),
  getPdf: (id: string, force = false) =>
    apiFetch<{ pdfUrl: string | null }>(`/invoices/${id}/pdf${force ? '?force=true' : ''}`),
  sendEstimate: (payload: any) =>
    apiFetch<{ success: boolean; pdfUrl: string; emailSent: boolean }>('/invoices/estimate/send', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
};

// ─── Media ───────────────────────────────────────────────────────────────────
export const mediaApi = {
  upload: (file: File, folder: string = 'misc', type: string = 'file', name: string = 'unnamed') => {
    const formData = new FormData();
    formData.append('file', file);
    const query = new URLSearchParams({ folder, type, name }).toString();
    return apiFetch<{ success: true; url: string; key: string }>(`/media/upload?${query}`, {
      method: 'POST',
      body: formData,
    });
  },
  delete: (key: string) => apiFetch('/media/' + encodeURIComponent(key), { method: 'DELETE' }),

  /**
   * Uploads a new file (if a File is provided) and cleans up the old media from R2 (if oldUrl is provided).
   * Returns the new URL (or the existing URL if no new File was provided).
   */
  uploadAndCleanMedia: async (
    newFileOrUrl: File | string | null,
    oldUrl?: string | null,
    folder: string = 'misc',
    type: string = 'file',
    name: string = 'unnamed'
  ): Promise<string | null> => {
    let finalUrl: string | null = null;
    let didUploadNew = false;

    // 1. If it's a File, upload it
    if (newFileOrUrl instanceof File) {
      const res = await mediaApi.upload(newFileOrUrl, folder, type, name);
      if (!res.success) throw new Error("Failed to upload image");
      finalUrl = res.url;
      didUploadNew = true;
    }
    // 2. If it's still a string, it means the user didn't change the image
    else if (typeof newFileOrUrl === 'string') {
      finalUrl = newFileOrUrl;
    }
    // 3. Otherwise, it's null (user cleared the image)
    else {
      finalUrl = null;
    }

    // Process old media cleanup
    if (oldUrl && oldUrl !== finalUrl) {
      try {
        // Extract the key from URL. R2_PUBLIC_URL ends before the key.
        // URLs look like: https://pub-xxx.r2.dev/folder/type_name_ts.ext
        // We can find the key by taking everything after the domain.
        const url = new URL(oldUrl);
        const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

        if (key && !key.startsWith('http')) {
          await mediaApi.delete(key);
        }
      } catch (err) {
        console.warn('Failed to delete old media during cleanup:', err);
      }
    }

    return finalUrl;
  }
};
