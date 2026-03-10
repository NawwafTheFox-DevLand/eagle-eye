'use client';

import { useState, useTransition, useEffect } from 'react';
import { approveRequest, rejectRequest, sendBackRequest, assignToEmployee } from '@/app/actions/requests';
import { useRouter } from 'next/navigation';

export default function RequestActions({
  requestId,
  stepId,
  approverRole,
  currentDeptId,
}: {
  requestId: string;
  stepId: string;
  approverRole?: string;
  currentDeptId?: string;
}) {
  const [action, setAction] = useState<'approve' | 'reject' | 'sendback' | 'assign' | null>(null);
  const [note, setNote] = useState('');
  const [isPending, startTransition] = useTransition();
  const [deptEmps, setDeptEmps] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const router = useRouter();

  const isDeptManager = approverRole === 'department_manager';

  useEffect(() => {
    if (action === 'assign' && currentDeptId && deptEmps.length === 0) {
      startTransition(async () => {
        const { getDeptEmployeesForAssign } = await import('@/app/actions/requests');
        const emps = await getDeptEmployeesForAssign(currentDeptId);
        setDeptEmps(emps);
      });
    }
  }, [action, currentDeptId]);

  function handleAction() {
    if (action === 'assign') {
      if (!selectedEmpId) return;
      startTransition(async () => {
        await assignToEmployee(requestId, stepId, selectedEmpId);
        router.refresh();
        setAction(null);
        setSelectedEmpId('');
      });
      return;
    }
    if (!note.trim()) return;
    startTransition(async () => {
      if (action === 'approve') await approveRequest(requestId, note, stepId);
      else if (action === 'reject') await rejectRequest(requestId, note, stepId);
      else if (action === 'sendback') await sendBackRequest(requestId, note, stepId);
      router.refresh();
      setAction(null);
      setNote('');
    });
  }

  if (!action) {
    return (
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
        <h3 className="font-semibold text-amber-900 mb-3">⏳ بانتظار إجراءك</h3>
        <p className="text-sm text-amber-700 mb-4">هذا الطلب يحتاج موافقتك للمتابعة</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setAction('approve')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm">
            ✓ موافقة
          </button>
          <button onClick={() => setAction('sendback')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors">
            ↩ طلب توضيح
          </button>
          <button onClick={() => setAction('reject')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors">
            ✗ رفض
          </button>
          {isDeptManager && currentDeptId && (
            <button onClick={() => setAction('assign')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
              👤 تعيين لموظف
            </button>
          )}
        </div>
      </div>
    );
  }

  if (action === 'assign') {
    return (
      <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
        <h3 className="font-semibold text-blue-900 mb-3">👤 تعيين لموظف / Assign to Employee</h3>
        <select
          value={selectedEmpId}
          onChange={e => setSelectedEmpId(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">اختر الموظف...</option>
          {deptEmps.map(e => (
            <option key={e.id} value={e.id}>{e.full_name_ar} ({e.employee_code})</option>
          ))}
        </select>
        <div className="flex gap-3">
          <button
            onClick={handleAction}
            disabled={isPending || !selectedEmpId}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? 'جاري...' : 'تأكيد التعيين'}
          </button>
          <button onClick={() => { setAction(null); setSelectedEmpId(''); }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">
            إلغاء
          </button>
        </div>
      </div>
    );
  }

  const labels = {
    approve: { title: 'موافقة على الطلب', color: 'emerald', btn: 'تأكيد الموافقة' },
    reject: { title: 'رفض الطلب', color: 'red', btn: 'تأكيد الرفض' },
    sendback: { title: 'طلب توضيح', color: 'amber', btn: 'إرسال' },
  }[action as 'approve' | 'reject' | 'sendback'];

  return (
    <div className={`bg-${labels!.color}-50 rounded-2xl border border-${labels!.color}-200 p-6`}>
      <h3 className={`font-semibold text-${labels!.color}-900 mb-3`}>{labels!.title}</h3>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-eagle-500/20"
        placeholder="اكتب سبب القرار (إلزامي)..." />
      <div className="flex gap-3">
        <button onClick={handleAction} disabled={isPending || !note.trim()}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-${labels!.color}-600 hover:bg-${labels!.color}-700 disabled:opacity-50`}>
          {isPending ? 'جاري...' : labels!.btn}
        </button>
        <button onClick={() => { setAction(null); setNote(''); }}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100">
          إلغاء
        </button>
      </div>
    </div>
  );
}
