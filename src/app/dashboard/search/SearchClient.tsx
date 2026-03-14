'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import NovusLogo from '@/components/brand/NovusLogo';

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  draft:                 { ar: 'مسودة',             en: 'Draft'                 },
  in_progress:           { ar: 'قيد المعالجة',      en: 'In Progress'           },
  pending_clarification: { ar: 'بانتظار توضيح',     en: 'Pending Clarification' },
  completed:             { ar: 'مكتمل',             en: 'Completed'             },
  rejected:              { ar: 'مرفوض',             en: 'Rejected'              },
  cancelled:             { ar: 'ملغي',              en: 'Cancelled'             },
};

const STATUS_COLORS: Record<string, string> = {
  draft:                 'bg-slate-100 text-slate-600',
  in_progress:           'bg-blue-100 text-blue-700',
  pending_clarification: 'bg-amber-100 text-amber-700',
  completed:             'bg-emerald-100 text-emerald-700',
  rejected:              'bg-red-100 text-red-700',
  cancelled:             'bg-slate-100 text-slate-500',
};

const PRIORITY_LABELS: Record<string, { ar: string; en: string }> = {
  low:    { ar: 'منخفض', en: 'Low'    },
  normal: { ar: 'عادي',  en: 'Normal' },
  high:   { ar: 'مهم',   en: 'High'   },
  urgent: { ar: 'عاجل',  en: 'Urgent' },
};

const PRIORITY_COLORS: Record<string, string> = {
  low:    'bg-slate-100 text-slate-600',
  normal: 'bg-blue-50 text-blue-600',
  high:   'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  general_internal:      { ar: 'طلب داخلي عام',    en: 'General Internal'  },
  cross_department:      { ar: 'طلب بين الأقسام',   en: 'Cross-Department'  },
  intercompany:          { ar: 'طلب بين الشركات',   en: 'Intercompany'      },
  fund_disbursement:     { ar: 'طلب صرف مالي',      en: 'Fund Disbursement' },
  leave_approval:        { ar: 'طلب إجازة',         en: 'Leave Approval'    },
  promotion:             { ar: 'طلب ترقية',         en: 'Promotion'         },
  demotion_disciplinary: { ar: 'طلب تأديبي',        en: 'Disciplinary'      },
  create_department:     { ar: 'إنشاء قسم',         en: 'Create Department' },
  create_company:        { ar: 'إنشاء شركة',        en: 'Create Company'    },
  create_position:       { ar: 'إنشاء وظيفة',       en: 'Create Position'   },
};

interface Props {
  requests: any[];
  empMap: Record<string, any>;
  companies: any[];
  roleLevel: string;
}

export default function SearchClient({ requests, empMap, companies, roleLevel }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const showCompanyFilter = ['super_admin', 'holding_ceo', 'company_ceo'].includes(roleLevel);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return requests.filter(r => {
      if (q && !r.request_number?.toLowerCase().includes(q) && !r.subject?.toLowerCase().includes(q) && !r.description?.toLowerCase().includes(q)) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (typeFilter && r.request_type !== typeFilter) return false;
      if (priorityFilter && r.priority !== priorityFilter) return false;
      if (companyFilter && r.origin_company_id !== companyFilter) return false;
      if (fromDate && r.created_at < fromDate) return false;
      if (toDate && r.created_at > toDate + 'T23:59:59') return false;
      return true;
    });
  }, [requests, query, statusFilter, typeFilter, priorityFilter, companyFilter, fromDate, toDate]);

  const hasFilters = query || statusFilter || typeFilter || priorityFilter || companyFilter || fromDate || toDate;

  function clearAll() {
    setQuery(''); setStatusFilter(''); setTypeFilter(''); setPriorityFilter('');
    setCompanyFilter(''); setFromDate(''); setToDate('');
  }

  const getName = (id: string | null) => {
    if (!id) return '—';
    const e = empMap[id];
    return e ? (isAr ? e.full_name_ar : e.full_name_en || e.full_name_ar) : '—';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'البحث' : 'Search'}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAr ? `${results.length} نتيجة` : `${results.length} result${results.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder={isAr ? 'ابحث في رقم الطلب، الموضوع، الوصف...' : 'Search request #, subject, description...'}
          className="input-field ps-9 pe-9 w-full text-sm"
          autoFocus
        />
        {query && (
          <button onClick={() => setQuery('')}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm">
            ✕
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{isAr ? v.ar : v.en}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">{isAr ? 'كل الأنواع' : 'All Types'}</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{isAr ? v.ar : v.en}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">{isAr ? 'كل الأولويات' : 'All Priorities'}</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{isAr ? v.ar : v.en}</option>)}
        </select>
        {showCompanyFilter && companies.length > 0 && (
          <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="input-field w-auto text-sm">
            <option value="">{isAr ? 'كل الشركات' : 'All Companies'}</option>
            {companies.map(c => <option key={c.id} value={c.id}>{isAr ? c.name_ar : c.name_en || c.name_ar}</option>)}
          </select>
        )}
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="input-field w-auto text-sm" title={isAr ? 'من تاريخ' : 'From'} />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="input-field w-auto text-sm" title={isAr ? 'إلى تاريخ' : 'To'} />
        {hasFilters && (
          <button onClick={clearAll} className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2">
            {isAr ? 'مسح الكل' : 'Clear all'}
          </button>
        )}
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="flex justify-center mb-4">
            <NovusLogo variant="empty" size={56} showText={false} />
          </div>
          <p className="text-slate-500 text-sm">{isAr ? 'لا توجد نتائج' : 'No results found'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1.5fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>{isAr ? 'الموضوع' : 'Subject'}</span>
            <span>{isAr ? 'النوع' : 'Type'}</span>
            <span>{isAr ? 'الأولوية' : 'Priority'}</span>
            <span>{isAr ? 'الحالة' : 'Status'}</span>
            <span>{isAr ? 'مقدم الطلب' : 'Requester'}</span>
            <span>{isAr ? 'المسؤول' : 'Assigned'}</span>
            <span>{isAr ? 'التاريخ' : 'Date'}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {results.map(req => {
              const typeLabel = TYPE_LABELS[req.request_type];
              const statusLabel = STATUS_LABELS[req.status];
              const priorityLabel = PRIORITY_LABELS[req.priority];
              return (
                <Link key={req.id} href={`/dashboard/requests/${req.id}`}
                  className="grid md:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1.5fr_auto] gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors items-center group">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 truncate">{req.subject}</p>
                    <p className="text-xs font-mono text-slate-400">{req.request_number}</p>
                  </div>
                  <span className="text-xs text-slate-500 truncate">
                    {typeLabel ? (isAr ? typeLabel.ar : typeLabel.en) : req.request_type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${PRIORITY_COLORS[req.priority] || ''}`}>
                    {priorityLabel ? (isAr ? priorityLabel.ar : priorityLabel.en) : req.priority}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${STATUS_COLORS[req.status] || ''}`}>
                    {statusLabel ? (isAr ? statusLabel.ar : statusLabel.en) : req.status}
                  </span>
                  <span className="text-xs text-slate-600 truncate">{getName(req.requester_id)}</span>
                  <span className="text-xs text-slate-600 truncate">{getName(req.assigned_to)}</span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(req.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
