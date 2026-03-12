'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { updateOnboardingConfig } from '@/app/actions/onboarding';

const TASK_LABELS: Record<string, { ar: string; en: string; icon: string }> = {
  hr_registration: { ar: 'تسجيل الموارد البشرية', en: 'HR Registration', icon: '👥' },
  it_setup:        { ar: 'إعداد تقنية المعلومات',  en: 'IT Setup',         icon: '💻' },
  payroll:         { ar: 'إعداد الراتب',            en: 'Payroll Setup',    icon: '💰' },
  access_card:     { ar: 'بطاقة الوصول',            en: 'Access Card',      icon: '🪪' },
};

interface Config {
  id: string;
  task_type: string;
  name_ar: string;
  name_en: string;
  assignee_dept_code: string | null;
  sla_hours: number | null;
  depends_on: string | null;
  is_active: boolean;
}

interface Dept { id: string; code: string; name_ar: string; name_en: string }

export default function OnboardingConfigClient({
  configs,
  departments,
}: {
  configs: Config[];
  departments: Dept[];
}) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local editable state per config row
  const [rows, setRows] = useState<Record<string, { deptCode: string; slaHours: string }>>(
    Object.fromEntries(
      configs.map(c => [c.id, {
        deptCode: c.assignee_dept_code || '',
        slaHours: String(c.sla_hours ?? 24),
      }])
    )
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  function handleSave(id: string) {
    const row = rows[id];
    const sla = parseInt(row.slaHours);
    if (!row.deptCode) {
      setErrors(prev => ({ ...prev, [id]: isAr ? 'كود القسم مطلوب' : 'Dept code required' }));
      return;
    }
    if (!sla || sla < 1) {
      setErrors(prev => ({ ...prev, [id]: isAr ? 'ساعات SLA يجب أن تكون أكبر من 0' : 'SLA hours must be > 0' }));
      return;
    }
    setErrors(prev => ({ ...prev, [id]: '' }));

    startTransition(async () => {
      const result = await updateOnboardingConfig(id, {
        assignee_dept_code: row.deptCode,
        sla_hours: sla,
      });
      if (result.error) {
        setErrors(prev => ({ ...prev, [id]: result.error! }));
      } else {
        setSaved(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setSaved(prev => ({ ...prev, [id]: false })), 2000);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6 animate-fade-in" suppressHydrationWarning>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isAr ? 'إعدادات التعيين' : 'Onboarding Configuration'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAr
            ? 'حدد القسم المسؤول ومدة SLA لكل مهمة تعيين'
            : 'Set the responsible department and SLA for each onboarding task'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {configs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-4xl mb-3">⚙️</p>
            <p>{isAr ? 'لا يوجد إعدادات' : 'No configurations found'}</p>
            <p className="text-xs text-slate-400 mt-1">
              {isAr ? 'تأكد من تشغيل السكريبت الابتدائي لجدول onboarding_config' : 'Ensure the onboarding_config seed script has been run'}
            </p>
          </div>
        ) : (
          configs.map(config => {
            const label = TASK_LABELS[config.task_type] || { ar: config.name_ar, en: config.name_en, icon: '📋' };
            const row = rows[config.id] || { deptCode: '', slaHours: '24' };
            return (
              <div key={config.id} className="p-5">
                <div className="flex items-start gap-4">
                  <span className="text-3xl mt-1 shrink-0">{label.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">
                      {isAr ? label.ar : label.en}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isAr ? label.en : label.ar}
                      {config.depends_on && (
                        <span className="ms-2 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px]">
                          {isAr ? `يتوقف على: ${config.depends_on}` : `Depends on: ${config.depends_on}`}
                        </span>
                      )}
                    </p>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Dept code */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          {isAr ? 'كود القسم المسؤول' : 'Responsible Dept Code'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={row.deptCode}
                            onChange={e => setRows(prev => ({ ...prev, [config.id]: { ...prev[config.id], deptCode: e.target.value } }))}
                            placeholder={isAr ? 'مثال: HR10' : 'e.g. HR10'}
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            list={`dept-codes-${config.id}`}
                          />
                          <datalist id={`dept-codes-${config.id}`}>
                            {departments.map(d => (
                              <option key={d.id} value={d.code}>{isAr ? d.name_ar : d.name_en}</option>
                            ))}
                          </datalist>
                        </div>
                      </div>

                      {/* SLA hours */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          {isAr ? 'مدة SLA (ساعة)' : 'SLA Duration (hours)'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={row.slaHours}
                          onChange={e => setRows(prev => ({ ...prev, [config.id]: { ...prev[config.id], slaHours: e.target.value } }))}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        />
                      </div>
                    </div>

                    {errors[config.id] && (
                      <p className="text-red-600 text-xs mt-2">{errors[config.id]}</p>
                    )}

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() => handleSave(config.id)}
                        disabled={isPending}
                        className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isAr ? 'حفظ' : 'Save'}
                      </button>
                      {saved[config.id] && (
                        <span className="text-emerald-600 text-sm font-medium">✅ {isAr ? 'تم الحفظ' : 'Saved'}</span>
                      )}
                      {config.assignee_dept_code && (
                        <span className="text-xs text-slate-400">
                          {isAr ? 'الحالي: ' : 'Current: '}<strong>{config.assignee_dept_code}</strong>
                          {config.sla_hours ? ` · ${config.sla_hours}h SLA` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
