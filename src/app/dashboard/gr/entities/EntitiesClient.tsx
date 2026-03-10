'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const groupNames: Record<number, { ar: string; en: string }> = {
  1: { ar: 'منصور للاستثمار القابضة', en: 'Mansour Investment Holding' },
  2: { ar: 'المؤشر اليوم القابضة', en: 'Al-Muasher Al-Yawm Holding' },
  3: { ar: 'منصور للتجارة', en: 'Mansour Trading' },
  4: { ar: 'الشيخ منصور', en: 'Sheikh Mansour' },
};

export default function EntitiesClient({ entities, isReadOnly }: any) {
  const { lang } = useLanguage();
  const [filterGroup, setFilterGroup] = useState<number | ''>('');

  const filtered = filterGroup ? entities.filter((e: any) => e.group_number === filterGroup) : entities;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'سجل الكيانات' : 'Entity Registry'}</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} {lang === 'ar' ? 'كيان' : 'entities'}</p>
        </div>
        <select value={filterGroup} onChange={e => setFilterGroup(e.target.value ? Number(e.target.value) : '')} className="input-field w-60">
          <option value="">{lang === 'ar' ? 'كل المجموعات' : 'All Groups'}</option>
          {[1, 2, 3, 4].map(g => <option key={g} value={g}>{groupNames[g]?.[lang]}</option>)}
        </select>
      </div>

      {isReadOnly && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-sm">
          <span>🔒</span>
          <span>{lang === 'ar' ? 'وضع العرض فقط' : 'View Only Mode'}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl block mb-3">🏢</span>
            <p className="font-medium">{lang === 'ar' ? 'لا توجد كيانات مسجلة' : 'No entities registered'}</p>
            <p className="text-xs mt-1">{lang === 'ar' ? 'أضف كيانات من خلال Supabase' : 'Add entities via Supabase'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'المجموعة' : 'Group'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'السجل التجاري' : 'CR Number'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'انتهاء السجل' : 'CR Expiry'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/gr/entities/${e.id}`} className="font-medium text-slate-900 hover:text-blue-700 hover:underline block">{lang === 'ar' ? e.name_ar : e.name_en || e.name_ar}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{groupNames[e.group_number]?.[lang] || `Group ${e.group_number}`}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{e.entity_type}</span></td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{e.cr_number || '—'}</td>
                    <td className="px-4 py-3 text-xs">{e.cr_expiry ? <span className={new Date(e.cr_expiry) < new Date() ? 'text-red-600 font-medium' : 'text-slate-600'}>{e.cr_expiry}</span> : '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${e.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{e.is_active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
