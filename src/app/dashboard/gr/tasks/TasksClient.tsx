'use client';
import { useState, useTransition } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Link from 'next/link';
import { createGRTask, updateGRTaskStatus } from '@/app/actions/gr';
import { useRouter } from 'next/navigation';

const taskTypes: Record<string, { ar: string; en: string; icon: string }> = {
  annual_renewal: { ar: 'تجديد سنوي', en: 'Annual Renewal', icon: '🔄' },
  issuance: { ar: 'إصدار وتعديل', en: 'Issuance', icon: '📝' },
  cancellation: { ar: 'شطب ونقل', en: 'Cancellation', icon: '❌' },
  inquiry: { ar: 'استعلام', en: 'Inquiry', icon: '❓' },
  violation: { ar: 'مخالفة', en: 'Violation', icon: '⚠️' },
  workshop: { ar: 'ورشة عمل', en: 'Workshop', icon: '📚' },
  investigation: { ar: 'تحقيق', en: 'Investigation', icon: '🔍' },
  committee: { ar: 'لجنة', en: 'Committee', icon: '👥' },
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600', pending_manager: 'bg-amber-100 text-amber-700',
  pending_finance: 'bg-blue-100 text-blue-700', pending_banking: 'bg-violet-100 text-violet-700',
  in_progress: 'bg-cyan-100 text-cyan-700', completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

export default function TasksClient({ tasks, entities, employees }: any) {
  const { lang } = useLanguage();
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [form, setForm] = useState({ task_type: '', entity_id: '', title: '', description: '', priority: 'normal', assigned_to: '', due_date: '' });

  const entityMap = new Map(entities.map((e: any) => [e.id, e]));
  const empMap = new Map(employees.map((e: any) => [e.id, e]));
  const filtered = tasks.filter((t: any) => {
    if (filterType && t.task_type !== filterType) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  function handleCreate() {
    if (!form.task_type || !form.title) return;
    setError('');
    startTransition(async () => {
      try {
        await createGRTask(form);
        setShowNew(false); setForm({ task_type: '', entity_id: '', title: '', description: '', priority: 'normal', assigned_to: '', due_date: '' });
        router.refresh();
      } catch (e: any) { setError(e.message); }
    });
  }

  function handleStatusChange(taskId: string, newStatus: string) {
    startTransition(async () => { await updateGRTaskStatus(taskId, newStatus); router.refresh(); });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'مهام العلاقات الحكومية' : 'GR Tasks'}</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} {lang === 'ar' ? 'مهمة' : 'tasks'}</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary text-sm">
          {showNew ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : (lang === 'ar' ? '➕ مهمة جديدة' : '➕ New Task')}
        </button>
      </div>

      {showNew && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 animate-slide-up">
          {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'نوع المهمة' : 'Task Type'} *</label>
              <select value={form.task_type} onChange={e => setForm({ ...form, task_type: e.target.value })} className="input-field text-sm">
                <option value="">{lang === 'ar' ? 'اختر النوع' : 'Select type'}</option>
                {Object.entries(taskTypes).map(([k, v]) => <option key={k} value={k}>{v.icon} {v[lang]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'الكيان' : 'Entity'}</label>
              <select value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })} className="input-field text-sm">
                <option value="">{lang === 'ar' ? 'اختر الكيان' : 'Select entity'}</option>
                {entities.map((e: any) => <option key={e.id} value={e.id}>{e.name_ar}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'العنوان' : 'Title'} *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'المسؤول' : 'Assigned To'}</label>
              <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className="input-field text-sm">
                <option value="">{lang === 'ar' ? 'اختر الموظف' : 'Select employee'}</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.full_name_ar} ({e.employee_code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="input-field text-sm" dir="ltr" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={isPending || !form.task_type || !form.title} className="btn-primary text-sm disabled:opacity-50">
            {isPending ? (lang === 'ar' ? 'جاري...' : 'Creating...') : (lang === 'ar' ? 'إنشاء المهمة' : 'Create Task')}
          </button>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field w-44">
          <option value="">{lang === 'ar' ? 'كل الأنواع' : 'All Types'}</option>
          {Object.entries(taskTypes).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field w-44">
          <option value="">{lang === 'ar' ? 'كل الحالات' : 'All Status'}</option>
          <option value="draft">{lang === 'ar' ? 'مسودة' : 'Draft'}</option>
          <option value="in_progress">{lang === 'ar' ? 'قيد التنفيذ' : 'In Progress'}</option>
          <option value="completed">{lang === 'ar' ? 'مكتمل' : 'Completed'}</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl block mb-3">📋</span>
            <p className="font-medium">{lang === 'ar' ? 'لا توجد مهام' : 'No tasks'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((t: any) => {
              const entity = entityMap.get(t.entity_id);
              const assignee = empMap.get(t.assigned_to);
              const type = taskTypes[t.task_type];
              return (
                <div key={t.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50">
                  <span className="text-xl">{type?.icon || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs text-slate-400" dir="ltr">{t.task_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[t.status] || 'bg-slate-100 text-slate-600'}`}>{t.status}</span>
                    </div>
                    <Link href={`/dashboard/gr/tasks/${t.id}`} className="font-medium text-slate-900 hover:text-blue-700 hover:underline truncate block">{t.title}</Link>
                    <p className="text-xs text-slate-500 mt-0.5">{type?.[lang] || t.task_type} • {entity?.name_ar || '—'} • {assignee?.full_name_ar || '—'}</p>
                  </div>
                  {t.due_date && <span className="text-xs text-slate-400">{t.due_date}</span>}
                  {t.status !== 'completed' && t.status !== 'cancelled' && (
                    <button onClick={() => handleStatusChange(t.id, 'completed')} className="text-xs text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg font-medium">
                      {lang === 'ar' ? 'إكمال' : 'Complete'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
