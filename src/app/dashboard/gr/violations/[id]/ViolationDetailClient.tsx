'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { updateGRViolation } from '@/app/actions/gr';

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ label, dateStr, lang }: { label: string; dateStr: string | null; lang: 'ar' | 'en' }) {
  if (!dateStr) return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-400">—</span>
    </div>
  );
  const days = daysUntil(dateStr);
  let color = 'bg-emerald-100 text-emerald-700';
  if (days < 0) color = 'bg-red-100 text-red-700';
  else if (days < 7) color = 'bg-red-100 text-red-700';
  else if (days < 30) color = 'bg-amber-100 text-amber-700';
  else if (days < 90) color = 'bg-yellow-100 text-yellow-700';

  const dayLabel = days < 0
    ? (lang === 'ar' ? `تجاوز بـ ${Math.abs(days)} يوم` : `${Math.abs(days)}d overdue`)
    : (lang === 'ar' ? `${days} يوم متبقٍ` : `${days}d left`);

  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="space-y-0.5">
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${color}`}>{dayLabel}</span>
        <p className="text-xs text-slate-500">{dateStr}</p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value || '—'}</p>
    </div>
  );
}

const pathLabels: Record<string, { ar: string; en: string; color: string }> = {
  direct_payment: { ar: 'سداد مباشر', en: 'Direct Payment', color: 'bg-blue-100 text-blue-700' },
  objection: { ar: 'اعتراض', en: 'Objection', color: 'bg-amber-100 text-amber-700' },
  settlement: { ar: 'تسوية', en: 'Settlement', color: 'bg-violet-100 text-violet-700' },
};

const objectionResultLabels: Record<string, { ar: string; en: string; color: string }> = {
  accepted: { ar: 'مقبول', en: 'Accepted', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { ar: 'مرفوض', en: 'Rejected', color: 'bg-red-100 text-red-700' },
  partially_accepted: { ar: 'مقبول جزئياً', en: 'Partially Accepted', color: 'bg-amber-100 text-amber-700' },
};

interface Props {
  violation: any;
  entity: any;
}

export default function ViolationDetailClient({ violation: initialViolation, entity }: Props) {
  const { lang } = useLanguage();
  const [violation, setViolation] = useState(initialViolation);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [resolutionPath, setResolutionPath] = useState(violation.resolution_path || '');
  // Path A
  const [directPaymentReason, setDirectPaymentReason] = useState(violation.direct_payment_reason || '');
  const [directPaymentDate, setDirectPaymentDate] = useState(violation.direct_payment_date || '');
  const [paymentReference, setPaymentReference] = useState(violation.payment_reference || '');
  // Path B
  const [objectionRationale, setObjectionRationale] = useState(violation.objection_rationale || '');
  const [objectionDate, setObjectionDate] = useState(violation.objection_date || '');
  const [objectionResponseDate, setObjectionResponseDate] = useState(violation.objection_response_date || '');
  const [objectionResult, setObjectionResult] = useState(violation.objection_result || '');
  const [postRejectionPaymentDate, setPostRejectionPaymentDate] = useState(violation.post_rejection_payment_date || '');
  // Path C
  const [settlementRationale, setSettlementRationale] = useState(violation.settlement_rationale || '');
  const [settlementDate, setSettlementDate] = useState(violation.settlement_date || '');
  const [settlementEmployeeContractEnd, setSettlementEmployeeContractEnd] = useState(violation.settlement_employee_contract_end || '');
  const [settlementAgreementEnd, setSettlementAgreementEnd] = useState(violation.settlement_agreement_end || '');
  const [postSettlementAmount, setPostSettlementAmount] = useState(violation.post_settlement_amount || '');
  const [postSettlementPaymentDate, setPostSettlementPaymentDate] = useState(violation.post_settlement_payment_date || '');

  function handleSave() {
    setError('');
    setSuccess('');
    const updates: Record<string, any> = { resolution_path: resolutionPath || null };

    if (resolutionPath === 'direct_payment') {
      updates.direct_payment_reason = directPaymentReason || null;
      updates.direct_payment_date = directPaymentDate || null;
      updates.payment_reference = paymentReference || null;
    } else if (resolutionPath === 'objection') {
      updates.objection_rationale = objectionRationale || null;
      updates.objection_date = objectionDate || null;
      updates.objection_response_date = objectionResponseDate || null;
      updates.objection_result = objectionResult || null;
      updates.post_rejection_payment_date = postRejectionPaymentDate || null;
    } else if (resolutionPath === 'settlement') {
      updates.settlement_rationale = settlementRationale || null;
      updates.settlement_date = settlementDate || null;
      updates.settlement_employee_contract_end = settlementEmployeeContractEnd || null;
      updates.settlement_agreement_end = settlementAgreementEnd || null;
      updates.post_settlement_amount = postSettlementAmount ? parseFloat(postSettlementAmount) : null;
      updates.post_settlement_payment_date = postSettlementPaymentDate || null;
    }

    startTransition(async () => {
      try {
        await updateGRViolation(violation.id, updates);
        setViolation({ ...violation, ...updates });
        setSuccess(lang === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully');
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <Link href="/dashboard/gr/violations" className="text-sm text-slate-500 hover:text-slate-700">
        {lang === 'ar' ? '← المخالفات' : '← Violations'}
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <span className="text-3xl">⚠️</span>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-slate-400" dir="ltr">{violation.violation_number}</span>
              {violation.resolution_path && pathLabels[violation.resolution_path] && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pathLabels[violation.resolution_path].color}`}>
                  {pathLabels[violation.resolution_path][lang]}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{violation.description || (lang === 'ar' ? 'مخالفة' : 'Violation')}</h1>
          </div>
        </div>
      </div>

      {/* Section 1: Core Info */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'المعلومات الأساسية' : 'Core Information'}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label={lang === 'ar' ? 'رقم المخالفة' : 'Violation Number'} value={violation.violation_number} />
          <Field label={lang === 'ar' ? 'الجهة المصدرة' : 'Issuing Authority'} value={violation.issuing_authority} />
          <Field label={lang === 'ar' ? 'الكيان المحدد في الإشعار' : 'Notified Entity'} value={violation.notified_entity_per_notice} />
          <Field label={lang === 'ar' ? 'الكيان الفعلي' : 'Actual Entity'} value={entity ? (lang === 'ar' ? entity.name_ar : entity.name_en || entity.name_ar) : null} />
          <div>
            <p className="text-xs text-slate-500 mb-0.5">{lang === 'ar' ? 'مبلغ المخالفة' : 'Violation Amount'}</p>
            <p className="text-sm font-bold text-red-700">{violation.violation_amount ? formatCurrency(parseFloat(violation.violation_amount), 'SAR', lang) : '—'}</p>
          </div>
          <Field label={lang === 'ar' ? 'الوصف' : 'Description'} value={violation.description} />
        </div>
      </div>

      {/* Section 2: Dates & Deadlines */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'التواريخ والمواعيد النهائية' : 'Dates & Deadlines'}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <DeadlineBadge label={lang === 'ar' ? 'موعد تقديم المبرر' : 'Justification Deadline'} dateStr={violation.justification_deadline} lang={lang} />
          <DeadlineBadge label={lang === 'ar' ? 'موعد الاعتراض' : 'Objection Deadline'} dateStr={violation.objection_deadline} lang={lang} />
          <DeadlineBadge label={lang === 'ar' ? 'موعد التسوية' : 'Settlement Deadline'} dateStr={violation.settlement_deadline} lang={lang} />
          <DeadlineBadge label={lang === 'ar' ? 'موعد الدفع' : 'Payment Deadline'} dateStr={violation.payment_deadline} lang={lang} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Field label={lang === 'ar' ? 'تاريخ استلام الإشعار' : 'Notice Received'} value={violation.notice_received_at ? formatDate(violation.notice_received_at, lang) : null} />
          <Field label={lang === 'ar' ? 'تاريخ الإشعار' : 'Notice Date'} value={violation.notice_date} />
          <Field label={lang === 'ar' ? 'تاريخ رصد المخالفة' : 'Violation Observed'} value={violation.violation_observed_date} />
          <Field label={lang === 'ar' ? 'تاريخ تأكيد المخالفة' : 'Violation Confirmed'} value={violation.violation_confirmed_date} />
        </div>
      </div>

      {/* Section 3: Identification */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'بيانات التعريف' : 'Identification'}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label={lang === 'ar' ? 'رقم الحاسب' : 'Computer Number'} value={violation.computer_number} />
          <Field label={lang === 'ar' ? 'رقم ملف مكتب العمل' : 'Labor Office File No.'} value={violation.labor_office_file_no} />
        </div>
      </div>

      {/* Section 4: Resolution Path (read-only current state) */}
      {violation.resolution_path && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'مسار الحل الحالي' : 'Current Resolution Path'}</h2>
          {violation.resolution_path === 'direct_payment' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label={lang === 'ar' ? 'سبب السداد المباشر' : 'Direct Payment Reason'} value={violation.direct_payment_reason} />
              <Field label={lang === 'ar' ? 'تاريخ الدفع' : 'Payment Date'} value={violation.direct_payment_date} />
              <Field label={lang === 'ar' ? 'مرجع الدفع' : 'Payment Reference'} value={violation.payment_reference} />
            </div>
          )}
          {violation.resolution_path === 'objection' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label={lang === 'ar' ? 'مبرر الاعتراض' : 'Objection Rationale'} value={violation.objection_rationale} />
              <Field label={lang === 'ar' ? 'تاريخ الاعتراض' : 'Objection Date'} value={violation.objection_date} />
              <Field label={lang === 'ar' ? 'تاريخ الرد' : 'Response Date'} value={violation.objection_response_date} />
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{lang === 'ar' ? 'نتيجة الاعتراض' : 'Objection Result'}</p>
                {violation.objection_result && objectionResultLabels[violation.objection_result] ? (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${objectionResultLabels[violation.objection_result].color}`}>
                    {objectionResultLabels[violation.objection_result][lang]}
                  </span>
                ) : <p className="text-sm text-slate-400">—</p>}
              </div>
              <Field label={lang === 'ar' ? 'تاريخ دفع ما بعد الرفض' : 'Post-Rejection Payment Date'} value={violation.post_rejection_payment_date} />
            </div>
          )}
          {violation.resolution_path === 'settlement' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label={lang === 'ar' ? 'مبرر التسوية' : 'Settlement Rationale'} value={violation.settlement_rationale} />
              <Field label={lang === 'ar' ? 'تاريخ التسوية' : 'Settlement Date'} value={violation.settlement_date} />
              <Field label={lang === 'ar' ? 'نهاية عقد الموظف' : 'Employee Contract End'} value={violation.settlement_employee_contract_end} />
              <Field label={lang === 'ar' ? 'نهاية اتفاقية التسوية' : 'Settlement Agreement End'} value={violation.settlement_agreement_end} />
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{lang === 'ar' ? 'مبلغ ما بعد التسوية' : 'Post-Settlement Amount'}</p>
                <p className="text-sm font-medium text-slate-900">{violation.post_settlement_amount ? formatCurrency(parseFloat(violation.post_settlement_amount), 'SAR', lang) : '—'}</p>
              </div>
              <Field label={lang === 'ar' ? 'تاريخ دفع ما بعد التسوية' : 'Post-Settlement Payment Date'} value={violation.post_settlement_payment_date} />
            </div>
          )}
        </div>
      )}

      {/* Section 5: Update Form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'تحديث مسار الحل' : 'Update Resolution Path'}</h2>

        {error && <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {success && <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{success}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'مسار الحل' : 'Resolution Path'}</label>
            <select value={resolutionPath} onChange={e => setResolutionPath(e.target.value)} className="input-field text-sm w-64">
              <option value="">{lang === 'ar' ? 'لم يحدد بعد' : 'Not determined'}</option>
              {Object.entries(pathLabels).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
            </select>
          </div>

          {/* Path A: Direct Payment */}
          {resolutionPath === 'direct_payment' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-blue-50">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'سبب السداد المباشر' : 'Direct Payment Reason'}</label>
                <input value={directPaymentReason} onChange={e => setDirectPaymentReason(e.target.value)} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'تاريخ الدفع' : 'Payment Date'}</label>
                <input type="date" value={directPaymentDate} onChange={e => setDirectPaymentDate(e.target.value)} className="input-field text-sm" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'مرجع الدفع' : 'Payment Reference'}</label>
                <input value={paymentReference} onChange={e => setPaymentReference(e.target.value)} className="input-field text-sm" />
              </div>
            </div>
          )}

          {/* Path B: Objection */}
          {resolutionPath === 'objection' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-amber-50">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'مبرر الاعتراض' : 'Objection Rationale'}</label>
                <textarea value={objectionRationale} onChange={e => setObjectionRationale(e.target.value)} rows={3} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'تاريخ الاعتراض' : 'Objection Date'}</label>
                <input type="date" value={objectionDate} onChange={e => setObjectionDate(e.target.value)} className="input-field text-sm" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'تاريخ الرد' : 'Response Date'}</label>
                <input type="date" value={objectionResponseDate} onChange={e => setObjectionResponseDate(e.target.value)} className="input-field text-sm" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'نتيجة الاعتراض' : 'Objection Result'}</label>
                <select value={objectionResult} onChange={e => setObjectionResult(e.target.value)} className="input-field text-sm">
                  <option value="">{lang === 'ar' ? 'لم تحدد' : 'Pending'}</option>
                  {Object.entries(objectionResultLabels).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'تاريخ دفع ما بعد الرفض' : 'Post-Rejection Payment Date'}</label>
                <input type="date" value={postRejectionPaymentDate} onChange={e => setPostRejectionPaymentDate(e.target.value)} className="input-field text-sm" dir="ltr" />
              </div>
            </div>
          )}

          {/* Path C: Settlement */}
          {resolutionPath === 'settlement' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-violet-50">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'مبرر التسوية' : 'Settlement Rationale'}</label>
                <textarea value={settlementRationale} onChange={e => setSettlementRationale(e.target.value)} rows={3} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'تاريخ التسوية' : 'Settlement Date'}</label>
                <input type="date" value={settlementDate} onChange={e => setSettlementDate(e.target.value)} className="input-field text-sm" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'نهاية عقد الموظف' : 'Employee Contract End'}</label>
                <input type="date" value={settlementEmployeeContractEnd} onChange={e => setSettlementEmployeeContractEnd(e.target.value)} className="input-field text-sm" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'نهاية اتفاقية التسوية' : 'Settlement Agreement End'}</label>
                <input type="date" value={settlementAgreementEnd} onChange={e => setSettlementAgreementEnd(e.target.value)} className="input-field text-sm" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'مبلغ ما بعد التسوية' : 'Post-Settlement Amount'}</label>
                <input type="number" value={postSettlementAmount} onChange={e => setPostSettlementAmount(e.target.value)} className="input-field text-sm" dir="ltr" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'تاريخ دفع ما بعد التسوية' : 'Post-Settlement Payment Date'}</label>
                <input type="date" value={postSettlementPaymentDate} onChange={e => setPostSettlementPaymentDate(e.target.value)} className="input-field text-sm" dir="ltr" />
              </div>
            </div>
          )}

          <button onClick={handleSave} disabled={isPending} className="btn-primary text-sm disabled:opacity-50">
            {isPending ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
}
