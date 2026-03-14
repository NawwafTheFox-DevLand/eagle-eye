'use client';

import { useState, useTransition, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useRouter } from 'next/navigation';
import RequestActions from '@/components/requests/RequestActions';
import { cancelOnboarding } from '@/app/actions/onboarding';

// ─── Attachment preview helpers ────────────────────────────────────────────────

function getFileType(fileName: string): 'image' | 'pdf' | 'other' {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['doc', 'docx'].includes(ext)) return '📄';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (ext === 'txt') return '📝';
  return '📎';
}

function PdfPreview({ url, isAr }: { url: string; isAr: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
      >
        {expanded
          ? (isAr ? 'إخفاء المعاينة' : 'Hide Preview')
          : (isAr ? 'عرض المعاينة' : 'Show Preview')
        }
      </button>
      {expanded && (
        <iframe
          src={url}
          className="w-full h-[400px] rounded-lg border border-slate-200 mt-2"
          title="PDF Preview"
        />
      )}
    </div>
  );
}

// ─── Label maps ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  draft:                 { ar: 'مسودة',            en: 'Draft' },
  in_progress:           { ar: 'قيد المعالجة',      en: 'In Progress' },
  pending_clarification: { ar: 'بانتظار توضيح',     en: 'Pending Clarification' },
  completed:             { ar: 'مكتمل',             en: 'Completed' },
  rejected:              { ar: 'مرفوض',             en: 'Rejected' },
  cancelled:             { ar: 'ملغي',              en: 'Cancelled' },
  archived:              { ar: 'مؤرشف',             en: 'Archived' },
};

const STATUS_COLORS: Record<string, string> = {
  draft:                 'bg-slate-100 text-slate-600',
  in_progress:           'bg-blue-100 text-blue-700',
  pending_clarification: 'bg-amber-100 text-amber-700',
  completed:             'bg-emerald-100 text-emerald-700',
  rejected:              'bg-red-100 text-red-700',
  cancelled:             'bg-slate-100 text-slate-500',
  archived:              'bg-gray-100 text-gray-500',
};

const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  general_internal:      { ar: 'طلب داخلي عام',        en: 'General Internal'    },
  cross_department:      { ar: 'طلب بين الأقسام',       en: 'Cross-Department'    },
  intercompany:          { ar: 'طلب بين الشركات',       en: 'Intercompany'        },
  fund_disbursement:     { ar: 'طلب صرف مالي',          en: 'Fund Disbursement'   },
  leave_approval:        { ar: 'طلب إجازة',             en: 'Leave Approval'      },
  promotion:             { ar: 'طلب ترقية',             en: 'Promotion'           },
  demotion_disciplinary: { ar: 'طلب تأديبي',            en: 'Disciplinary'        },
  create_department:     { ar: 'إنشاء قسم',             en: 'Create Department'   },
  create_company:        { ar: 'إنشاء شركة',            en: 'Create Company'      },
  create_position:       { ar: 'إنشاء وظيفة',           en: 'Create Position'     },
  employee_onboarding:   { ar: 'توظيف موظف جديد',       en: 'Employee Onboarding' },
};

const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  submitted:            { ar: 'تم التقديم',             en: 'Submitted' },
  forwarded:            { ar: 'تم التحويل',              en: 'Forwarded' },
  returned:             { ar: 'تم الإرجاع',              en: 'Returned' },
  asked_requester:      { ar: 'طُلب توضيح',             en: 'Clarification Requested' },
  resubmitted:          { ar: 'أُعيد التقديم',           en: 'Resubmitted' },
  assigned:             { ar: 'تم التعيين',              en: 'Assigned' },
  company_exit_stamped: { ar: 'موافقة خروج الشركة',     en: 'Company Exit Approved' },
  finance_stamped:      { ar: 'اعتماد مالي',            en: 'Finance Approved' },
  hr_stamped:           { ar: 'موافقة الموارد البشرية', en: 'HR Approved' },
  ceo_stamped:          { ar: 'موافقة الرئيس التنفيذي', en: 'CEO Approved' },
  completed:            { ar: 'تم الإنجاز',              en: 'Completed' },
  rejected:             { ar: 'تم الرفض',               en: 'Rejected' },
  cancelled:            { ar: 'تم الإلغاء',              en: 'Cancelled' },
};

function getActionIcon(action: string): string {
  if (['submitted', 'completed', 'company_exit_stamped', 'finance_stamped', 'hr_stamped', 'ceo_stamped'].includes(action)) return '🟢';
  if (['forwarded', 'assigned'].includes(action)) return '🔵';
  if (['returned', 'asked_requester', 'resubmitted'].includes(action)) return '🟡';
  if (['rejected', 'cancelled'].includes(action)) return '🔴';
  return '⚪';
}

function formatDuration(ms: number, isAr: boolean): string {
  const totalSecs = Math.floor(ms / 1000);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  if (isAr) {
    const parts: string[] = [];
    if (days > 0)  parts.push(`${days} يوم`);
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins} دقيقة`);
    return parts.join(' و');
  }
  const parts: string[] = [];
  if (days > 0)  parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);
  return parts.join(' ');
}

function formatDate(dateStr: string, isAr: boolean): string {
  return new Date(dateStr).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Internal metadata keys (UUIDs used for routing — never show to users) ─────

const HIDDEN_METADATA_KEYS = new Set([
  'target_employee_id', 'target_department_id', 'direct_manager_id', 'progress',
  'custom_type_id', 'custom_fields_data', 'current_step', 'total_steps',
]);

// Request types that have dedicated metadata cards — their metadata is shown in those cards, not the generic loop
const TYPES_WITH_DEDICATED_METADATA = new Set(['employee_onboarding']);

// ─── Props ─────────────────────────────────────────────────────────────────────

const TASK_LABELS: Record<string, { ar: string; en: string; icon: string }> = {
  hr_registration: { ar: 'تسجيل الموارد البشرية', en: 'HR Registration', icon: '👥' },
  it_setup:        { ar: 'إعداد تقنية المعلومات',  en: 'IT Setup',         icon: '💻' },
  payroll:         { ar: 'إعداد الراتب',            en: 'Payroll Setup',    icon: '💰' },
  access_card:     { ar: 'بطاقة الوصول',            en: 'Access Card',      icon: '🪪' },
};

interface Props {
  request: any;
  actions: any[];
  evidence: any[];
  currentEmployeeId: string;
  requesterId: string;
  requesterName: any;
  assignedName: any;
  originCompany: any;
  originDept: any;
  destCompany: any;
  destDept: any;
  isDeptHead: boolean;
  isOriginCompanyCEO: boolean;
  isHoldingCEO: boolean;
  isFinanceHead: boolean;
  isHRHead: boolean;
  allCompanies: any[];
  allDepartments: any[];
  evidenceFiltered?: boolean;
  // Onboarding
  isOnboardingParent?: boolean;
  isOnboardingChild?: boolean;
  childRequests?: any[];
  childAssigneeMap?: Record<string, any>;
  parentRequest?: any;
  dependsOnStatus?: string | null;
  // SLA
  slaInfo?: { hoursElapsed: number; targetHours: number; maxHours: number; status: 'ok' | 'warning' | 'critical' } | null;
  // Custom fixed-path
  isCustomFixedPath?: boolean;
  customSteps?: any[];
  customTypeName?: { ar: string; en: string } | null;
  customTypeFields?: any[];
  currentStep?: number;
  totalSteps?: number;
  isLastStep?: boolean;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function RequestDetailClient({
  request,
  actions,
  evidence,
  currentEmployeeId,
  requesterId,
  requesterName,
  assignedName,
  originCompany,
  originDept,
  destCompany,
  destDept,
  isDeptHead,
  isOriginCompanyCEO,
  isHoldingCEO,
  isFinanceHead,
  isHRHead,
  allCompanies,
  allDepartments,
  evidenceFiltered = false,
  isOnboardingParent = false,
  isOnboardingChild = false,
  childRequests = [],
  childAssigneeMap = {},
  parentRequest = null,
  dependsOnStatus = null,
  slaInfo = null,
  isCustomFixedPath = false,
  customSteps = [],
  customTypeName = null,
  customTypeFields = [],
  currentStep = 1,
  totalSteps = 1,
  isLastStep = false,
}: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [cancelNote, setCancelNote] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelPending, startCancelTransition] = useTransition();
  const [cancelError, setCancelError] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxUrl(null);
    };
    if (lightboxUrl) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [lightboxUrl]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const personName = (p: any) =>
    p ? (isAr ? p.full_name_ar : p.full_name_en) || '—' : '—';

  const statusLabel = (s: string) =>
    STATUS_LABELS[s] ? (isAr ? STATUS_LABELS[s].ar : STATUS_LABELS[s].en) : s;

  const actionLabel = (a: string) =>
    ACTION_LABELS[a] ? (isAr ? ACTION_LABELS[a].ar : ACTION_LABELS[a].en) : a;

  // ── Processing duration ───────────────────────────────────────────────────────

  let durationEl: React.ReactNode = '—';
  if (request.submitted_at) {
    const start = new Date(request.submitted_at).getTime();
    const end   = request.completed_at ? new Date(request.completed_at).getTime() : Date.now();
    const ms    = end - start;
    const color =
      ms < 86_400_000  ? 'text-emerald-600' :
      ms < 259_200_000 ? 'text-amber-600'   :
                         'text-red-600';
    durationEl = (
      <span className={`text-2xl font-bold ${color}`}>
        {formatDuration(ms, isAr)}
      </span>
    );
  }

  // ── Gate display ─────────────────────────────────────────────────────────────

  const showGates =
    request.requires_finance || request.requires_hr || request.requires_ceo || request.company_exit_stamped_at !== null;

  type Gate = { key: string; labelAr: string; labelEn: string; stamped: boolean };
  const gates: Gate[] = [];
  if (request.requires_finance) {
    gates.push({ key: 'finance', labelAr: 'البوابة المالية', labelEn: 'Finance Gate', stamped: !!request.finance_stamped_at });
  }
  if (request.requires_hr) {
    gates.push({ key: 'hr', labelAr: 'بوابة الموارد البشرية', labelEn: 'HR Gate', stamped: !!request.hr_stamped_at });
  }
  if (request.requires_ceo) {
    gates.push({ key: 'ceo', labelAr: 'موافقة الرئيس التنفيذي', labelEn: 'CEO Gate', stamped: !!request.ceo_stamped_at });
  }

  // ── Timeline (newest first) ───────────────────────────────────────────────────

  const reversedActions = [...actions].reverse();

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={`max-w-7xl mx-auto px-4 py-6 ${isAr ? 'direction-rtl' : ''}`} dir={isAr ? 'rtl' : 'ltr'}>

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-4 text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
      >
        {isAr ? '→ العودة' : '← Back'}
      </button>

      {/* ── Onboarding child banner ── */}
      {isOnboardingChild && (
        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-2xl">🧑‍💼</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-indigo-900 text-sm">
              {isAr ? 'مهمة تعيين موظف' : 'Employee Onboarding Task'}
              {request.task_type && TASK_LABELS[request.task_type] && (
                <span className="ms-2 text-indigo-700">
                  — {isAr ? TASK_LABELS[request.task_type].ar : TASK_LABELS[request.task_type].en}
                </span>
              )}
            </p>
            {parentRequest && (
              <a
                href={`/dashboard/requests/${parentRequest.id}`}
                className="text-xs text-indigo-600 hover:underline"
              >
                {isAr ? 'الطلب الرئيسي: ' : 'Parent: '}{parentRequest.request_number}
              </a>
            )}
          </div>
          {dependsOnStatus && dependsOnStatus !== 'completed' && (
            <div className="bg-amber-100 border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-amber-800 font-medium">
              🔒 {isAr ? 'مقفلة — تنتظر مهمة أخرى' : 'Locked — awaiting dependency'}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* 1. Header card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <p className="font-mono text-sm text-slate-400 mb-1">{request.request_number}</p>
            <h1 className="text-xl font-bold text-slate-800 mb-4">{request.subject || '—'}</h1>
            <div className="flex flex-wrap gap-2">
              {/* Status badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[request.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {statusLabel(request.status)}
              </span>
              {/* Priority badge */}
              {request.priority && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  request.priority === 'urgent'   ? 'bg-red-100 text-red-700' :
                  request.priority === 'high'     ? 'bg-orange-100 text-orange-700' :
                  request.priority === 'medium'   ? 'bg-amber-100 text-amber-700' :
                                                    'bg-slate-100 text-slate-600'
                }`}>
                  {request.priority === 'urgent' ? (isAr ? 'عاجل' : 'Urgent') :
                   request.priority === 'high'   ? (isAr ? 'مرتفع' : 'High')   :
                   request.priority === 'medium' ? (isAr ? 'متوسط' : 'Medium') :
                                                   (isAr ? 'منخفض' : 'Low')}
                </span>
              )}
              {/* Type badge */}
              {(customTypeName || request.request_type) && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${customTypeName ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {customTypeName
                    ? (isAr ? customTypeName.ar : customTypeName.en)
                    : TYPE_LABELS[request.request_type]
                    ? (isAr ? TYPE_LABELS[request.request_type].ar : TYPE_LABELS[request.request_type].en)
                    : request.request_type.replace(/_/g, ' ')}
                </span>
              )}
              {/* Confidential badge */}
              {request.confidentiality === 'confidential' && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-white">
                  {isAr ? 'سري' : 'Confidential'}
                </span>
              )}
            </div>
          </div>

          {/* 2. Info grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              {isAr ? 'تفاصيل الطلب' : 'Request Details'}
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {/* Request type — always first */}
              {(customTypeName || request.request_type) && (
                <div className="sm:col-span-2">
                  <dt className="text-slate-500 mb-0.5">{isAr ? 'نوع الطلب' : 'Request Type'}</dt>
                  <dd>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${customTypeName ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {customTypeName
                        ? (isAr ? customTypeName.ar : customTypeName.en)
                        : TYPE_LABELS[request.request_type]
                        ? (isAr ? TYPE_LABELS[request.request_type].ar : TYPE_LABELS[request.request_type].en)
                        : request.request_type.replace(/_/g, ' ')}
                    </span>
                    {isCustomFixedPath && (
                      <span className="ms-2 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 border border-violet-200">
                        {isAr ? 'مسار ثابت' : 'Fixed Path'}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500 mb-0.5">{isAr ? 'مقدم الطلب' : 'Requester'}</dt>
                <dd className="font-medium text-slate-800">{personName(requesterName)}</dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">{isAr ? 'من قسم' : 'From Dept'}</dt>
                <dd className="font-medium text-slate-800">
                  {originDept ? (isAr ? originDept.name_ar : originDept.name_en) || '—' : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">{isAr ? 'من شركة' : 'From Company'}</dt>
                <dd className="font-medium text-slate-800">
                  {originCompany ? (isAr ? originCompany.name_ar : originCompany.name_en) || '—' : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">{isAr ? 'إلى قسم' : 'To Dept'}</dt>
                <dd className="font-medium text-slate-800">
                  {destDept ? (isAr ? destDept.name_ar : destDept.name_en) || '—' : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-0.5">{isAr ? 'إلى شركة' : 'To Company'}</dt>
                <dd className="font-medium text-slate-800">
                  {destCompany ? (isAr ? destCompany.name_ar : destCompany.name_en) || '—' : '—'}
                </dd>
              </div>
              {request.created_at && (
                <div>
                  <dt className="text-slate-500 mb-0.5">{isAr ? 'تاريخ الإنشاء' : 'Created'}</dt>
                  <dd className="font-medium text-slate-800">{formatDate(request.created_at, isAr)}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* 3. Description */}
          {request.description && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                {isAr ? 'الوصف' : 'Description'}
              </h2>
              <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          {/* 3b. Custom fields */}
          {customTypeName && (request.metadata as any)?.custom_fields_data &&
           Object.keys((request.metadata as any).custom_fields_data).length > 0 && (
            <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-violet-600 uppercase tracking-wide mb-4">
                🗂️ {isAr ? 'بيانات الطلب المخصص' : 'Custom Request Data'}
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {Object.entries((request.metadata as any).custom_fields_data as Record<string, string>).map(([k, v]) => {
                  const fieldDef = customTypeFields.find((f: any) => f.key === k);
                  const label = fieldDef
                    ? (isAr ? fieldDef.label_ar : fieldDef.label_en)
                    : k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <div key={k}>
                      <dt className="text-slate-500 mb-0.5">{label}</dt>
                      <dd className="font-medium text-slate-800">{String(v) || '—'}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}

          {/* 4. Onboarding: Employee info + task tracker */}
          {isOnboardingParent && request.metadata && (
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide mb-4">
                🧑‍💼 {isAr ? 'بيانات الموظف الجديد' : 'New Employee Details'}
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {(request.metadata as any).emp_name_ar && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'الاسم (عربي)' : 'Name (Arabic)'}</dt>
                    <dd className="font-medium text-slate-800">{(request.metadata as any).emp_name_ar}</dd>
                  </div>
                )}
                {(request.metadata as any).emp_name_en && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'الاسم (إنجليزي)' : 'Name (English)'}</dt>
                    <dd className="font-medium text-slate-800">{(request.metadata as any).emp_name_en}</dd>
                  </div>
                )}
                {(request.metadata as any).national_id && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'رقم الهوية' : 'National ID'}</dt>
                    <dd className="font-medium text-slate-800">{(request.metadata as any).national_id}</dd>
                  </div>
                )}
                {(request.metadata as any).dob && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'تاريخ الميلاد' : 'Date of Birth'}</dt>
                    <dd className="font-medium text-slate-800">{(request.metadata as any).dob}</dd>
                  </div>
                )}
                {(request.metadata as any).job_title_ar && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'المسمى الوظيفي' : 'Job Title'}</dt>
                    <dd className="font-medium text-slate-800">{(request.metadata as any).job_title_ar}</dd>
                  </div>
                )}
                {(request.metadata as any).salary && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'الراتب الأساسي' : 'Basic Salary'}</dt>
                    <dd className="font-medium text-slate-800">{Number((request.metadata as any).salary).toLocaleString()} SAR</dd>
                  </div>
                )}
                {(request.metadata as any).start_date && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'تاريخ الانضمام' : 'Start Date'}</dt>
                    <dd className="font-medium text-slate-800">{(request.metadata as any).start_date}</dd>
                  </div>
                )}
                {(request.metadata as any).branch && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'الفرع' : 'Branch'}</dt>
                    <dd className="font-medium text-slate-800">{(request.metadata as any).branch}</dd>
                  </div>
                )}
                {(request.metadata as any).direct_manager && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'المدير المباشر' : 'Direct Manager'}</dt>
                    <dd className="font-medium text-slate-800">{(request.metadata as any).direct_manager}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Task tracker */}
          {isOnboardingParent && childRequests.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                {isAr ? 'مهام التعيين' : 'Onboarding Tasks'}
              </h2>
              <ul className="flex flex-col gap-3">
                {childRequests.map((child: any) => {
                  const taskLabel = child.task_type ? TASK_LABELS[child.task_type] : null;
                  const assignee = child.assigned_to ? childAssigneeMap[child.assigned_to] : null;
                  const statusColor =
                    child.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    child.status === 'cancelled' ? 'bg-slate-100 text-slate-500' :
                    child.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700';
                  const statusLabel =
                    child.status === 'completed' ? (isAr ? 'مكتمل' : 'Done') :
                    child.status === 'cancelled' ? (isAr ? 'ملغي' : 'Cancelled') :
                    child.status === 'in_progress' ? (isAr ? 'جارٍ' : 'In Progress') :
                    (isAr ? 'انتظار' : 'Pending');
                  return (
                    <li key={child.id} className="flex items-center gap-3 text-sm">
                      <span className="text-xl shrink-0">
                        {taskLabel?.icon || '📋'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/dashboard/requests/${child.id}`}
                          className="font-medium text-slate-800 hover:text-blue-600 transition-colors"
                        >
                          {taskLabel ? (isAr ? taskLabel.ar : taskLabel.en) : child.task_type}
                        </a>
                        {assignee && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {isAr ? 'المسؤول: ' : 'Assigned: '}
                            {isAr ? assignee.full_name_ar : (assignee.full_name_en || assignee.full_name_ar)}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Cancel onboarding button */}
              {['in_progress', 'draft'].includes(request.status) && currentEmployeeId === requesterId && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  {!showCancelModal ? (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                    >
                      🚫 {isAr ? 'إلغاء طلب التعيين' : 'Cancel Onboarding'}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={cancelNote}
                        onChange={e => setCancelNote(e.target.value)}
                        rows={2}
                        placeholder={isAr ? 'سبب الإلغاء *' : 'Cancellation reason *'}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                      />
                      {cancelError && <p className="text-red-600 text-xs">{cancelError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!cancelNote.trim()) { setCancelError(isAr ? 'السبب مطلوب' : 'Reason required'); return; }
                            setCancelError('');
                            startCancelTransition(async () => {
                              const result = await cancelOnboarding(request.id, cancelNote);
                              if (result.error) { setCancelError(result.error); } else { router.push('/dashboard/requests'); }
                            });
                          }}
                          disabled={cancelPending}
                          className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                          {isAr ? 'تأكيد الإلغاء' : 'Confirm Cancel'}
                        </button>
                        <button onClick={() => { setShowCancelModal(false); setCancelNote(''); setCancelError(''); }}
                          className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                          {isAr ? 'تراجع' : 'Back'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 4b. Type-specific info */}
          {request.request_type === 'fund_disbursement' && (request.amount != null || request.payee || request.cost_center) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                {isAr ? 'تفاصيل الصرف المالي' : 'Payment Details'}
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {request.amount != null && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'المبلغ' : 'Amount'}</dt>
                    <dd className="font-medium text-slate-800 text-lg">{Number(request.amount).toLocaleString()} {request.currency || ''}</dd>
                  </div>
                )}
                {request.payee && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'المستفيد' : 'Payee'}</dt>
                    <dd className="font-medium text-slate-800">{request.payee}</dd>
                  </div>
                )}
                {request.cost_center && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'مركز التكلفة' : 'Cost Center'}</dt>
                    <dd className="font-medium text-slate-800">{request.cost_center}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          {request.request_type === 'leave_approval' && request.leave_type && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                {isAr ? 'تفاصيل الإجازة' : 'Leave Details'}
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="text-slate-500 mb-0.5">{isAr ? 'نوع الإجازة' : 'Leave Type'}</dt>
                  <dd className="font-medium text-slate-800">{request.leave_type}</dd>
                </div>
                {request.leave_start_date && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'من تاريخ' : 'Start Date'}</dt>
                    <dd className="font-medium text-slate-800">{request.leave_start_date}</dd>
                  </div>
                )}
                {request.leave_end_date && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">{isAr ? 'إلى تاريخ' : 'End Date'}</dt>
                    <dd className="font-medium text-slate-800">{request.leave_end_date}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          {!isOnboardingParent && !isOnboardingChild &&
           !TYPES_WITH_DEDICATED_METADATA.has(request.request_type) &&
           request.metadata &&
           Object.keys(request.metadata).some(k => !HIDDEN_METADATA_KEYS.has(k)) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                {isAr ? 'بيانات إضافية' : 'Additional Details'}
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {Object.entries(request.metadata as Record<string, string>)
                  .filter(([k]) => !HIDDEN_METADATA_KEYS.has(k))
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-slate-500 mb-0.5 capitalize">{k.replace(/_/g, ' ')}</dt>
                      <dd className="font-medium text-slate-800">{String(v)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}

          {/* 6. Evidence */}
          {(evidence.length > 0 || evidenceFiltered) && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                {isAr ? 'المستندات المرفقة' : 'Attached Documents'}
              </h2>
              {evidence.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {evidence.map((e: any) => {
                    const fileType = getFileType(e.file_name);
                    const sizeKB = e.file_size ? Math.ceil(e.file_size / 1024) : null;
                    return (
                      <div key={e.id} className="border border-slate-100 rounded-xl p-3 space-y-2">
                        {/* Header row: icon + name + meta + download */}
                        <div className="flex items-center gap-3">
                          <span className="text-lg shrink-0">
                            {fileType === 'image' ? '🖼️' : fileType === 'pdf' ? '📕' : getFileIcon(e.file_name)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{e.file_name}</p>
                            <div className="text-xs text-slate-400 flex flex-wrap gap-2">
                              {sizeKB !== null && <span>{sizeKB} KB</span>}
                              {e.uploader && <span>{personName(e.uploader)}</span>}
                              {e.created_at && <span>{formatDate(e.created_at, isAr)}</span>}
                            </div>
                          </div>
                          <a
                            href={e.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 whitespace-nowrap shrink-0"
                          >
                            {isAr ? 'تحميل' : 'Download'}
                          </a>
                        </div>

                        {/* Preview area */}
                        {fileType === 'image' && (
                          <button onClick={() => setLightboxUrl(e.file_url)} className="block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={e.file_url}
                              alt={e.file_name}
                              className="max-h-40 rounded-lg border border-slate-200 hover:opacity-90 transition-opacity cursor-pointer"
                            />
                          </button>
                        )}

                        {fileType === 'pdf' && (
                          <PdfPreview url={e.file_url} isAr={isAr} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  {isAr ? 'لا توجد مرفقات مرئية لك' : 'No attachments visible to you'}
                </p>
              )}
              {evidenceFiltered && (
                <p className="mt-3 text-xs text-slate-400 italic">
                  📎 {isAr
                    ? 'تظهر لك المرفقات حتى آخر مرة كان الطلب لديك'
                    : 'You see attachments up to your last involvement'}
                </p>
              )}
            </div>
          )}

          {/* 7. Actions */}
          {!isOnboardingParent && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <RequestActions
                requestId={request.id}
                requestStatus={request.status}
                assignedTo={request.assigned_to}
                currentEmployeeId={currentEmployeeId}
                requesterId={requesterId}
                originCompanyId={request.origin_company_id}
                destinationDeptId={request.destination_dept_id}
                isDeptHead={isDeptHead}
                isOriginCompanyCEO={isOriginCompanyCEO}
                isHoldingCEO={isHoldingCEO}
                isFinanceHead={isFinanceHead}
                isHRHead={isHRHead}
                requiresCeo={request.requires_ceo}
                requiresHr={request.requires_hr}
                requiresFinance={request.requires_finance}
                ceoStampedAt={request.ceo_stamped_at}
                hrStampedAt={request.hr_stamped_at}
                financeStampedAt={request.finance_stamped_at}
                companyExitStampedAt={request.company_exit_stamped_at}
                companies={allCompanies}
                departments={allDepartments}
                isOnboardingChild={isOnboardingChild}
                dependsOnStatus={dependsOnStatus}
                isCustomFixedPath={isCustomFixedPath}
                isLastStep={isLastStep}
              />
            </div>
          )}

        </div>

        {/* ════════════ RIGHT COLUMN ════════════ */}
        <div className="lg:col-span-1 flex flex-col gap-6">

          {/* 1. Status card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
              {isAr ? 'الحالة' : 'Status'}
            </h2>
            <div className={`inline-flex px-4 py-2 rounded-full text-sm font-bold mb-5 ${STATUS_COLORS[request.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {statusLabel(request.status)}
            </div>

            <div className="text-sm text-slate-500 mb-1">
              {isAr ? 'المسؤول الحالي' : 'Currently With'}
            </div>
            <div className="font-semibold text-slate-800 mb-4">
              {personName(assignedName)}
            </div>

            {request.submitted_at && (
              <>
                <div className="text-sm text-slate-500 mb-1">
                  {isAr ? 'تاريخ التقديم' : 'Submitted At'}
                </div>
                <div className="text-sm font-medium text-slate-700">
                  {formatDate(request.submitted_at, isAr)}
                </div>
              </>
            )}
          </div>

          {/* 1b. Fixed-path step tracker */}
          {isCustomFixedPath && customSteps.length > 0 && (
            <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-violet-600 uppercase tracking-wide mb-4">
                🗂️ {isAr ? 'تقدم المسار' : 'Path Progress'}
              </h2>
              <div className="flex flex-col gap-2">
                {customSteps.map((step: any, idx: number) => {
                  const stepNum = idx + 1;
                  const isDone = stepNum < currentStep;
                  const isCurrent = stepNum === currentStep;
                  const isPending = stepNum > currentStep;
                  return (
                    <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm ${
                      isCurrent ? 'bg-violet-50 border border-violet-200' :
                      isDone    ? 'bg-emerald-50 border border-emerald-100' :
                                  'bg-slate-50 border border-slate-100'
                    }`}>
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isDone    ? 'bg-emerald-500 text-white' :
                        isCurrent ? 'bg-violet-600 text-white' :
                                    'bg-slate-200 text-slate-500'
                      }`}>
                        {isDone ? '✓' : stepNum}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${
                          isCurrent ? 'text-violet-900' :
                          isDone    ? 'text-emerald-800' :
                                      'text-slate-400'
                        }`}>
                          {isAr ? step.action_label_ar : step.action_label_en}
                        </p>
                        {step.dept && (
                          <p className="text-xs text-slate-400 truncate">
                            {isAr ? step.dept.name_ar : step.dept.name_en}
                          </p>
                        )}
                      </div>
                      {isCurrent && (
                        <span className="text-xs font-semibold text-violet-600 shrink-0">
                          {isAr ? 'الحالي' : 'Current'}
                        </span>
                      )}
                      {step.is_final && (
                        <span className="text-xs text-slate-400 shrink-0">🏁</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-slate-400 text-center">
                {isAr
                  ? `الخطوة ${currentStep} من ${totalSteps}`
                  : `Step ${currentStep} of ${totalSteps}`}
              </p>
            </div>
          )}

          {/* 2. SLA Indicator */}
          {slaInfo && (
            <div className={`bg-white rounded-2xl border shadow-sm p-6 ${
              slaInfo.status === 'critical' ? 'border-red-300' :
              slaInfo.status === 'warning'  ? 'border-amber-300' :
                                              'border-slate-200'
            }`}>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                {isAr ? 'مؤشر SLA' : 'SLA Status'}
              </h2>

              {/* Status badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-4 ${
                slaInfo.status === 'critical' ? 'bg-red-100 text-red-700' :
                slaInfo.status === 'warning'  ? 'bg-amber-100 text-amber-700' :
                                                'bg-emerald-100 text-emerald-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  slaInfo.status === 'critical' ? 'bg-red-500' :
                  slaInfo.status === 'warning'  ? 'bg-amber-500' :
                                                  'bg-emerald-500'
                }`} />
                {slaInfo.status === 'critical'
                  ? (isAr ? 'متجاوز الحد الأقصى' : 'SLA Breached')
                  : slaInfo.status === 'warning'
                  ? (isAr ? 'اقترب من الحد' : 'Approaching Limit')
                  : (isAr ? 'ضمن المدة' : 'On Track')
                }
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{isAr ? 'مضى' : 'Elapsed'}</span>
                  <span>{Math.round(slaInfo.hoursElapsed)}h / {slaInfo.targetHours}h</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      slaInfo.status === 'critical' ? 'bg-red-500' :
                      slaInfo.status === 'warning'  ? 'bg-amber-400' :
                                                      'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (slaInfo.hoursElapsed / slaInfo.maxHours) * 100).toFixed(1)}%` }}
                  />
                </div>
              </div>

              {/* Labels */}
              <div className="flex justify-between text-xs text-slate-400">
                <span>{isAr ? 'الهدف:' : 'Target:'} {slaInfo.targetHours}h</span>
                <span>{isAr ? 'الحد الأقصى:' : 'Max:'} {slaInfo.maxHours}h</span>
              </div>
            </div>
          )}

          {/* 3. Gate badges */}
          {showGates && gates.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                {isAr ? 'البوابات المطلوبة' : 'Required Gates'}
              </h2>
              <ul className="flex flex-col gap-3">
                {gates.map(g => (
                  <li key={g.key} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {isAr ? g.labelAr : g.labelEn}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${g.stamped ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {g.stamped
                        ? (isAr ? '✅ تمت' : '✅ Done')
                        : (isAr ? '⏳ مطلوبة' : '⏳ Required')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. Duration card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {isAr ? 'مدة المعالجة' : 'Processing Time'}
            </h2>
            {durationEl}
          </div>

          {/* 4. Timeline */}
          {reversedActions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                {isAr ? 'سجل الإجراءات' : 'Activity Timeline'}
              </h2>
              <ol className="flex flex-col gap-5">
                {reversedActions.map((a: any, idx: number) => {
                  // "after X" = time between this action and the previous one in the original (ascending) order.
                  // reversedActions[idx] is actions[actions.length - 1 - idx]
                  // Previous action in original order = actions[actions.length - 1 - idx - 1]
                  const originalIdx = actions.length - 1 - idx;
                  const prevAction  = originalIdx > 0 ? actions[originalIdx - 1] : null;
                  const afterMs     = prevAction ? new Date(a.created_at).getTime() - new Date(prevAction.created_at).getTime() : null;

                  return (
                    <li key={a.id} className="flex gap-3 text-sm">
                      <span className="text-base mt-0.5 shrink-0">{getActionIcon(a.action)}</span>
                      <div className="flex-1 min-w-0">
                        {/* Action label */}
                        <div className="font-semibold text-slate-800">{actionLabel(a.action)}</div>

                        {/* Actor */}
                        {a.actor && (
                          <div className="text-slate-500 text-xs mt-0.5">
                            {isAr ? 'بواسطة' : 'By'}: {personName(a.actor)}
                          </div>
                        )}

                        {/* Forwarded from → to */}
                        {a.from_person && a.to_person && (
                          <div className="text-slate-500 text-xs mt-0.5">
                            {isAr
                              ? `من ${personName(a.from_person)} ← إلى ${personName(a.to_person)}`
                              : `${personName(a.from_person)} → ${personName(a.to_person)}`}
                          </div>
                        )}

                        {/* Note */}
                        {a.note && (
                          <div className="mt-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 text-xs leading-relaxed">
                            {a.note}
                          </div>
                        )}

                        {/* Timestamp */}
                        {a.created_at && (
                          <div className="text-slate-400 text-xs mt-1">
                            {formatDate(a.created_at, isAr)}
                          </div>
                        )}

                        {/* Time since previous action */}
                        {afterMs !== null && afterMs > 0 && (
                          <div className="text-slate-300 text-xs mt-0.5">
                            {isAr ? `بعد ${formatDuration(afterMs, true)}` : `after ${formatDuration(afterMs, false)}`}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

        </div>
      </div>

      {/* ── Image lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-slate-600 hover:text-slate-900 z-10"
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightboxUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <div className="flex justify-center mt-3">
              <a
                href={lightboxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                {isAr ? '⬇️ تحميل' : '⬇️ Download'}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
