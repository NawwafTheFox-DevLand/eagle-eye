'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { toggleEmployeeActive } from '@/app/actions/admin';
import { useRouter } from 'next/navigation';

const t = {
  ar: { title: 'إدارة الموظفين', search: 'بحث بالاسم أو الرمز أو البريد...', code: 'الرمز', name: 'الاسم', company: 'الشركة', dept: 'القسم', grade: 'الدرجة', status: 'الحالة', active: 'نشط', inactive: 'غير نشط', total: 'موظف', actions: 'إجراءات', deactivate: 'تعطيل', activate: 'تفعيل' },
  en: { title: 'Employee Management', search: 'Search by name, code, or email...', code: 'Code', name: 'Name', company: 'Company', dept: 'Department', grade: 'Grade', status: 'Status', active: 'Active', inactive: 'Inactive', total: 'employees', actions: 'Actions', deactivate: 'Deactivate', activate: 'Activate' },
};

export default function EmployeesClient({ employees, companies, departments }: any) {
  const { lang } = useLanguage();
  const L = t[lang];
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');

  const companyMap = new Map(companies.map((c: any) => [c.id, c]));
  const deptMap = new Map(departments.map((d: any) => [d.id, d]));

  const filtered = employees.filter((e: any) => {
    const matchSearch = !search || [e.full_name_ar, e.full_name_en, e.employee_code, e.email]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchCompany = !filterCompany || e.company_id === filterCompany;
    return matchSearch && matchCompany;
  });

  async function handleToggle(empId: string, currentActive: boolean) {
    await toggleEmployeeActive(empId, !currentActive);
    router.refresh();
  }

  function exportToExcel() {
    const isAr = lang === 'ar';
    const rows = filtered.map((e: any) => {
      const co = companyMap.get(e.company_id) as any;
      const dept = deptMap.get(e.department_id) as any;
      return {
        [isAr ? 'الرمز'         : 'Code']:        e.employee_code,
        [isAr ? 'الاسم بالعربي' : 'Arabic Name']: e.full_name_ar,
        [isAr ? 'الاسم بالإنجليزي': 'English Name']: e.full_name_en ?? '',
        [isAr ? 'الشركة'        : 'Company']:     isAr ? (co?.name_ar ?? '') : ((co?.name_en || co?.name_ar) ?? ''),
        [isAr ? 'القسم'         : 'Department']:  isAr ? (dept?.name_ar ?? '') : ((dept?.name_en || dept?.name_ar) ?? ''),
        [isAr ? 'الدرجة'        : 'Grade']:        e.grade ?? '',
        [isAr ? 'المسمى الوظيفي': 'Title']:        e.title_ar ?? '',
        [isAr ? 'الحالة'        : 'Status']:       e.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'غير نشط' : 'Inactive'),
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isAr ? 'الموظفون' : 'Employees');
    XLSX.writeFile(wb, `eagle-eye-employees-${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{L.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{filtered.length} {L.total}</p>
        </div>
        <button onClick={exportToExcel} className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors">
          {lang === 'ar' ? '⬇️ تصدير Excel' : '⬇️ Export Excel'}
        </button>
      </div>

      <div className="flex gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L.search}
          className="input-field flex-1" />
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="input-field w-60">
          <option value="">{lang === 'ar' ? 'كل الشركات' : 'All Companies'}</option>
          {companies.map((c: any) => <option key={c.id} value={c.id}>{c.name_ar} ({c.code})</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-start font-medium text-slate-600">{L.code}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{L.name}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{L.company}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{L.dept}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{L.grade}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{L.status}</th>
                <th className="px-4 py-3 text-start font-medium text-slate-600">{L.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((emp: any) => {
                const co = companyMap.get(emp.company_id);
                const dept = deptMap.get(emp.department_id);
                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{emp.employee_code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{emp.full_name_ar}</p>
                      <p className="text-xs text-slate-500">{emp.full_name_en}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{co?.name_ar || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{dept?.name_ar || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{emp.grade || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {emp.is_active ? L.active : L.inactive}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(emp.id, emp.is_active)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${emp.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                        {emp.is_active ? L.deactivate : L.activate}
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
