'use client';
import { useState } from 'react';
import Link from 'next/link';
import { getInitials } from '@/lib/utils';

interface TopBarProps { employee: any; unreadCount: number; pendingCount: number; lang?: 'ar' | 'en'; }

export default function TopBar({ employee, unreadCount, pendingCount, lang = 'ar' }: TopBarProps) {
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
      {pendingCount > 0 && (
        <Link href="/dashboard/approvals" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {pendingCount} {lang === 'ar' ? 'بانتظار إجراء' : 'pending'}
        </Link>
      )}
      <Link href="/dashboard/notifications" className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700">
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && <span className="absolute -top-0.5 -end-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </Link>
      <Link href="/dashboard/profile" className="flex items-center gap-3 ps-3 pe-4 py-1.5 rounded-xl hover:bg-slate-50">
        <div className="w-8 h-8 rounded-full bg-eagle-100 flex items-center justify-center text-eagle-700 text-xs font-bold">
          {employee ? getInitials(employee.full_name_en || employee.full_name_ar || '?') : '?'}
        </div>
        <div className="hidden sm:block text-start">
          <p className="text-sm font-medium text-slate-900 leading-tight">{employee?.full_name_ar || employee?.full_name_en || 'User'}</p>
          <p className="text-[10px] text-slate-500">{employee?.department?.name_ar || ''}</p>
        </div>
      </Link>
    </header>
  );
}
