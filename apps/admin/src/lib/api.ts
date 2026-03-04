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

  /**
   * Uploads a new file (if a File is provided) and cleans up the old media from R2 (if oldUrl is provided).
   * Returns the new URL (or the existing URL if no new File was provided).
   */
  uploadAndCleanMedia: async (newFileOrUrl: File | string | null, oldUrl?: string | null): Promise<string | null> => {
    let finalUrl: string | null = null;
    let didUploadNew = false;

    // 1. If it's a File, upload it
    if (newFileOrUrl instanceof File) {
      const res = await mediaApi.upload(newFileOrUrl);
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
    // We delete the oldUrl IF:
    // a) A new upload occurred, and oldUrl is a valid URL.
    // b) Or the user explicitly cleared the image, and oldUrl is a valid URL.
    // Basically, if oldUrl exists AND it is different from finalUrl, delete oldUrl.
    if (oldUrl && oldUrl !== finalUrl) {
      try {
        // Extract the filename/key from the URL (everything after the last slash)
        const parts = oldUrl.split('/');
        const key = parts[parts.length - 1];
        if (key) {
          await mediaApi.delete(key);
        }
      } catch (err) {
        console.warn('Failed to delete old media during cleanup:', err);
      }
    }

    return finalUrl;
  }
};
