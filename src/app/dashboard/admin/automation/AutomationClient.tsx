'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function AutomationClient({ configs, rules }: any) {
  const { lang } = useLanguage();

  const routineTypes = configs.filter((c: any) => c.is_routine_eligible);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'قواعد الأتمتة' : 'Automation Rules'}</h1>
        <p className="text-sm text-slate-500 mt-1">{lang === 'ar' ? 'إدارة الطلبات الروتينية التي يمكن تجاوز الموافقة فيها' : 'Manage routine requests that can bypass approval'}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-900 mb-4">{lang === 'ar' ? 'أنواع الطلبات المؤهلة للأتمتة' : 'Routine-Eligible Types'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {routineTypes.map((c: any) => (
            <div key={c.request_type} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-slate-900">{lang === 'ar' ? c.name_ar : c.name_en}</span>
              <span className="text-xs text-slate-500 ms-auto">{lang === 'ar' ? 'مؤهل' : 'Eligible'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{lang === 'ar' ? 'القواعد النشطة' : 'Active Rules'}</h2>
          <span className="text-sm text-slate-500">{rules.length} {lang === 'ar' ? 'قاعدة' : 'rules'}</span>
        </div>
        {rules.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl block mb-3">⚡</span>
            <p className="font-medium">{lang === 'ar' ? 'لا توجد قواعد أتمتة بعد' : 'No automation rules yet'}</p>
            <p className="text-xs mt-1">{lang === 'ar' ? 'سيتم إضافة هذه الميزة في التحديثات القادمة' : 'This feature will be available in upcoming updates'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {rules.map((r: any) => (
              <div key={r.id} className="px-6 py-4">
                <p className="font-medium text-slate-900">{lang === 'ar' ? r.name_ar : r.name_en}</p>
                <p className="text-xs text-slate-500 mt-1">{r.request_type} • {r.is_active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'معطل' : 'Inactive')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
