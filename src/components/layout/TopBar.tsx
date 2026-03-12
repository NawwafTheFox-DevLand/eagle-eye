'use client';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createClient } from '@/lib/supabase/client';

interface TopBarProps {
  employee: any;
  roles: string[];
  notifCount: number;
}

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  super_admin:        { ar: 'مدير النظام',     en: 'Super Admin' },
  ceo:                { ar: 'رئيس تنفيذي',     en: 'CEO' },
  department_manager: { ar: 'مدير قسم',         en: 'Dept. Manager' },
  hr_approver:        { ar: 'موارد بشرية',      en: 'HR' },
  finance_approver:   { ar: 'مالية',            en: 'Finance' },
  gr_manager:         { ar: 'مدير GR',          en: 'GR Manager' },
  gr_employee:        { ar: 'موظف GR',          en: 'GR Employee' },
  employee:           { ar: 'موظف',             en: 'Employee' },
};

function getHighestRoleLabel(roles: string[], isAr: boolean): string {
  const order = ['super_admin', 'ceo', 'department_manager', 'gr_manager', 'finance_approver', 'hr_approver', 'gr_employee', 'employee'];
  const found = order.find(r => roles.includes(r)) || 'employee';
  return isAr ? (ROLE_LABELS[found]?.ar ?? found) : (ROLE_LABELS[found]?.en ?? found);
}

export default function TopBar({ employee, roles, notifCount }: TopBarProps) {
  const { lang, toggle } = useLanguage();
  const isAr = lang === 'ar';

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  const name = isAr
    ? (employee?.full_name_ar || employee?.full_name_en || '')
    : (employee?.full_name_en || employee?.full_name_ar || '');

  const companyName = isAr
    ? (employee?.company?.name_ar || '')
    : (employee?.company?.name_en || employee?.company?.name_ar || '');

  const roleLabel = getHighestRoleLabel(roles, isAr);

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center px-6 gap-4 shrink-0">
      {/* Employee info — right side (RTL = start) */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
          {name.charAt(0) || '?'}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-900 leading-tight">{name || '—'}</p>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-medium">{roleLabel}</span>
            {companyName && <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{companyName}</span>}
          </div>
        </div>
      </div>

      <div className="flex-1" />

      {/* Actions — left side (RTL = end) */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="text-xs text-slate-500 hover:text-blue-600 border border-slate-200 rounded-full px-3 py-1.5 hover:border-blue-300 transition-colors bg-white"
        >
          {isAr ? 'EN' : 'عر'}
        </button>

        <Link
          href="/dashboard/notifications"
          className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 transition-colors text-slate-600"
          title={isAr ? 'الإشعارات' : 'Notifications'}
        >
          <span className="text-lg">🔔</span>
          {notifCount > 0 && (
            <span className="absolute top-1 end-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </Link>

        <button
          onClick={handleLogout}
          className="text-xs text-slate-500 hover:text-red-600 border border-slate-200 rounded-xl px-3 py-1.5 hover:border-red-200 transition-colors bg-white"
          title={isAr ? 'تسجيل الخروج' : 'Logout'}
        >
          {isAr ? 'خروج' : 'Logout'}
        </button>
      </div>
    </header>
  );
}
