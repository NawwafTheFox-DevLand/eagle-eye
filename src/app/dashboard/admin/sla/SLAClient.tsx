'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { updateSLAConfig } from '@/app/actions/admin';

export default function SLAClient({ configs, requests, isSuperAdmin }: any) {
  const { lang } = useLanguage();

  // editingRow: requestType string | null
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState('');
  const [editMax, setEditMax] = useState('');
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const [savedRow, setSavedRow] = useState<string | null>(null);

  const stats = configs.map((c: any) => {
    const typeReqs = requests.filter((r: any) => r.request_type === c.request_type);
    const total = typeReqs.length;
    const breached = typeReqs.filter((r: any) => r.sla_breached).length;
    const completed = typeReqs.filter((r: any) => ['completed', 'approved', 'rejected'].includes(r.status));
    let avgHours = 0;
    if (completed.length > 0) {
      const totalMs = completed.reduce((sum: number, r: any) => {
        if (r.completed_at && r.submitted_at) return sum + (new Date(r.completed_at).getTime() - new Date(r.submitted_at).getTime());
        return sum;
      }, 0);
      avgHours = Math.round(totalMs / completed.length / (1000 * 60 * 60));
    }
    return { ...c, total, breached, avgHours, breachRate: total > 0 ? Math.round((breached / total) * 100) : 0 };
  });

  const totalRequests = requests.length;
  const totalBreached = requests.filter((r: any) => r.sla_breached).length;
  const overallBreachRate = totalRequests > 0 ? Math.round((totalBreached / totalRequests) * 100) : 0;

  function startEdit(s: any) {
    setEditingRow(s.request_type);
    setEditTarget(String(s.default_sla_target_hours));
    setEditMax(String(s.default_sla_max_hours));
  }

  function cancelEdit() {
    setEditingRow(null);
    setEditTarget('');
    setEditMax('');
  }

  async function handleSave(requestType: string) {
    const target = parseInt(editTarget, 10);
    const max = parseInt(editMax, 10);
    if (!target || !max || target <= 0 || max <= 0) return;

    setSavingRow(requestType);
    try {
      await updateSLAConfig(requestType, target, max);
      setSavedRow(requestType);
      setEditingRow(null);
      setTimeout(() => setSavedRow(null), 3000);
    } finally {
      setSavingRow(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'أداء SLA' : 'SLA Performance'}</h1>
        <p className="text-sm text-slate-500 mt-1">{lang === 'ar' ? 'مراقبة مستوى الخدمة والالتزام بالمواعيد' : 'Service level monitoring and compliance'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card bg-blue-50 border-blue-100">
          <p className="text-xs font-medium text-slate-500 mb-1">{lang === 'ar' ? 'إجمالي الطلبات' : 'Total Requests'}</p>
          <p className="text-3xl font-bold text-slate-900">{totalRequests}</p>
        </div>
        <div className="kpi-card bg-emerald-50 border-emerald-100">
          <p className="text-xs font-medium text-slate-500 mb-1">{lang === 'ar' ? 'ملتزم بالـ SLA' : 'Within SLA'}</p>
          <p className="text-3xl font-bold text-emerald-700">{totalRequests - totalBreached}</p>
        </div>
        <div className="kpi-card bg-red-50 border-red-100">
          <p className="text-xs font-medium text-slate-500 mb-1">{lang === 'ar' ? 'تجاوز SLA' : 'SLA Breached'}</p>
          <p className="text-3xl font-bold text-red-700">{totalBreached}</p>
        </div>
        <div className="kpi-card bg-amber-50 border-amber-100">
          <p className="text-xs font-medium text-slate-500 mb-1">{lang === 'ar' ? 'نسبة التجاوز' : 'Breach Rate'}</p>
          <p className="text-3xl font-bold text-amber-700">{overallBreachRate}%</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{lang === 'ar' ? 'حسب نوع الطلب' : 'By Request Type'}</h2>
          {isSuperAdmin && (
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'ar' ? 'انقر "تعديل" لتغيير أهداف SLA' : 'Click "Edit" to update SLA targets'}
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'نوع الطلب' : 'Type'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الهدف' : 'Target'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الحد الأقصى' : 'Max'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'المتوسط' : 'Avg'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'العدد' : 'Total'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'تجاوز' : 'Breach'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الأداء' : 'Score'}</th>
                {isSuperAdmin && <th className="px-4 py-3 text-start font-medium text-slate-600"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.map((s: any) => {
                const isEditing = editingRow === s.request_type;
                const isSaving = savingRow === s.request_type;
                const justSaved = savedRow === s.request_type;
                return (
                  <tr key={s.request_type} className={`hover:bg-slate-50 transition-colors ${isEditing ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {lang === 'ar' ? s.name_ar : s.name_en}
                      {justSaved && (
                        <span className="ms-2 text-xs text-emerald-600">✓</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editTarget}
                          onChange={e => setEditTarget(e.target.value)}
                          min="1"
                          className="w-20 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        `${s.default_sla_target_hours}h`
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editMax}
                          onChange={e => setEditMax(e.target.value)}
                          min="1"
                          className="w-20 px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                      ) : (
                        `${s.default_sla_max_hours}h`
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={s.avgHours > s.default_sla_max_hours ? 'text-red-600 font-medium' : s.avgHours > s.default_sla_target_hours ? 'text-amber-600' : 'text-emerald-600'}>
                        {s.avgHours > 0 ? s.avgHours + 'h' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.total}</td>
                    <td className="px-4 py-3"><span className={s.breached > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>{s.breached}</span></td>
                    <td className="px-4 py-3">
                      {s.total > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className={'h-full rounded-full ' + (s.breachRate > 20 ? 'bg-red-500' : s.breachRate > 10 ? 'bg-amber-500' : 'bg-emerald-500')}
                              style={{ width: Math.min(100, 100 - s.breachRate) + '%' }} />
                          </div>
                          <span className="text-xs text-slate-500">{100 - s.breachRate}%</span>
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSave(s.request_type)}
                              disabled={isSaving}
                              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                            >
                              {isSaving ? '...' : (lang === 'ar' ? 'حفظ' : 'Save')}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-xs font-medium px-2 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                            >
                              {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(s)}
                            className="text-xs font-medium px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
