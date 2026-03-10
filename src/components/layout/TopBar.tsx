'use client';
import { useState } from 'react';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import NotificationBell from '@/components/layout/NotificationBell';

interface TopBarProps { employee: any; unreadCount: number; pendingCount: number; }

export default function TopBar({ employee, unreadCount, pendingCount }: TopBarProps) {
  const { lang, toggle } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center px-6 gap-4 shrink-0">
      {searchOpen ? (
        <div className="flex-1 max-w-xl relative">
          <input autoFocus placeholder={lang === 'ar' ? 'ابحث عن طلب، موظف، أو رقم...' : 'Search request, employee, or number...'}
            className="w-full px-4 py-2 ps-10 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-eagle-500/20"
            onBlur={() => setSearchOpen(false)} />
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        </div>
      ) : (
        <button onClick={() => setSearchOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-50">
          <span>🔍</span><span className="hidden sm:inline">{lang === 'ar' ? 'بحث...' : 'Search...'}</span>
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-mono">⌘K</kbd>
        </button>
      )}
      <div className="flex-1" />
      <button onClick={toggle}
        className="text-xs text-slate-500 hover:text-eagle-600 transition-colors px-3 py-1.5 rounded-full border border-slate-200 hover:border-eagle-300 bg-white shadow-sm">
        {lang === 'ar' ? 'English' : 'العربية'}
      </button>
      {pendingCount > 0 && (
        <Link href="/dashboard/approvals" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {pendingCount} {lang === 'ar' ? 'بانتظار إجراء' : 'pending'}
        </Link>
      )}
      <NotificationBell employeeId={employee?.id ?? ''} initialUnread={unreadCount} />
      <Link href="/dashboard/profile" className="flex items-center gap-3 ps-3 pe-4 py-1.5 rounded-xl hover:bg-slate-50">
        <div className="w-8 h-8 rounded-full bg-eagle-100 flex items-center justify-center text-eagle-700 text-xs font-bold">
          {employee ? getInitials(employee.full_name_en || employee.full_name_ar || '?') : '?'}
        </div>
        <div className="hidden sm:block text-start">
          <p className="text-sm font-medium text-slate-900 leading-tight">
            {lang === 'ar' ? (employee?.full_name_ar || employee?.full_name_en) : (employee?.full_name_en || employee?.full_name_ar) || 'User'}
          </p>
          <p className="text-[10px] text-slate-500">
            {lang === 'ar' ? employee?.department?.name_ar : employee?.department?.name_en || employee?.department?.name_ar || ''}
          </p>
        </div>
      </Link>
    </header>
  );
}
