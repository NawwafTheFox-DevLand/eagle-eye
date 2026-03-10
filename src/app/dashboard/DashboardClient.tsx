'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const translations = {
  ar: {
    greeting_morning: 'صباح الخير',
    greeting_evening: 'مساء الخير',
    recentActivity: 'النشاط الأخير',
    viewAll: 'عرض الكل',
    noActivity: 'لا يوجد نشاط حديث',
    noActivitySub: 'ابدأ بإنشاء طلب جديد',
    quickActions: 'إجراءات سريعة',
    systemStatus: 'حالة النظام',
    systemOk: 'النظام يعمل بشكل طبيعي',
    kpis: [
      { title: 'بانتظار إجرائي', subtitle: 'طلبات تحتاج موافقتي', icon: '⏳', color: 'amber' },
      { title: 'طلباتي المفتوحة', subtitle: 'قيد المعالجة', icon: '📋', color: 'blue' },
      { title: 'مكتملة', subtitle: 'تم إنجازها', icon: '✅', color: 'green' },
      { title: 'متأخرة', subtitle: 'تجاوزت SLA', icon: '🔴', color: 'red' },
    ],
    actions: [
      { label: 'طلب داخلي عام', href: '/dashboard/new-request', icon: '📝' },
      { label: 'طلب صرف مالي', href: '/dashboard/new-request', icon: '💰' },
      { label: 'طلب إجازة', href: '/dashboard/new-request', icon: '🏖️' },
      { label: 'طلب بين الشركات', href: '/dashboard/new-request', icon: '🏢' },
    ],
    statusLabels: {
      draft: 'مسودة', submitted: 'مقدم', under_review: 'قيد المراجعة',
      approved: 'موافق عليه', rejected: 'مرفوض', completed: 'مكتمل',
      pending_clarification: 'بانتظار توضيح', cancelled: 'ملغي',
    } as Record<string, string>,
  },
  en: {
    greeting_morning: 'Good morning',
    greeting_evening: 'Good evening',
    recentActivity: 'Recent Activity',
    viewAll: 'View all',
    noActivity: 'No recent activity',
    noActivitySub: 'Start by creating a new request',
    quickActions: 'Quick Actions',
    systemStatus: 'System Status',
    systemOk: 'All systems operational',
    kpis: [
      { title: 'Pending My Action', subtitle: 'Awaiting my approval', icon: '⏳', color: 'amber' },
      { title: 'My Open Requests', subtitle: 'In progress', icon: '📋', color: 'blue' },
      { title: 'Completed', subtitle: 'Successfully closed', icon: '✅', color: 'green' },
      { title: 'Overdue', subtitle: 'SLA breached', icon: '🔴', color: 'red' },
    ],
    actions: [
      { label: 'General Internal Request', href: '/dashboard/new-request', icon: '📝' },
      { label: 'Fund Disbursement', href: '/dashboard/new-request', icon: '💰' },
      { label: 'Leave Request', href: '/dashboard/new-request', icon: '🏖️' },
      { label: 'Intercompany Request', href: '/dashboard/new-request', icon: '🏢' },
    ],
    statusLabels: {
      draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review',
      approved: 'Approved', rejected: 'Rejected', completed: 'Completed',
      pending_clarification: 'Pending Clarification', cancelled: 'Cancelled',
    } as Record<string, string>,
  },
};

const statusColors: Record<string, string> = {
  draft: '#94A3B8', submitted: '#3B82F6', under_review: '#8B5CF6',
  approved: '#10B981', rejected: '#EF4444', completed: '#059669',
  pending_clarification: '#F59E0B', cancelled: '#6B7280',
};

const kpiColors: Record<string, string> = {
  amber: 'bg-amber-50 border-amber-100',
  blue: 'bg-blue-50 border-blue-100',
  green: 'bg-emerald-50 border-emerald-100',
  red: 'bg-red-50 border-red-100',
};

interface DashboardClientProps {
  employee: any;
  pendingCount: number | null;
  myOpenCount: number | null;
  completedCount: number | null;
  overdueCount: number | null;
  recentRequests: any[] | null;
}

export default function DashboardClient({
  employee, pendingCount, myOpenCount, completedCount, overdueCount, recentRequests,
}: DashboardClientProps) {
  const { lang } = useLanguage();
  const t = translations[lang];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.greeting_morning : t.greeting_evening;
  const name = lang === 'ar'
    ? (employee?.full_name_ar || employee?.full_name_en || 'المستخدم')
    : (employee?.full_name_en || employee?.full_name_ar || 'User');
  const companyName = lang === 'ar'
    ? employee?.company?.name_ar
    : (employee?.company?.name_en || employee?.company?.name_ar);

  const kpiValues = [pendingCount ?? 0, myOpenCount ?? 0, completedCount ?? 0, overdueCount ?? 0];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting}، {name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {companyName} — {new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {t.kpis.map((kpi, i) => (
          <div key={i} className={`kpi-card ${kpiColors[kpi.color]}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">{kpi.title}</p>
                <p className="text-3xl font-bold text-slate-900">{kpiValues[i]}</p>
                <p className="text-[11px] text-slate-400 mt-1">{kpi.subtitle}</p>
              </div>
              <span className="text-2xl">{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{t.recentActivity}</h2>
            <Link href="/dashboard/requests" className="text-xs text-eagle-600 hover:underline">{t.viewAll}</Link>
          </div>
          {!recentRequests || recentRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <span className="text-3xl block mb-3">📋</span>
              <p className="text-sm font-medium">{t.noActivity}</p>
              <p className="text-xs mt-1">{t.noActivitySub}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentRequests.map((req: any) => (
                <Link key={req.id} href={`/dashboard/requests/${req.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColors[req.status] || '#94A3B8' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{req.subject}</p>
                    <p className="text-xs text-slate-500">
                      {req.requester?.full_name_ar} • <span dir="ltr">{req.request_number}</span>
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: (statusColors[req.status] || '#94A3B8') + '15', color: statusColors[req.status] || '#94A3B8' }}>
                    {t.statusLabels[req.status] || req.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{t.quickActions}</h3>
            <div className="space-y-2">
              {t.actions.map(a => (
                <Link key={a.label} href={a.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <span className="text-lg">{a.icon}</span>
                  <span className="text-sm text-slate-700 group-hover:text-eagle-600 font-medium">{a.label}</span>
                  <svg className="w-4 h-4 text-slate-300 ms-auto group-hover:text-eagle-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-3">{t.systemStatus}</h3>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-sm text-slate-600">{t.systemOk}</span></div>
            <p className="text-xs text-slate-400 mt-2">Eagle Eye v1.0 — عين النسر</p>
          </div>
        </div>
      </div>
    </div>
  );
}
