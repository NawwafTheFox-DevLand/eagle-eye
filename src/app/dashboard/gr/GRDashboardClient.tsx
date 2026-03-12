'use client';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Props {
  stats: {
    entities: number;
    licenses: number;
    activeTasks: number;
    openViolations: number;
    pendingAlerts: number;
    error: string | null;
  };
}

const KPI_CARDS = [
  { key: 'entities',       icon: '🏛️', ar: 'الجهات',           en: 'Entities',         href: '/dashboard/gr/entities',   color: 'text-blue-600'   },
  { key: 'licenses',       icon: '📄', ar: 'التراخيص',          en: 'Licenses',         href: '/dashboard/gr/licenses',   color: 'text-emerald-600'},
  { key: 'activeTasks',    icon: '✅', ar: 'مهام نشطة',          en: 'Active Tasks',     href: '/dashboard/gr/tasks',      color: 'text-amber-600'  },
  { key: 'openViolations', icon: '⚠️', ar: 'مخالفات مفتوحة',    en: 'Open Violations',  href: '/dashboard/gr/violations', color: 'text-red-600'    },
  { key: 'pendingAlerts',  icon: '🔔', ar: 'تنبيهات معلقة',      en: 'Pending Alerts',   href: '/dashboard/gr/licenses',   color: 'text-orange-500' },
];

const NAV_ITEMS = [
  { href: '/dashboard/gr/entities',   icon: '🏛️', ar: 'الجهات الحكومية',    en: 'Government Entities'  },
  { href: '/dashboard/gr/licenses',   icon: '📄', ar: 'التراخيص والسجلات',   en: 'Licenses & Registrations' },
  { href: '/dashboard/gr/tasks',      icon: '✅', ar: 'المهام',               en: 'Tasks'                },
  { href: '/dashboard/gr/violations', icon: '⚠️', ar: 'المخالفات',            en: 'Violations'           },
  { href: '/dashboard/gr/committees', icon: '👥', ar: 'اللجان',               en: 'Committees'           },
];

export default function GRDashboardClient({ stats }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isAr ? 'العلاقات الحكومية' : 'Government Relations'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAr ? 'إدارة التراخيص والمهام والجهات الحكومية' : 'Manage licenses, tasks and government entities'}
        </p>
      </div>

      {stats.error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          {isAr ? 'تعذّر تحميل بعض البيانات. تأكد من إعداد جداول GR في قاعدة البيانات.' : 'Some data failed to load. Ensure GR tables are set up in the database.'}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {KPI_CARDS.map(card => (
          <Link key={card.key} href={card.href}
            className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow">
            <p className="text-2xl mb-2">{card.icon}</p>
            <p className={`text-2xl font-bold ${card.color}`}>
              {(stats as any)[card.key] ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">{isAr ? card.ar : card.en}</p>
          </Link>
        ))}
      </div>

      {/* Quick Navigation */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          {isAr ? 'التنقل السريع' : 'Quick Navigation'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-4 py-3.5 hover:border-blue-200 hover:bg-blue-50 transition-colors group">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700">
                {isAr ? item.ar : item.en}
              </span>
              <span className="ms-auto text-slate-400 text-xs group-hover:text-blue-500">←</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
