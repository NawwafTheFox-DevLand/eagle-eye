'use client';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import NovusLogo from '@/components/brand/NovusLogo';

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  pending_clarification: 'bg-amber-100 text-amber-700',
};
const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  in_progress: { ar: 'قيد المعالجة', en: 'In Progress' },
  pending_clarification: { ar: 'بانتظار توضيح', en: 'Needs Clarification' },
};
const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  normal: 'bg-blue-50 text-blue-600',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};
const PRIORITY_LABELS: Record<string, { ar: string; en: string }> = {
  low: { ar: 'منخفض', en: 'Low' },
  normal: { ar: 'عادي', en: 'Normal' },
  high: { ar: 'مهم', en: 'High' },
  urgent: { ar: 'عاجل', en: 'Urgent' },
};
const TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  general_internal:      { ar: 'طلب داخلي عام',    en: 'General Internal'   },
  cross_department:      { ar: 'طلب بين الأقسام',   en: 'Cross-Department'   },
  intercompany:          { ar: 'طلب بين الشركات',   en: 'Intercompany'       },
  fund_disbursement:     { ar: 'طلب صرف مالي',      en: 'Fund Disbursement'  },
  leave_approval:        { ar: 'طلب إجازة',         en: 'Leave Approval'     },
  promotion:             { ar: 'طلب ترقية',         en: 'Promotion'          },
  demotion_disciplinary: { ar: 'طلب تأديبي',        en: 'Disciplinary'       },
  create_department:     { ar: 'إنشاء قسم',         en: 'Create Department'  },
  create_company:        { ar: 'إنشاء شركة',        en: 'Create Company'     },
  create_position:       { ar: 'إنشاء وظيفة',       en: 'Create Position'    },
};

function timeAgo(dateStr: string, isAr: boolean) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (isAr) {
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return `منذ ${Math.floor(diff / 86400)} يوم`;
  }
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function InboxClient({ items }: { items: any[] }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'صندوق الوارد' : 'Inbox'}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {items.length === 0
            ? (isAr ? 'لا يوجد طلبات بانتظارك' : 'No requests waiting for you')
            : isAr ? `${items.length} طلب بانتظار إجراء` : `${items.length} requests awaiting action`}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="flex justify-center mb-4">
            <NovusLogo variant="empty" size={56} showText={false} />
          </div>
          <p className="text-slate-500">{isAr ? 'صندوق الوارد فارغ' : 'Inbox is empty'}</p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-100">
          {items.map(item => {
            const senderName = isAr
              ? (item.sender?.full_name_ar || item.sender?.full_name_en)
              : (item.sender?.full_name_en || item.sender?.full_name_ar);
            const requesterName = isAr
              ? (item.requester?.full_name_ar || item.requester?.full_name_en)
              : (item.requester?.full_name_en || item.requester?.full_name_ar);
            return (
              <Link
                key={item.id}
                href={`/dashboard/requests/${item.id}`}
                className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="text-xs font-mono text-slate-400">{item.request_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || 'bg-slate-100 text-slate-600'}`}>
                      {isAr ? STATUS_LABELS[item.status]?.ar : STATUS_LABELS[item.status]?.en}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[item.priority] || ''}`}>
                      {isAr ? PRIORITY_LABELS[item.priority]?.ar : PRIORITY_LABELS[item.priority]?.en}
                    </span>
                    {item.request_type && TYPE_LABELS[item.request_type] && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600">
                        {isAr ? TYPE_LABELS[item.request_type].ar : TYPE_LABELS[item.request_type].en}
                      </span>
                    )}
                    {item.parent_request_id && item.task_type && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700">
                        🧑‍💼 {isAr ? 'مهمة توظيف' : 'Onboarding Task'}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate">
                    {item.subject}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    {senderName && (
                      <p className="text-xs text-slate-500">
                        {isAr ? 'أرسله: ' : 'Sent by: '}<span className="font-medium">{senderName}</span>
                      </p>
                    )}
                    {requesterName && (
                      <p className="text-xs text-slate-400">
                        {isAr ? 'مقدم: ' : 'From: '}{requesterName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-400 shrink-0 mt-1">
                  {timeAgo(item.last_action_at, isAr)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
