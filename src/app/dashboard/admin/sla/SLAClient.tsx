'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';

export default function SLAClient({ configs, requests }: any) {
  const { lang } = useLanguage();

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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.map((s: any) => (
                <tr key={s.request_type} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{lang === 'ar' ? s.name_ar : s.name_en}</td>
                  <td className="px-4 py-3 text-slate-600">{s.default_sla_target_hours}h</td>
                  <td className="px-4 py-3 text-slate-600">{s.default_sla_max_hours}h</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
