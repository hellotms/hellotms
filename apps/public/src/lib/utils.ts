import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBDT(amount: number): string {
  return '৳\u00a0' + new Intl.NumberFormat('en-IN').format(Math.round(amount));
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? (typeof window !== 'undefined' ? `https://api.${window.location.hostname}` : 'https://api.hellotms.com.bd');
