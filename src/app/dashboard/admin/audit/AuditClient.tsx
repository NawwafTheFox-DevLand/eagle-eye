'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { exportToCSV } from '@/lib/utils/export';

const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  submitted:            { ar: 'تم التقديم',             en: 'Submitted'                },
  forwarded:            { ar: 'تم التحويل',              en: 'Forwarded'                },
  returned:             { ar: 'تم الإرجاع',              en: 'Returned'                 },
  asked_requester:      { ar: 'طُلب توضيح',             en: 'Clarification Requested'  },
  resubmitted:          { ar: 'أُعيد التقديم',           en: 'Resubmitted'              },
  assigned:             { ar: 'تم التعيين',              en: 'Assigned'                 },
  company_exit_stamped: { ar: 'موافقة خروج الشركة',     en: 'Company Exit Stamped'     },
  finance_stamped:      { ar: 'اعتماد مالي',            en: 'Finance Stamped'          },
  hr_stamped:           { ar: 'موافقة الموارد البشرية', en: 'HR Stamped'               },
  ceo_stamped:          { ar: 'موافقة الرئيس التنفيذي', en: 'CEO Stamped'              },
  completed:            { ar: 'تم الإنجاز',              en: 'Completed'                },
  rejected:             { ar: 'تم الرفض',               en: 'Rejected'                 },
  cancelled:            { ar: 'تم الإلغاء',              en: 'Cancelled'                },
};

function actionBadge(action: string) {
  if (['submitted', 'completed', 'company_exit_stamped', 'finance_stamped', 'hr_stamped', 'ceo_stamped'].includes(action))
    return 'bg-emerald-100 text-emerald-700';
  if (['forwarded', 'assigned'].includes(action))
    return 'bg-blue-100 text-blue-700';
  if (['returned', 'asked_requester', 'resubmitted'].includes(action))
    return 'bg-amber-100 text-amber-700';
  if (['rejected', 'cancelled'].includes(action))
    return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS);

export default function AuditClient({
  actions, actorMap, reqMap,
}: {
  actions: any[];
  actorMap: Record<string, any>;
  reqMap: Record<string, string>;
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const getName = (id: string | null) => {
    if (!id) return '—';
    const e = actorMap[id];
    return e ? (isAr ? e.full_name_ar : e.full_name_en || e.full_name_ar) : '—';
  };

  const filtered = actions.filter(a => {
    if (actionFilter && a.action !== actionFilter) return false;
    if (fromDate && a.created_at < fromDate) return false;
    if (toDate && a.created_at > toDate + 'T23:59:59') return false;
    return true;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  function handleExport() {
    exportToCSV(filtered.map(a => ({
      [isAr ? 'التاريخ' : 'Date']: formatDate(a.created_at),
      [isAr ? 'الإجراء' : 'Action']: a.action,
      [isAr ? 'المنفذ' : 'Actor']: getName(a.actor_id),
      [isAr ? 'الملاحظة' : 'Note']: a.note || '',
    })), 'audit-log');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'سجل التدقيق' : 'Audit Log'}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAr ? `${filtered.length} من ${actions.length} إجراء` : `${filtered.length} of ${actions.length} actions`}
          </p>
        </div>
        <button onClick={handleExport} className="text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
          {isAr ? '⬇ تصدير' : '⬇ Export'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">{isAr ? 'كل الإجراءات' : 'All Actions'}</option>
          {ALL_ACTIONS.map(a => {
            const label = ACTION_LABELS[a];
            return <option key={a} value={a}>{label ? (isAr ? label.ar : label.en) : a}</option>;
          })}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="input-field w-auto text-sm" title={isAr ? 'من تاريخ' : 'From date'} />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="input-field w-auto text-sm" title={isAr ? 'إلى تاريخ' : 'To date'} />
        {(actionFilter || fromDate || toDate) && (
          <button onClick={() => { setActionFilter(''); setFromDate(''); setToDate(''); }}
            className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2">
            {isAr ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1.5fr_2fr] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <span>{isAr ? 'التاريخ' : 'Date'}</span>
          <span>{isAr ? 'رقم الطلب' : 'Request #'}</span>
          <span>{isAr ? 'الإجراء' : 'Action'}</span>
          <span>{isAr ? 'المنفذ' : 'Actor'}</span>
          <span>{isAr ? 'من ← إلى' : 'From → To'}</span>
          <span>{isAr ? 'الملاحظة' : 'Note'}</span>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.map(a => {
            const reqNum = a.request_id ? reqMap[a.request_id] : null;
            const label = ACTION_LABELS[a.action];
            return (
              <div key={a.id} className="grid md:grid-cols-[1.5fr_1fr_1.5fr_1.5fr_1.5fr_2fr] gap-3 px-5 py-3 items-center">
                <span className="text-xs text-slate-500">{formatDate(a.created_at)}</span>
                <span className="text-xs font-mono text-indigo-600">
                  {reqNum ? (
                    <Link href={`/dashboard/requests/${a.request_id}`} className="hover:underline">{reqNum}</Link>
                  ) : '—'}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${actionBadge(a.action)}`}>
                  {label ? (isAr ? label.ar : label.en) : a.action}
                </span>
                <span className="text-xs text-slate-700">{getName(a.actor_id)}</span>
                <span className="text-xs text-slate-500">
                  {a.from_status && a.to_status ? `${a.from_status} → ${a.to_status}` : '—'}
                </span>
                <span className="text-xs text-slate-500 truncate">{a.note || '—'}</span>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-4xl mb-3">📜</p>
              <p className="text-slate-500 text-sm">{isAr ? 'لا توجد نتائج' : 'No results'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
