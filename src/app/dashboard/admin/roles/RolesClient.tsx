'use client';

import { useState, useTransition } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { assignRole, revokeRole } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

const ROLES = [
  { value: 'super_admin', ar: 'مدير النظام', en: 'Super Admin' },
  { value: 'company_admin', ar: 'مدير الشركة', en: 'Company Admin' },
  { value: 'ceo', ar: 'الرئيس التنفيذي', en: 'CEO' },
  { value: 'department_manager', ar: 'مدير القسم', en: 'Dept Manager' },
  { value: 'employee', ar: 'موظف', en: 'Employee' },
  { value: 'finance_approver', ar: 'معتمد مالي', en: 'Finance Approver' },
  { value: 'hr_approver', ar: 'معتمد موارد بشرية', en: 'HR Approver' },
  { value: 'audit_reviewer', ar: 'مراجع تدقيق', en: 'Audit Reviewer' },
  { value: 'gr_manager', ar: 'مدير علاقات حكومية', en: 'GR Manager' },
  { value: 'gr_employee', ar: 'موظف علاقات حكومية', en: 'GR Employee' },
];

export default function RolesClient({ roles, employees, companies }: any) {
  const { lang } = useLanguage();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [newEmpId, setNewEmpId] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newCompanyId, setNewCompanyId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const empMap = new Map(employees.map((e: any) => [e.id, e]));
  const coMap = new Map(companies.map((c: any) => [c.id, c]));
  const roleLabels = new Map(ROLES.map(r => [r.value, lang === 'ar' ? r.ar : r.en]));

  function handleAssign() {
    if (!newEmpId || !newRole || !newCompanyId) return;
    setError('');
    startTransition(async () => {
      try {
        await assignRole(newEmpId, newRole, newCompanyId);
        setShowAdd(false); setNewEmpId(''); setNewRole(''); setNewCompanyId('');
        router.refresh();
      } catch (e: any) { setError(e.message); }
    });
  }

  function handleRevoke(roleId: string) {
    startTransition(async () => {
      await revokeRole(roleId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'إدارة الصلاحيات' : 'Role Management'}</h1>
          <p className="text-sm text-slate-500 mt-1">{roles.length} {lang === 'ar' ? 'صلاحية نشطة' : 'active roles'}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-sm">
          {showAdd ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : (lang === 'ar' ? '➕ صلاحية جديدة' : '➕ New Role')}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4 animate-slide-up">
          {error && <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'الموظف' : 'Employee'}</label>
              <select value={newEmpId} onChange={e => setNewEmpId(e.target.value)} className="input-field text-sm">
                <option value="">{lang === 'ar' ? 'اختر موظف' : 'Select employee'}</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.full_name_ar} ({e.employee_code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'الصلاحية' : 'Role'}</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="input-field text-sm">
                <option value="">{lang === 'ar' ? 'اختر صلاحية' : 'Select role'}</option>
                {ROLES.map(r => <option key={r.value} value={r.value}>{lang === 'ar' ? r.ar : r.en}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lang === 'ar' ? 'الشركة' : 'Company'}</label>
              <select value={newCompanyId} onChange={e => setNewCompanyId(e.target.value)} className="input-field text-sm">
                <option value="">{lang === 'ar' ? 'اختر الشركة' : 'Select company'}</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name_ar} ({c.code})</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleAssign} disabled={isPending || !newEmpId || !newRole || !newCompanyId}
            className="btn-primary text-sm disabled:opacity-50">
            {isPending ? (lang === 'ar' ? 'جاري...' : 'Saving...') : (lang === 'ar' ? 'إضافة الصلاحية' : 'Assign Role')}
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الموظف' : 'Employee'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الصلاحية' : 'Role'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الشركة' : 'Company'}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {roles.map((role: any) => {
                const emp = empMap.get(role.employee_id);
                const co = coMap.get(role.company_id);
                return (
                  <tr key={role.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{emp?.full_name_ar || '—'}</p>
                      <p className="text-xs text-slate-500">{emp?.employee_code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-eagle-50 text-eagle-700">
                        {roleLabels.get(role.role) || role.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{co?.name_ar || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleRevoke(role.id)} disabled={isPending}
                        className="text-xs font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg">
                        {lang === 'ar' ? 'إلغاء' : 'Revoke'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
