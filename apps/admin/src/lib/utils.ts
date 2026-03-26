import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number): string {
  return `৳ ${amount.toLocaleString('en-IN')}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${year} ${hours}:${minutes}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    active: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800',
    completed: 'bg-green-100 dark:bg-green-500/20 text-green-800',
    new: 'bg-purple-100 dark:bg-purple-500/20 text-purple-800',
    contacted: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-green-100 dark:bg-green-500/20 text-green-800',
    sent: 'bg-blue-100 dark:bg-blue-500/20 text-blue-800',
    paid: 'bg-green-100 dark:bg-green-500/20 text-green-800',
    overdue: 'bg-red-100 dark:bg-red-500/20 text-red-800',
    unpaid: 'bg-orange-100 dark:bg-orange-500/20 text-orange-800',
    income: 'bg-green-100 dark:bg-green-500/20 text-green-800',
    expense: 'bg-red-100 dark:bg-red-500/20 text-red-800',
    published: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800',
    partial: 'bg-orange-100 dark:bg-orange-500/20 text-orange-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-800';
}

export function deltaSign(n: number): string {
  return n >= 0 ? `+${formatBDT(n)}` : formatBDT(n);
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

