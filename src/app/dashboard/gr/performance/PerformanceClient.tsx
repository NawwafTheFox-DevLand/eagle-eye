'use client';
import { useMemo } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatCurrency } from '@/lib/utils';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

const TASK_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  annual_renewal: { ar: 'تجديد سنوي', en: 'Annual Renewal' },
  issuance: { ar: 'إصدار', en: 'Issuance' },
  cancellation: { ar: 'شطب', en: 'Cancellation' },
  inquiry: { ar: 'استعلام', en: 'Inquiry' },
  violation: { ar: 'مخالفة', en: 'Violation' },
  workshop: { ar: 'ورشة عمل', en: 'Workshop' },
  investigation: { ar: 'تحقيق', en: 'Investigation' },
  committee: { ar: 'لجنة', en: 'Committee' },
};

const PATH_LABELS: Record<string, { ar: string; en: string }> = {
  direct_payment: { ar: 'سداد مباشر', en: 'Direct Payment' },
  objection: { ar: 'اعتراض', en: 'Objection' },
  settlement: { ar: 'تسوية', en: 'Settlement' },
};

const BAR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

interface Props {
  data: {
    tasks: any[];
    violations: any[];
    employees: any[];
  };
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function PerformanceClient({ data }: Props) {
  const { lang } = useLanguage();
  const { tasks, violations } = data;

  const completedTasks = useMemo(() => tasks.filter((t: any) => t.status === 'completed'), [tasks]);
  const inProgressTasks = useMemo(() => tasks.filter((t: any) => !['completed', 'cancelled'].includes(t.status)), [tasks]);
  const onTimeTasks = useMemo(() => completedTasks.filter((t: any) => t.is_on_time === true), [completedTasks]);
  const onTimeRate = completedTasks.length > 0 ? Math.round((onTimeTasks.length / completedTasks.length) * 100) : 0;
  const totalViolationAmount = useMemo(() => violations.reduce((s: number, v: any) => s + (parseFloat(v.violation_amount) || 0), 0), [violations]);

  // Chart 1: On-time vs Late pie
  const onTimePieData = useMemo(() => {
    const late = completedTasks.filter((t: any) => t.is_on_time === false).length;
    return [
      { name: lang === 'ar' ? 'في الوقت' : 'On Time', value: onTimeTasks.length },
      { name: lang === 'ar' ? 'متأخر' : 'Late', value: late },
    ].filter(d => d.value > 0);
  }, [completedTasks, onTimeTasks, lang]);

  // Chart 2: Tasks by type bar
  const tasksByTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t: any) => { counts[t.task_type] = (counts[t.task_type] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({
      name: TASK_TYPE_LABELS[type]?.[lang] || type,
      count,
    })).sort((a, b) => b.count - a.count);
  }, [tasks, lang]);

  // Chart 3: Monthly completions last 6 months
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', year: '2-digit' });
      months.push({ key, label, count: 0 });
    }
    completedTasks.forEach((t: any) => {
      if (!t.completed_at) return;
      const d = new Date(t.completed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const m = months.find(m => m.key === key);
      if (m) m.count++;
    });
    return months;
  }, [completedTasks, lang]);

  // Chart 4: Violation amounts by resolution path
  const violationByPathData = useMemo(() => {
    const sums: Record<string, number> = {};
    violations.forEach((v: any) => {
      if (!v.resolution_path) return;
      sums[v.resolution_path] = (sums[v.resolution_path] || 0) + (parseFloat(v.violation_amount) || 0);
    });
    return Object.entries(sums).map(([path, amount]) => ({
      name: PATH_LABELS[path]?.[lang] || path,
      amount: Math.round(amount),
    }));
  }, [violations, lang]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'لوحة الأداء' : 'Performance Dashboard'}</h1>
        <p className="text-sm text-slate-500 mt-1">{lang === 'ar' ? 'إحصاءات وتحليلات أداء فريق العلاقات الحكومية' : 'GR team performance statistics and analytics'}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          label={lang === 'ar' ? 'المهام المكتملة' : 'Completed Tasks'}
          value={completedTasks.length}
          sub={lang === 'ar' ? `من ${tasks.length} إجمالي` : `of ${tasks.length} total`}
        />
        <SummaryCard
          label={lang === 'ar' ? 'نسبة الإنجاز في الوقت' : 'On-Time Rate'}
          value={`${onTimeRate}%`}
          sub={lang === 'ar' ? `${onTimeTasks.length} مهمة في الوقت` : `${onTimeTasks.length} on-time tasks`}
        />
        <SummaryCard
          label={lang === 'ar' ? 'المهام قيد التنفيذ' : 'Tasks In Progress'}
          value={inProgressTasks.length}
        />
        <SummaryCard
          label={lang === 'ar' ? 'إجمالي المخالفات (ريال)' : 'Total Violations (SAR)'}
          value={formatCurrency(totalViolationAmount, 'SAR', lang)}
          sub={`${violations.length} ${lang === 'ar' ? 'مخالفة' : 'violations'}`}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Pie */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'الإنجاز في الوقت مقابل التأخير' : 'On-Time vs Late'}</h2>
          {onTimePieData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={onTimePieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 2: Tasks by type */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'المهام حسب النوع' : 'Tasks by Type'}</h2>
          {tasksByTypeData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tasksByTypeData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name={lang === 'ar' ? 'العدد' : 'Count'} radius={[4, 4, 0, 0]}>
                  {tasksByTypeData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Monthly completions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'الإنجاز الشهري (آخر 6 أشهر)' : 'Monthly Completions (Last 6 Months)'}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name={lang === 'ar' ? 'المهام المكتملة' : 'Completed Tasks'} fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Violation amounts by path */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'مبالغ المخالفات حسب المسار' : 'Violation Amounts by Resolution Path'}</h2>
          {violationByPathData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-sm">{lang === 'ar' ? 'لا توجد بيانات' : 'No data'}</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={violationByPathData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(value: number) => [formatCurrency(value, 'SAR', lang), lang === 'ar' ? 'الإجمالي' : 'Total']} />
                <Bar dataKey="amount" name={lang === 'ar' ? 'المبلغ (ريال)' : 'Amount (SAR)'} radius={[4, 4, 0, 0]}>
                  <Cell fill="#ef4444" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#8b5cf6" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
