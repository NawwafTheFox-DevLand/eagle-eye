import { createClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect, notFound } from 'next/navigation';
import { getStatusColor, formatDateTime, formatCurrency } from '@/lib/utils';
import RequestActions from '@/components/requests/RequestActions';

const statusLabels: Record<string, string> = {
  draft: 'مسودة', submitted: 'مقدم', under_review: 'قيد المراجعة',
  pending_clarification: 'بانتظار توضيح', returned: 'مُعاد',
  approved: 'موافق عليه', rejected: 'مرفوض', completed: 'مكتمل',
  cancelled: 'ملغي', archived: 'مؤرشف',
};

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getSessionEmployee();
  if (!employee) redirect('/login');

  const supabase = await createClient();

  const { data: request } = await supabase
    .from('requests')
    .select(`*,
      requester:employees!requester_id(id, full_name_ar, full_name_en, employee_code),
      origin_company:companies!origin_company_id(name_ar, code),
      origin_dept:departments!origin_dept_id(name_ar, code),
      destination_company:companies!destination_company_id(name_ar, code),
      destination_dept:departments!destination_dept_id(name_ar, code)
    `)
    .eq('id', id)
    .single();

  if (!request) notFound();

  const { data: actions } = await supabase
    .from('request_actions')
    .select('*, actor:employees!actor_id(full_name_ar, full_name_en)')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  const { data: approvalSteps } = await supabase
    .from('approval_steps')
    .select('*, approver:employees!approver_id(full_name_ar, full_name_en)')
    .eq('request_id', id)
    .order('step_order');

  // Check if current user has a pending approval step
  const pendingStep = approvalSteps?.find(
    (s: any) => s.approver_id === employee.id && s.status === 'pending'
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-slate-400" dir="ltr">{request.request_number}</span>
            <span className={`status-badge ${getStatusColor(request.status)}`}>
              {statusLabels[request.status]}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{request.subject}</h1>
        </div>
        <a href="/dashboard/requests" className="text-sm text-slate-500 hover:text-eagle-600">← الرجوع</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {request.description && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">التفاصيل</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          {/* Financial info */}
          {request.amount && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">البيانات المالية</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">المبلغ:</span> <span className="font-bold text-lg">{formatCurrency(request.amount, request.currency)}</span></div>
                {request.payee && <div><span className="text-slate-500">المستفيد:</span> {request.payee}</div>}
                {request.cost_center && <div><span className="text-slate-500">مركز التكلفة:</span> {request.cost_center}</div>}
              </div>
            </div>
          )}

          {/* Leave info */}
          {request.leave_type && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-semibold text-slate-900 mb-3">بيانات الإجازة</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-slate-500">النوع:</span> {request.leave_type}</div>
                {request.leave_start_date && <div><span className="text-slate-500">من:</span> {request.leave_start_date}</div>}
                {request.leave_end_date && <div><span className="text-slate-500">إلى:</span> {request.leave_end_date}</div>}
              </div>
            </div>
          )}

          {/* Action panel for approver */}
          {pendingStep && (
            <RequestActions requestId={request.id} stepId={pendingStep.id} />
          )}

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">سجل الإجراءات</h3>
            {!actions || actions.length === 0 ? (
              <p className="text-sm text-slate-400">لا توجد إجراءات بعد</p>
            ) : (
              <div className="space-y-4">
                {actions.map((action: any, i: number) => (
                  <div key={action.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${
                        action.action === 'approved' ? 'bg-emerald-500' :
                        action.action === 'rejected' ? 'bg-red-500' :
                        action.action === 'sent_back' ? 'bg-amber-500' :
                        'bg-blue-500'
                      }`} />
                      {i < actions.length - 1 && <div className="w-px flex-1 bg-slate-200 my-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-sm font-medium text-slate-900">
                        {action.actor?.full_name_ar || 'النظام'} — <span className="text-slate-500">{
                          action.action === 'submitted' ? 'قدّم الطلب' :
                          action.action === 'approved' ? 'وافق' :
                          action.action === 'rejected' ? 'رفض' :
                          action.action === 'sent_back' ? 'طلب توضيح' :
                          action.action
                        }</span>
                      </p>
                      {action.rationale && <p className="text-sm text-slate-600 mt-1">{action.rationale}</p>}
                      <p className="text-xs text-slate-400 mt-1">{formatDateTime(action.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Request info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-3 text-sm">معلومات الطلب</h3>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-slate-500">مقدم الطلب</dt><dd className="font-medium">{request.requester?.full_name_ar}</dd></div>
              <div><dt className="text-slate-500">الشركة</dt><dd>{request.origin_company?.name_ar}</dd></div>
              <div><dt className="text-slate-500">القسم</dt><dd>{request.origin_dept?.name_ar || '—'}</dd></div>
              {request.destination_company && <div><dt className="text-slate-500">الجهة المستقبلة</dt><dd>{request.destination_company?.name_ar}</dd></div>}
              <div><dt className="text-slate-500">تاريخ الإنشاء</dt><dd>{formatDateTime(request.created_at)}</dd></div>
              {request.submitted_at && <div><dt className="text-slate-500">تاريخ التقديم</dt><dd>{formatDateTime(request.submitted_at)}</dd></div>}
            </dl>
          </div>

          {/* Approval chain */}
          {approvalSteps && approvalSteps.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="font-semibold text-slate-900 mb-3 text-sm">مسار الموافقة</h3>
              <div className="space-y-3">
                {approvalSteps.map((step: any) => (
                  <div key={step.id} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      step.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      step.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {step.status === 'approved' ? '✓' : step.status === 'rejected' ? '✗' : step.step_order}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{step.approver?.full_name_ar || 'غير محدد'}</p>
                      <p className="text-xs text-slate-500">{step.approver_role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
