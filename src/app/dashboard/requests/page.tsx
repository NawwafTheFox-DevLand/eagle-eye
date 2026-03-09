import { createClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils';

const statusLabels: Record<string, string> = {
  draft: 'مسودة', submitted: 'مقدم', under_review: 'قيد المراجعة',
  pending_clarification: 'بانتظار توضيح', returned: 'مُعاد', resubmitted: 'مُعاد تقديمه',
  approved: 'موافق عليه', rejected: 'مرفوض', completed: 'مكتمل',
  cancelled: 'ملغي', archived: 'مؤرشف',
};

const typeLabels: Record<string, string> = {
  general_internal: 'طلب داخلي عام', intercompany: 'طلب بين الشركات',
  cross_department: 'طلب بين الأقسام', fund_disbursement: 'صرف مالي',
  leave_approval: 'إجازة', promotion: 'ترقية',
  demotion_disciplinary: 'تأديبي', create_department: 'إنشاء قسم',
  create_company: 'إنشاء شركة', create_position: 'إنشاء وظيفة',
};

export default async function RequestsPage() {
  const employee = await getSessionEmployee();
  if (!employee) redirect('/login');

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from('requests')
    .select('*, requester:employees!requester_id(full_name_ar, full_name_en), origin_company:companies!origin_company_id(name_ar, code)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">الطلبات</h1>
          <p className="text-sm text-slate-500 mt-1">{requests?.length || 0} طلب</p>
        </div>
        <Link href="/dashboard/new-request" className="btn-primary text-sm flex items-center gap-2">
          <span>➕</span> طلب جديد
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {!requests || requests.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl mb-4 block">📋</span>
            <p className="font-medium">لا توجد طلبات بعد</p>
            <p className="text-sm mt-1">ابدأ بإنشاء طلب جديد</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {requests.map((req: any) => (
              <Link key={req.id} href={`/dashboard/requests/${req.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400" dir="ltr">{req.request_number}</span>
                    <span className={`status-badge ${getStatusColor(req.status)}`}>
                      {statusLabels[req.status] || req.status}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${getPriorityColor(req.priority)}`}>
                      {req.priority === 'urgent' ? 'عاجل' : req.priority === 'high' ? 'عالي' : req.priority === 'normal' ? 'عادي' : 'منخفض'}
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 truncate">{req.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {typeLabels[req.request_type] || req.request_type} • {req.requester?.full_name_ar} • {req.origin_company?.name_ar}
                  </p>
                </div>
                <div className="text-xs text-slate-400 shrink-0">
                  {formatDate(req.created_at)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
