'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';

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
};

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

const priorityLabels: Record<string, { ar: string; en: string }> = {
  urgent: { ar: 'عاجل',   en: 'Urgent' },
  high:   { ar: 'عالي',   en: 'High' },
  normal: { ar: 'عادي',   en: 'Normal' },
  low:    { ar: 'منخفض',  en: 'Low' },
};

export interface RequestRow {
  id: string;
  request_number: string;
  subject: string;
  request_type: string;
  status: string;
  priority: string;
  created_at: string;
  requester_name_ar: string | null;
  requester_name_en: string | null;
  company_name_ar: string | null;
  company_name_en: string | null;
}

export default function RequestsClient({ requests }: { requests: RequestRow[] }) {
  const { lang } = useLanguage();

  const t = {
    ar: { title: 'الطلبات', count: (n: number) => `${n} طلب`, newRequest: 'طلب جديد', empty: 'لا توجد طلبات بعد', emptySub: 'ابدأ بإنشاء طلب جديد' },
    en: { title: 'Requests', count: (n: number) => `${n} request${n !== 1 ? 's' : ''}`, newRequest: 'New Request', empty: 'No requests yet', emptySub: 'Start by creating a new request' },
  }[lang];

  function exportToCSV() {
    const headers = lang === 'ar'
      ? ['رقم الطلب', 'الموضوع', 'النوع', 'الحالة', 'الأولوية', 'مقدم الطلب', 'الشركة', 'تاريخ الإنشاء']
      : ['Request #', 'Subject', 'Type', 'Status', 'Priority', 'Requester', 'Company', 'Created'];
    const rows = requests.map(r => [
      r.request_number,
      r.subject,
      typeLabels[r.request_type]?.[lang] ?? r.request_type,
      statusLabels[r.status]?.[lang] ?? r.status,
      priorityLabels[r.priority]?.[lang] ?? r.priority,
      lang === 'ar' ? r.requester_name_ar : (r.requester_name_en || r.requester_name_ar),
      lang === 'ar' ? r.company_name_ar : (r.company_name_en || r.company_name_ar),
      r.created_at,
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const bom = '\uFEFF'; // UTF-8 BOM for Arabic support in Excel
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eagle-eye-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{t.count(requests.length)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportToCSV} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
            {lang === 'ar' ? '⬇️ تصدير CSV' : '⬇️ Export CSV'}
          </button>
          <Link href="/dashboard/new-request" className="btn-primary text-sm flex items-center gap-2">
            <span>➕</span> {t.newRequest}
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="font-medium">{t.empty}</p>
            <p className="text-sm mt-1">{t.emptySub}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {requests.map(req => {
              const statusLabel   = statusLabels[req.status]?.[lang]   ?? req.status;
              const typeLabel     = typeLabels[req.request_type]?.[lang] ?? req.request_type;
              const priorityLabel = priorityLabels[req.priority]?.[lang] ?? req.priority;
              const requesterName = lang === 'ar' ? req.requester_name_ar : (req.requester_name_en || req.requester_name_ar);
              const companyName   = lang === 'ar' ? req.company_name_ar  : (req.company_name_en  || req.company_name_ar);
              return (
                <Link key={req.id} href={`/dashboard/requests/${req.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-slate-400" dir="ltr">{req.request_number}</span>
                      <span className={`status-badge ${getStatusColor(req.status)}`}>{statusLabel}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getPriorityColor(req.priority)}`}>
                        {priorityLabel}
                      </span>
                    </div>
                    <p className="font-medium text-slate-900 truncate">{req.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {typeLabel} • {requesterName} • {companyName}
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">{formatDate(req.created_at, lang)}</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
