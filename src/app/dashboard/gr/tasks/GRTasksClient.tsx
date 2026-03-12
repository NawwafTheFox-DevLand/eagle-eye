'use client';
import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { updateGRTaskStatus, createGRTask } from '@/app/actions/gr';
import { exportToCSV } from '@/lib/utils/export';

const TASK_TYPES: Record<string, { ar: string; en: string }> = {
  annual_renewal:  { ar: 'تجديد سنوي',         en: 'Annual Renewal'   },
  issuance:        { ar: 'استخراج',              en: 'Issuance'         },
  cancellation:    { ar: 'إلغاء',               en: 'Cancellation'     },
  inquiry:         { ar: 'استفسار',              en: 'Inquiry'          },
  violation:       { ar: 'معالجة مخالفة',        en: 'Violation'        },
  workshop:        { ar: 'ورشة عمل',             en: 'Workshop'         },
  investigation:   { ar: 'تحقيق',               en: 'Investigation'    },
  committee:       { ar: 'لجنة',                en: 'Committee'        },
};

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  pending:     { ar: 'معلق',     en: 'Pending'     },
  in_progress: { ar: 'جارٍ',    en: 'In Progress' },
  completed:   { ar: 'مكتمل',   en: 'Completed'   },
  cancelled:   { ar: 'ملغي',    en: 'Cancelled'   },
};

const STATUS_COLORS: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-slate-100 text-slate-500',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600', normal: 'bg-blue-50 text-blue-600',
  high: 'bg-amber-100 text-amber-700', urgent: 'bg-red-100 text-red-700',
};

interface Props {
  tasks: any[];
  empMap: Record<string, any>;
  error: string | null;
}

export default function GRTasksClient({ tasks, empMap, error }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({ task_type: 'annual_renewal', title_ar: '', title_en: '', priority: 'normal', due_date: '', notes: '' });

  const filtered = useMemo(() => tasks.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (typeFilter && t.task_type !== typeFilter) return false;
    return true;
  }), [tasks, statusFilter, typeFilter]);

  const getName = (id: string | null) => {
    if (!id) return '—';
    const e = empMap[id];
    return e ? (isAr ? e.full_name_ar : (e.full_name_en || e.full_name_ar)) : '—';
  };

  async function handleCreate() {
    if (!form.title_ar.trim()) { setCreateError(isAr ? 'الاسم العربي مطلوب' : 'Arabic title required'); return; }
    setCreating(true); setCreateError('');
    const result = await createGRTask(form);
    setCreating(false);
    if (result.error) { setCreateError(result.error); return; }
    setShowCreate(false);
    setForm({ task_type: 'annual_renewal', title_ar: '', title_en: '', priority: 'normal', due_date: '', notes: '' });
    startTransition(() => router.refresh());
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    await updateGRTaskStatus(taskId, newStatus);
    startTransition(() => router.refresh());
  }

  function handleExport() {
    exportToCSV(filtered.map(t => ({
      [isAr ? 'العنوان' : 'Title']: isAr ? t.title_ar : (t.title_en || t.title_ar),
      [isAr ? 'النوع' : 'Type']: t.task_type,
      [isAr ? 'الأولوية' : 'Priority']: t.priority,
      [isAr ? 'الحالة' : 'Status']: t.status,
      [isAr ? 'تاريخ الاستحقاق' : 'Due Date']: t.due_date || '',
      [isAr ? 'المكلف' : 'Assigned To']: getName(t.assigned_to),
    })), 'gr-tasks');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'المهام' : 'Tasks'}</h1>
          <p className="text-slate-500 text-sm mt-1">{isAr ? `${filtered.length} مهمة` : `${filtered.length} tasks`}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={handleExport} className="text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            {isAr ? '⬇ تصدير' : '⬇ Export'}
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2 px-4">
            {isAr ? '+ مهمة جديدة' : '+ New Task'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          {isAr ? 'تعذّر تحميل البيانات.' : 'Failed to load data.'}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">{isAr ? 'إنشاء مهمة جديدة' : 'Create New Task'}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{isAr ? 'النوع' : 'Type'}</label>
              <select value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))} className="input-field text-sm w-full">
                {Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{isAr ? v.ar : v.en}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{isAr ? 'الأولوية' : 'Priority'}</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="input-field text-sm w-full">
                <option value="low">{isAr ? 'منخفض' : 'Low'}</option>
                <option value="normal">{isAr ? 'عادي' : 'Normal'}</option>
                <option value="high">{isAr ? 'مهم' : 'High'}</option>
                <option value="urgent">{isAr ? 'عاجل' : 'Urgent'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{isAr ? 'العنوان (عربي) *' : 'Title (Arabic) *'}</label>
              <input value={form.title_ar} onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))} className="input-field text-sm w-full" dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{isAr ? 'العنوان (إنجليزي)' : 'Title (English)'}</label>
              <input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{isAr ? 'تاريخ الاستحقاق' : 'Due Date'}</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="input-field text-sm w-full" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field text-sm w-full" />
            </div>
          </div>
          {createError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{createError}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating || isPending} className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
              {creating ? '...' : (isAr ? 'إنشاء' : 'Create')}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-sm px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors">
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{isAr ? v.ar : v.en}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">{isAr ? 'كل الأنواع' : 'All Types'}</option>
          {Object.entries(TASK_TYPES).map(([k, v]) => <option key={k} value={k}>{isAr ? v.ar : v.en}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-slate-500 text-sm">{isAr ? 'لا توجد مهام' : 'No tasks found'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>{isAr ? 'المهمة' : 'Task'}</span>
            <span>{isAr ? 'النوع' : 'Type'}</span>
            <span>{isAr ? 'الأولوية' : 'Priority'}</span>
            <span>{isAr ? 'الحالة' : 'Status'}</span>
            <span>{isAr ? 'المكلف' : 'Assigned'}</span>
            <span>{isAr ? 'الاستحقاق' : 'Due'}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map(task => {
              const typeLabel = TASK_TYPES[task.task_type];
              const statusLabel = STATUS_LABELS[task.status];
              return (
                <div key={task.id} className="grid md:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_auto] gap-3 px-5 py-3.5 items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 truncate">{isAr ? task.title_ar : (task.title_en || task.title_ar)}</p>
                    {task.notes && <p className="text-xs text-slate-400 truncate">{task.notes}</p>}
                  </div>
                  <span className="text-xs text-slate-600">{typeLabel ? (isAr ? typeLabel.ar : typeLabel.en) : task.task_type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${PRIORITY_COLORS[task.priority] || ''}`}>
                    {task.priority}
                  </span>
                  <select
                    value={task.status}
                    onChange={e => handleStatusChange(task.id, e.target.value)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer focus:ring-1 focus:ring-blue-400 ${STATUS_COLORS[task.status] || 'bg-slate-100'}`}
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-600 truncate">{getName(task.assigned_to)}</span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' }) : '—'}
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
