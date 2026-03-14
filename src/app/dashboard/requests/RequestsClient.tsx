'use client';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { exportToCSV } from '@/lib/utils/export';
import NovusLogo from '@/components/brand/NovusLogo';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  pending_clarification: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
  archived: 'bg-gray-100 text-gray-500',
};
const STATUS_LABELS: Record<string, { ar: string; en: string }> = {
  draft: { ar: 'مسودة', en: 'Draft' },
  in_progress: { ar: 'قيد المعالجة', en: 'In Progress' },
  pending_clarification: { ar: 'بانتظار توضيح', en: 'Needs Clarification' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  rejected: { ar: 'مرفوض', en: 'Rejected' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
  archived: { ar: 'مؤرشف', en: 'Archived' },
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

const TABS = [
  { key: 'all',       ar: 'الكل',          en: 'All'            },
  { key: 'submitted', ar: 'صادرة',         en: 'My Submissions' },
  { key: 'received',  ar: 'واردة',         en: 'Received'       },
  { key: 'forwarded', ar: 'تم تحويلها',    en: 'Forwarded'      },
  { key: 'returned',  ar: 'تم إرجاعها',    en: 'Returned'       },
  { key: 'assigned',  ar: 'معينة',         en: 'Assigned by Me' },
] as const;

interface Props {
  requests: any[];
  currentEmployeeId: string;
  myActions: { request_id: string; action: string }[];
}

export default function RequestsClient({ requests, currentEmployeeId, myActions }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const searchParams = useSearchParams();

  const [activeTab,     setActiveTab]     = useState(searchParams.get('tab')    || 'all');
  const [statusFilter,  setStatusFilter]  = useState(searchParams.get('status') || '');
  const [priorityFilter, setPriorityFilter] = useState('');

  // ── Build action lookup maps ───────────────────────────────────────────────

  const { actionsByRequest, receivedRequestIds } = useMemo(() => {
    const byReq = new Map<string, Set<string>>();
    myActions.forEach(a => {
      if (!byReq.has(a.request_id)) byReq.set(a.request_id, new Set());
      byReq.get(a.request_id)!.add(a.action);
    });
    // "received" = had any action other than submitted (i.e. the request came to me)
    const received = new Set(
      myActions.filter(a => a.action !== 'submitted').map(a => a.request_id)
    );
    return { actionsByRequest: byReq, receivedRequestIds: received };
  }, [myActions]);

  // ── Tab filter ────────────────────────────────────────────────────────────

  const filteredByTab = useMemo(() => {
    switch (activeTab) {
      case 'submitted': return requests.filter(r => r.requester_id === currentEmployeeId);
      case 'received':  return requests.filter(r => receivedRequestIds.has(r.id));
      case 'forwarded': return requests.filter(r => actionsByRequest.get(r.id)?.has('forwarded'));
      case 'returned':  return requests.filter(r => actionsByRequest.get(r.id)?.has('returned'));
      case 'assigned':  return requests.filter(r => actionsByRequest.get(r.id)?.has('assigned'));
      default:          return requests;
    }
  }, [requests, activeTab, currentEmployeeId, actionsByRequest, receivedRequestIds]);

  // ── Status/priority filter on top of tab filter ───────────────────────────

  const filtered = useMemo(() =>
    filteredByTab.filter(r =>
      (!statusFilter  || r.status   === statusFilter)  &&
      (!priorityFilter || r.priority === priorityFilter)
    ),
  [filteredByTab, statusFilter, priorityFilter]);

  // ── Tab counts ────────────────────────────────────────────────────────────

  const tabCounts = useMemo(() => ({
    all:       requests.length,
    submitted: requests.filter(r => r.requester_id === currentEmployeeId).length,
    received:  requests.filter(r => receivedRequestIds.has(r.id)).length,
    forwarded: requests.filter(r => actionsByRequest.get(r.id)?.has('forwarded')).length,
    returned:  requests.filter(r => actionsByRequest.get(r.id)?.has('returned')).length,
    assigned:  requests.filter(r => actionsByRequest.get(r.id)?.has('assigned')).length,
  }), [requests, currentEmployeeId, actionsByRequest, receivedRequestIds]);

  // ── Export ────────────────────────────────────────────────────────────────

  function handleExport() {
    exportToCSV(filtered.map(r => ({
      [isAr ? 'رقم الطلب' : 'Number']: r.request_number || '',
      [isAr ? 'الموضوع'   : 'Subject']: r.subject        || '',
      [isAr ? 'النوع'     : 'Type']:    r.request_type   || '',
      [isAr ? 'الأولوية'  : 'Priority']: r.priority      || '',
      [isAr ? 'الحالة'    : 'Status']:  r.status         || '',
      [isAr ? 'التاريخ'   : 'Date']:    r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
    })), 'requests');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'الطلبات' : 'Requests'}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAr
              ? `${filtered.length} من ${filteredByTab.length} طلب`
              : `${filtered.length} of ${filteredByTab.length} requests`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            {isAr ? '⬇ تصدير' : '⬇ Export'}
          </button>
          <Link href="/dashboard/new-request" className="btn-primary">
            {isAr ? '➕ طلب جديد' : '➕ New Request'}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {isAr ? tab.ar : tab.en}
            {tabCounts[tab.key] > 0 && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-field w-auto text-sm">
          <option value="">{isAr ? 'جميع الحالات' : 'All Statuses'}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          className="input-field w-auto text-sm">
          <option value="">{isAr ? 'جميع الأولويات' : 'All Priorities'}</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{isAr ? v.ar : v.en}</option>
          ))}
        </select>
        {(statusFilter || priorityFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setPriorityFilter(''); }}
            className="text-sm text-slate-500 hover:text-slate-700 px-3 py-2">
            {isAr ? 'مسح الفلاتر' : 'Clear filters'}
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="flex justify-center mb-4">
            <NovusLogo variant="empty" size={56} showText={false} />
          </div>
          <p className="text-slate-500 mb-4">{isAr ? 'لا توجد طلبات' : 'No requests found'}</p>
          <Link href="/dashboard/new-request" className="btn-primary">
            {isAr ? 'إنشاء طلب جديد' : 'Create new request'}
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1.5fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>{isAr ? 'الموضوع' : 'Subject'}</span>
            <span>{isAr ? 'النوع' : 'Type'}</span>
            <span>{isAr ? 'الأولوية' : 'Priority'}</span>
            <span>{isAr ? 'الحالة' : 'Status'}</span>
            <span>{isAr ? 'مقدم الطلب' : 'Requester'}</span>
            <span>{isAr ? 'المسؤول الحالي' : 'Assigned To'}</span>
            <span>{isAr ? 'التاريخ' : 'Date'}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map(req => {
              const requesterName = isAr ? req.requester_name_ar : (req.requester_name_en || req.requester_name_ar);
              const assignedName  = isAr ? req.assigned_name_ar  : (req.assigned_name_en  || req.assigned_name_ar);
              return (
                <Link
                  key={req.id}
                  href={`/dashboard/requests/${req.id}`}
                  className="grid md:grid-cols-[2fr_1fr_1fr_1fr_1.5fr_1.5fr_auto] gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors items-center group">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">{req.subject}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{req.request_number}</p>
                  </div>
                  <span className="text-xs text-slate-500 truncate">
                    {TYPE_LABELS[req.request_type]
                      ? (isAr ? TYPE_LABELS[req.request_type].ar : TYPE_LABELS[req.request_type].en)
                      : req.request_type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${PRIORITY_COLORS[req.priority] || ''}`}>
                    {isAr ? PRIORITY_LABELS[req.priority]?.ar : PRIORITY_LABELS[req.priority]?.en}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${STATUS_COLORS[req.status] || ''}`}>
                    {isAr ? STATUS_LABELS[req.status]?.ar : STATUS_LABELS[req.status]?.en}
                  </span>
                  <span className="text-xs text-slate-600 truncate">{requesterName || '—'}</span>
                  <span className="text-xs text-slate-600 truncate">{assignedName || '—'}</span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(req.created_at).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
