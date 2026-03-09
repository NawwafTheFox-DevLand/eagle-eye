import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, locale: 'ar' | 'en' = 'ar') {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date, locale: 'ar' | 'en' = 'ar') {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
}

export function formatCurrency(amount: number, currency = 'SAR', locale: 'ar' | 'en' = 'ar') {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    style: 'currency', currency,
  }).format(amount);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 border-slate-200',
    submitted: 'bg-blue-50 text-blue-700 border-blue-200',
    under_review: 'bg-violet-50 text-violet-700 border-violet-200',
    pending_clarification: 'bg-amber-50 text-amber-700 border-amber-200',
    returned: 'bg-red-50 text-red-700 border-red-200',
    resubmitted: 'bg-orange-50 text-orange-700 border-orange-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-gray-50 text-gray-700 border-gray-200',
    archived: 'bg-gray-50 text-gray-500 border-gray-200',
  };
  return colors[status] || colors.draft;
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600', normal: 'bg-blue-100 text-blue-600',
    high: 'bg-amber-100 text-amber-700', urgent: 'bg-red-100 text-red-700',
  };
  return colors[priority] || colors.normal;
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function timeAgo(date: string | Date, locale: 'ar' | 'en' = 'ar'): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (locale === 'ar') {
    if (diff < 60) return 'الآن';
    if (diff < 3600) return 'منذ ' + Math.floor(diff / 60) + ' دقيقة';
    if (diff < 86400) return 'منذ ' + Math.floor(diff / 3600) + ' ساعة';
    if (diff < 604800) return 'منذ ' + Math.floor(diff / 86400) + ' يوم';
    return formatDate(date, locale);
  }
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return formatDate(date, locale);
}
