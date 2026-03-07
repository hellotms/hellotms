import {
  differenceInDays,
  parseISO,
  isAfter,
  isBefore,
  isValid,
  format,
} from 'date-fns';
import type { Project, Collection, ProjectDurations } from '../types/index.js';

/** Format a number as BDT currency */
export function formatBDT(amount: number): string {
  return new Intl.NumberFormat('bn-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount).replace('৳', '৳ ');
}

/** Format number with commas, BDT sign */
export function formatBDTSimple(amount: number): string {
  return `৳ ${amount.toLocaleString('en-IN')}`;
}

/** Format date string */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, 'dd-MMM-yy') : '—';
  } catch {
    return '—';
  }
}

/** Format date and time string */
export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, 'dd-MMM-yy hh:mm a') : '—';
  } catch {
    return '—';
  }
}

/** Compute durations for the timeline card */
export function computeProjectDurations(
  project: Project,
  collections: Collection[],
  totalInvoiced: number
): ProjectDurations {
  const today = new Date();

  const startDate = project.event_start_date ? parseISO(project.event_start_date) : null;
  const endDate = project.event_end_date ? parseISO(project.event_end_date) : startDate;
  const completedAt = project.project_completed_at ? parseISO(project.project_completed_at) : null;

  // 1. Event duration
  let event_duration_days: number | null = null;
  if (startDate && endDate && isValid(startDate) && isValid(endDate)) {
    event_duration_days = differenceInDays(endDate, startDate) + 1;
  }

  // 2. Days since started (if ongoing)
  let days_since_started: number | null = null;
  if (startDate && isValid(startDate) && project.status === 'active') {
    days_since_started = differenceInDays(today, startDate);
  }

  // 3. Days since ended (if completed)
  let days_since_ended: number | null = null;
  if (endDate && isValid(endDate) && project.status === 'completed') {
    days_since_ended = differenceInDays(today, endDate);
  }

  // Compute collection metrics
  const sortedCollections = [...collections].sort((a, b) =>
    a.payment_date.localeCompare(b.payment_date)
  );
  const totalCollected = sortedCollections.reduce((sum, c) => sum + c.amount, 0);
  const firstPaymentDate = sortedCollections[0]?.payment_date;
  const lastPaymentDate = sortedCollections[sortedCollections.length - 1]?.payment_date;

  // 4. Collection duration (only if fully collected)
  let collection_duration_days: number | null = null;
  let days_to_full_collection_from_end: number | null = null;

  if (totalCollected >= totalInvoiced && totalInvoiced > 0 && firstPaymentDate && lastPaymentDate) {
    const first = parseISO(firstPaymentDate);
    const last = parseISO(lastPaymentDate);
    if (isValid(first) && isValid(last)) {
      collection_duration_days = differenceInDays(last, first) + 1;
    }
    if (endDate && isValid(endDate) && last && isValid(last)) {
      days_to_full_collection_from_end = differenceInDays(last, endDate);
    }
  }

  // 5. Project completion time
  let completion_time_days: number | null = null;
  if (completedAt && endDate && isValid(completedAt) && isValid(endDate)) {
    completion_time_days = differenceInDays(completedAt, endDate) + 1;
  }

  return {
    event_duration_days,
    days_since_started,
    days_since_ended,
    collection_duration_days,
    days_to_full_collection_from_end,
    completion_time_days,
  };
}

/** Convert a string to URL-friendly slug */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Generate invoice number like TMS/2026/001 */
export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  return `TMS/${year}/${String(sequence).padStart(3, '0')}`;
}

/** Check if a date is within a range */
export function isWithinRange(
  date: string,
  from: string,
  to: string
): boolean {
  const d = parseISO(date);
  const f = parseISO(from);
  const t = parseISO(to);
  return !isBefore(d, f) && !isAfter(d, t);
}

/** Get date range boundaries for preset filters */
export function getDateRangeBounds(preset: 'today' | 'week' | 'month' | 'year'): {
  from: Date;
  to: Date;
} {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'week': {
      const from = new Date(today);
      from.setDate(today.getDate() - today.getDay());
      return { from, to: today };
    }
    case 'month':
      return { from: new Date(today.getFullYear(), today.getMonth(), 1), to: today };
    case 'year':
      return { from: new Date(today.getFullYear(), 0, 1), to: today };
  }
}

/** Default permissions map for roles */
export const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  super_admin: {
    view_dashboard: true, manage_companies: true, manage_projects: true,
    manage_ledger: true, manage_invoices: true, send_invoice: true,
    manage_leads: true, manage_staff: true, manage_roles: true,
    manage_cms: true, manage_settings: true, view_audit_logs: true,
  },
  admin: {
    view_dashboard: true, manage_companies: true, manage_projects: true,
    manage_ledger: true, manage_invoices: true, send_invoice: true,
    manage_leads: true, manage_staff: false, manage_roles: false,
    manage_cms: true, manage_settings: false, view_audit_logs: true,
  },
  staff: {
    view_dashboard: true, manage_companies: false, manage_projects: true,
    manage_ledger: true, manage_invoices: true, send_invoice: false,
    manage_leads: true, manage_staff: false, manage_roles: false,
    manage_cms: false, manage_settings: false, view_audit_logs: false,
  },
  viewer: {
    view_dashboard: true, manage_companies: false, manage_projects: false,
    manage_ledger: false, manage_invoices: false, send_invoice: false,
    manage_leads: false, manage_staff: false, manage_roles: false,
    manage_cms: false, manage_settings: false, view_audit_logs: false,
  },
};

/** Convert a number to English words for BDT currency */
export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + convert(n % 100) : '');
    return '';
  };

  const processThousands = (n: number): string => {
    if (n < 1000) return convert(n);
    if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + convert(n % 1000);
    if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + processThousands(n % 100000);
    return convert(Math.floor(n / 10000000)) + 'Crore ' + processThousands(n % 10000000);
  };

  return processThousands(Math.floor(num)).trim();
}
