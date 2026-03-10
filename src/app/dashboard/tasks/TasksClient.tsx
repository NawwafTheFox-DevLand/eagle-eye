'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { relativeTime, formatDate, getPriorityColor, getStatusColor } from '@/lib/utils';

const typeLabels: Record<string, { ar: string; en: string }> = {
  general_internal:      { ar: 'طلب داخلي عام',       en: 'General Internal' },
  intercompany:          { ar: 'طلب بين الشركات',      en: 'Intercompany' },
  cross_department:      { ar: 'طلب بين الأقسام',      en: 'Cross-Department' },
  fund_disbursement:     { ar: 'صرف مالي',              en: 'Fund Disbursement' },
  leave_approval:        { ar: 'إجازة',                 en: 'Leave' },
  promotion:             { ar: 'ترقية',                 en: 'Promotion' },
  demotion_disciplinary: { ar: 'تأديبي',                en: 'Disciplinary' },
  create_department:     { ar: 'إنشاء قسم',             en: 'New Department' },
  create_company:        { ar: 'إنشاء شركة',            en: 'New Company' },
  create_position:       { ar: 'إنشاء وظيفة',           en: 'New Position' },
};

const statusLabels: Record<string, { ar: string; en: string }> = {
  in_progress:          { ar: 'قيد التنفيذ',       en: 'In Progress' },
  assigned_to_employee: { ar: 'مُسند إليك',         en: 'Assigned to You' },
  completed:            { ar: 'مكتمل',              en: 'Completed' },
};

const priorityLabels: Record<string, { ar: string; en: string }> = {
  low:    { ar: 'منخفض', en: 'Low' },
  normal: { ar: 'عادي',  en: 'Normal' },
  high:   { ar: 'عالي',  en: 'High' },
  urgent: { ar: 'عاجل',  en: 'Urgent' },
};

export interface TaskItem {
  requestId: string;
  requestNumber: string;
  subject: string;
  requestType: string;
  status: string;
  priority: string;
  createdAt: string;
  requesterNameAr: string;
  requesterNameEn: string | null;
  companyNameAr: string;
  companyNameEn: string | null;
  assignedByNameAr: string;
  assignedByNameEn: string | null;
  assignedAt: string;
  isAutoAssigned: boolean;
}

interface Props {
  activeTasks: TaskItem[];
  completedTasks: TaskItem[];
  currentEmployeeId: string;
}

export default function TasksClient({ activeTasks, completedTasks }: Props) {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const isAr = lang === 'ar';

  function TaskCard({ task, isCompleted }: { task: TaskItem; isCompleted: boolean }) {
    const requesterName = isAr ? task.requesterNameAr : (task.requesterNameEn || task.requesterNameAr);
    const companyName   = isAr ? task.companyNameAr   : (task.companyNameEn   || task.companyNameAr);
    const assignedBy    = isAr ? task.assignedByNameAr : (task.assignedByNameEn || task.assignedByNameAr);
    const typeLabel     = typeLabels[task.requestType]?.[lang] || task.requestType;
    const statusLabel   = statusLabels[task.status]?.[lang] || task.status;
    const priorityLabel = priorityLabels[task.priority]?.[lang] || task.priority;

    return (
      <Link href={`/dashboard/requests/${task.requestId}`}
        className={`block bg-white rounded-2xl border shadow-sm p-5 transition-all hover:shadow-md hover:-translate-y-0.5 ${isCompleted ? 'border-slate-100 opacity-75' : 'border-slate-200 hover:border-cyan-200'}`}>

        {/* Top row: number + priority + status */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-mono text-slate-400" dir="ltr">{task.requestNumber}</span>
          {task.priority !== 'normal' && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getPriorityColor(task.priority)}`}>
              {priorityLabel}
            </span>
          )}
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getStatusColor(task.status)}`}>
            {statusLabel}
          </span>
        </div>

        {/* Subject */}
        <p className="font-semibold text-slate-900 mb-1 leading-snug">{task.subject}</p>

        {/* Type */}
        <p className="text-xs text-slate-400 mb-3">{typeLabel}</p>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-500">
          <div>
            <span className="text-slate-400">{isAr ? 'من: ' : 'From: '}</span>
            <span className="text-slate-700">{requesterName || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400">{isAr ? 'الشركة: ' : 'Company: '}</span>
            <span className="text-slate-700">{companyName || '—'}</span>
          </div>
          <div>
            {task.isAutoAssigned
              ? <span className="text-cyan-600 font-medium">{isAr ? 'تعيين تلقائي' : 'Auto-assigned'}</span>
              : (
                <>
                  <span className="text-slate-400">{isAr ? 'عُيّن بواسطة: ' : 'Assigned by: '}</span>
                  <span className="text-slate-700">{assignedBy || '—'}</span>
                </>
              )
            }
          </div>
          <div>
            <span className="text-slate-400">{isCompleted ? (isAr ? 'مكتمل: ' : 'Completed: ') : (isAr ? 'منذ: ' : 'Since: ')}</span>
            <span className="text-slate-700">
              {isCompleted ? formatDate(task.assignedAt, lang) : relativeTime(task.assignedAt, lang)}
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'مهامي' : 'My Tasks'}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isAr
            ? `${activeTasks.length} مهمة نشطة`
            : `${activeTasks.length} active task${activeTasks.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'active'
              ? 'border-cyan-500 text-cyan-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}>
          {isAr ? 'نشطة' : 'Active'}
          {activeTasks.length > 0 && (
            <span className="ms-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-700">
              {activeTasks.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('completed')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'completed'
              ? 'border-emerald-500 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}>
          {isAr ? 'مكتملة' : 'Completed'}
          {completedTasks.length > 0 && (
            <span className="ms-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
              {completedTasks.length}
            </span>
          )}
        </button>
      </div>

      {/* Active tab */}
      {tab === 'active' && (
        activeTasks.length === 0
          ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
              <span className="text-4xl mb-4 block">🎯</span>
              <p className="font-medium">{isAr ? 'لا توجد مهام نشطة — أحسنت!' : 'No active tasks — well done!'}</p>
              <p className="text-sm mt-1">{isAr ? 'ليس لديك أي مهام معينة حالياً' : 'You have no tasks assigned to you right now'}</p>
            </div>
          )
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeTasks.map(task => <TaskCard key={task.requestId} task={task} isCompleted={false} />)}
            </div>
          )
      )}

      {/* Completed tab */}
      {tab === 'completed' && (
        completedTasks.length === 0
          ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
              <span className="text-4xl mb-4 block">📭</span>
              <p className="font-medium">{isAr ? 'لا توجد مهام مكتملة بعد' : 'No completed tasks yet'}</p>
            </div>
          )
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {completedTasks.map(task => <TaskCard key={task.requestId} task={task} isCompleted={true} />)}
            </div>
          )
      )}
    </div>
  );
}
