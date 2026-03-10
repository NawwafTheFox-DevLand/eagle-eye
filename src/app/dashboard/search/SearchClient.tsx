'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';
import { searchRequests } from '@/app/actions/search';

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

interface Props {
  companies: { id: string; name_ar: string; name_en: string }[];
  departments: { id: string; name_ar: string; name_en: string }[];
}

export default function SearchClient({ companies, departments }: Props) {
  const { lang } = useLanguage();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [requestType, setRequestType] = useState('');
  const [priority, setPriority] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [deptId, setDeptId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const data = await searchRequests({
        q: query || undefined,
        status: status || undefined,
        request_type: requestType || undefined,
        priority: priority || undefined,
        company_id: companyId || undefined,
        dept_id: deptId || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setResults(data);
      setHasSearched(true);
    });
  }

  const t = {
    ar: {
      title: 'بحث في الطلبات',
      placeholder: 'رقم الطلب، الموضوع، أو التفاصيل...',
      statusLabel: 'الحالة', typeLabel: 'النوع', priorityLabel: 'الأولوية',
      companyLabel: 'الشركة', deptLabel: 'القسم',
      fromLabel: 'من تاريخ', toLabel: 'إلى تاريخ',
      searchBtn: 'بحث',
      allStatuses: 'جميع الحالات', allTypes: 'جميع الأنواع',
      allPriorities: 'جميع الأولويات', allCompanies: 'جميع الشركات', allDepts: 'جميع الأقسام',
      noResults: 'لا توجد نتائج', initialState: 'اكتب للبحث في الطلبات', searching: 'جاري البحث...',
    },
    en: {
      title: 'Search Requests',
      placeholder: 'Request number, subject, or description...',
      statusLabel: 'Status', typeLabel: 'Type', priorityLabel: 'Priority',
      companyLabel: 'Company', deptLabel: 'Department',
      fromLabel: 'From Date', toLabel: 'To Date',
      searchBtn: 'Search',
      allStatuses: 'All Statuses', allTypes: 'All Types',
      allPriorities: 'All Priorities', allCompanies: 'All Companies', allDepts: 'All Departments',
      noResults: 'No results', initialState: 'Enter search terms above', searching: 'Searching...',
    },
  }[lang];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t.placeholder}
            className="input-field w-full"
          />
        </div>

        {/* Row 1: Status, Type, Priority */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.statusLabel}</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="input-field text-sm">
              <option value="">{t.allStatuses}</option>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>{v[lang]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.typeLabel}</label>
            <select value={requestType} onChange={e => setRequestType(e.target.value)} className="input-field text-sm">
              <option value="">{t.allTypes}</option>
              {Object.entries(typeLabels).map(([k, v]) => (
                <option key={k} value={k}>{v[lang]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.priorityLabel}</label>
            <select value={priority} onChange={e => setPriority(e.target.value)} className="input-field text-sm">
              <option value="">{t.allPriorities}</option>
              {Object.entries(priorityLabels).map(([k, v]) => (
                <option key={k} value={k}>{v[lang]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Company, Department, From Date, To Date */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.companyLabel}</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="input-field text-sm">
              <option value="">{t.allCompanies}</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{lang === 'ar' ? c.name_ar : (c.name_en || c.name_ar)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.deptLabel}</label>
            <select value={deptId} onChange={e => setDeptId(e.target.value)} className="input-field text-sm">
              <option value="">{t.allDepts}</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{lang === 'ar' ? d.name_ar : (d.name_en || d.name_ar)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.fromLabel}</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field text-sm" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.toLabel}</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field text-sm" dir="ltr" />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">
            {isPending ? t.searching : `🔍 ${t.searchBtn}`}
          </button>
        </div>
      </form>

      {/* Results */}
      {!hasSearched && !isPending ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <span className="text-4xl block mb-3">🔍</span>
          <p className="text-sm font-medium">{t.initialState}</p>
        </div>
      ) : isPending ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <p className="text-sm">{t.searching}</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <span className="text-4xl block mb-3">📭</span>
          <p className="text-sm font-medium">{t.noResults}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-50">
            {results.map((req: any) => {
              const statusLabel   = statusLabels[req.status]?.[lang]    ?? req.status;
              const typeLabel     = typeLabels[req.request_type]?.[lang] ?? req.request_type;
              const priorityLabel = priorityLabels[req.priority]?.[lang] ?? req.priority;
              const requesterName = lang === 'ar'
                ? req.requester?.full_name_ar
                : (req.requester?.full_name_en || req.requester?.full_name_ar);
              return (
                <Link key={req.id} href={`/dashboard/requests/${req.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400" dir="ltr">{req.request_number}</span>
                      <span className={`status-badge ${getStatusColor(req.status)}`}>{statusLabel}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getPriorityColor(req.priority)}`}>
                        {priorityLabel}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 truncate">{req.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {typeLabel}{requesterName ? ` • ${requesterName}` : ''}
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">{formatDate(req.created_at, lang)}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
