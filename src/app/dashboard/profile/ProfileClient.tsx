'use client';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Props {
  employee: any;
  company: any;
  department: any;
  userEmail: string;
}

export default function ProfileClient({ employee, company, department, userEmail }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const fields = [
    { label: { ar: 'الاسم الكامل (عربي)', en: 'Full Name (Arabic)' }, value: employee.full_name_ar },
    { label: { ar: 'الاسم الكامل (إنجليزي)', en: 'Full Name (English)' }, value: employee.full_name_en },
    { label: { ar: 'كود الموظف', en: 'Employee Code' }, value: employee.employee_code },
    { label: { ar: 'البريد الإلكتروني', en: 'Email' }, value: userEmail },
    { label: { ar: 'الشركة', en: 'Company' }, value: isAr ? company?.name_ar : (company?.name_en || company?.name_ar) },
    { label: { ar: 'القسم', en: 'Department' }, value: isAr ? department?.name_ar : (department?.name_en || department?.name_ar) },
    { label: { ar: 'المسمى الوظيفي', en: 'Title' }, value: employee.title },
    { label: { ar: 'الدرجة الوظيفية', en: 'Grade' }, value: employee.grade },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'الملف الشخصي' : 'Profile'}</h1>
        <p className="text-slate-500 text-sm mt-1">{isAr ? 'معلومات حسابك' : 'Your account information'}</p>
      </div>

      <div className="card p-6 space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold">
            {(isAr ? employee.full_name_ar : employee.full_name_en)?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-bold text-lg text-slate-900">
              {isAr ? employee.full_name_ar : (employee.full_name_en || employee.full_name_ar)}
            </p>
            <p className="text-slate-500 text-sm">{userEmail}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f, i) => (
            <div key={i}>
              <p className="text-xs font-medium text-slate-500 mb-1">{isAr ? f.label.ar : f.label.en}</p>
              <p className="text-slate-900 font-medium text-sm">{f.value || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
