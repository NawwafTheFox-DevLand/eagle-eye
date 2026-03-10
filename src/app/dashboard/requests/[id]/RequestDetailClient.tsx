'use client';

import { useState, useTransition } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getStatusColor, formatDateTime, formatCurrency } from '@/lib/utils';
import RequestActions from '@/components/requests/RequestActions';
import ExecutionActions from '@/components/requests/ExecutionActions';
import { cancelRequest, resubmitRequest, completeRequest } from '@/app/actions/requests';

const statusLabels: Record<string, { ar: string; en: string }> = {
  draft:                 { ar: 'مسودة',              en: 'Draft' },
  submitted:             { ar: 'مقدم',               en: 'Submitted' },
  under_review:          { ar: 'قيد المراجعة',        en: 'Under Review' },
  pending_clarification: { ar: 'بانتظار توضيح',       en: 'Pending Clarification' },
  returned:              { ar: 'مُعاد',               en: 'Returned' },
  resubmitted:           { ar: 'مُعاد تقديمه',         en: 'Resubmitted' },
  approved:              { ar: 'موافق عليه',           en: 'Approved' },
  rejected:              { ar: 'مرفوض',               en: 'Rejected' },
  completed:             { ar: 'مكتمل',               en: 'Completed' },
  cancelled:             { ar: 'ملغي',                en: 'Cancelled' },
  archived:              { ar: 'مؤرشف',               en: 'Archived' },
  pending_execution:     { ar: 'بانتظار التنفيذ',      en: 'Pending Execution' },
  in_progress:           { ar: 'قيد التنفيذ',          en: 'In Progress' },
  assigned_to_employee:  { ar: 'مُسند لموظف',          en: 'Assigned' },
};

const actionLabels: Record<string, { ar: string; en: string }> = {
  submitted:             { ar: 'قدّم الطلب',       en: 'submitted' },
  approved:              { ar: 'وافق',              en: 'approved' },
  rejected:              { ar: 'رفض',               en: 'rejected' },
  sent_back:             { ar: 'طلب توضيح',         en: 'requested clarification' },
  cancelled:             { ar: 'ألغى',              en: 'cancelled' },
  resubmitted:           { ar: 'أعاد التقديم',      en: 'resubmitted' },
  delegated_to_employee: { ar: 'عُيِّن لموظف',            en: 'assigned to employee' },
  auto_assigned:         { ar: 'تعيين تلقائي — روتيني', en: 'auto-assigned — routine' },
  pending_execution:     { ar: 'بانتظار التنفيذ',        en: 'awaiting execution' },
  handle_myself:         { ar: 'تولى التنفيذ بنفسه',     en: 'handling personally' },
  assigned_to_employee:  { ar: 'تم التعيين لموظف',       en: 'assigned to employee' },
  employee_completed:    { ar: 'أنجز الموظف المهمة',     en: 'employee completed task' },
  completed:             { ar: 'تم الإنجاز النهائي',     en: 'final completion' },
  returned_to_employee:  { ar: 'أُعيد للموظف',           en: 'returned to employee' },
};

const leaveTypeLabels: Record<string, { ar: string; en: string }> = {
  annual:    { ar: 'سنوية',       en: 'Annual' },
  sick:      { ar: 'مرضية',       en: 'Sick' },
  emergency: { ar: 'طارئة',       en: 'Emergency' },
  unpaid:    { ar: 'بدون راتب',   en: 'Unpaid' },
};

const CANCELLABLE = new Set(['draft', 'submitted', 'under_review', 'pending_clarification', 'pending_execution', 'in_progress', 'assigned_to_employee']);

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <>🖼️</>;
  if (mime === 'application/pdf') return <>📄</>;
  if (mime.includes('word')) return <>📝</>;
  if (mime.includes('excel') || mime.includes('spreadsheet')) return <>📊</>;
  if (mime.includes('powerpoint') || mime.includes('presentation')) return <>📑</>;
  return <>📎</>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface RequestDetailProps {
  request: any;
  actions: any[];
  approvalSteps: any[];
  evidence: any[];
  pendingStep: { id: string; approverRole?: string } | null;
  currentEmployeeId: string;
  currentEmployeeDeptId?: string;
  isAdmin: boolean;
  currentEmployeeRoles: string[];
  showExecution?: boolean;
  isDeptManagerOfDest?: boolean;
  isAssignedEmployee?: boolean;
  hasEmployeeCompleted?: boolean;
  assignedEmployee?: any;
}

function filterActionsForViewer(
  actions: any[],
  approvalSteps: any[],
  currentEmployeeId: string,
  roles: string[],
  request: any,
): any[] {
  const isSuperAdmin = roles.includes('super_admin');
  const isCEO = roles.includes('ceo');
  const isCompanyAdmin = roles.includes('company_admin');
  const isDeptManager = roles.includes('department_manager');
  const isRequester = request.requester_id === currentEmployeeId;

  // Super admin / CEO: full audit trail
  if (isSuperAdmin || isCEO) return actions;

  // Company admin viewing their company's request: full notes
  if (isCompanyAdmin) return actions;

  // Dept manager: full notes for their dept requests
  if (isDeptManager) return actions;

  // Requester: show own submission note + sent_back notes, hide other rationale
  if (isRequester) {
    return actions.map(a => {
      if (a.action === 'submitted' && a.actor_id === currentEmployeeId) return a;
      if (a.action === 'sent_back') return a;
      if (a.action === 'resubmitted' && a.actor_id === currentEmployeeId) return a;
      if (a.action === 'cancelled' && a.actor_id === currentEmployeeId) return a;
      if (a.action === 'completed') return a;
      return { ...a, rationale: null, note: a.actor_id === currentEmployeeId ? a.note : null };
    });
  }

  // Current/past approver in the chain
  const myStep = approvalSteps.find(s => s.approver_id === currentEmployeeId);
  if (myStep) {
    const myOrder = myStep.step_order;
    const prevStep = approvalSteps.find(s => s.step_order === myOrder - 1);
    const allowedActorIds = new Set([currentEmployeeId, prevStep?.approver_id].filter(Boolean));
    return actions.map(a => {
      if (allowedActorIds.has(a.actor_id)) return a;
      if (a.action === 'submitted') return a;
      if (a.action === 'sent_back' && a.actor_id === currentEmployeeId) return a;
      return { ...a, rationale: null, note: null };
    });
  }

  // Default: show actions without rationale
  return actions.map(a => ({ ...a, rationale: null, note: null }));
}

export default function RequestDetailClient({
  request, actions, approvalSteps, evidence, pendingStep, currentEmployeeId, currentEmployeeDeptId, isAdmin, currentEmployeeRoles,
  showExecution = false, isDeptManagerOfDest = false, isAssignedEmployee = false, hasEmployeeCompleted = false, assignedEmployee = null,
}: RequestDetailProps) {
  const { lang } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [lifecycleError, setLifecycleError] = useState('');
  const [lifecycleDone, setLifecycleDone] = useState('');
  const [resubmitNote, setResubmitNote] = useState('');
  const [completeNote, setCompleteNote] = useState('');
  const [showCompleteForm, setShowCompleteForm] = useState(false);

  const isRequester = request.requester_id === currentEmployeeId;
  const visibleActions = filterActionsForViewer(actions, approvalSteps, currentEmployeeId, currentEmployeeRoles, request);
  const canCancel    = isRequester && CANCELLABLE.has(request.status);
  const canResubmit  = isRequester && request.status === 'pending_clarification';
  const canComplete  = (isAdmin || isRequester) && request.status === 'approved';

  const t = {
    ar: {
      back: '← الرجوع',
      details: 'التفاصيل',
      financial: 'البيانات المالية',
      leaveInfo: 'بيانات الإجازة',
      hrInfo: 'بيانات الموارد البشرية',
      files: 'المستندات والمرفقات',
      noFiles: 'لا توجد مرفقات',
      actionLog: 'سجل الإجراءات',
      noActions: 'لا توجد إجراءات بعد',
      requestInfo: 'معلومات الطلب',
      approvalChain: 'مسار الموافقة',
      requester: 'مقدم الطلب',
      company: 'الشركة',
      dept: 'القسم',
      destination: 'الجهة المستقبلة',
      destDept: 'القسم المستقبل',
      created: 'تاريخ الإنشاء',
      submitted: 'تاريخ التقديم',
      amount: 'المبلغ',
      payee: 'المستفيد',
      costCenter: 'مركز التكلفة',
      budgetSource: 'مصدر الميزانية',
      dueDate: 'تاريخ الاستحقاق',
      leaveType: 'نوع الإجازة',
      from: 'من',
      to: 'إلى',
      effectiveDate: 'تاريخ النفاذ',
      compensationImpact: 'الأثر على التعويض',
      system: 'النظام',
      download: 'تحميل',
      cancelBtn: 'إلغاء الطلب',
      cancelConfirm: 'تأكيد الإلغاء',
      resubmitBtn: 'إعادة التقديم',
      resubmitNote: 'ملاحظة التوضيح...',
      completeBtn: 'تأكيد التنفيذ',
      completeNote: 'ملاحظة الإتمام...',
      lifecycleError: 'حدث خطأ',
    },
    en: {
      back: '← Back',
      details: 'Details',
      financial: 'Financial Info',
      leaveInfo: 'Leave Details',
      hrInfo: 'HR Details',
      files: 'Documents & Attachments',
      noFiles: 'No attachments',
      actionLog: 'Action Log',
      noActions: 'No actions yet',
      requestInfo: 'Request Info',
      approvalChain: 'Approval Chain',
      requester: 'Requester',
      company: 'Company',
      dept: 'Department',
      destination: 'Destination',
      destDept: 'Destination Dept',
      created: 'Created',
      submitted: 'Submitted',
      amount: 'Amount',
      payee: 'Payee',
      costCenter: 'Cost Center',
      budgetSource: 'Budget Source',
      dueDate: 'Due Date',
      leaveType: 'Leave Type',
      from: 'From',
      to: 'To',
      effectiveDate: 'Effective Date',
      compensationImpact: 'Compensation Impact',
      system: 'System',
      download: 'Download',
      cancelBtn: 'Cancel Request',
      cancelConfirm: 'Confirm Cancellation',
      resubmitBtn: 'Resubmit',
      resubmitNote: 'Clarification note...',
      completeBtn: 'Mark as Completed',
      completeNote: 'Completion note...',
      lifecycleError: 'An error occurred',
    },
  }[lang];

  function doCancel() {
    if (!confirm(lang === 'ar' ? 'هل تريد إلغاء هذا الطلب؟' : 'Are you sure you want to cancel this request?')) return;
    setLifecycleError('');
    startTransition(async () => {
      try {
        await cancelRequest(request.id);
        setLifecycleDone(lang === 'ar' ? 'تم إلغاء الطلب' : 'Request cancelled');
        window.location.reload();
      } catch (e: any) { setLifecycleError(e.message); }
    });
  }

  function doResubmit() {
    if (!resubmitNote.trim()) return;
    setLifecycleError('');
    startTransition(async () => {
      try {
        await resubmitRequest(request.id, resubmitNote);
        setLifecycleDone(lang === 'ar' ? 'تمت إعادة التقديم' : 'Request resubmitted');
        window.location.reload();
      } catch (e: any) { setLifecycleError(e.message); }
    });
  }

  function doComplete() {
    setLifecycleError('');
    startTransition(async () => {
      try {
        await completeRequest(request.id, completeNote);
        setLifecycleDone(lang === 'ar' ? 'تم تأكيد التنفيذ' : 'Request completed');
        window.location.reload();
      } catch (e: any) { setLifecycleError(e.message); }
    });
  }

  const requesterName = lang === 'ar'
    ? (request.requester?.full_name_ar || request.requester?.full_name_en)
    : (request.requester?.full_name_en || request.requester?.full_name_ar);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-slate-400" dir="ltr">{request.request_number}</span>
            <span className={`status-badge ${getStatusColor(request.status)}`}>
              {statusLabels[request.status]?.[lang] ?? request.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{request.subject}</h1>
        </div>
        <a href="/dashboard/requests" className="text-sm text-slate-500 hover:text-eagle-600">{t.back}</a>
      </div>

      {/* Lifecycle messages */}
      {lifecycleError && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{lifecycleError}</div>
      )}
      {lifecycleDone && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{lifecycleDone}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Description */}
          {request.description && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">{t.details}</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          {/* Financial info */}
          {request.amount && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">{t.financial}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <span className="text-slate-500">{t.amount}: </span>
                  <span className="font-bold text-lg">{formatCurrency(request.amount, request.currency, lang)}</span>
                </div>
                {request.payee       && <div><span className="text-slate-500">{t.payee}: </span>{request.payee}</div>}
                {request.cost_center && <div><span className="text-slate-500">{t.costCenter}: </span>{request.cost_center}</div>}
                {request.budget_source && <div><span className="text-slate-500">{t.budgetSource}: </span>{request.budget_source}</div>}
                {request.due_date    && <div><span className="text-slate-500">{t.dueDate}: </span>{request.due_date}</div>}
              </div>
            </div>
          )}

          {/* Leave info */}
          {request.leave_type && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">{t.leaveInfo}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">{t.leaveType}: </span>{leaveTypeLabels[request.leave_type]?.[lang] ?? request.leave_type}</div>
                {request.leave_start_date && <div><span className="text-slate-500">{t.from}: </span>{request.leave_start_date}</div>}
                {request.leave_end_date   && <div><span className="text-slate-500">{t.to}: </span>{request.leave_end_date}</div>}
              </div>
            </div>
          )}

          {/* HR / Promotion info */}
          {(request.effective_date || request.compensation_impact) && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">{t.hrInfo}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {request.effective_date       && <div><span className="text-slate-500">{t.effectiveDate}: </span>{request.effective_date}</div>}
                {request.compensation_impact  && <div className="col-span-2"><span className="text-slate-500">{t.compensationImpact}: </span>{request.compensation_impact}</div>}
              </div>
            </div>
          )}

          {/* Extra form_data fields */}
          {request.form_data && Object.keys(request.form_data).length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">{t.details}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(request.form_data as Record<string, string>).map(([k, v]) => (
                  <div key={k} className="col-span-2">
                    <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}: </span>{v}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evidence / files */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{t.files}</h3>
            {evidence.length === 0 ? (
              <p className="text-sm text-slate-400">{t.noFiles}</p>
            ) : (
              <div className="space-y-2">
                {evidence.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-xl shrink-0"><FileIcon mime={f.mime_type} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{f.file_name}</p>
                      <p className="text-xs text-slate-400">{formatBytes(f.file_size_bytes ?? 0)} • {formatDateTime(f.created_at, lang)}</p>
                    </div>
                    {f.url && (
                      <a href={f.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-eagle-600 hover:underline shrink-0 font-medium">
                        {t.download}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approval action panel (for approvers) */}
          {pendingStep && (
            <RequestActions
              requestId={request.id}
              stepId={pendingStep.id}
              approverRole={pendingStep.approverRole}
              currentDeptId={currentEmployeeDeptId}
            />
          )}

          {/* Execution phase actions */}
          {showExecution && (
            <ExecutionActions
              requestId={request.id}
              requestStatus={request.status}
              assignedTo={request.assigned_to ?? null}
              currentEmployeeId={currentEmployeeId}
              isDeptManager={isDeptManagerOfDest}
              isAssignedEmployee={isAssignedEmployee}
              hasEmployeeCompleted={hasEmployeeCompleted}
              departmentId={currentEmployeeDeptId ?? ''}
            />
          )}

          {/* Resubmit panel */}
          {canResubmit && !lifecycleDone && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
              <h3 className="font-semibold text-amber-900 mb-2">
                {lang === 'ar' ? 'مطلوب توضيح — أعد تقديم الطلب بعد التعديل' : 'Clarification Required — Resubmit with updates'}
              </h3>
              <textarea
                value={resubmitNote}
                onChange={e => setResubmitNote(e.target.value)}
                rows={3}
                className="input-field mb-3"
                placeholder={t.resubmitNote}
              />
              <button
                onClick={doResubmit}
                disabled={isPending || !resubmitNote.trim()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {isPending ? '...' : t.resubmitBtn}
              </button>
            </div>
          )}

          {/* Complete panel (for admins after approval) */}
          {canComplete && !lifecycleDone && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <h3 className="font-semibold text-emerald-900 mb-2">
                {lang === 'ar' ? 'تأكيد إتمام التنفيذ' : 'Confirm Completion'}
              </h3>
              {showCompleteForm ? (
                <>
                  <textarea
                    value={completeNote}
                    onChange={e => setCompleteNote(e.target.value)}
                    rows={2}
                    className="input-field mb-3"
                    placeholder={t.completeNote}
                  />
                  <div className="flex gap-2">
                    <button onClick={doComplete} disabled={isPending} className="btn-primary text-sm disabled:opacity-50">
                      {isPending ? '...' : t.completeBtn}
                    </button>
                    <button onClick={() => setShowCompleteForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-white rounded-xl border">
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => setShowCompleteForm(true)} className="btn-primary text-sm">
                  {t.completeBtn}
                </button>
              )}
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{t.actionLog}</h3>
            {visibleActions.length === 0 ? (
              <p className="text-sm text-slate-400">{t.noActions}</p>
            ) : (
              <div className="space-y-4">
                {visibleActions.map((action: any, i: number) => {
                  const actorName = lang === 'ar'
                    ? (action.actor?.full_name_ar || action.actor?.full_name_en || t.system)
                    : (action.actor?.full_name_en || action.actor?.full_name_ar || t.system);
                  const actionLabel = actionLabels[action.action]?.[lang] ?? action.action;
                  return (
                    <div key={action.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-1.5 ${
                          action.action === 'approved'   ? 'bg-emerald-500' :
                          action.action === 'rejected'   ? 'bg-red-500' :
                          action.action === 'sent_back'  ? 'bg-amber-500' :
                          action.action === 'completed'  ? 'bg-blue-500' :
                          action.action === 'cancelled'  ? 'bg-slate-400' : 'bg-blue-500'
                        }`} />
                        {i < visibleActions.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-slate-900">
                          {actorName} — <span className="text-slate-500">{actionLabel}</span>
                        </p>
                        {action.rationale && <p className="text-sm text-slate-600 mt-1">{action.rationale}</p>}
                        {action.note      && <p className="text-sm text-slate-600 mt-1">{action.note}</p>}
                        <p className="text-xs text-slate-400 mt-1">{formatDateTime(action.created_at, lang)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-3 text-sm">{t.requestInfo}</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">{t.requester}</dt>
                <dd className="font-medium">{requesterName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.company}</dt>
                <dd>{lang === 'ar' ? request.origin_company?.name_ar : (request.origin_company?.name_en || request.origin_company?.name_ar)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">{t.dept}</dt>
                <dd>{lang === 'ar' ? (request.origin_dept?.name_ar || '—') : (request.origin_dept?.name_en || request.origin_dept?.name_ar || '—')}</dd>
              </div>
              {request.destination_company && (
                <div>
                  <dt className="text-slate-500">{t.destination}</dt>
                  <dd>{lang === 'ar' ? request.destination_company.name_ar : (request.destination_company.name_en || request.destination_company.name_ar)}</dd>
                </div>
              )}
              {request.destination_dept && (
                <div>
                  <dt className="text-slate-500">{t.destDept}</dt>
                  <dd>{lang === 'ar' ? request.destination_dept.name_ar : (request.destination_dept.name_en || request.destination_dept.name_ar)}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">{t.created}</dt>
                <dd>{formatDateTime(request.created_at, lang)}</dd>
              </div>
              {request.submitted_at && (
                <div>
                  <dt className="text-slate-500">{t.submitted}</dt>
                  <dd>{formatDateTime(request.submitted_at, lang)}</dd>
                </div>
              )}
              {assignedEmployee && (
                <div>
                  <dt className="text-slate-500">{lang === 'ar' ? 'المُسند إليه' : 'Assigned To'}</dt>
                  <dd className="font-medium">
                    {lang === 'ar' ? assignedEmployee.full_name_ar : (assignedEmployee.full_name_en || assignedEmployee.full_name_ar)}
                    <span className="text-xs text-slate-400 ms-1">({assignedEmployee.employee_code})</span>
                  </dd>
                </div>
              )}
              {request.execution_started_at && (
                <div>
                  <dt className="text-slate-500">{lang === 'ar' ? 'بدأ التنفيذ' : 'Execution Started'}</dt>
                  <dd>{formatDateTime(request.execution_started_at, lang)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Approval chain */}
          {approvalSteps.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 mb-3 text-sm">{t.approvalChain}</h3>
              <div className="space-y-3">
                {approvalSteps.map((step: any) => {
                  const approverName = lang === 'ar'
                    ? (step.approver?.full_name_ar || step.approver?.full_name_en || '—')
                    : (step.approver?.full_name_en || step.approver?.full_name_ar || '—');
                  return (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        step.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        step.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        step.status === 'pending'  ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {step.status === 'approved' ? '✓' : step.status === 'rejected' ? '✗' : step.step_order}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{approverName}</p>
                        <p className="text-xs text-slate-500">{step.approver_role}</p>
                        {step.delegateOf && (
                          <p className="text-xs text-blue-500">
                            {lang === 'ar' ? `نيابةً عن: ${step.delegateOf?.full_name_ar}` : `Acting for: ${step.delegateOf?.full_name_en || step.delegateOf?.full_name_ar}`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Requester lifecycle actions */}
          {canCancel && !lifecycleDone && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <button
                onClick={doCancel}
                disabled={isPending}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {isPending ? '...' : t.cancelBtn}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
