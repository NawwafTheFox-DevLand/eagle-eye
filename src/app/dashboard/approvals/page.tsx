import { createClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStatusColor, formatDate } from '@/lib/utils';

export default async function ApprovalsPage() {
  const employee = await getSessionEmployee();
  if (!employee) redirect('/login');

  const supabase = await createClient();

  // Get pending approval steps for this user
  const { data: pendingSteps } = await supabase
    .from('approval_steps')
    .select(`
      *,
      request:requests(
        id, request_number, subject, request_type, priority, status, created_at,
        requester:employees!requester_id(full_name_ar),
        origin_company:companies!origin_company_id(name_ar)
      )
    `)
    .eq('approver_id', employee.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">الموافقات</h1>
        <p className="text-sm text-slate-500 mt-1">{pendingSteps?.length || 0} طلب بانتظار إجراءك</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {!pendingSteps || pendingSteps.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl mb-4 block">✅</span>
            <p className="font-medium">لا توجد طلبات بانتظار موافقتك</p>
            <p className="text-sm mt-1">أحسنت! لا يوجد شيء معلق</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {pendingSteps.map((step: any) => (
              <Link key={step.id} href={`/dashboard/requests/${step.request?.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-amber-50/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <span>⏳</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400" dir="ltr">{step.request?.request_number}</span>
                  </div>
                  <p className="font-medium text-slate-900 truncate">{step.request?.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {step.request?.requester?.full_name_ar} • {step.request?.origin_company?.name_ar}
                  </p>
                </div>
                <div className="text-xs text-slate-400 shrink-0">
                  {step.request?.created_at ? formatDate(step.request.created_at) : ''}
                </div>
                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
