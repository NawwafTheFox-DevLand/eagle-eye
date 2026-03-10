'use client';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const typeLabels: Record<string, { ar: string; en: string; icon: string }> = {
  investigation: { ar: 'تحقيق', en: 'Investigation', icon: '🔍' },
  branch_opening: { ar: 'افتتاح فرع', en: 'Branch Opening', icon: '🏪' },
  branch_closing: { ar: 'إغلاق فرع', en: 'Branch Closing', icon: '🚪' },
  renovation: { ar: 'تجديد', en: 'Renovation', icon: '🔧' },
};

export default function CommitteesClient({ committees }: any) {
  const { lang } = useLanguage();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'اللجان' : 'Committees'}</h1>
        <p className="text-sm text-slate-500 mt-1">{committees.length} {lang === 'ar' ? 'لجنة' : 'committees'}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {committees.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl block mb-3">👥</span>
            <p className="font-medium">{lang === 'ar' ? 'لا توجد لجان مسجلة' : 'No committees registered'}</p>
            <p className="text-xs mt-1">{lang === 'ar' ? 'يمكن إنشاء اللجان من خلال المهام' : 'Committees can be created through tasks'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {committees.map((c: any) => {
              const type = typeLabels[c.committee_type];
              return (
                <div key={c.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50">
                  <span className="text-xl">{type?.icon || '👥'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{c.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{type?.[lang] || c.committee_type}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : c.status === 'completed' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                    {c.status === 'active' ? (lang === 'ar' ? 'نشطة' : 'Active') : c.status === 'completed' ? (lang === 'ar' ? 'مكتملة' : 'Completed') : (lang === 'ar' ? 'ملغاة' : 'Cancelled')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
