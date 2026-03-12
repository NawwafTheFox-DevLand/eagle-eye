'use client';
import { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { exportToCSV } from '@/lib/utils/export';

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function expiryBadge(days: number | null): string {
  if (days === null) return 'bg-slate-100 text-slate-500';
  if (days < 0)   return 'bg-red-100 text-red-700';
  if (days <= 30) return 'bg-red-100 text-red-700';
  if (days <= 90) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  active:   { ar: 'نشط',     en: 'Active'   },
  expired:  { ar: 'منتهي',   en: 'Expired'  },
  pending:  { ar: 'معلق',    en: 'Pending'  },
  cancelled:{ ar: 'ملغي',    en: 'Cancelled'},
};

interface Props {
  licenses: any[];
  error: string | null;
}

export default function GRLicensesClient({ licenses, error }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => licenses.filter(l => {
    if (statusFilter && l.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.license_number?.toLowerCase().includes(q)
      || l.license_name_ar?.toLowerCase().includes(q)
      || l.license_name_en?.toLowerCase().includes(q)
      || l.authority?.toLowerCase().includes(q);
  }), [licenses, search, statusFilter]);

  function handleExport() {
    exportToCSV(filtered.map(l => ({
      [isAr ? 'الرقم' : 'Number']: l.license_number || '',
      [isAr ? 'الاسم' : 'Name']: isAr ? (l.license_name_ar || '') : (l.license_name_en || l.license_name_ar || ''),
      [isAr ? 'النوع' : 'Type']: l.license_type || '',
      [isAr ? 'الجهة' : 'Authority']: l.authority || '',
      [isAr ? 'تاريخ الانتهاء' : 'Expiry']: l.expiry_date || '',
      [isAr ? 'الحالة' : 'Status']: l.status || '',
    })), 'gr-licenses');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'التراخيص والسجلات' : 'Licenses & Registrations'}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAr ? `${filtered.length} ترخيص` : `${filtered.length} licenses`}
          </p>
        </div>
        <button onClick={handleExport} className="text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
          {isAr ? '⬇ تصدير' : '⬇ Export'}
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          {isAr ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={isAr ? 'ابحث...' : 'Search...'}
            className="input-field w-full text-sm ps-9" />
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-slate-500 text-sm">{isAr ? 'لا توجد تراخيص' : 'No licenses found'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>{isAr ? 'الترخيص' : 'License'}</span>
            <span>{isAr ? 'النوع' : 'Type'}</span>
            <span>{isAr ? 'الجهة' : 'Authority'}</span>
            <span>{isAr ? 'الإصدار' : 'Issue Date'}</span>
            <span>{isAr ? 'الانتهاء' : 'Expiry'}</span>
            <span>{isAr ? 'الحالة' : 'Status'}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map(license => {
              const days = daysUntil(license.expiry_date);
              const statusLabel = STATUS_LABELS[license.status];
              return (
                <div key={license.id} className="grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3.5 items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {isAr ? (license.license_name_ar || license.license_name_en) : (license.license_name_en || license.license_name_ar)}
                    </p>
                    <p className="text-xs font-mono text-slate-400">{license.license_number}</p>
                  </div>
                  <span className="text-xs text-slate-600">{license.license_type || '—'}</span>
                  <span className="text-xs text-slate-600 truncate">{license.authority || '—'}</span>
                  <span className="text-xs text-slate-500">
                    {license.issue_date ? new Date(license.issue_date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </span>
                  <div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit block ${expiryBadge(days)}`}>
                      {license.expiry_date ? new Date(license.expiry_date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                    </span>
                    {days !== null && days <= 90 && (
                      <p className="text-[10px] text-red-600 mt-0.5">
                        {days < 0 ? (isAr ? `انتهى منذ ${Math.abs(days)} يوم` : `Expired ${Math.abs(days)}d ago`)
                          : (isAr ? `${days} يوم متبقٍ` : `${days}d left`)}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${license.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {statusLabel ? (isAr ? statusLabel.ar : statusLabel.en) : license.status}
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
