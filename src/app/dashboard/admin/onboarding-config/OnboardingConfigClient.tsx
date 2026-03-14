'use client';

import { useState, useTransition } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { updateOnboardingConfig } from '@/app/actions/onboarding';

const TASK_LABELS: Record<string, { ar: string; en: string }> = {
  hr_registration: { ar: 'تسجيل في نظام HR', en: 'HR Registration' },
  contract:        { ar: 'إعداد عقد العمل',   en: 'Employment Contract' },
  insurance:       { ar: 'التأمين الطبي',      en: 'Medical Insurance' },
  payroll:         { ar: 'تفعيل الرواتب وسند الأمر', en: 'Payroll Activation' },
};

interface ConfigRow {
  id: string;
  task_type: string;
  task_name_ar: string;
  task_name_en: string;
  assigned_employee_id: string | null;
  backup_employee_id: string | null;
  sla_hours: number | null;
  depends_on_task: string | null;
  sort_order: number | null;
  is_active: boolean;
  assigned_employee?: any;
  backup_employee?: any;
}

interface Employee {
  id: string;
  full_name_ar: string;
  full_name_en: string;
  employee_code: string;
  company_id: string;
  department_id: string;
}

interface Department {
  id: string;
  name_ar: string;
  name_en: string;
  company_id: string;
}

interface Company {
  id: string;
  name_ar: string;
  name_en: string;
}

interface Props {
  configs: ConfigRow[];
  employees: Employee[];
  departments: Department[];
  companies: Company[];
}

export default function OnboardingConfigClient({ configs, employees, departments, companies }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [isPending, startTransition] = useTransition();

  const [editedConfigs, setEditedConfigs] = useState<ConfigRow[]>(
    configs.map(c => ({ ...c }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function updateConfig(taskType: string, field: keyof ConfigRow, value: any) {
    setEditedConfigs(prev =>
      prev.map(c => c.task_type === taskType ? { ...c, [field]: value } : c)
    );
    setSaved(false);
  }

  // Build dept map for display
  const deptMap = new Map(departments.map(d => [d.id, d]));
  const companyMap = new Map(companies.map(c => [c.id, c]));

  function getEmpLabel(emp: Employee): string {
    const dept = deptMap.get(emp.department_id);
    const deptName = dept ? (isAr ? dept.name_ar : dept.name_en) : '';
    return `${isAr ? emp.full_name_ar : (emp.full_name_en || emp.full_name_ar)} (${emp.employee_code})${deptName ? ' — ' + deptName : ''}`;
  }

  // Group employees by company for <optgroup>
  const employeesByCompany = companies.map(co => ({
    company: co,
    employees: employees.filter(e => e.company_id === co.id),
  })).filter(g => g.employees.length > 0);

  async function handleSave() {
    setError('');
    setSaving(true);
    startTransition(async () => {
      const result = await updateOnboardingConfig(
        editedConfigs.map(c => ({
          task_type: c.task_type,
          assigned_employee_id: c.assigned_employee_id || null,
          backup_employee_id: c.backup_employee_id || null,
          sla_hours: c.sla_hours || 24,
        }))
      );
      setSaving(false);
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error || (isAr ? 'حدث خطأ' : 'An error occurred'));
      }
    });
  }

  const BADGE_NUMS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          🧑‍💼 {isAr ? 'إعداد التوظيف' : 'Onboarding Configuration'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAr
            ? 'حدد المسؤول الأساسي والاحتياطي ومدة SLA لكل مهمة توظيف'
            : 'Set the primary handler, backup, and SLA for each onboarding task'}
        </p>
      </div>

      {editedConfigs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          <p className="text-4xl mb-3">⚙️</p>
          <p>{isAr ? 'لا يوجد إعدادات' : 'No configurations found'}</p>
          <p className="text-xs text-slate-400 mt-1">
            {isAr
              ? 'تأكد من تشغيل السكريبت الابتدائي لجدول onboarding_config'
              : 'Ensure the onboarding_config seed script has been run'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editedConfigs.map((config, idx) => {
            const label = TASK_LABELS[config.task_type] || { ar: config.task_name_ar, en: config.task_name_en };
            const badgeNum = BADGE_NUMS[idx] || String(idx + 1);
            const hasHandler = !!config.assigned_employee_id;
            return (
              <div key={config.task_type} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-blue-600">{badgeNum}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{isAr ? label.ar : label.en}</p>
                    <p className="text-xs text-slate-400">{isAr ? label.en : label.ar}</p>
                  </div>
                  {hasHandler
                    ? <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="Handler set" />
                    : <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" title="No handler" />
                  }
                </div>

                {/* Depends on */}
                {config.depends_on_task && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                    ⚠️ {isAr ? 'يعتمد على: ' : 'Depends on: '}
                    <strong>{TASK_LABELS[config.depends_on_task]
                      ? (isAr ? TASK_LABELS[config.depends_on_task].ar : TASK_LABELS[config.depends_on_task].en)
                      : config.depends_on_task}</strong>
                  </div>
                )}

                {/* Primary Handler */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {isAr ? 'المسؤول الأساسي' : 'Primary Handler'}
                    {!hasHandler && <span className="text-amber-500 ms-1">⚠</span>}
                  </label>
                  <select
                    value={config.assigned_employee_id || ''}
                    onChange={e => updateConfig(config.task_type, 'assigned_employee_id', e.target.value || null)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="">{isAr ? '— اختر مسؤولاً —' : '— Select Handler —'}</option>
                    {employeesByCompany.map(group => (
                      <optgroup
                        key={group.company.id}
                        label={isAr ? group.company.name_ar : group.company.name_en}
                      >
                        {group.employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {getEmpLabel(emp)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Backup Handler */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {isAr ? 'المسؤول الاحتياطي' : 'Backup Handler'}
                    <span className="text-slate-400 ms-1">({isAr ? 'اختياري' : 'optional'})</span>
                  </label>
                  <select
                    value={config.backup_employee_id || ''}
                    onChange={e => updateConfig(config.task_type, 'backup_employee_id', e.target.value || null)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="">{isAr ? '— لا يوجد —' : '— None —'}</option>
                    {employeesByCompany.map(group => (
                      <optgroup
                        key={group.company.id}
                        label={isAr ? group.company.name_ar : group.company.name_en}
                      >
                        {group.employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {getEmpLabel(emp)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* SLA Hours */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {isAr ? 'مدة SLA (ساعة)' : 'SLA Duration (hours)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    value={config.sla_hours ?? 24}
                    onChange={e => updateConfig(config.task_type, 'sla_hours', parseInt(e.target.value) || 24)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editedConfigs.length > 0 && (
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={isPending || saving}
            className="px-6 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {saving
              ? (isAr ? 'جاري الحفظ...' : 'Saving...')
              : (isAr ? 'حفظ جميع الإعدادات' : 'Save All Settings')}
          </button>
          {saved && (
            <span className="text-emerald-600 text-sm font-medium">
              ✅ {isAr ? 'تم الحفظ بنجاح' : 'Saved successfully'}
            </span>
          )}
          {error && (
            <span className="text-red-600 text-sm">{error}</span>
          )}
        </div>
      )}
    </div>
  );
}
