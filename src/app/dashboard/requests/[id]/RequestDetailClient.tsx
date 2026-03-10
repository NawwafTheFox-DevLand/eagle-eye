'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getStatusColor, formatDateTime, formatCurrency } from '@/lib/utils';
import RequestActions from '@/components/requests/RequestActions';

const statusLabels: Record<string, { ar: string; en: string }> = {
  draft:                 { ar: 'مسودة',              en: 'Draft' },
  submitted:             { ar: 'مقدم',               en: 'Submitted' },
  under_review:          { ar: 'قيد المراجعة',        en: 'Under Review' },
  pending_clarification: { ar: 'بانتظار توضيح',       en: 'Pending Clarification' },
  returned:              { ar: 'مُعاد',               en: 'Returned' },
  approved:              { ar: 'موافق عليه',           en: 'Approved' },
  rejected:              { ar: 'مرفوض',               en: 'Rejected' },
  completed:             { ar: 'مكتمل',               en: 'Completed' },
  cancelled:             { ar: 'ملغي',                en: 'Cancelled' },
  archived:              { ar: 'مؤرشف',               en: 'Archived' },
};

const actionLabels: Record<string, { ar: string; en: string }> = {
  submitted:  { ar: 'قدّم الطلب',    en: 'submitted' },
  approved:   { ar: 'وافق',          en: 'approved' },
  rejected:   { ar: 'رفض',           en: 'rejected' },
  sent_back:  { ar: 'طلب توضيح',     en: 'requested clarification' },
};

const leaveTypeLabels: Record<string, { ar: string; en: string }> = {
  annual:    { ar: 'سنوية',       en: 'Annual' },
  sick:      { ar: 'مرضية',       en: 'Sick' },
  emergency: { ar: 'طارئة',       en: 'Emergency' },
  unpaid:    { ar: 'بدون راتب',   en: 'Unpaid' },
};

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
  pendingStep: { id: string } | null;
}

export default function RequestDetailClient({
  request, actions, approvalSteps, evidence, pendingStep,
}: RequestDetailProps) {
  const { lang } = useLanguage();

  const t = {
    ar: {
      back: '← الرجوع',
      details: 'التفاصيل',
      financial: 'البيانات المالية',
      leaveInfo: 'بيانات الإجازة',
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
      created: 'تاريخ الإنشاء',
      submitted: 'تاريخ التقديم',
      amount: 'المبلغ',
      payee: 'المستفيد',
      costCenter: 'مركز التكلفة',
      leaveType: 'نوع الإجازة',
      from: 'من',
      to: 'إلى',
      system: 'النظام',
      download: 'تحميل',
    },
    en: {
      back: '← Back',
      details: 'Details',
      financial: 'Financial Info',
      leaveInfo: 'Leave Details',
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
      created: 'Created',
      submitted: 'Submitted',
      amount: 'Amount',
      payee: 'Payee',
      costCenter: 'Cost Center',
      leaveType: 'Leave Type',
      from: 'From',
      to: 'To',
      system: 'System',
      download: 'Download',
    },
  }[lang];

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
                <div><span className="text-slate-500">{t.amount}: </span><span className="font-bold text-lg">{formatCurrency(request.amount, request.currency, lang)}</span></div>
                {request.payee     && <div><span className="text-slate-500">{t.payee}: </span>{request.payee}</div>}
                {request.cost_center && <div><span className="text-slate-500">{t.costCenter}: </span>{request.cost_center}</div>}
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
                      <p className="text-xs text-slate-400">{formatBytes(f.file_size ?? 0)} • {formatDateTime(f.created_at, lang)}</p>
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

          {/* Approval action panel */}
          {pendingStep && (
            <RequestActions requestId={request.id} stepId={pendingStep.id} />
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">{t.actionLog}</h3>
            {actions.length === 0 ? (
              <p className="text-sm text-slate-400">{t.noActions}</p>
            ) : (
              <div className="space-y-4">
                {actions.map((action: any, i: number) => {
                  const actorName = lang === 'ar'
                    ? (action.actor?.full_name_ar || action.actor?.full_name_en || t.system)
                    : (action.actor?.full_name_en || action.actor?.full_name_ar || t.system);
                  const actionLabel = actionLabels[action.action]?.[lang] ?? action.action;
                  return (
                    <div key={action.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-1.5 ${
                          action.action === 'approved'  ? 'bg-emerald-500' :
                          action.action === 'rejected'  ? 'bg-red-500' :
                          action.action === 'sent_back' ? 'bg-amber-500' : 'bg-blue-500'
                        }`} />
                        {i < actions.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
