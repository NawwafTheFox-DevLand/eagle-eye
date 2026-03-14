'use client';
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  forwardRequest, returnRequest, askRequester, resubmitRequest,
  assignToEmployee, stampCompanyExit, stampFinance, stampHR, stampCEO,
  completeRequest, rejectRequest, cancelRequest, getDepartmentEmployees,
} from '@/app/actions/requests';
import { advanceCustomStep } from '@/app/actions/custom-requests';
import { uploadEvidence } from '@/app/actions/evidence';
import { completeOnboardingChild } from '@/app/actions/onboarding';

interface Props {
  requestId: string;
  requestStatus: string;
  assignedTo: string | null;
  currentEmployeeId: string;
  requesterId: string;
  originCompanyId: string | null;
  destinationDeptId: string | null;
  isDeptHead: boolean;
  isOriginCompanyCEO: boolean;
  isHoldingCEO: boolean;
  isFinanceHead: boolean;
  isHRHead: boolean;
  requiresCeo: boolean;
  requiresHr: boolean;
  requiresFinance: boolean;
  ceoStampedAt: string | null;
  hrStampedAt: string | null;
  financeStampedAt: string | null;
  companyExitStampedAt: string | null;
  companies: any[];
  departments: any[];
  isOnboardingChild?: boolean;
  dependsOnStatus?: string | null;
  isCustomFixedPath?: boolean;
  isLastStep?: boolean;
}

function GateBadge({ icon, label, done, isAr }: { icon: string; label: string; done: boolean; isAr: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full w-fit ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
      <span>{done ? '✅' : '⏳'}</span>
      <span className="text-xs">{done ? (isAr ? 'تمت' : 'Done') : (isAr ? 'مطلوبة' : 'Pending')}</span>
    </div>
  );
}

export default function RequestActions({
  requestId,
  requestStatus,
  assignedTo,
  currentEmployeeId,
  requesterId,
  originCompanyId,
  destinationDeptId,
  isDeptHead,
  isOriginCompanyCEO,
  isHoldingCEO,
  isFinanceHead,
  isHRHead,
  requiresCeo,
  requiresHr,
  requiresFinance,
  ceoStampedAt,
  hrStampedAt,
  financeStampedAt,
  companyExitStampedAt,
  companies,
  departments,
  isOnboardingChild = false,
  dependsOnStatus = null,
  isCustomFixedPath = false,
  isLastStep = false,
}: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<string | null>(null);

  const [showForward, setShowForward] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

  const [fwdCompanyId, setFwdCompanyId] = useState('');
  const [fwdDeptId, setFwdDeptId] = useState('');
  const [fwdEmployeeId, setFwdEmployeeId] = useState('');
  const [fwdPersonName, setFwdPersonName] = useState('');
  const [fwdDeptEmployees, setFwdDeptEmployees] = useState<any[]>([]);

  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignName, setAssignName] = useState('');
  const [assignDeptEmployees, setAssignDeptEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (destinationDeptId) {
      getDepartmentEmployees(destinationDeptId).then(setAssignDeptEmployees);
    }
  }, [destinationDeptId]);

  // Show success banner (replaces the whole panel while redirecting)
  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="text-3xl mb-3">✅</div>
        <p className="text-emerald-800 font-semibold text-lg">{success}</p>
        <p className="text-emerald-600 text-sm mt-2">
          {isAr ? 'جاري التحويل...' : 'Redirecting...'}
        </p>
      </div>
    );
  }

  // ── Onboarding child: restricted panel ──────────────────────────────────────
  if (isOnboardingChild && requestStatus === 'in_progress' && assignedTo === currentEmployeeId) {
    const isLocked = !!dependsOnStatus && dependsOnStatus !== 'completed';

    function handleOnboardingComplete() {
      if (!note.trim()) { setError(isAr ? 'الملاحظات مطلوبة' : 'Notes are required'); return; }
      setError('');
      startTransition(async () => {
        const result = await completeOnboardingChild(requestId, note);
        if (result.error) { setError(result.error); return; }
        setSuccess(isAr ? 'تم إنجاز المهمة بنجاح' : 'Task completed successfully');
        setTimeout(() => router.push('/dashboard/inbox'), 2000);
      });
    }

    function handleOnboardingReject() {
      if (!note.trim()) { setError(isAr ? 'الملاحظات مطلوبة' : 'Notes are required'); return; }
      setError('');
      startTransition(async () => {
        const result = await rejectRequest(requestId, note);
        if (result.error) { setError(result.error); return; }
        setSuccess(isAr ? 'تم رفض المهمة' : 'Task rejected');
        setTimeout(() => router.push('/dashboard/inbox'), 2000);
      });
    }

    if (isLocked) {
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="font-semibold text-amber-900">{isAr ? 'هذه المهمة مقفلة' : 'Task is Locked'}</p>
              <p className="text-sm text-amber-700 mt-0.5">
                {isAr
                  ? 'تنتظر اكتمال مهمة أخرى قبل أن تصبح قابلة للتنفيذ'
                  : 'Awaiting completion of a prerequisite task before this can be acted on'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
        <h3 className="font-bold text-slate-900">
          🧑‍💼 {isAr ? 'مهمة التعيين' : 'Onboarding Task'}
        </h3>
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder={isAr ? 'الملاحظات *' : 'Notes *'}
            className="input-field resize-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleOnboardingComplete}
            disabled={isPending}
            className="flex-1 rounded-xl px-4 py-2 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            ✅ {isAr ? 'إنجاز المهمة' : 'Complete Task'}
          </button>
          <button
            onClick={handleOnboardingReject}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
            ❌ {isAr ? 'رفض' : 'Reject'}
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}
      </div>
    );
  }

  // ── Custom fixed-path panel ──────────────────────────────────────────────────
  if (isCustomFixedPath && requestStatus === 'in_progress' && assignedTo === currentEmployeeId) {
    function handleAdvance() {
      if (!note.trim()) { setError(isAr ? 'الملاحظات مطلوبة' : 'Notes are required'); return; }
      setError('');
      startTransition(async () => {
        await uploadFiles();
        const result = await advanceCustomStep(requestId, note);
        if (result.error) { setError(result.error); return; }
        setSuccess(isAr
          ? (isLastStep ? 'تم إنجاز الطلب بنجاح' : 'تمت الموافقة والتحويل للخطوة التالية')
          : (isLastStep ? 'Request completed successfully' : 'Approved and forwarded to next step'));
        setTimeout(() => router.push(isLastStep ? '/dashboard/requests' : '/dashboard/inbox'), 2000);
      });
    }

    function handleFixedReturn() {
      if (!note.trim()) { setError(isAr ? 'الملاحظات مطلوبة' : 'Notes are required'); return; }
      setError('');
      startTransition(async () => {
        await uploadFiles();
        const result = await returnRequest(requestId, note);
        if (result.error) { setError(result.error); return; }
        setSuccess(isAr ? 'تم الإرجاع بنجاح' : 'Returned successfully');
        setTimeout(() => router.push('/dashboard/inbox'), 2000);
      });
    }

    function handleFixedAsk() {
      if (!note.trim()) { setError(isAr ? 'الملاحظات مطلوبة' : 'Notes are required'); return; }
      setError('');
      startTransition(async () => {
        await uploadFiles();
        const result = await askRequester(requestId, note);
        if (result.error) { setError(result.error); return; }
        setSuccess(isAr ? 'تم إرسال طلب التوضيح' : 'Clarification request sent');
        setTimeout(() => router.push('/dashboard/inbox'), 2000);
      });
    }

    function handleFixedReject() {
      if (!note.trim()) { setError(isAr ? 'الملاحظات مطلوبة' : 'Notes are required'); return; }
      setError('');
      startTransition(async () => {
        await uploadFiles();
        const result = await rejectRequest(requestId, note);
        if (result.error) { setError(result.error); return; }
        setSuccess(isAr ? 'تم رفض الطلب' : 'Request rejected');
        setTimeout(() => router.push('/dashboard/requests'), 2000);
      });
    }

    return (
      <div className="bg-white rounded-2xl border border-violet-100 p-5 space-y-4">
        <h3 className="font-bold text-slate-900">
          🗂️ {isAr ? 'إجراءات المسار الثابت' : 'Fixed-Path Actions'}
        </h3>
        <div className="space-y-3">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            placeholder={isAr ? 'الملاحظات *' : 'Notes *'}
            className="input-field resize-none"
          />
          <input
            type="file"
            multiple
            onChange={e => setFiles(Array.from(e.target.files || []))}
            className="text-sm text-slate-600"
          />
          {files.length > 0 && (
            <p className="text-xs text-slate-500">
              {files.length} {isAr ? 'ملف مرفق' : 'file(s) selected'}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleAdvance}
            disabled={isPending}
            className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors text-white ${
              isLastStep
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-violet-600 hover:bg-violet-700'
            }`}
          >
            {isLastStep
              ? (isAr ? '✅ إنجاز الطلب' : '✅ Complete Request')
              : (isAr ? '↗ موافقة وتحويل' : '↗ Approve & Forward')}
          </button>
          <button
            onClick={handleFixedReturn}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-amber-500 text-white hover:bg-amber-600">
            ↩ {isAr ? 'إرجاع' : 'Return'}
          </button>
          <button
            onClick={handleFixedAsk}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-amber-500 text-white hover:bg-amber-600">
            ❓ {isAr ? 'طلب توضيح' : 'Ask Requester'}
          </button>
          <button
            onClick={handleFixedReject}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-red-600 text-white hover:bg-red-700">
            ❌ {isAr ? 'رفض' : 'Reject'}
          </button>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
        )}
      </div>
    );
  }

  // Gate: show nothing if user can't act
  const canAct = (() => {
    if (!['in_progress', 'pending_clarification', 'draft'].includes(requestStatus)) return false;
    if (requestStatus === 'in_progress' && assignedTo !== currentEmployeeId) return false;
    if (requestStatus === 'pending_clarification' && currentEmployeeId !== requesterId) return false;
    if (requestStatus === 'draft' && currentEmployeeId !== requesterId) return false;
    return true;
  })();

  if (!canAct) return null;

  // ── Shared helpers ───────────────────────────────────────────────────────────

  async function uploadFiles() {
    if (files.length > 0) {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      await uploadEvidence(requestId, fd);
    }
  }

  function requireNote(): boolean {
    if (!note.trim()) {
      setError(isAr ? 'الملاحظات مطلوبة' : 'Notes are required');
      return false;
    }
    return true;
  }

  // ── Action handlers ──────────────────────────────────────────────────────────

  function handleForward() {
    if (!requireNote()) return;
    if (!fwdDeptId) { setError(isAr ? 'اختر القسم أولاً' : 'Select a department'); return; }
    setError('');
    startTransition(async () => {
      await uploadFiles();
      const result = await forwardRequest(requestId, note, fwdDeptId, fwdCompanyId, fwdEmployeeId || undefined);
      if (result.error) { setError(result.error); return; }
      const name = fwdPersonName || (isAr ? 'رئيس القسم' : 'Department Head');
      setSuccess(isAr ? `تم التحويل إلى ${name}` : `Forwarded to ${name}`);
      setTimeout(() => router.push('/dashboard/inbox'), 2000);
    });
  }

  function handleAssign() {
    if (!requireNote()) return;
    if (!assignEmpId) { setError(isAr ? 'اختر موظفاً أولاً' : 'Select an employee'); return; }
    setError('');
    startTransition(async () => {
      await uploadFiles();
      const result = await assignToEmployee(requestId, assignEmpId, note);
      if (result.error) { setError(result.error); return; }
      setSuccess(isAr ? `تم التعيين إلى ${assignName}` : `Assigned to ${assignName}`);
      setTimeout(() => router.push('/dashboard/inbox'), 2000);
    });
  }

  function handleReturn() {
    if (!requireNote()) return;
    setError('');
    startTransition(async () => {
      await uploadFiles();
      const result = await returnRequest(requestId, note);
      if (result.error) { setError(result.error); return; }
      setSuccess(isAr ? 'تم الإرجاع بنجاح' : 'Returned successfully');
      setTimeout(() => router.push('/dashboard/inbox'), 2000);
    });
  }

  function handleAskRequester() {
    if (!requireNote()) return;
    setError('');
    startTransition(async () => {
      await uploadFiles();
      const result = await askRequester(requestId, note);
      if (result.error) { setError(result.error); return; }
      setSuccess(isAr ? 'تم إرسال طلب التوضيح' : 'Clarification request sent');
      setTimeout(() => router.push('/dashboard/inbox'), 2000);
    });
  }

  function handleComplete() {
    if (!requireNote()) return;
    setError('');
    startTransition(async () => {
      await uploadFiles();
      const result = await completeRequest(requestId, note);
      if (result.error) { setError(result.error); return; }
      setSuccess(isAr ? 'تم إنجاز الطلب بنجاح' : 'Request completed successfully');
      setTimeout(() => router.push('/dashboard/requests'), 2000);
    });
  }

  function handleReject() {
    if (!requireNote()) return;
    setError('');
    startTransition(async () => {
      await uploadFiles();
      const result = await rejectRequest(requestId, note);
      if (result.error) { setError(result.error); return; }
      setSuccess(isAr ? 'تم رفض الطلب' : 'Request rejected');
      setTimeout(() => router.push('/dashboard/requests'), 2000);
    });
  }

  function handleResubmit() {
    if (!requireNote()) return;
    setError('');
    startTransition(async () => {
      await uploadFiles();
      const result = await resubmitRequest(requestId, note);
      if (result.error) { setError(result.error); return; }
      setSuccess(isAr ? 'تمت إعادة التقديم' : 'Resubmitted successfully');
      setTimeout(() => router.push('/dashboard/requests'), 2000);
    });
  }

  function handleCancel() {
    if (!requireNote()) return;
    setError('');
    startTransition(async () => {
      await uploadFiles();
      const result = await cancelRequest(requestId, note);
      if (result.error) { setError(result.error); return; }
      setSuccess(isAr ? 'تم إلغاء الطلب' : 'Request cancelled');
      setTimeout(() => router.push('/dashboard/requests'), 2000);
    });
  }

  function handleStamp(fn: () => Promise<{ error: string | null }>) {
    if (!requireNote()) return;
    setError('');
    startTransition(async () => {
      const result = await fn();
      if (result.error) { setError(result.error); return; }
      setSuccess(isAr ? 'تمت الموافقة بنجاح' : 'Approved successfully');
      setTimeout(() => { setSuccess(null); router.refresh(); }, 1000);
    });
  }

  const showGates = requiresFinance || requiresHr || requiresCeo || isOriginCompanyCEO;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
      <h3 className="font-bold text-slate-900">{isAr ? 'الإجراءات المتاحة' : 'Available Actions'}</h3>

      {/* Gate badges */}
      {showGates && (
        <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {isAr ? 'البوابات المطلوبة' : 'Required Gates'}
          </p>
          {requiresFinance && (
            <GateBadge icon="💰" label={isAr ? 'المالية' : 'Finance'} done={!!financeStampedAt} isAr={isAr} />
          )}
          {requiresHr && (
            <GateBadge icon="👥" label={isAr ? 'الموارد البشرية' : 'HR'} done={!!hrStampedAt} isAr={isAr} />
          )}
          {requiresCeo && (
            <GateBadge icon="🏛️" label={isAr ? 'الرئيس التنفيذي' : 'CEO'} done={!!ceoStampedAt} isAr={isAr} />
          )}
          {isOriginCompanyCEO && (
            <GateBadge icon="🏢" label={isAr ? 'خروج الشركة' : 'Company Exit'} done={!!companyExitStampedAt} isAr={isAr} />
          )}
        </div>
      )}

      {/* Note + file upload */}
      <div className="space-y-3">
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={3}
          placeholder={isAr ? 'الملاحظات *' : 'Notes *'}
          className="input-field resize-none"
        />
        <input
          type="file"
          multiple
          onChange={e => setFiles(Array.from(e.target.files || []))}
          className="text-sm text-slate-600"
        />
        {files.length > 0 && (
          <p className="text-xs text-slate-500">
            {files.length} {isAr ? 'ملف مرفق' : 'file(s) selected'}
          </p>
        )}
      </div>

      {/* in_progress actions */}
      {requestStatus === 'in_progress' && assignedTo === currentEmployeeId && (
        <>
          {/* Stamp buttons */}
          {isOriginCompanyCEO && !companyExitStampedAt && (
            <button
              onClick={() => handleStamp(() => stampCompanyExit(requestId, note))}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-emerald-600 hover:bg-emerald-700 text-white w-full">
              🏢 {isAr ? 'موافقة خروج الشركة' : 'Approve Company Exit'}
            </button>
          )}
          {isFinanceHead && requiresFinance && !financeStampedAt && (
            <button
              onClick={() => handleStamp(() => stampFinance(requestId, note))}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-emerald-600 hover:bg-emerald-700 text-white w-full">
              💰 {isAr ? 'اعتماد مالي' : 'Finance Stamp'}
            </button>
          )}
          {isHRHead && requiresHr && !hrStampedAt && (
            <button
              onClick={() => handleStamp(() => stampHR(requestId, note))}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-emerald-600 hover:bg-emerald-700 text-white w-full">
              👥 {isAr ? 'موافقة الموارد البشرية' : 'HR Stamp'}
            </button>
          )}
          {isHoldingCEO && requiresCeo && !ceoStampedAt && (
            <button
              onClick={() => handleStamp(() => stampCEO(requestId, note))}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-emerald-600 hover:bg-emerald-700 text-white w-full">
              🏛️ {isAr ? 'موافقة الرئيس التنفيذي' : 'CEO Stamp'}
            </button>
          )}

          {/* Regular action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setShowForward(f => !f); setShowAssign(false); }}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700">
              ↗ {isAr ? 'تحويل' : 'Forward'}
            </button>
            {isDeptHead && (
              <button
                onClick={() => { setShowAssign(a => !a); setShowForward(false); }}
                disabled={isPending}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-indigo-600 text-white hover:bg-indigo-700">
                👤 {isAr ? 'تعيين' : 'Assign'}
              </button>
            )}
            <button
              onClick={handleReturn}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-amber-500 text-white hover:bg-amber-600">
              ↩ {isAr ? 'إرجاع' : 'Return'}
            </button>
            <button
              onClick={handleAskRequester}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-amber-500 text-white hover:bg-amber-600">
              ↩ {isAr ? 'طلب توضيح' : 'Ask Requester'}
            </button>
            {(isDeptHead || isHoldingCEO) && (
              <button
                onClick={handleComplete}
                disabled={isPending}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-emerald-600 text-white hover:bg-emerald-700">
                ✅ {isAr ? 'إنجاز' : 'Complete'}
              </button>
            )}
            <button
              onClick={handleReject}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-red-600 text-white hover:bg-red-700">
              ❌ {isAr ? 'رفض' : 'Reject'}
            </button>
          </div>

          {/* Forward sub-panel */}
          {showForward && (
            <div className="border border-blue-200 rounded-xl p-4 bg-blue-50 space-y-3">
              <p className="font-semibold text-sm text-blue-900">{isAr ? 'تحويل الطلب' : 'Forward Request'}</p>
              <select
                value={fwdCompanyId}
                onChange={e => {
                  setFwdCompanyId(e.target.value);
                  setFwdDeptId('');
                  setFwdEmployeeId('');
                  setFwdPersonName('');
                }}
                className="input-field text-sm">
                <option value="">{isAr ? 'اختر الشركة' : 'Select Company'}</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{isAr ? c.name_ar : (c.name_en || c.name_ar)}</option>
                ))}
              </select>
              <select
                value={fwdDeptId}
                onChange={async e => {
                  setFwdDeptId(e.target.value);
                  setFwdEmployeeId('');
                  setFwdPersonName('');
                  if (e.target.value) {
                    const emps = await getDepartmentEmployees(e.target.value);
                    setFwdDeptEmployees(emps);
                  }
                }}
                className="input-field text-sm"
                disabled={!fwdCompanyId}>
                <option value="">{isAr ? 'اختر القسم' : 'Select Department'}</option>
                {departments
                  .filter(d => d.company_id === fwdCompanyId)
                  .map(d => (
                    <option key={d.id} value={d.id}>{isAr ? d.name_ar : (d.name_en || d.name_ar)}</option>
                  ))}
              </select>
              {fwdDeptEmployees.length > 0 && (
                <select
                  value={fwdEmployeeId}
                  onChange={e => {
                    setFwdEmployeeId(e.target.value);
                    const emp = fwdDeptEmployees.find(em => em.id === e.target.value);
                    setFwdPersonName(emp ? (isAr ? emp.full_name_ar : (emp.full_name_en || emp.full_name_ar)) : '');
                  }}
                  className="input-field text-sm">
                  <option value="">{isAr ? 'رئيس القسم (افتراضي)' : 'Dept Head (default)'}</option>
                  {fwdDeptEmployees.map(e => (
                    <option key={e.id} value={e.id}>{isAr ? e.full_name_ar : (e.full_name_en || e.full_name_ar)}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleForward}
                  disabled={isPending}
                  className="btn-primary text-sm flex-1">
                  {isAr ? 'تأكيد التحويل' : 'Confirm Forward'}
                </button>
                <button onClick={() => setShowForward(false)} className="btn-secondary text-sm">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Assign sub-panel */}
          {showAssign && (
            <div className="border border-indigo-200 rounded-xl p-4 bg-indigo-50 space-y-3">
              <p className="font-semibold text-sm text-indigo-900">{isAr ? 'تعيين لموظف' : 'Assign to Employee'}</p>
              <select
                value={assignEmpId}
                onChange={e => {
                  setAssignEmpId(e.target.value);
                  const emp = assignDeptEmployees.find(em => em.id === e.target.value);
                  setAssignName(emp ? (isAr ? emp.full_name_ar : (emp.full_name_en || emp.full_name_ar)) : '');
                }}
                className="input-field text-sm">
                <option value="">{isAr ? 'اختر الموظف' : 'Select Employee'}</option>
                {assignDeptEmployees.map(e => (
                  <option key={e.id} value={e.id}>{isAr ? e.full_name_ar : (e.full_name_en || e.full_name_ar)}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleAssign}
                  disabled={isPending}
                  className="btn-primary text-sm flex-1">
                  {isAr ? 'تأكيد التعيين' : 'Confirm Assign'}
                </button>
                <button onClick={() => setShowAssign(false)} className="btn-secondary text-sm">
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* pending_clarification actions */}
      {requestStatus === 'pending_clarification' && currentEmployeeId === requesterId && (
        <div className="flex gap-2">
          <button
            onClick={handleResubmit}
            disabled={isPending}
            className="btn-primary flex-1">
            📤 {isAr ? 'إعادة التقديم' : 'Resubmit'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-red-600 text-white hover:bg-red-700">
            🚫 {isAr ? 'إلغاء' : 'Cancel'}
          </button>
        </div>
      )}

      {/* draft actions */}
      {requestStatus === 'draft' && currentEmployeeId === requesterId && (
        <button
          onClick={handleCancel}
          disabled={isPending}
          className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors bg-red-600 text-white hover:bg-red-700 w-full">
          🚫 {isAr ? 'إلغاء الطلب' : 'Cancel Request'}
        </button>
      )}

      {/* Error feedback */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  );
}
