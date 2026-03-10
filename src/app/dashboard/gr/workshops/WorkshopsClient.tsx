'use client';
import { useState, useTransition } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDate } from '@/lib/utils';
import { createGRWorkshop } from '@/app/actions/gr';

interface Props {
  workshops: any[];
}

export default function WorkshopsClient({ workshops: initialWorkshops }: Props) {
  const { lang } = useLanguage();
  const [workshops, setWorkshops] = useState(initialWorkshops);
  const [showNew, setShowNew] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    workshop_title: '',
    organizing_authority: '',
    workshop_date: '',
    summary_points: '',
    recommendations: '',
  });

  function handleCreate() {
    if (!form.workshop_title) return;
    setError('');
    startTransition(async () => {
      try {
        const workshopData = {
          workshop_title: form.workshop_title,
          organizing_authority: form.organizing_authority || null,
          workshop_date: form.workshop_date || null,
          summary_points: form.summary_points
            ? form.summary_points.split('\n').map(s => s.trim()).filter(Boolean)
            : [],
          recommendations: form.recommendations
            ? form.recommendations.split('\n').map(s => s.trim()).filter(Boolean)
            : [],
        };
        const created = await createGRWorkshop(workshopData);
        setWorkshops([created, ...workshops]);
        setShowNew(false);
        setForm({ workshop_title: '', organizing_authority: '', workshop_date: '', summary_points: '', recommendations: '' });
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'ورش العمل' : 'Workshops'}</h1>
          <p className="text-sm text-slate-500 mt-1">{workshops.length} {lang === 'ar' ? 'ورشة' : 'workshops'}</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary text-sm">
          {showNew ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : (lang === 'ar' ? '➕ ورشة جديدة' : '➕ New Workshop')}
        </button>
      </div>

      {/* New Workshop Form */}
      {showNew && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 animate-slide-up">
          <h2 className="text-sm font-semibold text-slate-700">{lang === 'ar' ? 'إضافة ورشة عمل' : 'Add Workshop'}</h2>
          {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'عنوان الورشة' : 'Workshop Title'} *</label>
              <input
                value={form.workshop_title}
                onChange={e => setForm({ ...form, workshop_title: e.target.value })}
                className="input-field text-sm"
                placeholder={lang === 'ar' ? 'عنوان الورشة...' : 'Workshop title...'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'الجهة المنظمة' : 'Organizing Authority'}</label>
              <input
                value={form.organizing_authority}
                onChange={e => setForm({ ...form, organizing_authority: e.target.value })}
                className="input-field text-sm"
                placeholder={lang === 'ar' ? 'الجهة المنظمة...' : 'Organizing authority...'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'تاريخ الورشة' : 'Workshop Date'}</label>
              <input
                type="date"
                value={form.workshop_date}
                onChange={e => setForm({ ...form, workshop_date: e.target.value })}
                className="input-field text-sm"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'نقاط الملخص (سطر واحد لكل نقطة)' : 'Summary Points (one per line)'}</label>
              <textarea
                value={form.summary_points}
                onChange={e => setForm({ ...form, summary_points: e.target.value })}
                rows={4}
                className="input-field text-sm"
                placeholder={lang === 'ar' ? 'نقطة أولى\nنقطة ثانية...' : 'First point\nSecond point...'}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'التوصيات (سطر واحد لكل توصية)' : 'Recommendations (one per line)'}</label>
              <textarea
                value={form.recommendations}
                onChange={e => setForm({ ...form, recommendations: e.target.value })}
                rows={4}
                className="input-field text-sm"
                placeholder={lang === 'ar' ? 'توصية أولى\nتوصية ثانية...' : 'First recommendation\nSecond recommendation...'}
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending || !form.workshop_title}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {isPending ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ الورشة' : 'Save Workshop')}
          </button>
        </div>
      )}

      {/* Workshops list */}
      {workshops.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <span className="text-4xl block mb-3">📚</span>
          <p className="font-medium">{lang === 'ar' ? 'لا توجد ورش عمل مسجلة' : 'No workshops recorded'}</p>
          <p className="text-xs mt-1">{lang === 'ar' ? 'أضف ورشة جديدة من الزر أعلاه' : 'Add a new workshop using the button above'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workshops.map((w: any) => {
            const isExpanded = expandedId === w.id;
            const summaryPoints: string[] = Array.isArray(w.summary_points) ? w.summary_points : [];
            const recommendations: string[] = Array.isArray(w.recommendations) ? w.recommendations : [];
            return (
              <div key={w.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                  className="w-full px-6 py-4 flex items-center gap-4 text-start hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : w.id)}
                >
                  <span className="text-2xl shrink-0">📚</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{w.workshop_title}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      {w.organizing_authority && (
                        <span className="text-xs text-slate-500">{w.organizing_authority}</span>
                      )}
                      {w.workshop_date && (
                        <span className="text-xs text-slate-400">{formatDate(w.workshop_date, lang)}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-slate-400 text-sm shrink-0">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 space-y-4 border-t border-slate-50">
                    {summaryPoints.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 mb-2 mt-4">{lang === 'ar' ? 'نقاط الملخص' : 'Summary Points'}</h4>
                        <ul className="space-y-1">
                          {summaryPoints.map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {recommendations.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 mb-2">{lang === 'ar' ? 'التوصيات' : 'Recommendations'}</h4>
                        <ul className="space-y-1">
                          {recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                              <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {w.document_url && (
                      <a
                        href={w.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <span>📄</span> {lang === 'ar' ? 'تحميل المستند' : 'Download Document'}
                      </a>
                    )}
                    {summaryPoints.length === 0 && recommendations.length === 0 && !w.document_url && (
                      <p className="text-sm text-slate-400 mt-4">{lang === 'ar' ? 'لا توجد تفاصيل إضافية' : 'No additional details'}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
