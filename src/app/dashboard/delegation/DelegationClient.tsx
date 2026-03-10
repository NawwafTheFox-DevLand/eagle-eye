'use client';

import { useState, useTransition } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createDelegation, revokeDelegation } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

const t = {
  ar: {
    title: 'التفويض', subtitle: 'إدارة تفويضات الموافقة أثناء الغياب',
    newDelegation: '➕ تفويض جديد', cancel: 'إلغاء',
    delegator: 'المفوِّض (الغائب)', delegate: 'المفوَّض إليه (النائب)',
    company: 'الشركة', startDate: 'من تاريخ', endDate: 'إلى تاريخ',
    reason: 'سبب التفويض', reasonPh: 'إجازة سنوية، سفر عمل...',
    create: 'إنشاء التفويض', creating: 'جاري الإنشاء...',
    active: 'نشط', revoked: 'ملغي', revoke: 'إلغاء التفويض',
    noDelegations: 'لا توجد تفويضات', from: 'من', to: 'إلى',
    selectEmployee: 'اختر الموظف', selectCompany: 'اختر الشركة',
  },
  en: {
    title: 'Delegation', subtitle: 'Manage approval delegation during absence',
    newDelegation: '➕ New Delegation', cancel: 'Cancel',
    delegator: 'Delegator (absent)', delegate: 'Delegate (acting)',
    company: 'Company', startDate: 'Start Date', endDate: 'End Date',
    reason: 'Reason', reasonPh: 'Annual leave, business trip...',
    create: 'Create Delegation', creating: 'Creating...',
    active: 'Active', revoked: 'Revoked', revoke: 'Revoke',
    noDelegations: 'No delegations found', from: 'From', to: 'To',
    selectEmployee: 'Select employee', selectCompany: 'Select company',
  },
};

export default function DelegationClient({ delegations, employees, companies, isAdmin, currentEmployeeId }: any) {
  const { lang } = useLanguage();
  const L = t[lang];
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [delegatorId, setDelegatorId] = useState(isAdmin ? '' : currentEmployeeId);
  const [delegateId, setDelegateId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const empMap = new Map(employees.map((e: any) => [e.id, e]));
  const coMap = new Map(companies.map((c: any) => [c.id, c]));

  function handleCreate() {
    if (!delegatorId || !delegateId || !companyId || !startDate || !endDate) return;
    if (delegatorId === delegateId) { setError(lang === 'ar' ? 'لا يمكن التفويض لنفس الشخص' : 'Cannot delegate to self'); return; }
    setError('');
    startTransition(async () => {
      try {
        await createDelegation(delegatorId, delegateId, companyId, startDate, endDate, reason);
        setShowForm(false); setDelegatorId(isAdmin ? '' : currentEmployeeId);
        setDelegateId(''); setCompanyId(''); setStartDate(''); setEndDate(''); setReason('');
        router.refresh();
      } catch (e: any) { setError(e.message); }
    });
  }

  function handleRevoke(id: string) {
    startTransition(async () => { await revokeDelegation(id); router.refresh(); });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{L.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{L.subtitle}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? L.cancel : L.newDelegation}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 animate-slide-up">
          {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isAdmin && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{L.delegator}</label>
                <select value={delegatorId} onChange={e => setDelegatorId(e.target.value)} className="input-field text-sm">
                  <option value="">{L.selectEmployee}</option>
                  {employees.map((e: any) => <option key={e.id} value={e.id}>{e.full_name_ar} ({e.employee_code})</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{L.delegate}</label>
              <select value={delegateId} onChange={e => setDelegateId(e.target.value)} className="input-field text-sm">
                <option value="">{L.selectEmployee}</option>
                {employees.filter((e: any) => e.id !== delegatorId).map((e: any) => <option key={e.id} value={e.id}>{e.full_name_ar} ({e.employee_code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{L.company}</label>
              <select value={companyId} onChange={e => setCompanyId(e.target.value)} className="input-field text-sm">
                <option value="">{L.selectCompany}</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name_ar} ({c.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{L.startDate}</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field text-sm" dir="ltr" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{L.endDate}</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field text-sm" dir="ltr" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{L.reason}</label>
              <input value={reason} onChange={e => setReason(e.target.value)} className="input-field text-sm" placeholder={L.reasonPh} />
            </div>
          </div>
          <button onClick={handleCreate} disabled={isPending || !delegateId || !companyId || !startDate || !endDate}
            className="btn-primary text-sm disabled:opacity-50">
            {isPending ? L.creating : L.create}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {delegations.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl block mb-3">🔄</span>
            <p className="font-medium">{L.noDelegations}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {delegations.map((d: any) => {
              const delegator = empMap.get(d.delegator_id);
              const delegate = empMap.get(d.delegate_id);
              const co = coMap.get(d.company_id);
              const isExpired = new Date(d.end_date) < new Date();
              return (
                <div key={d.id} className="px-6 py-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${d.is_active && !isExpired ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    🔄
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {delegator?.full_name_ar || '—'} ← {delegate?.full_name_ar || '—'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {co?.name_ar} • {L.from} {d.start_date} {L.to} {d.end_date}
                      {d.reason && ` • ${d.reason}`}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${d.is_active && !isExpired ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {d.is_active && !isExpired ? L.active : isExpired ? (lang === 'ar' ? 'منتهي' : 'Expired') : L.revoked}
                  </span>
                  {d.is_active && !isExpired && (
                    <button onClick={() => handleRevoke(d.id)} disabled={isPending}
                      className="text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium">
                      {L.revoke}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
