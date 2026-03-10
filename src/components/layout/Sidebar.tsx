'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface SidebarProps { employee: any; }

const navSections = [
  { title: { ar: 'الرئيسية', en: 'Main' }, items: [
    { href: '/dashboard', icon: '◫', label: { ar: 'لوحة القيادة', en: 'Dashboard' } },
    { href: '/dashboard/requests', icon: '📋', label: { ar: 'الطلبات', en: 'Requests' } },
    { href: '/dashboard/approvals', icon: '✅', label: { ar: 'الموافقات', en: 'Approvals' } },
    { href: '/dashboard/new-request', icon: '➕', label: { ar: 'طلب جديد', en: 'New Request' } },
  ]},
  { title: { ar: 'العلاقات الحكومية', en: 'Gov Relations' }, roles: ['gr_employee', 'gr_manager', 'super_admin', 'ceo'], items: [
    { href: '/dashboard/gr', icon: '🛡️', label: { ar: 'لوحة GR', en: 'GR Dashboard' } },
    { href: '/dashboard/gr/entities', icon: '🏢', label: { ar: 'الكيانات', en: 'Entities' } },
    { href: '/dashboard/gr/licenses', icon: '📜', label: { ar: 'التراخيص', en: 'Licenses' } },
    { href: '/dashboard/gr/tasks', icon: '📝', label: { ar: 'المهام', en: 'Tasks' } },
    { href: '/dashboard/gr/violations', icon: '⚠️', label: { ar: 'المخالفات', en: 'Violations' } },
    { href: '/dashboard/gr/committees', icon: '👥', label: { ar: 'اللجان', en: 'Committees' } },
  ]},
  { title: { ar: 'الإدارة', en: 'Admin' }, roles: ['super_admin', 'company_admin', 'ceo'], items: [
    { href: '/dashboard/admin/employees', icon: '👤', label: { ar: 'الموظفين', en: 'Employees' } },
    { href: '/dashboard/admin/departments', icon: '🏗️', label: { ar: 'الأقسام', en: 'Departments' } },
    { href: '/dashboard/admin/sla', icon: '⏱️', label: { ar: 'إعدادات SLA', en: 'SLA Config' } },
    { href: '/dashboard/admin/audit', icon: '📖', label: { ar: 'سجل التدقيق', en: 'Audit Log' } },
  ]},
  { title: { ar: 'الحساب', en: 'Account' }, items: [
    { href: '/dashboard/delegation', icon: '🔄', label: { ar: 'التفويض', en: 'Delegation' } },
    { href: '/dashboard/notifications', icon: '🔔', label: { ar: 'الإشعارات', en: 'Notifications' } },
    { href: '/dashboard/settings', icon: '⚙️', label: { ar: 'الإعدادات', en: 'Settings' } },
  ]},
];

export default function Sidebar({ employee }: SidebarProps) {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const userRoles = employee?.roles?.map((r: any) => r.role) || ['employee'];

  return (
    <aside className={cn('flex flex-col eagle-gradient text-white transition-all duration-300', collapsed ? 'w-20' : 'w-72')}>
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0">
          <svg width="24" height="24" viewBox="0 0 512 512" fill="none">
            <circle cx="256" cy="270" r="30" fill="#D4A843"/><circle cx="256" cy="270" r="14" fill="#0A3558"/>
            <path d="M 256 140 Q 170 120, 80 180 Q 50 200, 35 240 Q 100 195, 170 200 Q 200 220, 220 245 Z" fill="white"/>
            <path d="M 256 140 Q 342 120, 432 180 Q 462 200, 477 240 Q 412 195, 342 200 Q 312 220, 292 245 Z" fill="white"/>
          </svg>
        </div>
        {!collapsed && <div><h1 className="font-bold text-base leading-tight">{lang === 'ar' ? 'عين النسر' : 'Eagle Eye'}</h1><p className="text-[10px] text-white/50 tracking-wider">EAGLE EYE</p></div>}
        <button onClick={() => setCollapsed(!collapsed)} className="ms-auto text-white/40 hover:text-white/80 transition-colors text-sm">
          {collapsed ? '☰' : '◁'}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navSections.map((section, si) => {
          if (section.roles && !section.roles.some(r => userRoles.includes(r))) return null;
          return (
            <div key={si}>
              {!collapsed && <p className="px-4 mb-2 text-[10px] font-semibold text-white/40 uppercase tracking-wider">{section.title[lang]}</p>}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <Link key={item.href} href={item.href}
                      className={cn('sidebar-link', isActive && 'active')}
                      title={collapsed ? item.label[lang] : undefined}>
                      <span className={cn('shrink-0 text-base', isActive ? 'opacity-100' : 'opacity-60')}>{item.icon}</span>
                      {!collapsed && <span>{item.label[lang]}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      {!collapsed && employee && (
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gold-400/20 flex items-center justify-center text-gold-400 text-xs font-bold">
              {employee.full_name_ar?.[0] || employee.full_name_en?.[0] || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {lang === 'ar' ? (employee.full_name_ar || employee.full_name_en) : (employee.full_name_en || employee.full_name_ar)}
              </p>
              <p className="text-[10px] text-white/50 truncate">
                {lang === 'ar' ? employee.company?.name_ar : employee.company?.name_en || employee.company?.name_ar}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
