'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { assignRole, revokeRole } from '@/app/actions/admin';

const ALL_ROLES = [
  'super_admin', 'ceo', 'company_admin', 'department_manager', 'employee',
  'finance_approver', 'hr_approver', 'audit_reviewer',
  'gr_manager', 'gr_employee', 'finance_supervisor', 'banking_employee',
];

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  super_admin:        { ar: 'مدير النظام',          en: 'Super Admin'         },
  ceo:                { ar: 'رئيس تنفيذي',          en: 'CEO'                 },
  company_admin:      { ar: 'مدير الشركة',           en: 'Company Admin'       },
  department_manager: { ar: 'رئيس قسم',             en: 'Department Manager'  },
  employee:           { ar: 'موظف',                 en: 'Employee'            },
  finance_approver:   { ar: 'معتمد مالي',           en: 'Finance Approver'    },
  hr_approver:        { ar: 'معتمد الموارد البشرية', en: 'HR Approver'        },
  audit_reviewer:     { ar: 'مراجع التدقيق',        en: 'Audit Reviewer'      },
  gr_manager:         { ar: 'مدير العلاقات الحكومية',en: 'GR Manager'         },
  gr_employee:        { ar: 'موظف علاقات حكومية',  en: 'GR Employee'         },
  finance_supervisor: { ar: 'مشرف المالية',         en: 'Finance Supervisor'  },
  banking_employee:   { ar: 'موظف بنكي',            en: 'Banking Employee'    },
};

interface Props {
  roles: any[];
  empMap: Record<string, any>;
  coMap: Record<string, any>;
  allEmployees: any[];
  companies: any[];
}

export default function RolesClient({ roles, empMap, coMap, allEmployees, companies }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [assignEmpId, setAssignEmpId] = useState('');
  const [assignRole_, setAssignRole_] = useState('');
  const [assignCoId, setAssignCoId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [showActive, setShowActive] = useState<'all' | 'active' | 'inactive'>('all');

  const getName = (e: any) => e ? (isAr ? e.full_name_ar : e.full_name_en || e.full_name_ar) : '—';
  const getCoName = (c: any) => c ? (isAr ? c.name_ar : c.name_en || c.name_ar) : '—';

  const filteredEmployees = allEmployees.filter(e => {
    const q = empSearch.toLowerCase().trim();
    if (!q) return true;
    return e.full_name_ar?.toLowerCase().includes(q) || e.full_name_en?.toLowerCase().includes(q) || e.employee_code?.toLowerCase().includes(q);
  });

  const filteredRoles = roles.filter(r => {
    if (showActive === 'active' && !r.is_active) return false;
    if (showActive === 'inactive' && r.is_active) return false;
    return true;
  });

  async function handleAssign() {
    if (!assignEmpId || !assignRole_) {
      setErrorMsg(isAr ? 'يرجى اختيار الموظف والصلاحية' : 'Select employee and role');
      return;
    }
    setAssigning(true); setErrorMsg(''); setSuccessMsg('');
    const result = await assignRole(assignEmpId, assignRole_, assignCoId);
    setAssigning(false);
    if (result.error) { setErrorMsg(result.error); return; }
    setSuccessMsg(isAr ? 'تم تعيين الصلاحية بنجاح' : 'Role assigned successfully');
    setAssignEmpId(''); setAssignRole_(''); setAssignCoId('');
    startTransition(() => router.refresh());
  }

  async function handleRevoke(roleId: string) {
    setRevoking(roleId); setErrorMsg(''); setSuccessMsg('');
    const result = await revokeRole(roleId);
    setRevoking(null);
    if (result.error) { setErrorMsg(result.error); return; }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'إدارة الصلاحيات' : 'Role Management'}</h1>
        <p className="text-slate-500 text-sm mt-1">{isAr ? `${roles.length} صلاحية مسجلة` : `${roles.length} roles on record`}</p>
      </div>

      {/* Assign New Role */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">{isAr ? 'تعيين صلاحية جديدة' : 'Assign New Role'}</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{isAr ? 'بحث موظف' : 'Search Employee'}</label>
            <input type="text" value={empSearch} onChange={e => setEmpSearch(e.target.value)}
              placeholder={isAr ? 'اسم أو كود...' : 'Name or code...'}
              className="input-field w-full text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{isAr ? 'الموظف' : 'Employee'}</label>
            <select value={assignEmpId} onChange={e => setAssignEmpId(e.target.value)} className="input-field w-full text-sm">
              <option value="">{isAr ? '-- اختر --' : '-- Select --'}</option>
              {filteredEmployees.map(e => (
                <option key={e.id} value={e.id}>{getName(e)} ({e.employee_code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{isAr ? 'الصلاحية' : 'Role'}</label>
            <select value={assignRole_} onChange={e => setAssignRole_(e.target.value)} className="input-field w-full text-sm">
              <option value="">{isAr ? '-- اختر --' : '-- Select --'}</option>
              {ALL_ROLES.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r] ? (isAr ? ROLE_LABELS[r].ar : ROLE_LABELS[r].en) : r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{isAr ? 'الشركة (اختياري)' : 'Company (opt.)'}</label>
            <select value={assignCoId} onChange={e => setAssignCoId(e.target.value)} className="input-field w-full text-sm">
              <option value="">{isAr ? '-- لا شيء --' : '-- None --'}</option>
              {companies.map(c => <option key={c.id} value={c.id}>{getCoName(c)}</option>)}
            </select>
          </div>
        </div>

        {errorMsg && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>}
        {successMsg && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{successMsg}</p>}

        <button onClick={handleAssign} disabled={assigning || isPending}
          className="btn-primary text-sm py-2 px-5 disabled:opacity-50">
          {assigning ? (isAr ? 'جاري...' : 'Saving...') : (isAr ? 'تعيين الصلاحية' : 'Assign Role')}
        </button>
      </div>

      {/* Filter */}
      <div>
        <select value={showActive} onChange={e => setShowActive(e.target.value as 'all' | 'active' | 'inactive')}
          className="input-field w-auto text-sm">
          <option value="all">{isAr ? 'الكل' : 'All'}</option>
          <option value="active">{isAr ? 'نشط' : 'Active'}</option>
          <option value="inactive">{isAr ? 'ملغاة' : 'Revoked'}</option>
        </select>
      </div>

      {/* Roles table */}
      <div className="card overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1.5fr_1.5fr_1fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <span>{isAr ? 'الموظف' : 'Employee'}</span>
          <span>{isAr ? 'الصلاحية' : 'Role'}</span>
          <span>{isAr ? 'الشركة' : 'Company'}</span>
          <span>{isAr ? 'الحالة' : 'Status'}</span>
          <span></span>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredRoles.map(r => {
            const emp = empMap[r.employee_id];
            const co  = r.company_id ? coMap[r.company_id] : null;
            const roleLabel = ROLE_LABELS[r.role];
            return (
              <div key={r.id} className="grid md:grid-cols-[2fr_1.5fr_1.5fr_1fr_auto] gap-3 px-5 py-3.5 items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{getName(emp)}</p>
                  <p className="text-xs font-mono text-slate-400">{emp?.employee_code}</p>
                </div>
                <span className="text-sm font-semibold text-indigo-700">
                  {roleLabel ? (isAr ? roleLabel.ar : roleLabel.en) : r.role}
                </span>
                <span className="text-xs text-slate-500">{co ? getCoName(co) : '—'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                  {r.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'ملغاة' : 'Revoked')}
                </span>
                {r.is_active && (
                  <button
                    onClick={() => handleRevoke(r.id)}
                    disabled={revoking === r.id || isPending}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {revoking === r.id ? '...' : (isAr ? 'إلغاء' : 'Revoke')}
                  </button>
                )}
              </div>
            );
          })}
          {filteredRoles.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-4xl mb-3">🔑</p>
              <p className="text-slate-500 text-sm">{isAr ? 'لا توجد صلاحيات' : 'No roles found'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
