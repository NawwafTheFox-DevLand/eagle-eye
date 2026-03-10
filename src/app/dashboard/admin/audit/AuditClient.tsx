'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const actionColors: Record<string, string> = {
  submitted:            'bg-blue-50 text-blue-700',
  approved:             'bg-emerald-50 text-emerald-700',
  rejected:             'bg-red-50 text-red-700',
  sent_back:            'bg-amber-50 text-amber-700',
  completed:            'bg-teal-50 text-teal-700',
  cancelled:            'bg-slate-100 text-slate-600',
  resubmitted:          'bg-indigo-50 text-indigo-700',
  delegated:            'bg-purple-50 text-purple-700',
  delegated_to_employee:'bg-purple-50 text-purple-700',
};

const actionLabels: Record<string, { ar: string; en: string }> = {
  submitted:             { ar: 'تم التقديم',         en: 'Submitted' },
  approved:              { ar: 'موافق عليه',          en: 'Approved' },
  rejected:              { ar: 'مرفوض',              en: 'Rejected' },
  sent_back:             { ar: 'أُعيد للمراجعة',      en: 'Sent Back' },
  completed:             { ar: 'مكتمل',              en: 'Completed' },
  cancelled:             { ar: 'ملغي',               en: 'Cancelled' },
  resubmitted:           { ar: 'أُعيد تقديمه',        en: 'Resubmitted' },
  delegated:             { ar: 'تم التفويض',          en: 'Delegated' },
  delegated_to_employee: { ar: 'عُيِّن لموظف',        en: 'Assigned to Employee' },
};

const filterableActions = ['submitted', 'approved', 'rejected', 'sent_back', 'completed', 'cancelled', 'resubmitted', 'delegated'];

export default function AuditClient({ actions, actors, requests }: any) {
  const { lang } = useLanguage();
  const [filterAction, setFilterAction] = useState('');

  const actorMap = new Map(actors.map((a: any) => [a.id, a]));
  const requestMap = new Map(requests.map((r: any) => [r.id, r]));

  const filtered = filterAction ? actions.filter((a: any) => a.action === filterAction) : actions;

  function formatDateTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === 'ar' ? 'سجل التدقيق' : 'Audit Log'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {filtered.length}{lang === 'ar' ? ' إجراء' : ' actions'}
            {filterAction ? ` / ${actions.length}` : ''}
          </p>
        </div>
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="input-field w-52"
        >
          <option value="">{lang === 'ar' ? 'جميع الإجراءات' : 'All Actions'}</option>
          {filterableActions.map(a => (
            <option key={a} value={a}>{actionLabels[a]?.[lang] ?? a}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-start font-medium text-slate-600">
                  {lang === 'ar' ? 'التاريخ' : 'Date'}
                </th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">
                  {lang === 'ar' ? 'رقم الطلب' : 'Request #'}
                </th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">
                  {lang === 'ar' ? 'الإجراء' : 'Action'}
                </th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">
                  {lang === 'ar' ? 'المنفِّذ' : 'Actor'}
                </th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">
                  {lang === 'ar' ? 'من ← إلى' : 'From → To'}
                </th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">
                  {lang === 'ar' ? 'ملاحظات' : 'Notes'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    {lang === 'ar' ? 'لا توجد سجلات' : 'No records found'}
                  </td>
                </tr>
              ) : filtered.map((a: any) => {
                const actor = actorMap.get(a.actor_id) as any;
                const req = requestMap.get(a.request_id) as any;
                const actorName = actor
                  ? (lang === 'ar' ? actor.full_name_ar : (actor.full_name_en || actor.full_name_ar))
                  : '—';
                const actionColor = actionColors[a.action] ?? 'bg-slate-100 text-slate-600';
                const actionLabel = actionLabels[a.action]?.[lang] ?? a.action;
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(a.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-700">
                        {req?.request_number ?? '—'}
                      </span>
                      {req?.subject && (
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">{req.subject}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColor}`}>
                        {actionLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{actorName}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {a.from_status && a.to_status
                        ? `${a.from_status} → ${a.to_status}`
                        : a.to_status ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">
                      {a.note || a.rationale
                        ? <span className="line-clamp-2">{a.note || a.rationale}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
