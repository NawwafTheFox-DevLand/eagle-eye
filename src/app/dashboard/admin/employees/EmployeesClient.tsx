'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { toggleEmployeeActive } from '@/app/actions/admin';
import { exportToCSV } from '@/lib/utils/export';

interface Props {
  employees: any[];
  companies: any[];
  departments: any[];
  companyMap: Record<string, any>;
  deptMap: Record<string, any>;
}

export default function EmployeesClient({ employees, companies, departments, companyMap, deptMap }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [toggling, setToggling] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredDepts = departments.filter(d => !companyFilter || d.company_id === companyFilter);

  const filtered = employees.filter(e => {
    const q = search.toLowerCase().trim();
    if (q && !e.full_name_ar?.toLowerCase().includes(q) && !e.full_name_en?.toLowerCase().includes(q) && !e.employee_code?.toLowerCase().includes(q)) return false;
    if (companyFilter && e.company_id !== companyFilter) return false;
    if (deptFilter && e.department_id !== deptFilter) return false;
    if (activeFilter === 'active' && !e.is_active) return false;
    if (activeFilter === 'inactive' && e.is_active) return false;
    return true;
  });

  function handleExport() {
    exportToCSV(filtered.map(e => ({
      [isAr ? 'الكود' : 'Code']: e.employee_code || '',
      [isAr ? 'الاسم عربي' : 'Name (AR)']: e.full_name_ar || '',
      [isAr ? 'الاسم إنجليزي' : 'Name (EN)']: e.full_name_en || '',
      [isAr ? 'البريد' : 'Email']: e.email || '',
      [isAr ? 'الشركة' : 'Company']: companyMap[e.company_id]?.name_ar || '',
      [isAr ? 'القسم' : 'Department']: deptMap[e.department_id]?.name_ar || '',
      [isAr ? 'الحالة' : 'Status']: e.is_active ? 'Active' : 'Inactive',
    })), 'employees');
  }

  async function handleToggle(empId: string, currentlyActive: boolean) {
    setToggling(empId);
    setErrorMsg('');
    const result = await toggleEmployeeActive(empId, !currentlyActive);
    setToggling(null);
    if (result.error) { setErrorMsg(result.error); return; }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'الموظفون' : 'Employees'}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAr ? `${filtered.length} من ${employees.length} موظف` : `${filtered.length} of ${employees.length} employees`}
          </p>
        </div>
        <button onClick={handleExport} className="text-sm px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
          {isAr ? '⬇ تصدير' : '⬇ Export'}
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={isAr ? 'بحث بالاسم أو الكود...' : 'Search by name or code...'}
          className="input-field flex-1 min-w-48 text-sm"
        />
        <select value={companyFilter} onChange={e => { setCompanyFilter(e.target.value); setDeptFilter(''); }}
          className="input-field w-auto text-sm">
          <option value="">{isAr ? 'كل الشركات' : 'All Companies'}</option>
          {companies.map(c => <option key={c.id} value={c.id}>{isAr ? c.name_ar : (c.name_en || c.name_ar)}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="input-field w-auto text-sm" disabled={!companyFilter}>
          <option value="">{isAr ? 'كل الأقسام' : 'All Depts'}</option>
          {filteredDepts.map(d => <option key={d.id} value={d.id}>{isAr ? d.name_ar : (d.name_en || d.name_ar)}</option>)}
        </select>
        <select value={activeFilter} onChange={e => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="input-field w-auto text-sm">
          <option value="all">{isAr ? 'الكل' : 'All'}</option>
          <option value="active">{isAr ? 'نشط' : 'Active'}</option>
          <option value="inactive">{isAr ? 'غير نشط' : 'Inactive'}</option>
        </select>
      </div>

      {errorMsg && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{errorMsg}</div>}

      <div className="card overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1fr_2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          <span>{isAr ? 'الكود' : 'Code'}</span>
          <span>{isAr ? 'الاسم' : 'Name'}</span>
          <span>{isAr ? 'الشركة' : 'Company'}</span>
          <span>{isAr ? 'القسم' : 'Department'}</span>
          <span>{isAr ? 'الدرجة' : 'Grade'}</span>
          <span>{isAr ? 'الحالة' : 'Status'}</span>
          <span></span>
        </div>

        <div className="divide-y divide-slate-100">
          {filtered.map(e => {
            const co   = e.company_id    ? companyMap[e.company_id]    : null;
            const dept = e.department_id ? deptMap[e.department_id]    : null;
            return (
              <div key={e.id} className="grid md:grid-cols-[1fr_2fr_1.5fr_1.5fr_1fr_1fr_auto] gap-3 px-5 py-3.5 items-center">
                <span className="font-mono text-xs text-slate-500">{e.employee_code}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{e.full_name_ar}</p>
                  {e.full_name_en && <p className="text-xs text-slate-400 truncate">{e.full_name_en}</p>}
                </div>
                <span className="text-xs text-slate-600 truncate">{co ? (isAr ? co.name_ar : co.name_en || co.name_ar) : '—'}</span>
                <span className="text-xs text-slate-600 truncate">{dept ? (isAr ? dept.name_ar : dept.name_en || dept.name_ar) : '—'}</span>
                <span className="text-xs text-slate-500">{e.grade || '—'}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${e.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {e.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive')}
                </span>
                <button
                  onClick={() => handleToggle(e.id, e.is_active)}
                  disabled={toggling === e.id || isPending}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors shrink-0 disabled:opacity-50 ${
                    e.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  {toggling === e.id ? '...' : e.is_active ? (isAr ? 'تعطيل' : 'Deactivate') : (isAr ? 'تفعيل' : 'Activate')}
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-4xl mb-3">👥</p>
              <p className="text-slate-500 text-sm">{isAr ? 'لا توجد نتائج' : 'No results found'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
