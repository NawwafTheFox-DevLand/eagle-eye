'use client';
import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { exportToCSV } from '@/lib/utils/export';

const ENTITY_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  ministry:        { ar: 'وزارة',            en: 'Ministry'        },
  municipality:    { ar: 'بلدية',            en: 'Municipality'    },
  chamber:         { ar: 'غرفة تجارية',      en: 'Chamber'         },
  regulatory:      { ar: 'جهة تنظيمية',      en: 'Regulatory Body' },
  court:           { ar: 'محكمة',            en: 'Court'           },
  customs:         { ar: 'جمارك',            en: 'Customs'         },
  other:           { ar: 'أخرى',             en: 'Other'           },
};

interface Props {
  entities: any[];
  error: string | null;
}

export default function GREntitiesClient({ entities, error }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [search, setSearch] = useState('');

  const filtered = entities.filter(e => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.name_ar?.toLowerCase().includes(q) || e.name_en?.toLowerCase().includes(q) || e.entity_number?.toLowerCase().includes(q);
  });

  function handleExport() {
    exportToCSV(filtered.map(e => ({
      [isAr ? 'الاسم' : 'Name']: isAr ? e.name_ar : (e.name_en || e.name_ar),
      [isAr ? 'النوع' : 'Type']: e.entity_type,
      [isAr ? 'الرقم' : 'Number']: e.entity_number || '',
      [isAr ? 'جهة الاتصال' : 'Contact']: e.contact_name || '',
      [isAr ? 'الهاتف' : 'Phone']: e.contact_phone || '',
    })), 'gr-entities');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'الجهات الحكومية' : 'Government Entities'}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAr ? `${filtered.length} جهة` : `${filtered.length} entities`}
          </p>
        </div>
        <button onClick={handleExport} className="text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
          {isAr ? '⬇ تصدير' : '⬇ Export'}
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          {isAr ? 'تعذّر تحميل البيانات. تأكد من وجود جدول gr_entities.' : 'Failed to load. Ensure gr_entities table exists.'}
        </div>
      )}

      <div className="relative">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={isAr ? 'ابحث...' : 'Search...'}
          className="input-field w-full text-sm ps-9" />
        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">🏛️</p>
          <p className="text-slate-500 text-sm">{isAr ? 'لا توجد جهات' : 'No entities found'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>{isAr ? 'الجهة' : 'Entity'}</span>
            <span>{isAr ? 'النوع' : 'Type'}</span>
            <span>{isAr ? 'الرقم' : 'Number'}</span>
            <span>{isAr ? 'جهة الاتصال' : 'Contact'}</span>
            <span>{isAr ? 'الحالة' : 'Status'}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map(entity => {
              const typeLabel = ENTITY_TYPE_LABELS[entity.entity_type];
              return (
                <div key={entity.id} className="grid md:grid-cols-[2fr_1fr_1fr_1.5fr_auto] gap-3 px-5 py-3.5 items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{isAr ? entity.name_ar : (entity.name_en || entity.name_ar)}</p>
                    {entity.name_en && entity.name_ar && (
                      <p className="text-xs text-slate-400">{isAr ? entity.name_en : entity.name_ar}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-600">
                    {typeLabel ? (isAr ? typeLabel.ar : typeLabel.en) : entity.entity_type}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{entity.entity_number || '—'}</span>
                  <span className="text-xs text-slate-600 truncate">{entity.contact_name || '—'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${entity.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {entity.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
