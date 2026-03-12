'use client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { exportToCSV } from '@/lib/utils/export';

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  upcoming:   { ar: 'قادمة',    en: 'Upcoming'   },
  held:       { ar: 'منعقدة',   en: 'Held'       },
  cancelled:  { ar: 'ملغاة',    en: 'Cancelled'  },
  postponed:  { ar: 'مؤجلة',    en: 'Postponed'  },
};

const STATUS_COLORS: Record<string, string> = {
  upcoming:  'bg-blue-100 text-blue-700',
  held:      'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  postponed: 'bg-amber-100 text-amber-700',
};

interface Props {
  committees: any[];
  error: string | null;
}

export default function GRCommitteesClient({ committees, error }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  function handleExport() {
    exportToCSV(committees.map(c => ({
      [isAr ? 'الاسم' : 'Name']: c.committee_name || '',
      [isAr ? 'الغرض' : 'Purpose']: c.purpose || '',
      [isAr ? 'تاريخ الاجتماع' : 'Meeting Date']: c.meeting_date || '',
      [isAr ? 'الحالة' : 'Status']: c.status || '',
    })), 'gr-committees');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'اللجان' : 'Committees'}</h1>
          <p className="text-slate-500 text-sm mt-1">{isAr ? `${committees.length} لجنة` : `${committees.length} committees`}</p>
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

      {committees.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-slate-500 text-sm">{isAr ? 'لا توجد لجان' : 'No committees found'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_2fr_1.5fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>{isAr ? 'اللجنة' : 'Committee'}</span>
            <span>{isAr ? 'الغرض' : 'Purpose'}</span>
            <span>{isAr ? 'تاريخ الاجتماع' : 'Meeting Date'}</span>
            <span>{isAr ? 'الحالة' : 'Status'}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {committees.map(c => {
              const statusLabel = STATUS_LABELS[c.status];
              return (
                <div key={c.id} className="grid md:grid-cols-[2fr_2fr_1.5fr_auto] gap-3 px-5 py-3.5 items-center">
                  <p className="text-sm font-semibold text-slate-800">{c.committee_name || '—'}</p>
                  <p className="text-sm text-slate-600 truncate">{c.purpose || '—'}</p>
                  <span className="text-xs text-slate-500">
                    {c.meeting_date ? new Date(c.meeting_date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${STATUS_COLORS[c.status] || 'bg-slate-100 text-slate-600'}`}>
                    {statusLabel ? (isAr ? statusLabel.ar : statusLabel.en) : c.status}
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
