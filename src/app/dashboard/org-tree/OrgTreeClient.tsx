'use client';

import { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Employee {
  id: string;
  employee_code: string;
  full_name_ar: string;
  full_name_en: string | null;
  company_id: string;
  department_id: string;
  title_ar: string | null;
  grade: string | null;
  is_active: boolean;
}

interface Department {
  id: string;
  name_ar: string;
  name_en: string | null;
  code: string;
  company_id: string;
  head_employee_id: string | null;
}

interface Company {
  id: string;
  name_ar: string;
  name_en: string | null;
  code: string;
  is_holding: boolean;
  ceo_employee_id: string | null;
}

interface Props {
  employees: Employee[];
  companies: Company[];
  departments: Department[];
  userRoles: { employee_id: string; role: string }[];
  currentEmployeeId: string;
  viewerRole: 'admin' | 'company_admin' | 'dept_manager';
}

function getRoleLabel(employeeId: string, userRoles: { employee_id: string; role: string }[], lang: 'ar' | 'en'): string | null {
  const roles = userRoles.filter(r => r.employee_id === employeeId).map(r => r.role);
  const roleLabels: Record<string, { ar: string; en: string }> = {
    super_admin: { ar: 'مسؤول النظام', en: 'Super Admin' },
    ceo: { ar: 'مدير تنفيذي', en: 'CEO' },
    company_admin: { ar: 'مدير الشركة', en: 'Company Admin' },
    department_manager: { ar: 'مدير القسم', en: 'Dept Manager' },
    gr_manager: { ar: 'مدير GR', en: 'GR Manager' },
    gr_employee: { ar: 'موظف GR', en: 'GR Employee' },
    finance_supervisor: { ar: 'مشرف مالي', en: 'Finance Supervisor' },
    banking_employee: { ar: 'موظف بنكي', en: 'Banking Employee' },
  };
  for (const r of ['super_admin', 'ceo', 'company_admin', 'department_manager', 'gr_manager', 'gr_employee', 'finance_supervisor', 'banking_employee']) {
    if (roles.includes(r)) return roleLabels[r]?.[lang] || r;
  }
  return null;
}

function EmployeeCard({ emp, userRoles, lang, popoverId, setPopoverId }: any) {
  const name = lang === 'ar' ? (emp.full_name_ar || emp.full_name_en) : (emp.full_name_en || emp.full_name_ar);
  const roleLabel = getRoleLabel(emp.id, userRoles, lang);
  const isOpen = popoverId === emp.id;

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${isOpen ? 'bg-eagle-50 border-eagle-200 shadow-sm' : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}
        onClick={() => setPopoverId(isOpen ? null : emp.id)}
      >
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
          {(emp.full_name_ar?.[0] || emp.full_name_en?.[0] || '?')}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
          {emp.title_ar && <p className="text-xs text-slate-500 truncate">{emp.title_ar}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {emp.grade && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{emp.grade}</span>}
          {roleLabel && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-eagle-100 text-eagle-700">{roleLabel}</span>}
          <span className="text-xs text-slate-400 font-mono">{emp.employee_code}</span>
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-10 start-0 top-full mt-1 w-72 bg-white rounded-xl border border-slate-200 shadow-lg p-4">
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-slate-500">{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</p>
              <p className="font-medium">{emp.full_name_ar}</p>
              {emp.full_name_en && <p className="text-slate-600">{emp.full_name_en}</p>}
            </div>
            <div className="flex gap-4">
              {emp.grade && <div><p className="text-xs text-slate-500">{lang === 'ar' ? 'الدرجة' : 'Grade'}</p><p className="font-medium">{emp.grade}</p></div>}
              <div><p className="text-xs text-slate-500">{lang === 'ar' ? 'الكود' : 'Code'}</p><p className="font-mono text-xs">{emp.employee_code}</p></div>
            </div>
            {emp.title_ar && <div><p className="text-xs text-slate-500">{lang === 'ar' ? 'المسمى الوظيفي' : 'Title'}</p><p className="font-medium">{emp.title_ar}</p></div>}
            {roleLabel && <div><p className="text-xs text-slate-500">{lang === 'ar' ? 'الصلاحية' : 'Role'}</p><span className="px-2 py-0.5 rounded text-xs font-medium bg-eagle-100 text-eagle-700">{roleLabel}</span></div>}
          </div>
          <button onClick={() => setPopoverId(null)} className="absolute top-2 end-2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
        </div>
      )}
    </div>
  );
}

function DeptNode({ dept, employees, userRoles, lang, defaultExpanded, searchTerm, matchedIds, popoverId, setPopoverId }: any) {
  const headEmp = dept.head_employee_id ? employees.find((e: any) => e.id === dept.head_employee_id) : null;
  const deptEmps = employees
    .filter((e: any) => e.department_id === dept.id)
    .sort((a: any, b: any) => (b.grade || '').localeCompare(a.grade || ''));

  const hasMatch = searchTerm && deptEmps.some((e: any) => matchedIds.has(e.id));
  const [expanded, setExpanded] = useState(defaultExpanded || hasMatch);

  const deptName = lang === 'ar' ? (dept.name_ar || dept.name_en) : (dept.name_en || dept.name_ar);

  if (searchTerm && !hasMatch && !deptName.toLowerCase().includes(searchTerm.toLowerCase())) return null;

  return (
    <div className="mt-2">
      <div className="ms-4 border-s-2 border-slate-200 ps-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors text-start"
        >
          <span className="text-xs text-slate-400">{expanded ? '▼' : '▶'}</span>
          <span className="text-lg">🏗️</span>
          <div className="flex-1 min-w-0">
            <span className="font-medium text-slate-800 text-sm">{deptName}</span>
            {headEmp && <span className="ms-2 text-xs text-slate-500">— {lang === 'ar' ? headEmp.full_name_ar : (headEmp.full_name_en || headEmp.full_name_ar)}</span>}
          </div>
          <span className="text-xs text-slate-400 shrink-0">{deptEmps.length} {lang === 'ar' ? 'موظف' : 'emp'}</span>
        </button>

        {expanded && (
          <div className="mt-2 ms-4 border-s-2 border-slate-100 ps-4 space-y-1.5">
            {deptEmps.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">{lang === 'ar' ? 'لا يوجد موظفون' : 'No employees'}</p>
            ) : (
              deptEmps
                .filter((e: any) => !searchTerm || matchedIds.has(e.id))
                .map((e: any) => (
                  <EmployeeCard key={e.id} emp={e} userRoles={userRoles} lang={lang} popoverId={popoverId} setPopoverId={setPopoverId} />
                ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CompanyNode({ company, departments, employees, userRoles, lang, searchTerm, matchedIds, popoverId, setPopoverId }: any) {
  const [expanded, setExpanded] = useState(true);
  const coDepts = departments.filter((d: any) => d.company_id === company.id);
  const hasMatch = searchTerm && (coDepts.some((d: any) =>
    employees.filter((e: any) => e.department_id === d.id).some((e: any) => matchedIds.has(e.id))
  ) || (lang === 'ar' ? company.name_ar : company.name_en || company.name_ar).toLowerCase().includes(searchTerm.toLowerCase()));

  const coName = lang === 'ar' ? company.name_ar : (company.name_en || company.name_ar);
  const ceoEmp = company.ceo_employee_id ? employees.find((e: any) => e.id === company.ceo_employee_id) : null;

  if (searchTerm && !hasMatch && !coName.toLowerCase().includes(searchTerm.toLowerCase())) return null;

  return (
    <div className="border border-blue-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 w-full px-6 py-4 bg-blue-50 hover:bg-blue-100 transition-colors text-start"
      >
        <span className="text-xs text-blue-400">{expanded ? '▼' : '▶'}</span>
        <span className="text-xl">🏢</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-blue-900">{coName}</p>
          {ceoEmp && <p className="text-xs text-blue-700">{lang === 'ar' ? ceoEmp.full_name_ar : (ceoEmp.full_name_en || ceoEmp.full_name_ar)}</p>}
        </div>
        <span className="text-xs text-blue-500">{coDepts.length} {lang === 'ar' ? 'قسم' : 'depts'}</span>
        {company.is_holding && <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-200 text-blue-800">{lang === 'ar' ? 'قابضة' : 'Holding'}</span>}
      </button>

      {expanded && (
        <div className="p-4 bg-white space-y-1">
          {coDepts.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">{lang === 'ar' ? 'لا توجد أقسام' : 'No departments'}</p>
          ) : (
            coDepts.map((dept: any) => (
              <DeptNode
                key={dept.id}
                dept={dept}
                employees={employees}
                userRoles={userRoles}
                lang={lang}
                defaultExpanded={false}
                searchTerm={searchTerm}
                matchedIds={matchedIds}
                popoverId={popoverId}
                setPopoverId={setPopoverId}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function OrgTreeClient({ employees, companies, departments, userRoles, currentEmployeeId, viewerRole }: Props) {
  const { lang } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [popoverId, setPopoverId] = useState<string | null>(null);

  const matchedIds = useMemo(() => {
    if (!searchTerm) return new Set<string>();
    const q = searchTerm.toLowerCase();
    return new Set(employees
      .filter((e: any) =>
        e.full_name_ar?.toLowerCase().includes(q) ||
        e.full_name_en?.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q) ||
        e.title_ar?.toLowerCase().includes(q)
      )
      .map((e: any) => e.id)
    );
  }, [searchTerm, employees]);

  // Sort: holding first, then alphabetical
  const sortedCompanies = [...companies].sort((a: any, b: any) => {
    if (a.is_holding && !b.is_holding) return -1;
    if (!a.is_holding && b.is_holding) return 1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-fade-in" onClick={() => { /* close popovers on outside click */ }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'الهيكل التنظيمي' : 'Org Structure'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {employees.length} {lang === 'ar' ? 'موظف' : 'employees'} · {departments.length} {lang === 'ar' ? 'قسم' : 'departments'} · {companies.length} {lang === 'ar' ? 'شركة' : 'companies'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={lang === 'ar' ? '🔍 بحث عن موظف...' : '🔍 Search employee...'}
            className="input-field w-60"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-xs text-slate-400 hover:text-slate-700">✕</button>
          )}
        </div>
      </div>

      {searchTerm && matchedIds.size > 0 && (
        <div className="px-4 py-2 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-700">
          {matchedIds.size} {lang === 'ar' ? 'نتيجة' : 'results'}
        </div>
      )}
      {searchTerm && matchedIds.size === 0 && (
        <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500">
          {lang === 'ar' ? 'لا توجد نتائج' : 'No results'}
        </div>
      )}

      <div className="space-y-4">
        {sortedCompanies.map((company: any) => (
          <CompanyNode
            key={company.id}
            company={company}
            departments={departments}
            employees={employees}
            userRoles={userRoles}
            lang={lang}
            searchTerm={searchTerm}
            matchedIds={matchedIds}
            popoverId={popoverId}
            setPopoverId={setPopoverId}
          />
        ))}
      </div>
    </div>
  );
}
