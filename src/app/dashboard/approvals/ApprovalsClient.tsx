'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDate } from '@/lib/utils';

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

const priorityColors: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-100 text-blue-600',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

const execStatusLabels: Record<string, { ar: string; en: string }> = {
  pending_execution:    { ar: 'بانتظار التنفيذ', en: 'Pending Execution' },
  in_progress:          { ar: 'قيد التنفيذ',     en: 'In Progress' },
  assigned_to_employee: { ar: 'مُسند لموظف',     en: 'Assigned' },
};

export interface PendingItem {
  stepId: string;
  requestId: string;
  requestNumber: string;
  subject: string;
  requestType: string;
  priority: string;
  status: string;
  createdAt: string;
  requesterNameAr: string;
  requesterNameEn: string | null;
  companyNameAr: string;
  companyNameEn: string | null;
  itemType: 'approval' | 'execution';
}

export default function ApprovalsClient({ approvalItems, executionItems }: { approvalItems: PendingItem[]; executionItems: PendingItem[] }) {
  const { lang } = useLanguage();

  const t = {
    ar: {
      title: 'الموافقات والتنفيذ',
      approvalSection: 'بانتظار الموافقة',
      executionSection: 'بانتظار التنفيذ',
      subtitle: (n: number) => `${n} طلب بانتظار إجراءك`,
      emptyTitle: 'لا توجد طلبات بانتظار إجراءك',
      emptySub: 'أحسنت! لا يوجد شيء معلق',
      priorityLabels: { low: 'منخفض', normal: 'عادي', high: 'عالي', urgent: 'عاجل' } as Record<string, string>,
    },
    en: {
      title: 'Approvals & Execution',
      approvalSection: 'Pending Approval',
      executionSection: 'Pending Execution',
      subtitle: (n: number) => `${n} request${n !== 1 ? 's' : ''} awaiting your action`,
      emptyTitle: 'No requests awaiting your action',
      emptySub: 'All clear — nothing pending',
      priorityLabels: { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent' } as Record<string, string>,
    },
  }[lang];

  const total = approvalItems.length + executionItems.length;

  function renderItem(item: PendingItem) {
    const typeLabel = typeLabels[item.requestType];
    const requesterName = lang === 'ar' ? item.requesterNameAr : (item.requesterNameEn || item.requesterNameAr);
    const companyName   = lang === 'ar' ? item.companyNameAr  : (item.companyNameEn  || item.companyNameAr);
    const isExec = item.itemType === 'execution';
    const execLabel = execStatusLabels[item.status]?.[lang];

    return (
      <Link key={item.stepId} href={`/dashboard/requests/${item.requestId}`}
        className={`flex items-center gap-4 px-6 py-4 transition-colors ${isExec ? 'hover:bg-violet-50/50' : 'hover:bg-amber-50/50'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isExec ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'}`}>
          {isExec ? '🔧' : '⏳'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-mono text-slate-400" dir="ltr">{item.requestNumber}</span>
            {isExec && execLabel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-violet-100 text-violet-700">{execLabel}</span>
            )}
            {item.priority !== 'normal' && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${priorityColors[item.priority]}`}>
                {t.priorityLabels[item.priority]}
              </span>
            )}
          </div>
          <p className="font-medium text-slate-900 truncate">{item.subject}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {typeLabel ? typeLabel[lang] : item.requestType} • {requesterName} • {companyName}
          </p>
        </div>
        <div className="text-xs text-slate-400 shrink-0">{formatDate(item.createdAt, lang)}</div>
      </Link>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
        <p className="text-sm text-slate-500 mt-1">{t.subtitle(total)}</p>
      </div>

      {total === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <span className="text-4xl mb-4 block">✅</span>
          <p className="font-medium">{t.emptyTitle}</p>
          <p className="text-sm mt-1">{t.emptySub}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Approval items */}
          {approvalItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <span>⏳</span>
                <h2 className="text-sm font-semibold text-amber-900">{t.approvalSection}</h2>
                <span className="ms-auto text-xs text-amber-700 font-medium">{approvalItems.length}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {approvalItems.map(renderItem)}
              </div>
            </div>
          )}

          {/* Execution items */}
          {executionItems.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-3 bg-violet-50 border-b border-violet-100 flex items-center gap-2">
                <span>🔧</span>
                <h2 className="text-sm font-semibold text-violet-900">{t.executionSection}</h2>
                <span className="ms-auto text-xs text-violet-700 font-medium">{executionItems.length}</span>
              </div>
              <div className="divide-y divide-slate-50">
                {executionItems.map(renderItem)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
