'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#0F4C81', '#D4A843', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899'];

const statusLabels: Record<string, { ar: string; en: string; color: string }> = {
  draft: { ar: 'مسودة', en: 'Draft', color: '#94A3B8' },
  submitted: { ar: 'مقدم', en: 'Submitted', color: '#3B82F6' },
  under_review: { ar: 'قيد المراجعة', en: 'Under Review', color: '#8B5CF6' },
  pending_clarification: { ar: 'بانتظار توضيح', en: 'Pending', color: '#F59E0B' },
  approved: { ar: 'موافق عليه', en: 'Approved', color: '#10B981' },
  rejected: { ar: 'مرفوض', en: 'Rejected', color: '#EF4444' },
  completed: { ar: 'مكتمل', en: 'Completed', color: '#059669' },
  cancelled: { ar: 'ملغي', en: 'Cancelled', color: '#6B7280' },
};

const typeLabels: Record<string, { ar: string; en: string }> = {
  general_internal: { ar: 'داخلي عام', en: 'General' },
  intercompany: { ar: 'بين الشركات', en: 'Intercompany' },
  cross_department: { ar: 'بين الأقسام', en: 'Cross-Dept' },
  fund_disbursement: { ar: 'صرف مالي', en: 'Finance' },
  leave_approval: { ar: 'إجازة', en: 'Leave' },
  promotion: { ar: 'ترقية', en: 'Promotion' },
  demotion_disciplinary: { ar: 'تأديبي', en: 'Disciplinary' },
  create_department: { ar: 'إنشاء قسم', en: 'New Dept' },
  create_company: { ar: 'إنشاء شركة', en: 'New Company' },
  create_position: { ar: 'إنشاء وظيفة', en: 'New Position' },
};

interface Props {
  employee: any;
  analytics: any;
  pendingCount: number | null;
  myOpenCount: number | null;
  recentRequests: any[] | null;
}

export default function DashboardClient({ employee, analytics, pendingCount, myOpenCount, recentRequests }: Props) {
  const { lang } = useLanguage();
  const hour = new Date().getHours();
  const greeting = lang === 'ar'
    ? (hour < 12 ? 'صباح الخير' : 'مساء الخير')
    : (hour < 12 ? 'Good morning' : 'Good evening');
  const name = lang === 'ar' ? employee?.full_name_ar : employee?.full_name_en || employee?.full_name_ar;
  const companyName = lang === 'ar' ? employee?.company?.name_ar : employee?.company?.name_en || employee?.company?.name_ar;

  const isAdmin = employee?.roles?.some((r: any) => ['super_admin', 'ceo'].includes(r.role));
  const isDeptManager = employee?.roles?.some((r: any) => r.role === 'department_manager');

  // Chart data
  const statusData = Object.entries(analytics.statusCounts || {}).map(([key, value]) => ({
    name: statusLabels[key]?.[lang] || key,
    value: value as number,
    color: statusLabels[key]?.color || '#94A3B8',
  })).filter(d => d.value > 0);

  const typeData = Object.entries(analytics.typeCounts || {}).map(([key, value]) => ({
    name: typeLabels[key]?.[lang] || key,
    value: value as number,
  })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  const monthlyData = analytics.monthlyData || [];
  const deptWorkload = analytics.deptWorkload || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting}، {name}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {companyName} — {new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title={lang === 'ar' ? 'بانتظار إجرائي' : 'Pending My Action'} value={pendingCount ?? 0} icon="⏳" bg="bg-amber-50 border-amber-100" />
        <KPI title={lang === 'ar' ? 'طلباتي المفتوحة' : 'My Open Requests'} value={myOpenCount ?? 0} icon="📋" bg="bg-blue-50 border-blue-100" />
        {isAdmin && <KPI title={lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'} value={analytics.totalRequests} icon="📊" bg="bg-slate-50 border-slate-200" />}
        {isAdmin && <KPI title={lang === 'ar' ? 'تجاوز SLA' : 'SLA Breached'} value={analytics.breachedCount} icon="🔴" bg="bg-red-50 border-red-100" />}
      </div>

      {/* Admin analytics row */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI title={lang === 'ar' ? 'هذا الشهر' : 'This Month'} value={analytics.thisMonthRequests} icon="📅" bg="bg-violet-50 border-violet-100" />
          <KPI title={lang === 'ar' ? 'مكتملة' : 'Completed'} value={analytics.completedCount} icon="✅" bg="bg-emerald-50 border-emerald-100" />
          <KPI title={lang === 'ar' ? 'مرفوضة' : 'Rejected'} value={analytics.rejectedCount} icon="❌" bg="bg-red-50 border-red-100" />
          <KPI title={lang === 'ar' ? 'متوسط الإنجاز' : 'Avg Cycle'} value={analytics.avgCycleHours > 0 ? `${analytics.avgCycleHours}h` : '—'} icon="⏱️" bg="bg-cyan-50 border-cyan-100" />
        </div>
      )}

      {/* Admin new metrics row */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI title={lang === 'ar' ? 'معدل الموافقة' : 'Approval Rate'} value={`${analytics.approvalRate ?? 0}%`} icon="✅" bg="bg-emerald-50 border-emerald-100" />
          <KPI title={lang === 'ar' ? 'معدل الرفض' : 'Rejection Rate'} value={`${analytics.rejectionRate ?? 0}%`} icon="❌" bg="bg-red-50 border-red-100" />
          <KPI title={lang === 'ar' ? 'طلبات الإعادة' : 'Returned'} value={analytics.returnCount ?? 0} icon="↩️" bg="bg-amber-50 border-amber-100" />
          <KPI title={lang === 'ar' ? 'مبالغ معلقة (صرف)' : 'Pending Disbursement'} value={new Intl.NumberFormat('en-US', { notation: 'compact' }).format(analytics.financialExposure ?? 0) + ' SAR'} icon="💰" bg="bg-blue-50 border-blue-100" />
        </div>
      )}

      {/* Dept manager KPI row */}
      {isDeptManager && !isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI title={lang === 'ar' ? 'طلبات قسمي' : "My Dept's Requests"} value={analytics.deptWorkload?.find((d: any) => true)?.total ?? 0} icon="🏢" bg="bg-violet-50 border-violet-100" />
          <KPI title={lang === 'ar' ? 'معلقة' : 'Pending'} value={analytics.deptWorkload?.find((d: any) => true)?.pending ?? 0} icon="⏳" bg="bg-amber-50 border-amber-100" />
          <KPI title={lang === 'ar' ? 'نسبة الموافقة' : 'Approval Rate'} value={`${analytics.approvalRate ?? 0}%`} icon="✅" bg="bg-emerald-50 border-emerald-100" />
          <KPI title={lang === 'ar' ? 'نسبة الرفض' : 'Rejection Rate'} value={`${analytics.rejectionRate ?? 0}%`} icon="❌" bg="bg-red-50 border-red-100" />
        </div>
      )}

      {/* Charts Row */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'الاتجاه الشهري' : 'Monthly Trend'}</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#0F4C81" strokeWidth={2} name={lang === 'ar' ? 'الإجمالي' : 'Total'} />
                  <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name={lang === 'ar' ? 'مكتمل' : 'Completed'} />
                  <Line type="monotone" dataKey="breached" stroke="#EF4444" strokeWidth={2} name={lang === 'ar' ? 'تجاوز' : 'Breached'} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 text-center py-12">{lang === 'ar' ? 'لا توجد بيانات كافية' : 'Not enough data'}</p>}
          </div>

          {/* Status Distribution Pie */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'توزيع الحالات' : 'Status Distribution'}</h3>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={250}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} dataKey="value">
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {statusData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-slate-600">{d.name}</span>
                      <span className="ms-auto font-medium text-slate-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-sm text-slate-400 text-center py-12">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>}
          </div>
        </div>
      )}

      {/* Second charts row */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Types Bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'حسب نوع الطلب' : 'By Request Type'}</h3>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748B' }} width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0F4C81" radius={[0, 4, 4, 0]} name={lang === 'ar' ? 'العدد' : 'Count'} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 text-center py-12">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>}
          </div>

          {/* Department Workload */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'حمل العمل حسب القسم' : 'Department Workload'}</h3>
            {deptWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deptWorkload.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Bar dataKey="pending" fill="#F59E0B" stackId="a" name={lang === 'ar' ? 'معلق' : 'Pending'} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="completed" fill="#10B981" stackId="a" name={lang === 'ar' ? 'مكتمل' : 'Completed'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-slate-400 text-center py-12">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>}
          </div>
        </div>
      )}

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">{lang === 'ar' ? 'النشاط الأخير' : 'Recent Activity'}</h2>
            <Link href="/dashboard/requests" className="text-xs text-eagle-600 hover:underline">{lang === 'ar' ? 'عرض الكل' : 'View All'}</Link>
          </div>
          {!recentRequests || recentRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <span className="text-3xl block mb-3">📋</span>
              <p className="text-sm font-medium">{lang === 'ar' ? 'لا يوجد نشاط حديث' : 'No recent activity'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentRequests.map((req: any) => (
                <Link key={req.id} href={`/dashboard/requests/${req.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusLabels[req.status]?.color || '#94A3B8' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{req.subject}</p>
                    <p className="text-xs text-slate-500">{req.requester?.full_name_ar} • <span dir="ltr">{req.request_number}</span></p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: (statusLabels[req.status]?.color || '#94A3B8') + '15', color: statusLabels[req.status]?.color || '#94A3B8' }}>
                    {statusLabels[req.status]?.[lang] || req.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}</h3>
            <div className="space-y-2">
              {[{ label: lang === 'ar' ? 'طلب داخلي عام' : 'General Request', href: '/dashboard/new-request', icon: '📝' },
                { label: lang === 'ar' ? 'طلب صرف مالي' : 'Fund Disbursement', href: '/dashboard/new-request', icon: '💰' },
                { label: lang === 'ar' ? 'طلب إجازة' : 'Leave Request', href: '/dashboard/new-request', icon: '🏖️' },
                { label: lang === 'ar' ? 'طلب بين الشركات' : 'Intercompany', href: '/dashboard/new-request', icon: '🏢' }].map(a => (
                <Link key={a.label} href={a.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <span className="text-lg">{a.icon}</span>
                  <span className="text-sm text-slate-700 group-hover:text-eagle-600 font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {isAdmin && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">{lang === 'ar' ? 'ملخص المؤسسة' : 'Organization Summary'}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">{lang === 'ar' ? 'الموظفين' : 'Employees'}</span><span className="font-bold">{analytics.totalEmployees}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{lang === 'ar' ? 'الأقسام' : 'Departments'}</span><span className="font-bold">{analytics.totalDepartments}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{lang === 'ar' ? 'الطلبات المعلقة' : 'Pending'}</span><span className="font-bold text-amber-600">{analytics.pendingCount}</span></div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-2">{lang === 'ar' ? 'حالة النظام' : 'System Status'}</h3>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-sm text-slate-600">{lang === 'ar' ? 'النظام يعمل' : 'System operational'}</span></div>
            <p className="text-xs text-slate-400 mt-2">Eagle Eye v1.0 — عين النسر</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ title, value, icon, bg }: { title: string; value: string | number; icon: string; bg: string }) {
  return (
    <div className={`kpi-card ${bg}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}
