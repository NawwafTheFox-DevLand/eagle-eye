'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { updateDepartmentHead } from '@/app/actions/admin';

interface Props {
  companies: any[];
  departments: any[];
  employees: any[];
  empMap: Record<string, any>;
}

export default function DepartmentsClient({ companies, departments, employees, empMap }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [companyFilter, setCompanyFilter] = useState('');
  const [activePanel, setActivePanel]     = useState<string | null>(null);
  const [selectedHead, setSelectedHead]   = useState('');
  const [saving, setSaving]               = useState(false);
  const [errorMsg, setErrorMsg]           = useState('');

  const getName = (emp: any) =>
    emp ? (isAr ? emp.full_name_ar : emp.full_name_en || emp.full_name_ar) : null;

  const getCompanyName = (c: any) =>
    isAr ? c.name_ar : (c.name_en || c.name_ar);

  const companyMap: Record<string, any> = {};
  for (const c of companies) companyMap[c.id] = c;

  const empCountByDept: Record<string, number> = {};
  for (const e of employees) {
    if (e.department_id) {
      empCountByDept[e.department_id] = (empCountByDept[e.department_id] || 0) + 1;
    }
  }

  const filtered = departments.filter(d =>
    (!companyFilter || d.company_id === companyFilter),
  );

  function openPanel(deptId: string, currentHeadId: string | null) {
    setActivePanel(deptId);
    setSelectedHead(currentHeadId || '');
    setErrorMsg('');
  }

  function closePanel() {
    setActivePanel(null);
    setSelectedHead('');
    setErrorMsg('');
  }

  async function handleSave(deptId: string) {
    setSaving(true);
    setErrorMsg('');
    const result = await updateDepartmentHead(deptId, selectedHead || null);
    setSaving(false);
    if (result.error) {
      setErrorMsg(result.error);
      return;
    }
    closePanel();
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isAr ? 'إدارة الأقسام' : 'Departments'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAr ? `${filtered.length} من ${departments.length} قسم` : `${filtered.length} of ${departments.length} departments`}
        </p>
      </div>

      {/* Filter */}
      <div>
        <select
          value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value)}
          className="input-field w-auto text-sm"
        >
          <option value="">{isAr ? 'الكل — جميع الشركات' : 'All Companies'}</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{getCompanyName(c)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Header row */}
        <div className="hidden md:grid grid-cols-[1fr_2fr_1.5fr_2fr_auto_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <span>{isAr ? 'الكود' : 'Code'}</span>
          <span>{isAr ? 'الاسم' : 'Name'}</span>
          <span>{isAr ? 'الشركة' : 'Company'}</span>
          <span>{isAr ? 'رئيس القسم' : 'Head'}</span>
          <span>{isAr ? 'الموظفون' : 'Employees'}</span>
          <span></span>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map(dept => {
            const company    = companyMap[dept.company_id];
            const head       = dept.head_employee_id ? empMap[dept.head_employee_id] : null;
            const headName   = head ? getName(head) : null;
            const count      = empCountByDept[dept.id] || 0;
            const isPanelOpen = activePanel === dept.id;

            // Company-filtered employees for the head picker dropdown
            const companyEmps = employees.filter(e => e.company_id === dept.company_id);

            return (
              <div key={dept.id}>
                {/* Main row */}
                <div className="grid md:grid-cols-[1fr_2fr_1.5fr_2fr_auto_auto] gap-3 px-5 py-3.5 items-center">
                  <span className="font-mono text-xs text-slate-500">{dept.code}</span>

                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-900 truncate">{dept.name_ar}</p>
                    {dept.name_en && (
                      <p className="text-xs text-slate-400 truncate">{dept.name_en}</p>
                    )}
                  </div>

                  <span className="text-xs text-slate-600 truncate">
                    {company ? getCompanyName(company) : '—'}
                  </span>

                  <div className="min-w-0">
                    {headName ? (
                      <div>
                        <p className="text-sm font-medium text-slate-800 truncate">{headName}</p>
                        <p className="text-xs font-mono text-slate-400">{head?.employee_code}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-500 font-medium">
                        {isAr ? 'لم يُعيّن' : 'Unassigned'}
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 text-center shrink-0">
                    {count}
                  </span>

                  <button
                    onClick={() => isPanelOpen ? closePanel() : openPanel(dept.id, dept.head_employee_id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 ${
                      isPanelOpen
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                    }`}
                  >
                    {isPanelOpen
                      ? (isAr ? 'إغلاق' : 'Close')
                      : (isAr ? 'تغيير الرئيس' : 'Change Head')}
                  </button>
                </div>

                {/* Inline change-head panel */}
                {isPanelOpen && (
                  <div className="mx-5 mb-4 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-700">
                      {isAr ? 'اختر رئيس القسم الجديد' : 'Select New Department Head'}
                    </p>

                    <select
                      value={selectedHead}
                      onChange={e => setSelectedHead(e.target.value)}
                      className="input-field w-full text-sm"
                    >
                      <option value="">— {isAr ? 'إزالة الرئيس' : 'Remove Head'} —</option>
                      {companyEmps.map(e => {
                        const empName = getName(e);
                        return (
                          <option key={e.id} value={e.id}>
                            {empName} ({e.employee_code}){(isAr ? e.title_ar : e.title_en || e.title_ar) ? ` · ${isAr ? e.title_ar : e.title_en || e.title_ar}` : ''}
                          </option>
                        );
                      })}
                    </select>

                    {errorMsg && (
                      <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSave(dept.id)}
                        disabled={saving || isPending}
                        className="btn-primary text-sm py-1.5 px-4 disabled:opacity-50"
                      >
                        {saving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}
                      </button>
                      <button
                        onClick={closePanel}
                        disabled={saving}
                        className="text-sm px-4 py-1.5 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-4xl mb-3">🏢</p>
              <p className="text-slate-500 text-sm">{isAr ? 'لا توجد أقسام' : 'No departments found'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
