'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  approveRequest, rejectRequest, sendBackRequest, forwardRequest,
  handleMyself, assignExecutionToEmployee, markDoneByEmployee,
  finalComplete, returnToEmployee, getDeptEmployeesForAssign,
} from '@/app/actions/requests';

interface Props {
  requestId: string;
  stepId?: string;
  requestStatus: string;
  currentEmployeeId: string;
  isDeptManager: boolean;
  isAssignedEmployee: boolean;
  hasEmployeeCompleted: boolean;
  departmentId?: string;
  companies: any[];
  departments: any[];
}

export default function RequestActions({
  requestId, stepId, requestStatus, currentEmployeeId,
  isDeptManager, isAssignedEmployee, hasEmployeeCompleted,
  departmentId, companies, departments,
}: Props) {
  const { lang } = useLanguage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isAr = lang === 'ar';

  // Form state
  const [note, setNote] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState('');

  // Forward panel
  const [showForward, setShowForward] = useState(false);
  const [fwCompanyId, setFwCompanyId] = useState('');
  const [fwDeptId, setFwDeptId] = useState('');
  const [fwEmpId, setFwEmpId] = useState('');
  const [fwDeptEmps, setFwDeptEmps] = useState<any[]>([]);

  // Assign panel
  const [showAssign, setShowAssign] = useState(false);
  const [assignEmpId, setAssignEmpId] = useState('');
  const [deptEmps, setDeptEmps] = useState<any[]>([]);

  // ── Scenario detection ────────────────────────────────────────
  const isApproval     = !!stepId;
  const isExecManager  = !isApproval && requestStatus === 'pending_execution' && isDeptManager;
  const isExecEmployee = !isApproval && (
    (requestStatus === 'assigned_to_employee' && isAssignedEmployee) ||
    (requestStatus === 'in_progress' && isAssignedEmployee && !isDeptManager)
  );
  const isManagerSignOff = !isApproval && requestStatus === 'in_progress' && isDeptManager;

  if (!isApproval && !isExecManager && !isExecEmployee && !isManagerSignOff) return null;

  // ── Header config ─────────────────────────────────────────────
  const header = isApproval
    ? { bg: 'bg-amber-50 border-amber-200', tc: 'text-amber-900', title: isAr ? '⏳ بانتظار إجراءك' : '⏳ Awaiting Your Action', sub: isAr ? 'هذا الطلب يحتاج موافقتك للمتابعة' : 'This request requires your action to proceed' }
    : isExecManager
    ? { bg: 'bg-violet-50 border-violet-200', tc: 'text-violet-900', title: isAr ? '🔧 بانتظار التنفيذ' : '🔧 Pending Execution', sub: isAr ? 'هذا الطلب اعتُمد وبانتظار تنفيذه من قسمك' : 'This request was approved and awaits execution by your department' }
    : isExecEmployee
    ? { bg: 'bg-cyan-50 border-cyan-200', tc: 'text-cyan-900', title: isAr ? '🎯 مهمة مسندة إليك' : '🎯 Task Assigned to You', sub: isAr ? 'أنجز المهمة وسيقوم المدير بالتوقيع النهائي' : 'Complete the task and your manager will do the final sign-off' }
    : { bg: 'bg-emerald-50 border-emerald-200', tc: 'text-emerald-900', title: isAr ? '✅ بانتظار الإنجاز النهائي' : '✅ Pending Final Completion', sub: isAr ? 'أنت مسؤول الإنجاز النهائي لهذا الطلب' : 'You are responsible for the final completion of this request' };

  // ── Load assign dropdown ──────────────────────────────────────
  useEffect(() => {
    if (showAssign && deptEmps.length === 0 && departmentId) {
      startTransition(async () => {
        const emps = await getDeptEmployeesForAssign(departmentId);
        setDeptEmps(emps.filter((e: any) => e.id !== currentEmployeeId));
      });
    }
  }, [showAssign, departmentId]);

  // ── Load forward dept employees ───────────────────────────────
  useEffect(() => {
    if (showForward && fwDeptId) {
      startTransition(async () => {
        const emps = await getDeptEmployeesForAssign(fwDeptId);
        setFwDeptEmps(emps);
      });
    } else {
      setFwDeptEmps([]);
      setFwEmpId('');
    }
  }, [showForward, fwDeptId]);

  // Departments filtered by company selection
  const forwardDepts = fwCompanyId
    ? departments.filter((d: any) => d.company_id === fwCompanyId)
    : departments;

  // ── Helpers ───────────────────────────────────────────────────
  function buildEvidenceForm(): FormData | undefined {
    if (selectedFiles.length === 0) return undefined;
    const fd = new FormData();
    selectedFiles.forEach(f => fd.append('files', f));
    return fd;
  }

  function submit(fn: () => Promise<void>) {
    setError('');
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
        setNote('');
        setSelectedFiles([]);
        setShowForward(false);
        setShowAssign(false);
        setFwCompanyId(''); setFwDeptId(''); setFwEmpId('');
        setAssignEmpId('');
      } catch (e: any) {
        setError(e.message || (isAr ? 'حدث خطأ' : 'An error occurred'));
      }
    });
  }

  function handleAction(action: 'approve' | 'reject' | 'sendback' | 'handle' | 'done' | 'complete' | 'return') {
    if (!note.trim()) { setError(isAr ? 'المبررات مطلوبة' : 'Justification is required'); return; }
    if (action === 'reject' && selectedFiles.length === 0) { setError(isAr ? 'المرفقات مطلوبة عند الرفض' : 'Evidence is required for rejection'); return; }
    const ev = buildEvidenceForm();
    submit(async () => {
      if      (action === 'approve')  await approveRequest(requestId, note, stepId!, ev);
      else if (action === 'reject')   await rejectRequest(requestId, note, stepId!, ev);
      else if (action === 'sendback') await sendBackRequest(requestId, note, stepId, ev);
      else if (action === 'handle')   await handleMyself(requestId, note, ev);
      else if (action === 'done')     await markDoneByEmployee(requestId, note, ev);
      else if (action === 'complete') await finalComplete(requestId, note, ev);
      else if (action === 'return')   await returnToEmployee(requestId, note);
    });
  }

  function handleForwardSubmit() {
    if (!note.trim()) { setError(isAr ? 'المبررات مطلوبة' : 'Justification is required'); return; }
    if (!fwDeptId)    { setError(isAr ? 'اختر قسماً مستهدفاً' : 'Select a target department'); return; }
    submit(async () => {
      await forwardRequest(requestId, note, fwCompanyId, fwDeptId, fwEmpId || undefined, stepId);
    });
  }

  function handleAssignSubmit() {
    if (!assignEmpId) { setError(isAr ? 'اختر موظفاً' : 'Select an employee'); return; }
    submit(async () => {
      await assignExecutionToEmployee(requestId, assignEmpId, note, buildEvidenceForm());
    });
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className={`rounded-2xl border p-6 space-y-5 ${header.bg}`}>

      {/* Header */}
      <div>
        <h3 className={`font-semibold text-base ${header.tc}`}>{header.title}</h3>
        <p className={`text-sm mt-0.5 opacity-70 ${header.tc}`}>{header.sub}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Justification */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {isAr ? 'المبررات' : 'Justification'} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={note}
          onChange={e => { setNote(e.target.value); setError(''); }}
          rows={3}
          className="input-field w-full"
          placeholder={isAr ? 'اشرح قرارك بالتفصيل...' : 'Explain your decision in detail...'}
        />
      </div>

      {/* Evidence upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {isAr ? 'المرفقات' : 'Evidence'}
          {isApproval && (
            <span className="text-xs text-slate-400 font-normal ms-2">
              {isAr ? '(يُنصح بإرفاق مستند داعم)' : '(recommended to attach supporting document)'}
            </span>
          )}
          {(isApproval) && <span className="text-xs text-red-400 font-normal ms-1">{isAr ? '— مطلوب عند الرفض' : '— required for rejection'}</span>}
        </label>
        <input
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          onChange={e => setSelectedFiles(Array.from(e.target.files || []))}
          className="block w-full text-sm text-slate-500 file:me-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-50 border border-slate-200 rounded-xl bg-white"
        />
        {selectedFiles.length > 0 && (
          <p className="text-xs text-slate-500 mt-1.5">
            {selectedFiles.length} {isAr ? 'ملف محدد' : `file${selectedFiles.length > 1 ? 's' : ''} selected`}:&nbsp;
            {selectedFiles.map(f => f.name).join(', ')}
          </p>
        )}
      </div>

      {/* ── Action buttons ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2.5">

        {/* Approval phase */}
        {isApproval && (<>
          <button onClick={() => handleAction('approve')} disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
            ✓ {isAr ? 'موافقة' : 'Approve'}
          </button>
          <button onClick={() => { setShowForward(v => !v); setShowAssign(false); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${showForward ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
            ↗ {isAr ? 'تحويل' : 'Forward'}
          </button>
          <button onClick={() => handleAction('sendback')} disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 transition-colors">
            ↩ {isAr ? 'طلب توضيح' : 'Send Back'}
          </button>
          <button onClick={() => handleAction('reject')} disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors">
            ✗ {isAr ? 'رفض' : 'Reject'}
          </button>
        </>)}

        {/* Execution manager — pending_execution */}
        {isExecManager && (<>
          <button onClick={() => handleAction('handle')} disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 transition-colors shadow-sm">
            🔧 {isAr ? 'تنفيذ بنفسي' : 'Handle Myself'}
          </button>
          <button onClick={() => { setShowAssign(v => !v); setShowForward(false); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${showAssign ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
            👤 {isAr ? 'تعيين لموظف' : 'Assign'}
          </button>
          <button onClick={() => { setShowForward(v => !v); setShowAssign(false); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${showForward ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
            ↗ {isAr ? 'تحويل' : 'Forward'}
          </button>
          <button onClick={() => handleAction('sendback')} disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 transition-colors">
            ↩ {isAr ? 'طلب توضيح' : 'Send Back'}
          </button>
        </>)}

        {/* Execution employee — assigned_to_employee / in_progress */}
        {isExecEmployee && (<>
          <button onClick={() => handleAction('done')} disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
            ✅ {isAr ? 'تم الإنجاز' : 'Mark Done'}
          </button>
          <button onClick={() => handleAction('sendback')} disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 transition-colors">
            ↩ {isAr ? 'طلب توضيح' : 'Request Clarification'}
          </button>
        </>)}

        {/* Manager sign-off — in_progress */}
        {isManagerSignOff && (<>
          <button onClick={() => handleAction('complete')} disabled={isPending}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm">
            🏁 {isAr ? 'إنجاز نهائي' : 'Final Complete'}
          </button>
          {hasEmployeeCompleted && (
            <button onClick={() => handleAction('return')} disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 transition-colors">
              ↩ {isAr ? 'إعادة للموظف' : 'Return to Employee'}
            </button>
          )}
          <button onClick={() => { setShowForward(v => !v); setShowAssign(false); }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${showForward ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
            ↗ {isAr ? 'تحويل' : 'Forward'}
          </button>
        </>)}
      </div>

      {/* ── Forward sub-panel ─────────────────────────────────── */}
      {showForward && (
        <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-blue-900">↗ {isAr ? 'تحويل الطلب إلى' : 'Forward Request To'}</h4>

          {/* Company */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">{isAr ? 'الشركة' : 'Company'}</label>
            <select
              value={fwCompanyId}
              onChange={e => { setFwCompanyId(e.target.value); setFwDeptId(''); setFwEmpId(''); }}
              className="input-field w-full text-sm">
              <option value="">{isAr ? 'اختر الشركة...' : 'Select company...'}</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{isAr ? c.name_ar : (c.name_en || c.name_ar)}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">{isAr ? 'القسم' : 'Department'} <span className="text-red-500">*</span></label>
            <select
              value={fwDeptId}
              onChange={e => { setFwDeptId(e.target.value); setFwEmpId(''); }}
              className="input-field w-full text-sm">
              <option value="">{isAr ? 'اختر القسم...' : 'Select department...'}</option>
              {forwardDepts.map((d: any) => (
                <option key={d.id} value={d.id}>{isAr ? d.name_ar : (d.name_en || d.name_ar)}</option>
              ))}
            </select>
          </div>

          {/* Person (optional) */}
          {fwDeptId && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                {isAr ? 'الموظف (اختياري — إذا لم تختر سيُحوَّل لمدير القسم)' : 'Person (optional — defaults to dept manager)'}
              </label>
              <select value={fwEmpId} onChange={e => setFwEmpId(e.target.value)} className="input-field w-full text-sm">
                <option value="">{isAr ? 'مدير القسم (تلقائي)' : 'Dept Manager (default)'}</option>
                {fwDeptEmps.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    {isAr ? e.full_name_ar : (e.full_name_en || e.full_name_ar)} ({e.employee_code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button onClick={handleForwardSubmit} disabled={isPending || !fwDeptId}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {isPending ? '...' : (isAr ? 'تأكيد التحويل' : 'Confirm Forward')}
          </button>
        </div>
      )}

      {/* ── Assign sub-panel ──────────────────────────────────── */}
      {showAssign && (
        <div className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3">
          <h4 className="text-sm font-semibold text-indigo-900">👤 {isAr ? 'تعيين لموظف' : 'Assign to Employee'}</h4>
          <div>
            <label className="block text-xs text-slate-500 mb-1">{isAr ? 'الموظف' : 'Employee'} <span className="text-red-500">*</span></label>
            <select value={assignEmpId} onChange={e => setAssignEmpId(e.target.value)} className="input-field w-full text-sm">
              <option value="">{isAr ? 'اختر الموظف...' : 'Select employee...'}</option>
              {deptEmps.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {isAr ? e.full_name_ar : (e.full_name_en || e.full_name_ar)} ({e.employee_code})
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleAssignSubmit} disabled={isPending || !assignEmpId}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {isPending ? '...' : (isAr ? 'تأكيد التعيين' : 'Confirm Assignment')}
          </button>
        </div>
      )}
    </div>
  );
}
