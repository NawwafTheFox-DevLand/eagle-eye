'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  createDelegation, revokeDelegation,
  addToMatrix, removeFromMatrix, moveMatrixUp, moveMatrixDown,
} from '@/app/actions/admin';

interface Props {
  myId: string;
  departmentId: string | null;
  canManage: boolean;
  myDelegations: any[];
  delegatedToMe: any[];
  deptEmployees: any[];
  matrix: any[];
  empMap: Record<string, any>;
}

export default function DelegationClient({
  myId, departmentId, canManage,
  myDelegations, delegatedToMe, deptEmployees, matrix, empMap,
}: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Create delegation form
  const [delegateId, setDelegateId]  = useState('');
  const [startDate, setStartDate]    = useState('');
  const [endDate, setEndDate]        = useState('');
  const [reason, setReason]          = useState('');
  const [creating, setCreating]      = useState(false);
  const [createErr, setCreateErr]    = useState('');

  // Revoke
  const [revoking, setRevoking] = useState<string | null>(null);

  // Matrix
  const [addEmpId, setAddEmpId]   = useState('');
  const [matrixErr, setMatrixErr] = useState('');
  const [matrixPending, setMatrixPending] = useState(false);
  const [movingId, setMovingId]   = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [globalErr, setGlobalErr] = useState('');

  const today = new Date().toISOString().split('T')[0];

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getEmp(id: string | null | undefined) {
    if (!id) return null;
    return empMap[id] || deptEmployees.find(e => e.id === id) || null;
  }

  function empName(id: string | null | undefined) {
    const e = getEmp(id);
    if (!e) return '—';
    return isAr ? e.full_name_ar : (e.full_name_en || e.full_name_ar);
  }

  function empTitle(id: string | null | undefined) {
    const e = getEmp(id);
    if (!e) return '';
    return isAr ? (e.title_ar || '') : (e.title_en || e.title_ar || '');
  }

  function fmtDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function refresh() { startTransition(() => router.refresh()); }

  // ── Action handlers ────────────────────────────────────────────────────────

  async function handleCreate() {
    setCreateErr('');
    if (!delegateId) { setCreateErr(isAr ? 'اختر المفوض إليه' : 'Select a delegate'); return; }
    if (!startDate)  { setCreateErr(isAr ? 'تاريخ البداية مطلوب' : 'Start date required'); return; }
    if (!endDate)    { setCreateErr(isAr ? 'تاريخ النهاية مطلوب' : 'End date required'); return; }
    if (startDate < today) { setCreateErr(isAr ? 'تاريخ البداية يجب أن يكون اليوم أو لاحقاً' : 'Start date must be today or later'); return; }
    if (endDate < startDate) { setCreateErr(isAr ? 'تاريخ النهاية يجب أن يكون بعد البداية' : 'End date must be after start'); return; }
    if (!reason.trim()) { setCreateErr(isAr ? 'السبب مطلوب' : 'Reason is required'); return; }

    setCreating(true);
    const result = await createDelegation({ delegateId, startDate, endDate, reason: reason.trim() });
    setCreating(false);
    if (result.error) { setCreateErr(result.error); return; }
    setDelegateId(''); setStartDate(''); setEndDate(''); setReason('');
    refresh();
  }

  async function handleRevoke(id: string) {
    setGlobalErr('');
    setRevoking(id);
    const result = await revokeDelegation(id);
    setRevoking(null);
    if (result.error) { setGlobalErr(result.error); return; }
    refresh();
  }

  async function handleAddMatrix() {
    setMatrixErr('');
    if (!addEmpId) { setMatrixErr(isAr ? 'اختر موظفاً' : 'Select an employee'); return; }
    if (!departmentId) { setMatrixErr(isAr ? 'لا يوجد قسم' : 'No department'); return; }
    setMatrixPending(true);
    const result = await addToMatrix(departmentId, addEmpId);
    setMatrixPending(false);
    if (result.error) { setMatrixErr(result.error); return; }
    setAddEmpId('');
    refresh();
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    const result = await removeFromMatrix(id);
    setRemovingId(null);
    if (result.error) { setMatrixErr(result.error); }
    refresh();
  }

  async function handleMoveUp(id: string) {
    setMovingId(id);
    await moveMatrixUp(id);
    setMovingId(null);
    refresh();
  }

  async function handleMoveDown(id: string) {
    setMovingId(id);
    await moveMatrixDown(id);
    setMovingId(null);
    refresh();
  }

  // Employees already in matrix — exclude from add dropdown
  const matrixEmpIds = new Set(matrix.map(m => m.employee_id));
  const availableForMatrix = deptEmployees.filter(e => !matrixEmpIds.has(e.id));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'التفويضات' : 'Delegations'}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAr ? 'إدارة تفويضات الصلاحيات ومصفوفة الغياب' : 'Manage authority delegations and absence matrix'}
        </p>
      </div>

      {globalErr && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{globalErr}</div>
      )}

      {/* ── SECTION 1: Active Delegations ───────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          📋 {isAr ? 'التفويضات النشطة' : 'Active Delegations'}
        </h2>

        {myDelegations.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-slate-500 text-sm">{isAr ? 'لا توجد تفويضات معطاة' : 'No delegations granted yet'}</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr_auto_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>{isAr ? 'المفوض إليه' : 'Delegate'}</span>
              <span>{isAr ? 'من' : 'Start'}</span>
              <span>{isAr ? 'إلى' : 'End'}</span>
              <span>{isAr ? 'السبب' : 'Reason'}</span>
              <span>{isAr ? 'الحالة' : 'Status'}</span>
              <span></span>
            </div>
            <div className="divide-y divide-slate-100">
              {myDelegations.map(d => (
                <div key={d.id} className="grid md:grid-cols-[2fr_1fr_1fr_2fr_auto_auto] gap-3 px-5 py-3.5 items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{empName(d.delegate_id)}</p>
                    {empTitle(d.delegate_id) && (
                      <p className="text-xs text-slate-400">{empTitle(d.delegate_id)}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-600">{fmtDate(d.start_date)}</span>
                  <span className="text-xs text-slate-600">{fmtDate(d.end_date)}</span>
                  <span className="text-xs text-slate-600 truncate">{d.reason || '—'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {d.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'منتهٍ' : 'Ended')}
                  </span>
                  {d.is_active && (
                    <button
                      onClick={() => handleRevoke(d.id)}
                      disabled={revoking === d.id || isPending}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium transition-colors disabled:opacity-50 shrink-0"
                    >
                      {revoking === d.id ? '...' : (isAr ? 'إلغاء' : 'Revoke')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delegated TO me */}
        {delegatedToMe.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-2">
              {isAr ? 'تفويضات مسندة إليّ' : 'Delegated to Me'}
            </h3>
            <div className="card overflow-hidden">
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_2fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span>{isAr ? 'المُفوِّض' : 'Delegator'}</span>
                <span>{isAr ? 'من' : 'Start'}</span>
                <span>{isAr ? 'إلى' : 'End'}</span>
                <span>{isAr ? 'السبب' : 'Reason'}</span>
                <span>{isAr ? 'الحالة' : 'Status'}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {delegatedToMe.map(d => (
                  <div key={d.id} className="grid md:grid-cols-[2fr_1fr_1fr_2fr_auto] gap-3 px-5 py-3.5 items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{empName(d.delegator_id)}</p>
                    </div>
                    <span className="text-xs text-slate-600">{fmtDate(d.start_date)}</span>
                    <span className="text-xs text-slate-600">{fmtDate(d.end_date)}</span>
                    <span className="text-xs text-slate-600 truncate">{d.reason || '—'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {d.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'منتهٍ' : 'Ended')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION 2: Create Delegation ────────────────────────────────────── */}
      {canManage && (
        <section className="space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            ➕ {isAr ? 'إنشاء تفويض جديد' : 'Create New Delegation'}
          </h2>
          <div className="card p-5 space-y-4">
            {deptEmployees.length === 0 ? (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3">
                {isAr ? 'لا يوجد موظفون في قسمك للتفويض إليهم' : 'No employees in your department to delegate to'}
              </p>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isAr ? 'المفوض إليه *' : 'Delegate *'}
                  </label>
                  <select value={delegateId} onChange={e => setDelegateId(e.target.value)} className="input-field text-sm w-full">
                    <option value="">{isAr ? 'اختر موظفاً من قسمك...' : 'Select employee from your department...'}</option>
                    {deptEmployees.map(e => (
                      <option key={e.id} value={e.id}>
                        {isAr ? e.full_name_ar : (e.full_name_en || e.full_name_ar)}
                        {e.employee_code ? ` (${e.employee_code})` : ''}
                        {(isAr ? e.title_ar : e.title_en || e.title_ar) ? ` — ${isAr ? e.title_ar : e.title_en || e.title_ar}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isAr ? 'تاريخ البداية *' : 'Start Date *'}
                    </label>
                    <input type="date" min={today} value={startDate}
                      onChange={e => setStartDate(e.target.value)} className="input-field text-sm w-full" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      {isAr ? 'تاريخ النهاية *' : 'End Date *'}
                    </label>
                    <input type="date" min={startDate || today} value={endDate}
                      onChange={e => setEndDate(e.target.value)} className="input-field text-sm w-full" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {isAr ? 'السبب *' : 'Reason *'}
                  </label>
                  <input value={reason} onChange={e => setReason(e.target.value)}
                    className="input-field text-sm w-full"
                    placeholder={isAr ? 'إجازة سنوية، سفر عمل، مهمة رسمية...' : 'Annual leave, business trip, official mission...'} />
                </div>

                {createErr && (
                  <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{createErr}</div>
                )}

                <button
                  onClick={handleCreate}
                  disabled={creating || isPending}
                  className="btn-primary text-sm py-2 px-5 disabled:opacity-50"
                >
                  {creating ? '...' : (isAr ? 'إنشاء التفويض' : 'Create Delegation')}
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {/* ── SECTION 3: Delegation Matrix ────────────────────────────────────── */}
      {canManage && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              📊 {isAr ? 'مصفوفة التفويض' : 'Delegation Matrix'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {isAr
                ? 'حدد ترتيب أولوية الموظفين الذين يتولون المهام عند غيابك'
                : 'Set the priority order of employees who take over when you are absent'}
            </p>
          </div>

          <div className="card overflow-hidden">
            {matrix.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl mb-2">📊</p>
                <p className="text-slate-500 text-sm">
                  {isAr
                    ? 'لم يتم تعيين مصفوفة التفويض بعد — أضف موظفين بالترتيب المطلوب'
                    : 'No delegation matrix set — add employees in priority order'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {matrix.map((entry, idx) => (
                  <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="text-sm font-bold text-slate-400 w-8 shrink-0 text-center">
                      #{entry.priority_rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{empName(entry.employee_id)}</p>
                      {empTitle(entry.employee_id) && (
                        <p className="text-xs text-slate-400">{empTitle(entry.employee_id)}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveUp(entry.id)}
                        disabled={idx === 0 || movingId === entry.id || isPending}
                        title={isAr ? 'تحريك لأعلى' : 'Move up'}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center text-sm transition-colors"
                      >⬆️</button>
                      <button
                        onClick={() => handleMoveDown(entry.id)}
                        disabled={idx === matrix.length - 1 || movingId === entry.id || isPending}
                        title={isAr ? 'تحريك لأسفل' : 'Move down'}
                        className="w-8 h-8 rounded-lg hover:bg-slate-100 disabled:opacity-30 flex items-center justify-center text-sm transition-colors"
                      >⬇️</button>
                      <button
                        onClick={() => handleRemove(entry.id)}
                        disabled={removingId === entry.id || isPending}
                        title={isAr ? 'إزالة' : 'Remove'}
                        className="w-8 h-8 rounded-lg hover:bg-red-50 disabled:opacity-30 flex items-center justify-center text-sm transition-colors"
                      >❌</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add to matrix */}
            {availableForMatrix.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {isAr ? 'إضافة موظف إلى المصفوفة' : 'Add employee to matrix'}
                  </label>
                  <select value={addEmpId} onChange={e => setAddEmpId(e.target.value)} className="input-field text-sm w-full">
                    <option value="">{isAr ? 'اختر موظفاً...' : 'Select employee...'}</option>
                    {availableForMatrix.map(e => (
                      <option key={e.id} value={e.id}>
                        {isAr ? e.full_name_ar : (e.full_name_en || e.full_name_ar)}
                        {e.employee_code ? ` (${e.employee_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAddMatrix}
                  disabled={matrixPending || isPending}
                  className="btn-primary text-sm py-2 px-4 disabled:opacity-50 shrink-0"
                >
                  {matrixPending ? '...' : (isAr ? '+ إضافة' : '+ Add')}
                </button>
              </div>
            )}
          </div>

          {matrixErr && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{matrixErr}</div>
          )}
        </section>
      )}

      {/* Read-only message for non-managers */}
      {!canManage && delegatedToMe.length === 0 && myDelegations.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-4xl mb-3">🤝</p>
          <p className="text-slate-500 text-sm">
            {isAr ? 'لا توجد تفويضات مرتبطة بحسابك حالياً' : 'No delegations are currently linked to your account'}
          </p>
        </div>
      )}
    </div>
  );
}
