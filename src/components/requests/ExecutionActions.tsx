'use client';

import { useState, useTransition, useEffect } from 'react';
import {
  handleMyself,
  assignExecutionToEmployee,
  markDoneByEmployee,
  finalComplete,
  returnToEmployee,
  sendBackRequest,
  getDeptEmployeesForAssign,
} from '@/app/actions/requests';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Props {
  requestId: string;
  requestStatus: string;
  assignedTo: string | null;
  currentEmployeeId: string;
  isDeptManager: boolean;
  isAssignedEmployee: boolean;
  hasEmployeeCompleted: boolean;
  departmentId: string;
}

export default function ExecutionActions({
  requestId, requestStatus, assignedTo, currentEmployeeId,
  isDeptManager, isAssignedEmployee, hasEmployeeCompleted, departmentId,
}: Props) {
  const { lang } = useLanguage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scene, setScene] = useState<'main' | 'handle' | 'assign' | 'done' | 'complete' | 'return' | 'clarify' | null>('main');
  const [note, setNote] = useState('');
  const [deptEmps, setDeptEmps] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');

  const isAr = lang === 'ar';

  useEffect(() => {
    if (scene === 'assign' && deptEmps.length === 0 && departmentId) {
      startTransition(async () => {
        const emps = await getDeptEmployeesForAssign(departmentId);
        setDeptEmps(emps.filter((e: any) => e.id !== currentEmployeeId));
      });
    }
  }, [scene, departmentId]);

  function reset() { setScene('main'); setNote(''); setSelectedEmpId(''); }

  function submit(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
      reset();
    });
  }

  // ── Determine which scenario applies ─────────────────────────
  // Scenario A: pending_execution, dept manager
  const isScenarioA = requestStatus === 'pending_execution' && isDeptManager;
  // Scenario B/D: assigned_to_employee or in_progress (auto-assigned employee, not manager)
  const isScenarioB = (requestStatus === 'assigned_to_employee' && isAssignedEmployee) ||
                      (requestStatus === 'in_progress' && isAssignedEmployee && !isDeptManager);
  // Scenario C: in_progress, dept manager (either employee just completed OR manager handling self)
  const isScenarioC = requestStatus === 'in_progress' && isDeptManager;
  // Manager handling themselves also gets final-complete
  const isManagerSelf = requestStatus === 'in_progress' && isDeptManager && assignedTo === currentEmployeeId;

  if (!isScenarioA && !isScenarioB && !isScenarioC) return null;

  // ────────────────────────── NOTE FORM ────────────────────────
  if (scene === 'handle') {
    return (
      <div className="bg-cyan-50 rounded-2xl border border-cyan-200 p-6">
        <h3 className="font-semibold text-cyan-900 mb-3">🙋 {isAr ? 'تولي التنفيذ بنفسك' : 'Handle Myself'}</h3>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="input-field mb-4 w-full"
          placeholder={isAr ? 'ملاحظة (إلزامية)...' : 'Note (required)...'} />
        <div className="flex gap-3">
          <button onClick={() => submit(() => handleMyself(requestId, note))} disabled={isPending || !note.trim()} className="btn-primary text-sm disabled:opacity-50">
            {isPending ? '...' : (isAr ? 'تأكيد' : 'Confirm')}
          </button>
          <button onClick={reset} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">{isAr ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    );
  }

  if (scene === 'assign') {
    return (
      <div className="bg-violet-50 rounded-2xl border border-violet-200 p-6">
        <h3 className="font-semibold text-violet-900 mb-3">👤 {isAr ? 'تعيين لموظف' : 'Assign to Employee'}</h3>
        <select value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)} className="input-field w-full mb-3">
          <option value="">{isAr ? 'اختر الموظف...' : 'Select employee...'}</option>
          {deptEmps.map((e: any) => (
            <option key={e.id} value={e.id}>{isAr ? e.full_name_ar : (e.full_name_en || e.full_name_ar)} ({e.employee_code})</option>
          ))}
        </select>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="input-field mb-4 w-full"
          placeholder={isAr ? 'ملاحظة للموظف (اختياري)...' : 'Note to employee (optional)...'} />
        <div className="flex gap-3">
          <button onClick={() => submit(() => assignExecutionToEmployee(requestId, selectedEmpId, note))}
            disabled={isPending || !selectedEmpId} className="btn-primary text-sm disabled:opacity-50">
            {isPending ? '...' : (isAr ? 'تأكيد التعيين' : 'Confirm Assignment')}
          </button>
          <button onClick={reset} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">{isAr ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    );
  }

  if (scene === 'done') {
    return (
      <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
        <h3 className="font-semibold text-emerald-900 mb-3">✅ {isAr ? 'تأكيد إنجاز المهمة' : 'Confirm Task Completion'}</h3>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="input-field mb-4 w-full"
          placeholder={isAr ? 'صف ما تم إنجازه (إلزامي)...' : 'Describe what was done (required)...'} />
        <div className="flex gap-3">
          <button onClick={() => submit(() => markDoneByEmployee(requestId, note))} disabled={isPending || !note.trim()} className="btn-primary text-sm disabled:opacity-50">
            {isPending ? '...' : (isAr ? 'تأكيد الإنجاز' : 'Confirm Done')}
          </button>
          <button onClick={reset} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">{isAr ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    );
  }

  if (scene === 'complete') {
    return (
      <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
        <h3 className="font-semibold text-emerald-900 mb-3">🏁 {isAr ? 'الإنجاز النهائي' : 'Final Completion'}</h3>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="input-field mb-4 w-full"
          placeholder={isAr ? 'ملاحظة الإتمام (إلزامية)...' : 'Completion note (required)...'} />
        <div className="flex gap-3">
          <button onClick={() => submit(() => finalComplete(requestId, note))} disabled={isPending || !note.trim()} className="btn-primary text-sm disabled:opacity-50">
            {isPending ? '...' : (isAr ? 'تأكيد الإنجاز النهائي' : 'Confirm Final Completion')}
          </button>
          <button onClick={reset} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">{isAr ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    );
  }

  if (scene === 'return') {
    return (
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
        <h3 className="font-semibold text-amber-900 mb-3">↩ {isAr ? 'إعادة للموظف' : 'Return to Employee'}</h3>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="input-field mb-4 w-full"
          placeholder={isAr ? 'سبب الإعادة (إلزامي)...' : 'Reason for returning (required)...'} />
        <div className="flex gap-3">
          <button onClick={() => submit(() => returnToEmployee(requestId, note))} disabled={isPending || !note.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {isPending ? '...' : (isAr ? 'إعادة' : 'Return')}
          </button>
          <button onClick={reset} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">{isAr ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    );
  }

  if (scene === 'clarify') {
    return (
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
        <h3 className="font-semibold text-amber-900 mb-3">❓ {isAr ? 'طلب توضيح من المقدم' : 'Request Clarification'}</h3>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="input-field mb-4 w-full"
          placeholder={isAr ? 'ما الذي تحتاج توضيحه؟ (إلزامي)' : 'What needs clarification? (required)'} />
        <div className="flex gap-3">
          <button onClick={() => submit(() => sendBackRequest(requestId, note, ''))} disabled={isPending || !note.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors">
            {isPending ? '...' : (isAr ? 'إرسال' : 'Send')}
          </button>
          <button onClick={reset} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">{isAr ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    );
  }

  // ────────────────────────── MAIN BUTTON PANELS ───────────────

  // Scenario A: pending_execution, manager
  if (isScenarioA) {
    return (
      <div className="bg-violet-50 rounded-2xl border border-violet-200 p-6">
        <h3 className="font-semibold text-violet-900 mb-1">🔧 {isAr ? 'بانتظار إجراءك — التنفيذ' : 'Action Required — Execution'}</h3>
        <p className="text-sm text-violet-700 mb-4">{isAr ? 'هذا الطلب اعتُمد وبانتظار تنفيذه من قسمك' : 'This request was approved and awaits execution by your department'}</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setScene('handle')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 transition-colors shadow-sm">
            🙋 {isAr ? 'تنفيذ بنفسي' : 'Handle Myself'}
          </button>
          <button onClick={() => setScene('assign')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-violet-700 bg-violet-100 hover:bg-violet-200 transition-colors">
            👤 {isAr ? 'تعيين لموظف' : 'Assign to Employee'}
          </button>
          <button onClick={() => setScene('clarify')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors">
            ❓ {isAr ? 'طلب توضيح' : 'Request Clarification'}
          </button>
        </div>
      </div>
    );
  }

  // Scenario B / D: employee marks done
  if (isScenarioB) {
    return (
      <div className="bg-cyan-50 rounded-2xl border border-cyan-200 p-6">
        <h3 className="font-semibold text-cyan-900 mb-1">⚙️ {isAr ? 'مُسند إليك — قيد التنفيذ' : 'Assigned to You — In Progress'}</h3>
        <p className="text-sm text-cyan-700 mb-4">{isAr ? 'أنجز المهمة وسيقوم المدير بالتوقيع النهائي' : 'Complete the task and your manager will do the final sign-off'}</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setScene('done')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm">
            ✅ {isAr ? 'تم الإنجاز' : 'Mark Done'}
          </button>
          <button onClick={() => setScene('clarify')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors">
            ❓ {isAr ? 'طلب توضيح' : 'Request Clarification'}
          </button>
        </div>
      </div>
    );
  }

  // Scenario C: manager final sign-off (in_progress)
  if (isScenarioC) {
    return (
      <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6">
        <h3 className="font-semibold text-emerald-900 mb-1">
          🏁 {isAr ? (hasEmployeeCompleted ? 'أنجز الموظف — بانتظار توقيعك' : 'قيد التنفيذ — بانتظار إنهائك') : (hasEmployeeCompleted ? 'Employee Done — Final Sign-off' : 'In Progress — Ready to Complete')}
        </h3>
        <p className="text-sm text-emerald-700 mb-4">
          {isAr ? 'أنت مسؤول الإنجاز النهائي لهذا الطلب' : 'You are responsible for the final completion of this request'}
        </p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setScene('complete')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm">
            🏁 {isAr ? 'إنجاز نهائي' : 'Final Complete'}
          </button>
          {hasEmployeeCompleted && (
            <button onClick={() => setScene('return')}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors">
              ↩ {isAr ? 'إعادة للموظف' : 'Return to Employee'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
