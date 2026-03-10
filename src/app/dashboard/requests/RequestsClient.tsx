'use client';

import { useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';

const statusLabels: Record<string, { ar: string; en: string }> = {
  draft:                 { ar: 'مسودة',              en: 'Draft' },
  submitted:             { ar: 'مقدم',               en: 'Submitted' },
  under_review:          { ar: 'قيد المراجعة',        en: 'Under Review' },
  pending_clarification: { ar: 'بانتظار توضيح',       en: 'Pending Clarification' },
  returned:              { ar: 'مُعاد',               en: 'Returned' },
  resubmitted:           { ar: 'مُعاد تقديمه',         en: 'Resubmitted' },
  approved:              { ar: 'موافق عليه',           en: 'Approved' },
  rejected:              { ar: 'مرفوض',               en: 'Rejected' },
  completed:             { ar: 'مكتمل',               en: 'Completed' },
  cancelled:             { ar: 'ملغي',                en: 'Cancelled' },
  archived:              { ar: 'مؤرشف',               en: 'Archived' },
  pending_execution:     { ar: 'بانتظار التنفيذ',      en: 'Pending Execution' },
  in_progress:           { ar: 'قيد التنفيذ',          en: 'In Progress' },
  assigned_to_employee:  { ar: 'مُسند لموظف',          en: 'Assigned' },
  forwarded:             { ar: 'مُحوّل',                en: 'Forwarded' },
};

const typeLabels: Record<string, { ar: string; en: string }> = {
  general_internal:      { ar: 'طلب داخلي عام',       en: 'General Internal' },
  intercompany:          { ar: 'طلب بين الشركات',      en: 'Intercompany' },
  cross_department:      { ar: 'طلب بين الأقسام',      en: 'Cross-Department' },
  fund_disbursement:     { ar: 'صرف مالي',              en: 'Fund Disbursement' },
  leave_approval:        { ar: 'إجازة',                 en: 'Leave' },
  promotion:             { ar: 'ترقية',                 en: 'Promotion' },
  demotion_disciplinary: { ar: 'تأديبي',                en: 'Disciplinary' },
  create_department:     { ar: 'إنشاء قسم',             en: 'New Department' },
  create_company:        { ar: 'إنشاء شركة',            en: 'New Company' },
  create_position:       { ar: 'إنشاء وظيفة',           en: 'New Position' },
};

const priorityLabels: Record<string, { ar: string; en: string }> = {
  urgent: { ar: 'عاجل',   en: 'Urgent' },
  high:   { ar: 'عالي',   en: 'High' },
  normal: { ar: 'عادي',   en: 'Normal' },
  low:    { ar: 'منخفض',  en: 'Low' },
};

export interface RequestRow {
  id: string;
  request_number: string;
  subject: string;
  request_type: string;
  status: string;
  priority: string;
  created_at: string;
  company_id: string | null;
  dept_id: string | null;
  requester_name_ar: string | null;
  requester_name_en: string | null;
  company_name_ar: string | null;
  company_name_en: string | null;
}

interface Props {
  requests: RequestRow[];
  role: string;
  companies: { id: string; name_ar: string; name_en: string }[];
  departments: { id: string; name_ar: string; name_en: string; company_id: string }[];
}

export default function RequestsClient({ requests, role, companies, departments }: Props) {
  const { lang } = useLanguage();

  const isAdmin = role === 'super_admin' || role === 'ceo';
  const isCompanyAdmin = role === 'company_admin';

  const [filterStatus, setFilterStatus]   = useState('');
  const [filterType,   setFilterType]     = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterDept,   setFilterDept]     = useState('');

  const visibleDepts = filterCompany
    ? departments.filter(d => d.company_id === filterCompany)
    : departments;

  const filtered = requests.filter(r => {
    if (filterStatus  && r.status       !== filterStatus)  return false;
    if (filterType    && r.request_type !== filterType)    return false;
    if (filterCompany && r.company_id   !== filterCompany) return false;
    if (filterDept    && r.dept_id      !== filterDept)    return false;
    return true;
  });

  const t = {
    ar: {
      title: 'الطلبات',
      count: (n: number) => `${n} طلب`,
      newRequest: 'طلب جديد',
      empty: 'لا توجد طلبات',
      emptySub: 'ابدأ بإنشاء طلب جديد',
      allStatuses: 'جميع الحالات',
      allTypes: 'جميع الأنواع',
      allCompanies: 'جميع الشركات',
      allDepts: 'جميع الأقسام',
    },
    en: {
      title: 'Requests',
      count: (n: number) => `${n} request${n !== 1 ? 's' : ''}`,
      newRequest: 'New Request',
      empty: 'No requests yet',
      emptySub: 'Start by creating a new request',
      allStatuses: 'All Statuses',
      allTypes: 'All Types',
      allCompanies: 'All Companies',
      allDepts: 'All Departments',
    },
  }[lang];

  function exportToExcel() {
    const isAr = lang === 'ar';
    const rows = filtered.map(r => ({
      [isAr ? 'رقم الطلب'    : 'Request #']:   r.request_number,
      [isAr ? 'الموضوع'      : 'Subject']:      r.subject,
      [isAr ? 'النوع'        : 'Type']:         typeLabels[r.request_type]?.[lang] ?? r.request_type,
      [isAr ? 'الحالة'       : 'Status']:       statusLabels[r.status]?.[lang] ?? r.status,
      [isAr ? 'الأولوية'     : 'Priority']:     priorityLabels[r.priority]?.[lang] ?? r.priority,
      [isAr ? 'مقدم الطلب'   : 'Requester']:    isAr ? r.requester_name_ar : (r.requester_name_en || r.requester_name_ar),
      [isAr ? 'الشركة'       : 'Company']:      isAr ? r.company_name_ar  : (r.company_name_en  || r.company_name_ar),
      [isAr ? 'القسم'        : 'Department']:   r.dept_id ?? '—',
      [isAr ? 'تاريخ الإنشاء': 'Created']:      r.created_at,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isAr ? 'الطلبات' : 'Requests');
    XLSX.writeFile(wb, `eagle-eye-requests-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  const hasFilters = filterStatus || filterType || filterCompany || filterDept;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.count(filtered.length)}{hasFilters ? ` / ${requests.length}` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportToExcel} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
            {lang === 'ar' ? '⬇️ تصدير Excel' : '⬇️ Export Excel'}
          </button>
          <Link href="/dashboard/new-request" className="btn-primary text-sm flex items-center gap-2">
            <span>➕</span> {t.newRequest}
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      {(isAdmin || isCompanyAdmin || role === 'department_manager') && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Company filter (admin only) */}
            {isAdmin && companies.length > 0 && (
              <select value={filterCompany} onChange={e => { setFilterCompany(e.target.value); setFilterDept(''); }} className="input-field text-sm py-1.5 flex-1 min-w-[160px]">
                <option value="">{t.allCompanies}</option>
                {companies.map(c => <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : c.name_en || c.name_ar}</option>)}
              </select>
            )}

            {/* Department filter (admin + company_admin) */}
            {(isAdmin || isCompanyAdmin) && departments.length > 0 && (
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="input-field text-sm py-1.5 flex-1 min-w-[160px]">
                <option value="">{t.allDepts}</option>
                {visibleDepts.map(d => <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : d.name_en || d.name_ar}</option>)}
              </select>
            )}

            {/* Status filter (all elevated roles) */}
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field text-sm py-1.5 flex-1 min-w-[140px]">
              <option value="">{t.allStatuses}</option>
              {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
            </select>

            {/* Type filter (admin + company_admin) */}
            {(isAdmin || isCompanyAdmin) && (
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field text-sm py-1.5 flex-1 min-w-[140px]">
                <option value="">{t.allTypes}</option>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
              </select>
            )}

            {hasFilters && (
              <button onClick={() => { setFilterStatus(''); setFilterType(''); setFilterCompany(''); setFilterDept(''); }} className="text-xs text-slate-400 hover:text-slate-700 underline whitespace-nowrap">
                {lang === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="font-medium">{t.empty}</p>
            <p className="text-sm mt-1">{t.emptySub}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map(req => {
              const statusLabel   = statusLabels[req.status]?.[lang]    ?? req.status;
              const typeLabel     = typeLabels[req.request_type]?.[lang] ?? req.request_type;
              const priorityLabel = priorityLabels[req.priority]?.[lang] ?? req.priority;
              const requesterName = lang === 'ar' ? req.requester_name_ar : (req.requester_name_en || req.requester_name_ar);
              const companyName   = lang === 'ar' ? req.company_name_ar  : (req.company_name_en  || req.company_name_ar);
              return (
                <Link key={req.id} href={`/dashboard/requests/${req.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400" dir="ltr">{req.request_number}</span>
                      <span className={`status-badge ${getStatusColor(req.status)}`}>{statusLabel}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getPriorityColor(req.priority)}`}>{priorityLabel}</span>
                    </div>
                    <p className="font-medium text-slate-900 truncate">{req.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{typeLabel} • {requesterName} • {companyName}</p>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">{formatDate(req.created_at, lang)}</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
