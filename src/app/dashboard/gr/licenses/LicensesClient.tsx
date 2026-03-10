'use client';
import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const typeLabels: Record<string, { ar: string; en: string }> = {
  cr: { ar: 'سجل تجاري', en: 'Commercial Register' },
  municipal: { ar: 'رخصة بلدية', en: 'Municipal License' },
  safety: { ar: 'تصريح سلامة', en: 'Safety Permit' },
  industrial: { ar: 'رخصة صناعية', en: 'Industrial License' },
  operation: { ar: 'رخصة تشغيل', en: 'Operation License' },
  environmental: { ar: 'تصريح بيئي', en: 'Environmental Permit' },
  trademark: { ar: 'علامة تجارية', en: 'Trademark' },
  scale: { ar: 'ميزان', en: 'Scale' },
  shomos: { ar: 'شموس', en: 'Shomos' },
  chamber: { ar: 'غرفة تجارة', en: 'Chamber of Commerce' },
  other: { ar: 'أخرى', en: 'Other' },
};

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function expiryBadge(date: string, lang: string) {
  const days = daysUntil(date);
  if (days < 0) return { text: lang === 'ar' ? 'منتهي' : 'Expired', cls: 'bg-red-100 text-red-700' };
  if (days <= 7) return { text: lang === 'ar' ? `${days} يوم` : `${days}d`, cls: 'bg-red-100 text-red-700' };
  if (days <= 30) return { text: lang === 'ar' ? `${days} يوم` : `${days}d`, cls: 'bg-amber-100 text-amber-700' };
  if (days <= 90) return { text: lang === 'ar' ? `${days} يوم` : `${days}d`, cls: 'bg-yellow-100 text-yellow-700' };
  return { text: lang === 'ar' ? `${days} يوم` : `${days}d`, cls: 'bg-emerald-100 text-emerald-700' };
}

export default function LicensesClient({ licenses, entities, isReadOnly }: any) {
  const { lang } = useLanguage();
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const entityMap = new Map(entities.map((e: any) => [e.id, e]));
  const filtered = licenses.filter((l: any) => {
    if (filterType && l.license_type !== filterType) return false;
    if (filterStatus === 'active' && l.status !== 'active') return false;
    if (filterStatus === 'expired' && l.status !== 'expired') return false;
    if (filterStatus === 'expiring' && l.status === 'active' && daysUntil(l.expiry_date) > 30) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'متابعة التراخيص' : 'License Tracker'}</h1>
        <p className="text-sm text-slate-500 mt-1">{filtered.length} {lang === 'ar' ? 'ترخيص' : 'licenses'}</p>
      </div>

      {isReadOnly && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-sm">
          <span>🔒</span>
          <span>{lang === 'ar' ? 'وضع العرض فقط' : 'View Only Mode'}</span>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-48">
          <option value="">{lang === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
          {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-48">
          <option value="">{lang === 'ar' ? 'كل الحالات' : 'All Status'}</option>
          <option value="active">{lang === 'ar' ? 'نشط' : 'Active'}</option>
          <option value="expired">{lang === 'ar' ? 'منتهي' : 'Expired'}</option>
          <option value="expiring">{lang === 'ar' ? 'ينتهي قريباً' : 'Expiring Soon'}</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl block mb-3">📜</span>
            <p className="font-medium">{lang === 'ar' ? 'لا توجد تراخيص' : 'No licenses found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الكيان' : 'Entity'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الرقم' : 'Number'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'المتبقي' : 'Remaining'}</th>
                  <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((l: any) => {
                  const entity = entityMap.get(l.entity_id);
                  const badge = l.expiry_date ? expiryBadge(l.expiry_date, lang) : null;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{entity?.name_ar || '—'}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs font-medium bg-eagle-50 text-eagle-700">{typeLabels[l.license_type]?.[lang] || l.license_type}</span></td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{l.license_number || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{l.expiry_date || '—'}</td>
                      <td className="px-4 py-3">{badge ? <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.cls}`}>{badge.text}</span> : '—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${l.status === 'active' ? 'bg-emerald-50 text-emerald-700' : l.status === 'expired' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{l.status}</span></td>
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
