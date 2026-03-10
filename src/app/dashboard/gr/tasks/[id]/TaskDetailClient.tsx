'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { completeGRTaskStep, updateGRTask } from '@/app/actions/gr';

const taskTypeIcons: Record<string, string> = {
  annual_renewal: '🔄',
  issuance: '📝',
  cancellation: '❌',
  inquiry: '❓',
  violation: '⚠️',
  workshop: '📚',
  investigation: '🔍',
  committee: '👥',
};

const taskTypeLabels: Record<string, { ar: string; en: string }> = {
  annual_renewal: { ar: 'تجديد سنوي', en: 'Annual Renewal' },
  issuance: { ar: 'إصدار وتعديل', en: 'Issuance' },
  cancellation: { ar: 'شطب ونقل', en: 'Cancellation' },
  inquiry: { ar: 'استعلام', en: 'Inquiry' },
  violation: { ar: 'مخالفة', en: 'Violation' },
  workshop: { ar: 'ورشة عمل', en: 'Workshop' },
  investigation: { ar: 'تحقيق', en: 'Investigation' },
  committee: { ar: 'لجنة', en: 'Committee' },
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_manager: 'bg-amber-100 text-amber-700',
  pending_finance: 'bg-blue-100 text-blue-700',
  pending_banking: 'bg-violet-100 text-violet-700',
  in_progress: 'bg-cyan-100 text-cyan-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

interface Props {
  task: any;
  steps: any[];
  entity: any;
  empMap: Record<string, any>;
}

function StepRow({ step, lang, empMap }: { step: any; lang: 'ar' | 'en'; empMap: Record<string, any> }) {
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const isCompleted = step.status === 'completed';
  const isPendingStep = step.status === 'pending' || step.status === 'in_progress';

  function handleComplete() {
    setError('');
    startTransition(async () => {
      try {
        await completeGRTaskStep(step.id, notes);
        window.location.reload();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  return (
    <div className={`flex gap-4 ${isCompleted ? 'opacity-80' : ''}`}>
      {/* Step circle */}
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCompleted ? 'bg-emerald-500 text-white' : isPendingStep ? 'bg-blue-500 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
          {isCompleted ? '✓' : step.step_order}
        </div>
        <div className="w-0.5 flex-1 bg-slate-100 mt-1 mb-1 min-h-[2rem]" />
      </div>
      {/* Step content */}
      <div className="flex-1 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-slate-900">{step.step_name}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isCompleted ? 'bg-emerald-100 text-emerald-700' : isPendingStep ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
            {isCompleted ? (lang === 'ar' ? 'مكتمل' : 'Completed') : isPendingStep ? (lang === 'ar' ? 'قيد التنفيذ' : 'In Progress') : (lang === 'ar' ? 'لم يبدأ' : 'Pending')}
          </span>
        </div>
        {step.actor_role && <p className="text-xs text-slate-500">{lang === 'ar' ? 'الدور:' : 'Role:'} {step.actor_role}</p>}
        {step.actor_id && empMap[step.actor_id] && (
          <p className="text-xs text-slate-500">{lang === 'ar' ? 'المنفذ:' : 'Actor:'} {lang === 'ar' ? empMap[step.actor_id].full_name_ar : empMap[step.actor_id].full_name_en || empMap[step.actor_id].full_name_ar}</p>
        )}
        {step.completed_at && (
          <p className="text-xs text-emerald-600 mt-0.5">
            {lang === 'ar' ? 'أُكمل في:' : 'Completed:'} {formatDateTime(step.completed_at, lang)}
          </p>
        )}
        {step.notes && <p className="text-xs text-slate-600 mt-1 italic">{step.notes}</p>}

        {/* Complete step form for pending steps */}
        {isPendingStep && (
          <div className="mt-2 space-y-2">
            {error && <p className="text-xs text-red-600">{error}</p>}
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={lang === 'ar' ? 'ملاحظات (اختياري)...' : 'Notes (optional)...'}
              rows={2}
              className="input-field text-xs w-full"
            />
            <button
              onClick={handleComplete}
              disabled={isPending}
              className="btn-primary text-xs px-4 py-1.5 disabled:opacity-50"
            >
              {isPending ? (lang === 'ar' ? 'جاري...' : 'Saving...') : (lang === 'ar' ? 'إكمال هذه الخطوة' : 'Complete this step')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TaskDetailClient({ task, steps, entity, empMap }: Props) {
  const { lang } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const icon = taskTypeIcons[task.task_type] || '📋';
  const typeLabel = taskTypeLabels[task.task_type]?.[lang] || task.task_type;
  const assignee = task.assigned_to ? empMap[task.assigned_to] : null;
  const requester = task.requested_by ? empMap[task.requested_by] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <Link href="/dashboard/gr/tasks" className="text-sm text-slate-500 hover:text-slate-700">
        {lang === 'ar' ? '← المهام' : '← Tasks'}
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-sm text-slate-400" dir="ltr">{task.task_number}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status] || 'bg-slate-100 text-slate-600'}`}>{task.status}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority] || 'bg-slate-100 text-slate-600'}`}>{task.priority}</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900">{task.title}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{icon} {typeLabel}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Steps */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-6">{lang === 'ar' ? 'خطوات المهمة' : 'Task Steps'}</h2>
            {steps.length === 0 ? (
              <p className="text-sm text-slate-400">{lang === 'ar' ? 'لا توجد خطوات مسجلة' : 'No steps recorded'}</p>
            ) : (
              <div>
                {steps.map((step: any) => (
                  <StepRow key={step.id} step={step} lang={lang} empMap={empMap} />
                ))}
              </div>
            )}
          </div>

          {/* Documents */}
          {(task.payment_receipt_url || task.final_document_url || task.notes) && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'المستندات والملاحظات' : 'Documents & Notes'}</h2>
              {task.payment_receipt_url && (
                <a href={task.payment_receipt_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-2">
                  <span>📄</span> {lang === 'ar' ? 'إيصال الدفع' : 'Payment Receipt'}
                </a>
              )}
              {task.final_document_url && (
                <a href={task.final_document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 mb-2">
                  <span>📋</span> {lang === 'ar' ? 'الوثيقة النهائية' : 'Final Document'}
                </a>
              )}
              {task.notes && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 text-sm text-slate-600">
                  <p className="text-xs font-medium text-slate-500 mb-1">{lang === 'ar' ? 'ملاحظات' : 'Notes'}</p>
                  <p>{task.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">{lang === 'ar' ? 'التفاصيل' : 'Details'}</h2>

            {entity && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{lang === 'ar' ? 'الكيان' : 'Entity'}</p>
                <p className="text-sm font-medium text-slate-900">{lang === 'ar' ? entity.name_ar : entity.name_en || entity.name_ar}</p>
              </div>
            )}

            {assignee && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{lang === 'ar' ? 'المسؤول' : 'Assigned To'}</p>
                <p className="text-sm font-medium text-slate-900">{lang === 'ar' ? assignee.full_name_ar : assignee.full_name_en || assignee.full_name_ar}</p>
              </div>
            )}

            {requester && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{lang === 'ar' ? 'مقدم الطلب' : 'Requested By'}</p>
                <p className="text-sm font-medium text-slate-900">{lang === 'ar' ? requester.full_name_ar : requester.full_name_en || requester.full_name_ar}</p>
              </div>
            )}

            {task.due_date && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{lang === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</p>
                <p className="text-sm font-medium text-slate-900">{formatDate(task.due_date, lang)}</p>
              </div>
            )}

            {task.created_at && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{lang === 'ar' ? 'تاريخ الإنشاء' : 'Created At'}</p>
                <p className="text-sm font-medium text-slate-900">{formatDateTime(task.created_at, lang)}</p>
              </div>
            )}

            {task.invoice_amount && (
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{lang === 'ar' ? 'مبلغ الفاتورة' : 'Invoice Amount'}</p>
                <p className="text-sm font-medium text-slate-900">{formatCurrency(parseFloat(task.invoice_amount), 'SAR', lang)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
