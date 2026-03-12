'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface SidebarProps {
  employee: any;
  roles: string[];
  inboxCount: number;
  notifCount: number;
  isHRHead?: boolean;
}

const NAV = [
  {
    group: { ar: 'الرئيسية', en: 'Main' },
    roles: null,
    items: [
      { href: '/dashboard',             icon: '📊', ar: 'لوحة القيادة',     en: 'Dashboard' },
      { href: '/dashboard/new-request', icon: '➕', ar: 'طلب جديد',         en: 'New Request' },
      { href: '/dashboard/inbox',       icon: '📥', ar: 'صندوق الوارد',     en: 'Inbox',          badge: 'inbox' },
      { href: '/dashboard/requests',    icon: '📋', ar: 'طلباتي',           en: 'My Requests' },
      { href: '/dashboard/search',      icon: '🔍', ar: 'البحث',            en: 'Search' },
      { href: '/dashboard/org-tree',    icon: '🌳', ar: 'الهيكل التنظيمي',  en: 'Org Structure' },
    ],
  },
  {
    group: { ar: 'العلاقات الحكومية', en: 'Gov. Relations' },
    roles: ['gr_manager', 'gr_employee', 'super_admin', 'ceo'],
    items: [
      { href: '/dashboard/gr',             icon: '🏛️', ar: 'لوحة GR',          en: 'GR Dashboard'  },
      { href: '/dashboard/gr/entities',    icon: '🏢', ar: 'الجهات',            en: 'Entities'      },
      { href: '/dashboard/gr/licenses',    icon: '📄', ar: 'التراخيص',          en: 'Licenses'      },
      { href: '/dashboard/gr/tasks',       icon: '✅', ar: 'المهام',             en: 'Tasks'         },
      { href: '/dashboard/gr/violations',  icon: '⚠️', ar: 'المخالفات',          en: 'Violations'    },
      { href: '/dashboard/gr/committees',  icon: '👥', ar: 'اللجان',             en: 'Committees'    },
    ],
  },
  {
    group: { ar: 'الإدارة', en: 'Administration' },
    roles: ['super_admin'],
    items: [
      { href: '/dashboard/admin/employees',   icon: '👥', ar: 'الموظفين',       en: 'Employees' },
      { href: '/dashboard/admin/departments', icon: '🏢', ar: 'الأقسام',        en: 'Departments' },
      { href: '/dashboard/admin/roles',       icon: '🔑', ar: 'الصلاحيات',      en: 'Roles' },
      { href: '/dashboard/admin/sla',         icon: '⏱️', ar: 'مستوى الخدمة',   en: 'SLA Config' },
      { href: '/dashboard/admin/audit',       icon: '📜', ar: 'سجل التدقيق',    en: 'Audit Log' },
    ],
  },
  {
    group: { ar: 'حسابي', en: 'My Account' },
    roles: null,
    items: [
      { href: '/dashboard/profile',      icon: '👤', ar: 'الملف الشخصي', en: 'Profile'       },
      { href: '/dashboard/notifications',icon: '🔔', ar: 'الإشعارات',    en: 'Notifications', badge: 'notif' },
      { href: '/dashboard/delegation',   icon: '🤝', ar: 'التفويضات',    en: 'Delegations'   },
      { href: '/dashboard/settings',     icon: '⚙️', ar: 'الإعدادات',    en: 'Settings'      },
    ],
  },
];

export default function Sidebar({ employee, roles, inboxCount, notifCount, isHRHead = false }: SidebarProps) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <aside className={`flex flex-col bg-slate-900 text-white h-screen sticky top-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} shrink-0`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <div className="w-8 h-8 shrink-0 flex items-center justify-center">
          <Image src="/logo.png" alt="Eagle Eye" width={32} height={32} className="object-contain" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{isAr ? 'عين النسر' : 'Eagle Eye'}</p>
            <p className="text-[10px] text-slate-400 truncate">Eagle Eye Platform</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={`${collapsed ? 'mx-auto' : 'ms-auto'} text-slate-400 hover:text-white transition-colors text-xs shrink-0`}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {NAV.map((section, si) => {
          if (section.roles && !section.roles.some(r => roles.includes(r))) return null;
          const isAdminSection = section.group.en === 'Administration';
          const showOnboardingConfig = isAdminSection && (roles.includes('super_admin') || isHRHead);
          return (
            <div key={si} className="mb-2">
              {!collapsed && (
                <p className="px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {isAr ? section.group.ar : section.group.en}
                </p>
              )}
              {section.items.map(item => {
                const active = isActive(item.href);
                const badgeCount = (item as any).badge === 'inbox' ? inboxCount : (item as any).badge === 'notif' ? notifCount : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? (isAr ? item.ar : item.en) : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <span className="text-base shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1">{isAr ? item.ar : item.en}</span>
                        {badgeCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && badgeCount > 0 && (
                      <span className="absolute top-1 end-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
              {showOnboardingConfig && (
                <Link
                  href="/dashboard/admin/onboarding-config"
                  title={collapsed ? (isAr ? 'إعدادات التعيين' : 'Onboarding Config') : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/dashboard/admin/onboarding-config')
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <span className="text-base shrink-0">🧑‍💼</span>
                  {!collapsed && <span className="flex-1">{isAr ? 'إعدادات التعيين' : 'Onboarding Config'}</span>}
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Employee footer */}
      {!collapsed && employee && (
        <div className="px-4 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
              {(isAr ? employee.full_name_ar : employee.full_name_en)?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">
                {isAr ? employee.full_name_ar : (employee.full_name_en || employee.full_name_ar)}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {isAr ? employee.company?.name_ar : (employee.company?.name_en || employee.company?.name_ar)}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
