'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, Legend,
} from 'recharts';

// ── Action labels ─────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  submitted:             { ar: 'قدّم الطلب',                  en: 'submitted'                  },
  forwarded:             { ar: 'حوّل الطلب',                  en: 'forwarded'                  },
  returned:              { ar: 'أرجع الطلب',                  en: 'returned'                   },
  asked_requester:       { ar: 'طلب توضيحاً على',             en: 'requested clarification on' },
  resubmitted:           { ar: 'أعاد تقديم',                  en: 'resubmitted'                },
  assigned:              { ar: 'عيّن الطلب',                  en: 'assigned'                   },
  company_exit_stamped:  { ar: 'وافق على خروج',               en: 'approved exit for'          },
  finance_stamped:       { ar: 'اعتمد مالياً',                en: 'finance-approved'           },
  hr_stamped:            { ar: 'وافقت الموارد البشرية على',   en: 'HR-approved'                },
  ceo_stamped:           { ar: 'وافق الرئيس التنفيذي على',    en: 'CEO-approved'               },
  completed:             { ar: 'أنجز الطلب',                  en: 'completed'                  },
  rejected:              { ar: 'رفض الطلب',                   en: 'rejected'                   },
  cancelled:             { ar: 'ألغى الطلب',                  en: 'cancelled'                  },
};

function actionIcon(action: string): string {
  if (['submitted', 'completed', 'company_exit_stamped', 'finance_stamped', 'hr_stamped', 'ceo_stamped'].includes(action)) return '🟢';
  if (['forwarded', 'assigned'].includes(action)) return '🔵';
  if (['returned', 'asked_requester', 'resubmitted'].includes(action)) return '🟡';
  if (['rejected', 'cancelled'].includes(action)) return '🔴';
  return '⚪';
}

function relativeTime(dateStr: string, isAr: boolean): string {
  const diffMs = new Date().getTime() - new Date(dateStr).getTime();
  const mins  = Math.floor(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (isAr) {
    if (mins  < 1)  return 'الآن';
    if (mins  < 60) return 'منذ ' + mins  + ' دقيقة';
    if (hours < 24) return 'منذ ' + hours + ' ساعة';
    if (days  < 7)  return 'منذ ' + days  + ' يوم';
    return 'منذ ' + Math.floor(days / 7) + ' أسبوع';
  }
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return mins  + 'm ago';
  if (hours < 24) return hours + 'h ago';
  if (days  < 7)  return days  + 'd ago';
  return Math.floor(days / 7) + 'w ago';
}

// ── Scope KPI card ────────────────────────────────────────────────────────────

function ScopeKPI({ icon, titleAr, titleEn, value, borderColor, isAr, onClick }: {
  icon: string; titleAr: string; titleEn: string; value: string | number; borderColor: string; isAr: boolean; onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 border-l-4 ${borderColor} ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-200 transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{isAr ? titleAr : titleEn}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <span className="text-xl">{icon}</span>
      </div>
    </div>
  );
}

// ── Role badge map ────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  super_admin:        { ar: 'مدير النظام',          en: 'Super Admin',  color: 'bg-purple-100 text-purple-700' },
  ceo:                { ar: 'رئيس تنفيذي',          en: 'CEO',          color: 'bg-blue-100 text-blue-700'    },
  department_manager: { ar: 'رئيس قسم',             en: 'Dept Head',    color: 'bg-green-100 text-green-700'  },
  gr_manager:         { ar: 'مدير الشؤون الحكومية', en: 'GR Manager',   color: 'bg-amber-100 text-amber-700'  },
  gr_employee:        { ar: 'موظف الشؤون الحكومية', en: 'GR Employee',  color: 'bg-amber-100 text-amber-700'  },
  finance_approver:   { ar: 'مدير مالي',            en: 'Finance',      color: 'bg-cyan-100 text-cyan-700'    },
  hr_approver:        { ar: 'موارد بشرية',           en: 'HR',           color: 'bg-rose-100 text-rose-700'    },
  employee:           { ar: 'موظف',                 en: 'Employee',     color: 'bg-slate-100 text-slate-600'  },
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScopeData {
  level: string;
  requests: any[];
  employees: any[];
  actions: any[];
  assigned: any[];
  departments: any[];
  companies: any[];
  recentActivity: any[];
  actRequests: any[];
  actActors: any[];
  headEmployeeId: string | null;
}

interface Props {
  employee: any;
  level: 'holding' | 'company' | 'department' | 'employee';
  personalKPIs: { myOpen: number; myInbox: number; myCompleted: number; myRejected: number };
  scopeData: ScopeData | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardClient({ employee, level, personalKPIs, scopeData }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();

  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedDept, setSelectedDept]       = useState('');

  // ── Filtered scope data ───────────────────────────────────────────────────

  const filteredData = useMemo(() => {
    if (!scopeData) return null;

    let requests = scopeData.requests;
    let employees = scopeData.employees;
    let actions  = scopeData.actions;
    let assigned = scopeData.assigned;

    if (selectedCompany) {
      const compEmpIds = scopeData.employees
        .filter((e: any) => e.company_id === selectedCompany)
        .map((e: any) => e.id);
      requests = requests.filter((r: any) =>
        r.origin_company_id === selectedCompany || r.destination_company_id === selectedCompany
      );
      employees = employees.filter((e: any) => e.company_id === selectedCompany);
      actions   = actions.filter((a: any) => compEmpIds.includes(a.actor_id));
      assigned  = assigned.filter((r: any) => compEmpIds.includes(r.assigned_to));
    }

    if (selectedDept) {
      const deptEmpIds = employees
        .filter((e: any) => e.department_id === selectedDept)
        .map((e: any) => e.id);
      requests = requests.filter((r: any) =>
        r.origin_dept_id === selectedDept || r.destination_dept_id === selectedDept
      );
      employees = employees.filter((e: any) => e.department_id === selectedDept);
      actions   = actions.filter((a: any) => deptEmpIds.includes(a.actor_id));
      assigned  = assigned.filter((r: any) => deptEmpIds.includes(r.assigned_to));
    }

    return { requests, employees, actions, assigned };
  }, [scopeData, selectedCompany, selectedDept]);

  // ── Scope KPIs ────────────────────────────────────────────────────────────

  const scopeKPIs = useMemo(() => {
    if (!filteredData) return null;
    const { requests, actions, employees } = filteredData;
    const empIds = employees.map((e: any) => e.id);

    const completedReqs = requests.filter((r: any) =>
      r.status === 'completed' && r.submitted_at && r.completed_at
    );
    const total     = requests.length;
    const completed = requests.filter((r: any) => r.status === 'completed').length;

    let avgCycleTime = '—';
    if (completedReqs.length > 0) {
      const totalHours = completedReqs.reduce((sum: number, r: any) =>
        sum + (new Date(r.completed_at).getTime() - new Date(r.submitted_at).getTime()) / (1000 * 60 * 60), 0
      );
      const avg = totalHours / completedReqs.length;
      if (avg < 1)       avgCycleTime = Math.round(avg * 60) + (isAr ? ' دقيقة' : ' min');
      else if (avg < 48) avgCycleTime = Math.round(avg)      + (isAr ? ' ساعة'  : 'h');
      else               avgCycleTime = Math.round(avg / 24) + (isAr ? ' يوم'   : 'd');
    }

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      createdHere:          requests.filter((r: any) => empIds.includes(r.requester_id)).length,
      completedHere:        completed,
      inProgress:           requests.filter((r: any) => r.status === 'in_progress').length,
      pendingClarification: requests.filter((r: any) => r.status === 'pending_clarification').length,
      forwarded:     actions.filter((a: any) => a.action === 'forwarded').length,
      assigned:      actions.filter((a: any) => a.action === 'assigned').length,
      returned:      actions.filter((a: any) => a.action === 'returned').length,
      askedRequester:actions.filter((a: any) => a.action === 'asked_requester').length,
      completedByScope: actions.filter((a: any) => a.action === 'completed').length,
      rejectedByScope:  actions.filter((a: any) => a.action === 'rejected').length,
      avgCycleTime,
      completionRate,
    };
  }, [filteredData, isAr]);

  // ── Employee table visibility ─────────────────────────────────────────────

  const showEmployeeTable = level === 'department' || selectedDept !== '';

  // ── Employee performance data ─────────────────────────────────────────────

  const employeePerformance = useMemo(() => {
    if (!showEmployeeTable || !filteredData || !scopeData) return [];
    const { employees, actions, assigned } = filteredData;

    let headId: string | null = scopeData.headEmployeeId ?? null;
    if (!headId && selectedDept && scopeData.departments) {
      const dept = scopeData.departments.find((d: any) => d.id === selectedDept);
      headId = dept?.head_employee_id || null;
    }

    return employees.map((emp: any) => {
      const received = actions.filter((a: any) => a.to_person_id === emp.id);
      let avgResponseMs = 0;
      let responseCount = 0;

      received.forEach((recv: any) => {
        const nextAction = actions.find((a: any) =>
          a.request_id === recv.request_id &&
          a.actor_id === emp.id &&
          new Date(a.created_at) > new Date(recv.created_at)
        );
        if (nextAction) {
          avgResponseMs += new Date(nextAction.created_at).getTime() - new Date(recv.created_at).getTime();
          responseCount++;
        }
      });

      const avgHours = responseCount > 0 ? avgResponseMs / responseCount / (1000 * 60 * 60) : 0;
      let avgResponseText = '—';
      if (responseCount > 0) {
        if (avgHours < 1)       avgResponseText = Math.round(avgHours * 60) + (isAr ? 'د' : 'm');
        else if (avgHours < 24) avgResponseText = Math.round(avgHours)      + (isAr ? 'س' : 'h');
        else                    avgResponseText = Math.round(avgHours / 24) + (isAr ? 'ي' : 'd');
      }

      return {
        id:          emp.id,
        name:        isAr ? emp.full_name_ar : (emp.full_name_en || emp.full_name_ar),
        code:        emp.employee_code,
        title:       emp.title_ar || '',
        grade:       emp.grade || '',
        isDeptHead:  emp.id === headId,
        holding:     assigned.filter((r: any) => r.assigned_to === emp.id).length,
        submitted:   actions.filter((a: any) => a.action === 'submitted'      && a.actor_id === emp.id).length,
        forwarded:   actions.filter((a: any) => a.action === 'forwarded'      && a.actor_id === emp.id).length,
        assigned:    actions.filter((a: any) => a.action === 'assigned'       && a.actor_id === emp.id).length,
        completed:   actions.filter((a: any) => a.action === 'completed'      && a.actor_id === emp.id).length,
        rejected:    actions.filter((a: any) => a.action === 'rejected'       && a.actor_id === emp.id).length,
        returned:    actions.filter((a: any) => a.action === 'returned'       && a.actor_id === emp.id).length,
        asked:       actions.filter((a: any) => a.action === 'asked_requester' && a.actor_id === emp.id).length,
        avgResponse: avgResponseText,
      };
    }).sort((a: any, b: any) => b.holding - a.holding);
  }, [filteredData, showEmployeeTable, scopeData, selectedDept, isAr]);

  // ── Chart data ────────────────────────────────────────────────────────────

  const actionsChartData = useMemo(() => {
    if (!filteredData) return [];
    const { actions } = filteredData;
    return [
      { name: isAr ? 'تحويل'  : 'Forward',  value: actions.filter((a: any) => a.action === 'forwarded').length,      fill: '#3B82F6' },
      { name: isAr ? 'تعيين'  : 'Assign',   value: actions.filter((a: any) => a.action === 'assigned').length,       fill: '#6366F1' },
      { name: isAr ? 'إنجاز'  : 'Complete', value: actions.filter((a: any) => a.action === 'completed').length,      fill: '#10B981' },
      { name: isAr ? 'رفض'    : 'Reject',   value: actions.filter((a: any) => a.action === 'rejected').length,       fill: '#EF4444' },
      { name: isAr ? 'إرجاع'  : 'Return',   value: actions.filter((a: any) => a.action === 'returned').length,       fill: '#F59E0B' },
      { name: isAr ? 'توضيح'  : 'Clarify',  value: actions.filter((a: any) => a.action === 'asked_requester').length, fill: '#F97316' },
    ].filter(d => d.value > 0);
  }, [filteredData, isAr]);

  const monthlyTrendData = useMemo(() => {
    if (!filteredData) return [];
    const { requests, employees } = filteredData;
    const empIds = employees.map((e: any) => e.id);
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d        = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label    = d.toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' });
      const created   = requests.filter((r: any) => {
        if (!r.created_at) return false;
        const rd = new Date(r.created_at);
        return rd >= d && rd <= monthEnd && empIds.includes(r.requester_id);
      }).length;
      const completed = requests.filter((r: any) => {
        if (!r.completed_at) return false;
        const rd = new Date(r.completed_at);
        return rd >= d && rd <= monthEnd && r.status === 'completed';
      }).length;
      return { name: label, created, completed };
    });
  }, [filteredData, isAr]);

  const workloadChartData = useMemo(() => {
    if (!filteredData) return [];
    if (showEmployeeTable && employeePerformance.length > 0) {
      return employeePerformance.slice(0, 10).map((emp: any) => ({
        name:       emp.name.length > 12 ? emp.name.slice(0, 12) + '…' : emp.name,
        inProgress: emp.holding,
        completed:  emp.completed,
        forwarded:  emp.forwarded,
      }));
    }
    if (scopeData?.departments && scopeData.departments.length > 1) {
      return scopeData.departments.map((dept: any) => ({
        name:  (isAr ? dept.name_ar : (dept.name_en || dept.name_ar)).slice(0, 15),
        value: filteredData.requests.filter((r: any) =>
          r.origin_dept_id === dept.id || r.destination_dept_id === dept.id
        ).length,
      })).filter((d: any) => d.value > 0).sort((a: any, b: any) => b.value - a.value);
    }
    return [];
  }, [filteredData, showEmployeeTable, employeePerformance, scopeData, isAr]);

  const isEmployeeWorkload = showEmployeeTable && employeePerformance.length > 0;

  // ── Activity feed lookup maps ─────────────────────────────────────────────

  const actRequestMap = useMemo(() => {
    if (!scopeData?.actRequests) return new Map<string, any>();
    return new Map(scopeData.actRequests.map((r: any) => [r.id, r]));
  }, [scopeData]);

  const actActorMap = useMemo(() => {
    if (!scopeData?.actActors) return new Map<string, any>();
    return new Map(scopeData.actActors.map((a: any) => [a.id, a]));
  }, [scopeData]);

  // ── Display helpers ───────────────────────────────────────────────────────

  const displayName = isAr
    ? (employee.full_name_ar || employee.full_name_en || '')
    : (employee.full_name_en || employee.full_name_ar || '');

  const primaryRole = (employee.roles as any[])?.[0]?.role || 'employee';
  const roleBadge   = ROLE_LABELS[primaryRole] || ROLE_LABELS.employee;

  const companyName = employee.company
    ? (isAr ? employee.company.name_ar : (employee.company.name_en || employee.company.name_ar))
    : null;

  const filteredDepts = selectedCompany
    ? (scopeData?.departments || []).filter((d: any) => d.company_id === selectedCompany)
    : (scopeData?.departments || []);

  const SELECT_CLS =
    'border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in" suppressHydrationWarning>

      {/* ── SECTION 0: Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAr ? `مرحباً، ${displayName}` : `Welcome, ${displayName}`} 👋
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${roleBadge.color}`}>
              {isAr ? roleBadge.ar : roleBadge.en}
            </span>
            {companyName && (
              <span className="text-sm text-slate-500">{companyName}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 0.5: Filter Dropdowns (company / holding only) ── */}
      {(level === 'holding' || level === 'company') && scopeData && (
        <div className="flex flex-wrap items-center gap-3">

          {/* Company dropdown — holding only */}
          {level === 'holding' && scopeData.companies.length > 0 && (
            <select
              value={selectedCompany}
              onChange={e => { setSelectedCompany(e.target.value); setSelectedDept(''); }}
              className={SELECT_CLS}
            >
              <option value="">{isAr ? 'الكل — الشركات' : 'All Companies'}</option>
              {scopeData.companies.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {isAr ? c.name_ar : (c.name_en || c.name_ar)}
                </option>
              ))}
            </select>
          )}

          {/* Department dropdown — company level always, holding only after company selected */}
          {(level === 'company' || (level === 'holding' && selectedCompany)) && (
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className={SELECT_CLS}
            >
              <option value="">{isAr ? 'الكل — الأقسام' : 'All Departments'}</option>
              {filteredDepts.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {isAr ? d.name_ar : (d.name_en || d.name_ar)}
                </option>
              ))}
            </select>
          )}

          {/* Clear */}
          {(selectedCompany || selectedDept) && (
            <button
              onClick={() => { setSelectedCompany(''); setSelectedDept(''); }}
              className="text-sm text-slate-400 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ✕ {isAr ? 'مسح الفلتر' : 'Clear'}
            </button>
          )}
        </div>
      )}

      {/* ── SECTION 1: Personal KPIs ── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {isAr ? 'إحصائياتي الشخصية' : 'My Personal KPIs'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {([
            {
              label: { ar: 'طلباتي المفتوحة', en: 'My Open Requests' },
              value: personalKPIs.myOpen,
              icon: '📋',
              border: 'border-l-blue-500',
              text:   'text-blue-700',
              href:  '/dashboard/requests?tab=submitted',
            },
            {
              label: { ar: 'صندوق الوارد', en: 'My Inbox' },
              value: personalKPIs.myInbox,
              icon: '📥',
              border: 'border-l-red-500',
              text:   'text-red-700',
              href:  '/dashboard/inbox',
            },
            {
              label: { ar: 'مكتملة', en: 'Completed' },
              value: personalKPIs.myCompleted,
              icon: '✅',
              border: 'border-l-emerald-500',
              text:   'text-emerald-700',
              href:  '/dashboard/requests?tab=all&status=completed',
            },
            {
              label: { ar: 'مرفوضة', en: 'Rejected' },
              value: personalKPIs.myRejected,
              icon: '❌',
              border: 'border-l-red-400',
              text:   'text-red-600',
              href:  '/dashboard/requests?tab=all&status=rejected',
            },
          ] as const).map((card, i) => (
            <div
              key={i}
              onClick={() => router.push(card.href)}
              className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 border-l-4 ${card.border} cursor-pointer hover:shadow-md hover:border-blue-200 transition-all`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{card.icon}</span>
                <p className="text-xs text-slate-500 font-medium leading-tight">
                  {isAr ? card.label.ar : card.label.en}
                </p>
              </div>
              <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTIONS 2-4: Scope KPIs (only for non-employee levels) ── */}
      {filteredData && scopeKPIs && (
        <div className="space-y-6">

          {/* ── SECTION 2: Volume KPIs ── */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              📊 {isAr ? 'أداء النطاق' : 'Scope Performance'}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ScopeKPI icon="📤" titleAr="طلبات صادرة"    titleEn="Created Here"          value={scopeKPIs.createdHere}          borderColor="border-l-blue-500"    isAr={isAr} onClick={() => router.push('/dashboard/requests')} />
              <ScopeKPI icon="✅" titleAr="واردة مكتملة"   titleEn="Completed Here"         value={scopeKPIs.completedHere}        borderColor="border-l-emerald-500"  isAr={isAr} onClick={() => router.push('/dashboard/requests?status=completed')} />
              <ScopeKPI icon="⏳" titleAr="قيد المعالجة"   titleEn="In Progress"            value={scopeKPIs.inProgress}           borderColor="border-l-amber-500"   isAr={isAr} onClick={() => router.push('/dashboard/requests?status=in_progress')} />
              <ScopeKPI icon="❓" titleAr="بانتظار توضيح"  titleEn="Pending Clarification"  value={scopeKPIs.pendingClarification} borderColor="border-l-orange-500"  isAr={isAr} onClick={() => router.push('/dashboard/requests?status=pending_clarification')} />
            </div>
          </div>

          {/* ── SECTION 3: Actions KPIs ── */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              🔄 {isAr ? 'إجراءات النطاق' : 'Scope Actions'}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ScopeKPI icon="↗️" titleAr="تم تحويلها"    titleEn="Forwarded"          value={scopeKPIs.forwarded}       borderColor="border-l-blue-400"   isAr={isAr} onClick={() => router.push('/dashboard/requests?tab=forwarded')} />
              <ScopeKPI icon="👤" titleAr="تم تعيينها"    titleEn="Assigned"           value={scopeKPIs.assigned}        borderColor="border-l-indigo-500" isAr={isAr} onClick={() => router.push('/dashboard/requests?tab=assigned')} />
              <ScopeKPI icon="↩️" titleAr="تم إرجاعها"   titleEn="Returned"           value={scopeKPIs.returned}        borderColor="border-l-amber-400"  isAr={isAr} onClick={() => router.push('/dashboard/requests?tab=returned')} />
              <ScopeKPI icon="💬" titleAr="طلبات توضيح"   titleEn="Clarification Sent" value={scopeKPIs.askedRequester}  borderColor="border-l-orange-400" isAr={isAr} onClick={() => router.push('/dashboard/requests')} />
            </div>
          </div>

          {/* ── SECTION 4: Outcomes KPIs ── */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              🏁 {isAr ? 'نتائج النطاق' : 'Scope Outcomes'}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ScopeKPI icon="✅" titleAr="أنجزها النطاق"   titleEn="Completed by Scope" value={scopeKPIs.completedByScope} borderColor="border-l-emerald-500" isAr={isAr} onClick={() => router.push('/dashboard/requests?status=completed')} />
              <ScopeKPI icon="❌" titleAr="رفضها النطاق"    titleEn="Rejected by Scope"  value={scopeKPIs.rejectedByScope}  borderColor="border-l-red-500"    isAr={isAr} onClick={() => router.push('/dashboard/requests?status=rejected')} />
              <ScopeKPI icon="⏱️" titleAr="متوسط المدة"    titleEn="Avg Cycle Time"     value={scopeKPIs.avgCycleTime}     borderColor="border-l-cyan-500"   isAr={isAr} onClick={() => router.push('/dashboard/requests')} />
              <ScopeKPI
                icon="📈"
                titleAr="معدل الإنجاز"
                titleEn="Completion Rate"
                value={filteredData.requests.length === 0 ? '—' : scopeKPIs.completionRate + '%'}
                borderColor={
                  scopeKPIs.completionRate > 80 ? 'border-l-emerald-500'
                  : scopeKPIs.completionRate >= 50 ? 'border-l-amber-500'
                  : 'border-l-red-500'
                }
                isAr={isAr}
                onClick={() => router.push('/dashboard/requests')}
              />
            </div>
          </div>

          {/* ── SECTION 5: Employee Performance Table ── */}
          {showEmployeeTable && employeePerformance.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                👥 {isAr ? 'أداء الموظفين' : 'Employee Performance'}
              </h2>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-3 text-start font-medium text-slate-600">{isAr ? 'الموظف' : 'Employee'}</th>
                        <th className="px-3 py-3 text-center font-medium text-slate-600">{isAr ? 'مسند' : 'Hold'}</th>
                        <th className="px-3 py-3 text-center font-medium text-slate-600">{isAr ? 'قدّم' : 'Sub'}</th>
                        <th className="px-3 py-3 text-center font-medium text-slate-600">{isAr ? 'حوّل' : 'Fwd'}</th>
                        <th className="px-3 py-3 text-center font-medium text-slate-600">{isAr ? 'عيّن' : 'Asgn'}</th>
                        <th className="px-3 py-3 text-center font-medium text-slate-600">{isAr ? 'أنجز' : 'Comp'}</th>
                        <th className="px-3 py-3 text-center font-medium text-slate-600">{isAr ? 'رفض' : 'Rej'}</th>
                        <th className="px-3 py-3 text-center font-medium text-slate-600">{isAr ? 'أرجع' : 'Ret'}</th>
                        <th className="px-3 py-3 text-center font-medium text-slate-600">{isAr ? 'توضيح' : 'Clar'}</th>
                        <th className="px-3 py-3 text-center font-medium text-slate-600">{isAr ? 'استجابة' : 'Resp'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {employeePerformance.map((emp: any) => {
                        const allZero = emp.holding + emp.submitted + emp.forwarded + emp.assigned + emp.completed + emp.rejected + emp.returned + emp.asked === 0;
                        return (
                          <tr key={emp.id} className={`${emp.isDeptHead ? 'bg-blue-50' : 'hover:bg-slate-50'} ${allZero ? 'opacity-40' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span>{emp.isDeptHead ? '📋' : '👤'}</span>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {emp.name}{' '}
                                    {emp.isDeptHead && (
                                      <span className="text-xs text-blue-600 font-normal">
                                        {isAr ? '(رئيس القسم)' : '(Head)'}
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-slate-400">{emp.code} · {emp.title}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center font-semibold">
                              {emp.holding > 0 ? <span className="text-amber-600">{emp.holding}</span> : <span className="text-slate-300">0</span>}
                            </td>
                            <td className="px-3 py-3 text-center">{emp.submitted  || <span className="text-slate-300">0</span>}</td>
                            <td className="px-3 py-3 text-center">{emp.forwarded  || <span className="text-slate-300">0</span>}</td>
                            <td className="px-3 py-3 text-center">
                              {emp.isDeptHead
                                ? (emp.assigned || <span className="text-slate-300">0</span>)
                                : <span className="text-slate-200">—</span>}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {emp.completed > 0 ? <span className="text-emerald-600 font-medium">{emp.completed}</span> : <span className="text-slate-300">0</span>}
                            </td>
                            <td className="px-3 py-3 text-center">
                              {emp.rejected > 0 ? <span className="text-red-600">{emp.rejected}</span> : <span className="text-slate-300">0</span>}
                            </td>
                            <td className="px-3 py-3 text-center">{emp.returned || <span className="text-slate-300">0</span>}</td>
                            <td className="px-3 py-3 text-center">{emp.asked    || <span className="text-slate-300">0</span>}</td>
                            <td className="px-3 py-3 text-center text-xs font-mono">{emp.avgResponse}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION 6: Charts ── */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              📊 {isAr ? 'الرسوم البيانية' : 'Charts'}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Chart 1: Actions Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">{isAr ? 'توزيع الإجراءات' : 'Actions Breakdown'}</h3>
                {actionsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={actionsChartData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {actionsChartData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-slate-300 text-sm">
                    {isAr ? 'لا توجد بيانات' : 'No data'}
                  </div>
                )}
              </div>

              {/* Chart 2: Monthly Trend */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">{isAr ? 'الاتجاه الشهري' : 'Monthly Trend'}</h3>
                {monthlyTrendData.some(m => m.created > 0 || m.completed > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={monthlyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="created"   name={isAr ? 'صادرة'   : 'Created'}   stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="completed" name={isAr ? 'مكتملة'  : 'Completed'} stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-slate-300 text-sm">
                    {isAr ? 'لا توجد بيانات' : 'No data'}
                  </div>
                )}
              </div>

              {/* Chart 3: Employee Workload OR Department Comparison */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">
                  {isEmployeeWorkload
                    ? (isAr ? 'حمل العمل' : 'Employee Workload')
                    : (isAr ? 'مقارنة الأقسام' : 'Department Comparison')}
                </h3>
                {workloadChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    {isEmployeeWorkload ? (
                      <BarChart data={workloadChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="inProgress" name={isAr ? 'قيد المعالجة' : 'In Progress'} stackId="a" fill="#3B82F6" />
                        <Bar dataKey="completed"  name={isAr ? 'مكتمل'        : 'Completed'}   stackId="a" fill="#10B981" />
                        <Bar dataKey="forwarded"  name={isAr ? 'محوّل'        : 'Forwarded'}   stackId="a" fill="#94A3B8" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    ) : (
                      <BarChart data={workloadChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" name={isAr ? 'طلبات' : 'Requests'} fill="#6366F1" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-slate-300 text-sm">
                    {isAr ? 'لا توجد بيانات' : 'No data'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION 7: Activity Feed ── */}
          {scopeData && scopeData.recentActivity && scopeData.recentActivity.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                📋 {isAr ? 'النشاط الأخير' : 'Recent Activity'}
              </h2>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
                {scopeData.recentActivity.map((act: any) => {
                  const actor = actActorMap.get(act.actor_id);
                  const req   = actRequestMap.get(act.request_id);
                  const label = ACTION_LABELS[act.action] || { ar: act.action, en: act.action };
                  return (
                    <div key={act.id} className="px-5 py-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                      <span className="text-lg mt-0.5">{actionIcon(act.action)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-900">
                          <span className="font-medium">{actor?.full_name_ar || '—'}</span>
                          {' '}
                          <span className="text-slate-500">{isAr ? label.ar : label.en}</span>
                          {' '}
                          {req && (
                            <a href={`/dashboard/requests/${act.request_id}`} className="font-mono text-xs text-blue-600 hover:underline">
                              {req.request_number}
                            </a>
                          )}
                        </p>
                        {req && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{req.subject}</p>
                        )}
                        {act.note && (
                          <p className="text-xs text-slate-500 mt-1 bg-slate-50 rounded-lg px-3 py-1.5 truncate max-w-md">
                            &ldquo;{act.note.length > 80 ? act.note.slice(0, 80) + '…' : act.note}&rdquo;
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap mt-1">
                        {relativeTime(act.created_at, isAr)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
