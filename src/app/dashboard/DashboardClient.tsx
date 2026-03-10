'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getScopedAnalytics } from '@/app/actions/analytics';

const COLORS = ['#0F4C81', '#D4A843', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899'];

const statusLabels: Record<string, { ar: string; en: string; color: string }> = {
  draft:                 { ar: 'مسودة',          en: 'Draft',              color: '#94A3B8' },
  submitted:             { ar: 'مقدم',            en: 'Submitted',          color: '#3B82F6' },
  under_review:          { ar: 'قيد المراجعة',    en: 'Under Review',       color: '#8B5CF6' },
  pending_clarification: { ar: 'بانتظار توضيح',   en: 'Pending',            color: '#F59E0B' },
  approved:              { ar: 'موافق عليه',       en: 'Approved',           color: '#10B981' },
  rejected:              { ar: 'مرفوض',           en: 'Rejected',           color: '#EF4444' },
  completed:             { ar: 'مكتمل',           en: 'Completed',          color: '#059669' },
  cancelled:             { ar: 'ملغي',            en: 'Cancelled',          color: '#6B7280' },
};

const typeLabels: Record<string, { ar: string; en: string }> = {
  general_internal:      { ar: 'داخلي عام',    en: 'General' },
  intercompany:          { ar: 'بين الشركات',   en: 'Intercompany' },
  cross_department:      { ar: 'بين الأقسام',  en: 'Cross-Dept' },
  fund_disbursement:     { ar: 'صرف مالي',     en: 'Finance' },
  leave_approval:        { ar: 'إجازة',        en: 'Leave' },
  promotion:             { ar: 'ترقية',        en: 'Promotion' },
  demotion_disciplinary: { ar: 'تأديبي',       en: 'Disciplinary' },
  create_department:     { ar: 'إنشاء قسم',   en: 'New Dept' },
  create_company:        { ar: 'إنشاء شركة',  en: 'New Company' },
  create_position:       { ar: 'إنشاء وظيفة', en: 'New Position' },
};

const roleLabels: Record<string, { ar: string; en: string }> = {
  super_admin:        { ar: 'مدير النظام',      en: 'Super Admin' },
  ceo:                { ar: 'الرئيس التنفيذي',  en: 'CEO' },
  company_admin:      { ar: 'مدير الشركة',      en: 'Company Director' },
  department_manager: { ar: 'مدير القسم',       en: 'Dept Manager' },
  employee:           { ar: 'موظف',             en: 'Employee' },
};

interface Props {
  employee: any;
  analytics: any;
  pendingCount: number | null;
  myOpenCount: number | null;
  recentRequests: any[] | null;
  role: string;
  companies: any[];
  departments: any[];
  scopeEmployees: any[];
  upcomingApprovals: any[];
}

export default function DashboardClient({
  employee, analytics, pendingCount, myOpenCount, recentRequests,
  role, companies, departments, scopeEmployees, upcomingApprovals,
}: Props) {
  const { lang } = useLanguage();
  const [isPending, startTransition] = useTransition();

  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [scopedAnalytics, setScopedAnalytics] = useState<any>(analytics);

  const isCEO = role === 'super_admin' || role === 'ceo';
  const isCompanyAdmin = role === 'company_admin';
  const isDeptManager = role === 'department_manager';
  const isElevated = isCEO || isCompanyAdmin || isDeptManager;

  const hour = new Date().getHours();
  const greeting = lang === 'ar'
    ? (hour < 12 ? 'صباح الخير' : 'مساء الخير')
    : (hour < 12 ? 'Good morning' : 'Good evening');
  const name = lang === 'ar' ? employee?.full_name_ar : employee?.full_name_en || employee?.full_name_ar;
  const companyName = lang === 'ar' ? employee?.company?.name_ar : employee?.company?.name_en || employee?.company?.name_ar;

  // Cascading filter options
  const visibleDepts = selectedCompanyId
    ? departments.filter((d: any) => d.company_id === selectedCompanyId)
    : departments;
  const visibleEmps = selectedDeptId
    ? scopeEmployees.filter((e: any) => e.department_id === selectedDeptId)
    : scopeEmployees;

  function applyFilters(companyId: string, deptId: string, empId: string) {
    startTransition(async () => {
      const data = await getScopedAnalytics({
        companyId: companyId || undefined,
        departmentId: deptId || undefined,
        employeeId: empId || undefined,
      });
      setScopedAnalytics(data);
    });
  }

  function handleCompanyChange(val: string) {
    setSelectedCompanyId(val);
    setSelectedDeptId('');
    setSelectedEmployeeId('');
    applyFilters(val, '', '');
  }

  function handleDeptChange(val: string) {
    setSelectedDeptId(val);
    setSelectedEmployeeId('');
    applyFilters(selectedCompanyId, val, '');
  }

  function handleEmpChange(val: string) {
    setSelectedEmployeeId(val);
    applyFilters(selectedCompanyId, selectedDeptId, val);
  }

  // Determine current view level for showing appropriate sections
  const viewLevel = selectedEmployeeId ? 'employee' : selectedDeptId ? 'department' : selectedCompanyId ? 'company' : 'global';

  // Chart data
  const a = scopedAnalytics;
  const statusData = Object.entries(a.statusCounts || {}).map(([key, value]) => ({
    name: statusLabels[key]?.[lang] || key,
    value: value as number,
    color: statusLabels[key]?.color || '#94A3B8',
  })).filter(d => d.value > 0);

  const typeData = Object.entries(a.typeCounts || {}).map(([key, value]) => ({
    name: typeLabels[key]?.[lang] || key,
    value: value as number,
  })).filter(d => d.value > 0).sort((x: any, y: any) => y.value - x.value);

  const monthlyData = a.monthlyData || [];
  const deptWorkload = a.deptWorkload || [];
  const employeePerformance = a.employeePerformance || [];

  // Scope breadcrumb
  const selectedCompany = companies.find((c: any) => c.id === selectedCompanyId);
  const selectedDept = departments.find((d: any) => d.id === selectedDeptId);
  const selectedEmp = scopeEmployees.find((e: any) => e.id === selectedEmployeeId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{greeting}، {name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {companyName} — {new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-medium">
          {roleLabels[role]?.[lang] || role}
        </span>
      </div>

      {/* ── Cascading Filters ─────────────────────────────── */}
      {isElevated && (
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 ${isPending ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {lang === 'ar' ? 'نطاق العرض' : 'Viewing Scope'}
            </span>

            {/* Company (CEO/super_admin only) */}
            {isCEO && (
              <select
                value={selectedCompanyId}
                onChange={e => handleCompanyChange(e.target.value)}
                className="input-field text-sm py-1.5 flex-1 min-w-[180px]"
              >
                <option value="">{lang === 'ar' ? 'الكل — جميع الشركات' : 'All Companies'}</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_en || c.name_ar}</option>
                ))}
              </select>
            )}

            {/* Department */}
            {(isCEO || isCompanyAdmin) && (
              <select
                value={selectedDeptId}
                onChange={e => handleDeptChange(e.target.value)}
                className="input-field text-sm py-1.5 flex-1 min-w-[180px]"
                disabled={isCEO && !selectedCompanyId && departments.length > 20}
              >
                <option value="">{lang === 'ar' ? 'الكل — جميع الأقسام' : 'All Departments'}</option>
                {visibleDepts.map((d: any) => (
                  <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en || d.name_ar}</option>
                ))}
              </select>
            )}

            {/* Employee */}
            {(isCEO || isCompanyAdmin || isDeptManager) && (
              <select
                value={selectedEmployeeId}
                onChange={e => handleEmpChange(e.target.value)}
                className="input-field text-sm py-1.5 flex-1 min-w-[180px]"
              >
                <option value="">{lang === 'ar' ? 'الكل — جميع الموظفين' : 'All Employees'}</option>
                {visibleEmps.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {lang === 'ar' ? e.full_name_ar : e.full_name_en || e.full_name_ar}
                  </option>
                ))}
              </select>
            )}

            {(selectedCompanyId || selectedDeptId || selectedEmployeeId) && (
              <button
                onClick={() => { setSelectedCompanyId(''); setSelectedDeptId(''); setSelectedEmployeeId(''); setScopedAnalytics(analytics); }}
                className="text-xs text-slate-400 hover:text-slate-700 underline whitespace-nowrap"
              >
                {lang === 'ar' ? 'إعادة تعيين' : 'Reset'}
              </button>
            )}

            {isPending && <span className="text-xs text-slate-400">{lang === 'ar' ? 'جاري التحديث...' : 'Updating...'}</span>}
          </div>

          {/* Breadcrumb */}
          {(selectedCompanyId || selectedDeptId || selectedEmployeeId) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <span className="text-slate-400">{lang === 'ar' ? 'النطاق:' : 'Scope:'}</span>
              {selectedCompany && <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{lang === 'ar' ? selectedCompany.name_ar : selectedCompany.name_en || selectedCompany.name_ar}</span>}
              {selectedDept && <><span className="text-slate-300">›</span><span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full">{lang === 'ar' ? selectedDept.name_ar : selectedDept.name_en || selectedDept.name_ar}</span></>}
              {selectedEmp && <><span className="text-slate-300">›</span><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">{lang === 'ar' ? selectedEmp.full_name_ar : selectedEmp.full_name_en || selectedEmp.full_name_ar}</span></>}
            </div>
          )}
        </div>
      )}

      {/* ── KPI Row 1 ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title={lang === 'ar' ? 'بانتظار إجرائي' : 'Pending My Action'} value={pendingCount ?? 0} icon="⏳" bg="bg-amber-50 border-amber-100" />
        <KPI title={lang === 'ar' ? 'طلباتي المفتوحة' : 'My Open Requests'} value={myOpenCount ?? 0} icon="📋" bg="bg-blue-50 border-blue-100" />
        {isElevated && <KPI title={lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'} value={a.totalRequests ?? 0} icon="📊" bg="bg-slate-50 border-slate-200" />}
        {isElevated && <KPI title={lang === 'ar' ? 'تجاوز SLA' : 'SLA Breached'} value={a.breachedCount ?? 0} icon="🔴" bg="bg-red-50 border-red-100" />}
      </div>

      {/* ── KPI Row 2 (admin metrics) ─────────────────────── */}
      {isElevated && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI title={lang === 'ar' ? 'هذا الشهر' : 'This Month'} value={a.thisMonthRequests ?? 0} icon="📅" bg="bg-violet-50 border-violet-100" />
          <KPI title={lang === 'ar' ? 'مكتملة' : 'Completed'} value={a.completedCount ?? 0} icon="✅" bg="bg-emerald-50 border-emerald-100" />
          <KPI title={lang === 'ar' ? 'معدل الموافقة' : 'Approval Rate'} value={`${a.approvalRate ?? 0}%`} icon="📈" bg="bg-emerald-50 border-emerald-100" />
          <KPI title={lang === 'ar' ? 'متوسط الإنجاز' : 'Avg Cycle'} value={a.avgCycleHours > 0 ? `${a.avgCycleHours}h` : '—'} icon="⏱️" bg="bg-cyan-50 border-cyan-100" />
        </div>
      )}

      {/* ── CEO Upcoming Approvals ────────────────────────── */}
      {isCEO && upcomingApprovals.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span>🔔</span>
            <span>{lang === 'ar' ? 'طلبات قادمة للرئيس التنفيذي' : 'Upcoming CEO Approvals'}</span>
            <span className="ms-auto text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{upcomingApprovals.length}</span>
          </h2>
          <div className="divide-y divide-slate-50">
            {upcomingApprovals.map((ua: any, i: number) => (
              <Link key={i} href={`/dashboard/requests/${ua.requestId}`}
                className="flex items-center gap-4 py-3 hover:bg-slate-50 rounded-xl px-2 transition-colors">
                <span className="font-mono text-xs text-slate-400" dir="ltr">{ua.requestNumber}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{ua.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {lang === 'ar' ? 'الخطوة الحالية:' : 'Current step:'} {ua.currentStepRole}
                    {' · '}
                    {lang === 'ar' ? `${ua.stepsRemaining} خطوة قبلك` : `${ua.stepsRemaining} step${ua.stepsRemaining !== 1 ? 's' : ''} before you`}
                  </p>
                </div>
                <span className="text-amber-500 text-lg shrink-0">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts ────────────────────────────────────────── */}
      {isElevated && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'الاتجاه الشهري' : 'Monthly Trend'}</h3>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
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
            ) : <EmptyChart lang={lang} />}
          </div>

          {/* Status Distribution */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'توزيع الحالات' : 'Status Distribution'}</h3>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={240}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={85} innerRadius={45} paddingAngle={2} dataKey="value">
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {statusData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-slate-600 truncate">{d.name}</span>
                      <span className="ms-auto font-medium text-slate-900">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyChart lang={lang} />}
          </div>
        </div>
      )}

      {/* ── Type Chart + Dept Workload ────────────────────── */}
      {isElevated && viewLevel !== 'employee' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Types */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'حسب نوع الطلب' : 'By Request Type'}</h3>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#64748B' }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0F4C81" radius={[0, 4, 4, 0]} name={lang === 'ar' ? 'العدد' : 'Count'} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart lang={lang} />}
          </div>

          {/* Department Workload */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'حمل العمل حسب القسم' : 'Department Workload'}</h3>
            {deptWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={deptWorkload.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                  <Tooltip />
                  <Bar dataKey="pending" fill="#F59E0B" stackId="a" name={lang === 'ar' ? 'معلق' : 'Pending'} />
                  <Bar dataKey="completed" fill="#10B981" stackId="a" radius={[4, 4, 0, 0]} name={lang === 'ar' ? 'مكتمل' : 'Completed'} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart lang={lang} />}
          </div>
        </div>
      )}

      {/* ── Employee Performance Table (dept level) ───────── */}
      {isElevated && viewLevel === 'department' && employeePerformance.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'أداء الموظفين' : 'Employee Performance'}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-start pb-3 font-medium">{lang === 'ar' ? 'الموظف' : 'Employee'}</th>
                  <th className="text-center pb-3 font-medium">{lang === 'ar' ? 'الطلبات' : 'Requests'}</th>
                  <th className="text-center pb-3 font-medium">{lang === 'ar' ? 'المعلقة' : 'Pending'}</th>
                  <th className="text-center pb-3 font-medium">{lang === 'ar' ? 'متوسط الإنجاز' : 'Avg Cycle'}</th>
                  <th className="text-center pb-3 font-medium">{lang === 'ar' ? 'نسبة الموافقة' : 'Approval Rate'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {employeePerformance.map((emp: any) => (
                  <tr key={emp.id} className="hover:bg-slate-50">
                    <td className="py-3 font-medium text-slate-900">
                      {lang === 'ar' ? emp.full_name_ar : emp.full_name_en || emp.full_name_ar}
                    </td>
                    <td className="py-3 text-center text-slate-700">{emp.requestCount}</td>
                    <td className="py-3 text-center">
                      <span className={emp.pending > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}>{emp.pending}</span>
                    </td>
                    <td className="py-3 text-center text-slate-600">{emp.avgCycleHours > 0 ? `${emp.avgCycleHours}h` : '—'}</td>
                    <td className="py-3 text-center">
                      {emp.approvalRate !== null
                        ? <span className={`font-medium ${emp.approvalRate >= 70 ? 'text-emerald-600' : emp.approvalRate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{emp.approvalRate}%</span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent Activity + Quick Actions ───────────────── */}
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
                    <p className="text-xs text-slate-500">
                      {lang === 'ar' ? req.requester?.full_name_ar : (req.requester?.full_name_en || req.requester?.full_name_ar)}
                      {' • '}<span dir="ltr">{req.request_number}</span>
                    </p>
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
              {[
                { label: lang === 'ar' ? 'طلب داخلي عام' : 'General Request', href: '/dashboard/new-request', icon: '📝' },
                { label: lang === 'ar' ? 'طلب صرف مالي' : 'Fund Disbursement', href: '/dashboard/new-request', icon: '💰' },
                { label: lang === 'ar' ? 'طلب إجازة' : 'Leave Request', href: '/dashboard/new-request', icon: '🏖️' },
                { label: lang === 'ar' ? 'طلب بين الشركات' : 'Intercompany', href: '/dashboard/new-request', icon: '🏢' },
              ].map(a => (
                <Link key={a.label} href={a.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <span className="text-lg">{a.icon}</span>
                  <span className="text-sm text-slate-700 group-hover:text-eagle-600 font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {isElevated && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">{lang === 'ar' ? 'ملخص' : 'Summary'}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">{lang === 'ar' ? 'إجمالي الطلبات' : 'Total'}</span><span className="font-bold">{a.totalRequests}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{lang === 'ar' ? 'المعلقة' : 'Pending'}</span><span className="font-bold text-amber-600">{a.pendingCount}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{lang === 'ar' ? 'معدل الموافقة' : 'Approval Rate'}</span><span className="font-bold text-emerald-600">{a.approvalRate ?? 0}%</span></div>
                <div className="flex justify-between"><span className="text-slate-500">{lang === 'ar' ? 'معدل الرفض' : 'Rejection Rate'}</span><span className="font-bold text-red-500">{a.rejectionRate ?? 0}%</span></div>
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

function EmptyChart({ lang }: { lang: string }) {
  return <p className="text-sm text-slate-400 text-center py-16">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</p>;
}
