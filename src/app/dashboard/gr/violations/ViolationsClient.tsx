'use client';
import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const pathLabels: Record<string, { ar: string; en: string; color: string }> = {
  direct_payment: { ar: 'سداد مباشر', en: 'Direct Payment', color: 'bg-blue-100 text-blue-700' },
  objection: { ar: 'اعتراض', en: 'Objection', color: 'bg-amber-100 text-amber-700' },
  settlement: { ar: 'تسوية', en: 'Settlement', color: 'bg-violet-100 text-violet-700' },
};

export default function ViolationsClient({ violations, entities }: any) {
  const { lang } = useLanguage();
  const [filterPath, setFilterPath] = useState('');
  const entityMap = new Map(entities.map((e: any) => [e.id, e]));
  const filtered = filterPath ? violations.filter((v: any) => v.resolution_path === filterPath) : violations;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'إدارة المخالفات' : 'Violations Management'}</h1>
        <p className="text-sm text-slate-500 mt-1">{filtered.length} {lang === 'ar' ? 'مخالفة' : 'violations'}</p>
      </div>

      <div className="flex gap-3">
        <select value={filterPath} onChange={e => setFilterPath(e.target.value)} className="input-field w-48">
          <option value="">{lang === 'ar' ? 'كل المسارات' : 'All Paths'}</option>
          {Object.entries(pathLabels).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl block mb-3">⚠️</span>
            <p className="font-medium">{lang === 'ar' ? 'لا توجد مخالفات مسجلة' : 'No violations recorded'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'رقم المخالفة' : 'Number'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الوصف' : 'Description'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الجهة المصدرة' : 'Authority'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الكيان' : 'Entity'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'المسار' : 'Path'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((v: any) => {
                  const entity = entityMap.get(v.actual_entity_id);
                  const path = v.resolution_path ? pathLabels[v.resolution_path] : null;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{v.violation_number}</td>
                      <td className="px-4 py-3 text-slate-900 max-w-[200px] truncate">{v.description || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{v.issuing_authority || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{entity?.name_ar || v.notified_entity_per_notice || '—'}</td>
                      <td className="px-4 py-3 font-medium">{v.violation_amount ? `${parseFloat(v.violation_amount).toLocaleString()} SAR` : '—'}</td>
                      <td className="px-4 py-3">{path ? <span className={`px-2 py-1 rounded-full text-xs font-medium ${path.color}`}>{path[lang]}</span> : <span className="text-xs text-slate-400">{lang === 'ar' ? 'لم يحدد' : 'Pending'}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
