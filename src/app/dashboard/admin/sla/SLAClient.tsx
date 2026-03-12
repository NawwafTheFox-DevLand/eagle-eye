'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { updateSLAConfig } from '@/app/actions/admin';

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  general_internal:      { ar: 'طلب داخلي عام',    en: 'General Internal'   },
  cross_department:      { ar: 'طلب بين الأقسام',   en: 'Cross-Department'   },
  intercompany:          { ar: 'طلب بين الشركات',   en: 'Intercompany'       },
  fund_disbursement:     { ar: 'طلب صرف مالي',      en: 'Fund Disbursement'  },
  leave_approval:        { ar: 'طلب إجازة',         en: 'Leave Approval'     },
  promotion:             { ar: 'طلب ترقية',         en: 'Promotion'          },
  demotion_disciplinary: { ar: 'طلب تأديبي',        en: 'Disciplinary'       },
  create_department:     { ar: 'إنشاء قسم',         en: 'Create Department'  },
  create_company:        { ar: 'إنشاء شركة',        en: 'Create Company'     },
  create_position:       { ar: 'إنشاء وظيفة',       en: 'Create Position'    },
};

function hoursLabel(hours: number, isAr: boolean): string {
  if (!hours) return '—';
  const days = hours / 24;
  if (days >= 1 && Number.isInteger(days)) {
    return isAr ? `${hours} ساعة (${days} يوم)` : `${hours}h (${days}d)`;
  }
  return isAr ? `${hours} ساعة` : `${hours}h`;
}

export default function SLAClient({ configs }: { configs: any[] }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editing, setEditing] = useState<string | null>(null);
  const [targetHours, setTargetHours] = useState('');
  const [maxHours, setMaxHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  function openEdit(cfg: any) {
    setEditing(cfg.request_type);
    setTargetHours(String(cfg.target_hours || ''));
    setMaxHours(String(cfg.max_hours || ''));
    setErrorMsg('');
  }

  async function handleSave(requestType: string) {
    const t = parseInt(targetHours);
    const m = parseInt(maxHours);
    if (!t || !m || t <= 0 || m <= 0) {
      setErrorMsg(isAr ? 'يرجى إدخال قيم صحيحة' : 'Enter valid values');
      return;
    }
    setSaving(true); setErrorMsg('');
    const result = await updateSLAConfig(requestType, t, m);
    setSaving(false);
    if (result.error) { setErrorMsg(result.error); return; }
    setEditing(null);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'إعدادات مستوى الخدمة (SLA)' : 'SLA Configuration'}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAr ? 'تعديل أوقات الاستهداف والحد الأقصى لكل نوع طلب' : 'Set target and maximum processing times per request type'}
        </p>
      </div>

      {configs.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">⏱️</p>
          <p className="text-slate-500 text-sm">
            {isAr ? 'لا توجد إعدادات SLA — تأكد من وجود جدول sla_configs في قاعدة البيانات' : 'No SLA configs found — ensure the sla_configs table exists'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>{isAr ? 'نوع الطلب' : 'Request Type'}</span>
            <span>{isAr ? 'وقت الهدف' : 'Target Hours'}</span>
            <span>{isAr ? 'الحد الأقصى' : 'Max Hours'}</span>
            <span></span>
          </div>
          <div className="divide-y divide-slate-100">
            {configs.map(cfg => {
              const typeLabel = TYPE_LABELS[cfg.request_type];
              const isEditingThis = editing === cfg.request_type;
              return (
                <div key={cfg.request_type}>
                  <div className="grid md:grid-cols-[2fr_1.5fr_1.5fr_auto] gap-3 px-5 py-3.5 items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {typeLabel ? (isAr ? typeLabel.ar : typeLabel.en) : cfg.request_type}
                      </p>
                      <p className="text-xs font-mono text-slate-400">{cfg.request_type}</p>
                    </div>
                    {isEditingThis ? (
                      <>
                        <input type="number" min="1" value={targetHours} onChange={e => setTargetHours(e.target.value)}
                          className="input-field text-sm" placeholder="e.g. 48" />
                        <input type="number" min="1" value={maxHours} onChange={e => setMaxHours(e.target.value)}
                          className="input-field text-sm" placeholder="e.g. 96" />
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-slate-700">{hoursLabel(cfg.target_hours, isAr)}</span>
                        <span className="text-sm text-slate-700">{hoursLabel(cfg.max_hours, isAr)}</span>
                      </>
                    )}
                    <div className="flex gap-2 shrink-0">
                      {isEditingThis ? (
                        <>
                          <button onClick={() => handleSave(cfg.request_type)} disabled={saving || isPending}
                            className="btn-primary text-xs py-1.5 px-3 disabled:opacity-50">
                            {saving ? '...' : (isAr ? 'حفظ' : 'Save')}
                          </button>
                          <button onClick={() => setEditing(null)}
                            className="text-xs px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
                            {isAr ? 'إلغاء' : 'Cancel'}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => openEdit(cfg)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors">
                          {isAr ? 'تعديل' : 'Edit'}
                        </button>
                      )}
                    </div>
                  </div>
                  {isEditingThis && errorMsg && (
                    <div className="mx-5 mb-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
