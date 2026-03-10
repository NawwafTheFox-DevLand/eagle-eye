'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const t = {
  ar: { title: 'العلاقات الحكومية', subtitle: 'لوحة قيادة إدارة العلاقات الحكومية',
    entities: 'الكيانات', licenses: 'التراخيص النشطة', expiring: 'تنتهي خلال 30 يوم', expired: 'منتهية',
    openTasks: 'مهام مفتوحة', overdue: 'متأخرة', onTime: 'نسبة الإنجاز بالوقت', alerts: 'تنبيهات',
    violations: 'مخالفات مفتوحة', violationAmount: 'إجمالي المخالفات', committees: 'لجان نشطة',
    quickLinks: 'روابط سريعة', recentAlerts: 'تنبيهات حديثة', noAlerts: 'لا توجد تنبيهات',
  },
  en: { title: 'Government Relations', subtitle: 'GR Department Dashboard',
    entities: 'Entities', licenses: 'Active Licenses', expiring: 'Expiring in 30 days', expired: 'Expired',
    openTasks: 'Open Tasks', overdue: 'Overdue', onTime: 'On-Time Rate', alerts: 'Alerts',
    violations: 'Open Violations', violationAmount: 'Total Violation Amount', committees: 'Active Committees',
    quickLinks: 'Quick Links', recentAlerts: 'Recent Alerts', noAlerts: 'No alerts',
  },
};

export default function GRDashboardClient({ stats, alerts }: any) {
  const { lang } = useLanguage();
  const L = t[lang];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{L.title}</h1>
        <p className="text-sm text-slate-500 mt-1">{L.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title={L.entities} value={stats.totalEntities} icon="🏢" bg="bg-blue-50 border-blue-100" />
        <KPI title={L.licenses} value={stats.totalLicenses} icon="📜" bg="bg-emerald-50 border-emerald-100" />
        <KPI title={L.expiring} value={stats.expiringSoon} icon="⚠️" bg="bg-amber-50 border-amber-100" />
        <KPI title={L.expired} value={stats.expired} icon="🔴" bg="bg-red-50 border-red-100" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title={L.openTasks} value={stats.openTasks} icon="📋" bg="bg-violet-50 border-violet-100" />
        <KPI title={L.overdue} value={stats.overdueTasks} icon="⏰" bg="bg-red-50 border-red-100" />
        <KPI title={L.onTime} value={stats.onTimeRate + '%'} icon="✅" bg="bg-emerald-50 border-emerald-100" />
        <KPI title={L.alerts} value={stats.unackAlerts} icon="🔔" bg="bg-amber-50 border-amber-100" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPI title={L.violations} value={stats.openViolations} icon="⚠️" bg="bg-orange-50 border-orange-100" />
        <KPI title={L.violationAmount} value={stats.totalViolationAmount > 0 ? stats.totalViolationAmount.toLocaleString() + ' SAR' : '—'} icon="💰" bg="bg-red-50 border-red-100" />
        <KPI title={L.committees} value={stats.activeCommittees} icon="👥" bg="bg-blue-50 border-blue-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4">{L.quickLinks}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/dashboard/gr/entities', icon: '🏢', label: lang === 'ar' ? 'الكيانات' : 'Entities' },
              { href: '/dashboard/gr/licenses', icon: '📜', label: lang === 'ar' ? 'التراخيص' : 'Licenses' },
              { href: '/dashboard/gr/tasks', icon: '📋', label: lang === 'ar' ? 'المهام' : 'Tasks' },
              { href: '/dashboard/gr/violations', icon: '⚠️', label: lang === 'ar' ? 'المخالفات' : 'Violations' },
              { href: '/dashboard/gr/committees', icon: '👥', label: lang === 'ar' ? 'اللجان' : 'Committees' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors group">
                <span className="text-lg">{l.icon}</span>
                <span className="text-sm font-medium text-slate-700 group-hover:text-eagle-600">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4">{L.recentAlerts}</h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{L.noAlerts}</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {alerts.slice(0, 10).map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                  <span className="text-sm mt-0.5">{a.alert_type.includes('expired') ? '🔴' : '⚠️'}</span>
                  <div>
                    <p className="text-xs font-medium text-slate-900">{lang === 'ar' ? a.message_ar : a.message_en || a.message_ar}</p>
                    <p className="text-xs text-slate-500">{a.alert_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPI({ title, value, icon, bg }: { title: string; value: string | number; icon: string; bg: string }) {
  return (
    <div className={`kpi-card ${bg}`}>
      <div className="flex items-start justify-between">
        <div><p className="text-xs font-medium text-slate-500 mb-1">{title}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div>
        <span className="text-xl">{icon}</span>
      </div>
    </div>
  );
}
