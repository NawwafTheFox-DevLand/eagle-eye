'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  super_admin: { ar: 'مدير النظام', en: 'Super Admin' },
  company_admin: { ar: 'مدير الشركة', en: 'Company Admin' },
  ceo: { ar: 'الرئيس التنفيذي', en: 'CEO' },
  department_manager: { ar: 'مدير القسم', en: 'Dept Manager' },
  employee: { ar: 'موظف', en: 'Employee' },
  finance_approver: { ar: 'معتمد مالي', en: 'Finance Approver' },
  hr_approver: { ar: 'معتمد موارد بشرية', en: 'HR Approver' },
  gr_manager: { ar: 'مدير علاقات حكومية', en: 'GR Manager' },
  gr_employee: { ar: 'موظف علاقات حكومية', en: 'GR Employee' },
};

export default function ProfileClient({ employee, company, department, roles }: any) {
  const { lang } = useLanguage();

  const fields = [
    { label: { ar: 'رمز الموظف', en: 'Employee Code' }, value: employee.employee_code },
    { label: { ar: 'البريد الإلكتروني', en: 'Email' }, value: employee.email },
    { label: { ar: 'الشركة', en: 'Company' }, value: lang === 'ar' ? company?.name_ar : company?.name_en || company?.name_ar },
    { label: { ar: 'القسم', en: 'Department' }, value: lang === 'ar' ? department?.name_ar : department?.name_en || department?.name_ar || '—' },
    { label: { ar: 'المسمى الوظيفي', en: 'Job Title' }, value: employee.title_ar || '—' },
    { label: { ar: 'الدرجة', en: 'Grade' }, value: employee.grade || '—' },
    { label: { ar: 'الجنسية', en: 'Nationality' }, value: employee.nationality || '—' },
    { label: { ar: 'الجنس', en: 'Gender' }, value: employee.gender === 'male' ? (lang === 'ar' ? 'ذكر' : 'Male') : employee.gender === 'female' ? (lang === 'ar' ? 'أنثى' : 'Female') : '—' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="eagle-gradient px-8 py-10 text-white">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-3xl font-bold text-gold-400">
              {employee.full_name_ar?.[0] || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{lang === 'ar' ? employee.full_name_ar : employee.full_name_en || employee.full_name_ar}</h1>
              <p className="text-white/70 mt-1">{employee.title_ar || ''}</p>
              <div className="flex gap-2 mt-2">
                {roles.map((r: any, i: number) => (
                  <span key={i} className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white/90">
                    {ROLE_LABELS[r.role]?.[lang] || r.role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-8">
          <h2 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'المعلومات الشخصية' : 'Personal Information'}</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {fields.map((f, i) => (
              <div key={i}>
                <dt className="text-xs font-medium text-slate-500 mb-1">{f.label[lang]}</dt>
                <dd className="text-sm font-medium text-slate-900">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
