'use client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { exportToCSV } from '@/lib/utils/export';

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  open:       { ar: 'مفتوحة',   en: 'Open'      },
  resolved:   { ar: 'محلولة',   en: 'Resolved'  },
  appealing:  { ar: 'قيد الاستئناف', en: 'Appealing'},
  closed:     { ar: 'مغلقة',    en: 'Closed'    },
};

const STATUS_COLORS: Record<string, string> = {
  open:      'bg-red-100 text-red-700',
  resolved:  'bg-emerald-100 text-emerald-700',
  appealing: 'bg-amber-100 text-amber-700',
  closed:    'bg-slate-100 text-slate-500',
};

interface Props {
  violations: any[];
  error: string | null;
}

export default function GRViolationsClient({ violations, error }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  function handleExport() {
    exportToCSV(violations.map(v => ({
      [isAr ? 'رقم المخالفة' : 'Number']: v.violation_number || '',
      [isAr ? 'الوصف' : 'Description']: v.description || '',
      [isAr ? 'المبلغ' : 'Amount']: v.amount ?? '',
      [isAr ? 'الحالة' : 'Status']: v.status || '',
      [isAr ? 'تاريخ المخالفة' : 'Violation Date']: v.violation_date || '',
      [isAr ? 'تاريخ الاستحقاق' : 'Due Date']: v.due_date || '',
    })), 'gr-violations');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'المخالفات' : 'Violations'}</h1>
          <p className="text-slate-500 text-sm mt-1">{isAr ? `${violations.length} مخالفة` : `${violations.length} violations`}</p>
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

      {violations.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-slate-500 text-sm">{isAr ? 'لا توجد مخالفات' : 'No violations found'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>{isAr ? 'الرقم' : 'Number'}</span>
            <span>{isAr ? 'الوصف' : 'Description'}</span>
            <span>{isAr ? 'المبلغ' : 'Amount'}</span>
            <span>{isAr ? 'التاريخ' : 'Date'}</span>
            <span>{isAr ? 'الاستحقاق' : 'Due'}</span>
            <span>{isAr ? 'الحالة' : 'Status'}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {violations.map(v => {
              const statusLabel = STATUS_LABELS[v.status];
              return (
                <div key={v.id} className="grid md:grid-cols-[1fr_2fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3.5 items-center">
                  <span className="text-xs font-mono text-indigo-600">{v.violation_number || '—'}</span>
                  <p className="text-sm text-slate-700 truncate">{v.description || '—'}</p>
                  <span className="text-xs font-semibold text-slate-800">
                    {v.amount ? v.amount.toLocaleString() : '—'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {v.violation_date ? new Date(v.violation_date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {v.due_date ? new Date(v.due_date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${STATUS_COLORS[v.status] || 'bg-slate-100 text-slate-600'}`}>
                    {statusLabel ? (isAr ? statusLabel.ar : statusLabel.en) : v.status}
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
