'use client';
import { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

function gradeNum(grade: string): number {
  const m = grade?.match(/\d+/);
  return m ? parseInt(m[0]) : 0;
}

function gradeColor(grade: string): string {
  const n = gradeNum(grade);
  if (n >= 9) return 'bg-blue-100 text-blue-700';
  if (n >= 7) return 'bg-indigo-100 text-indigo-700';
  if (n >= 5) return 'bg-violet-100 text-violet-700';
  if (n >= 3) return 'bg-slate-100 text-slate-600';
  if (n >= 1) return 'bg-gray-100 text-gray-500';
  return 'bg-slate-100 text-slate-500';
}

interface Props {
  companies: any[];
  departments: any[];
  employees: any[];
  empMap: Record<string, any>;
  roleLevel: string;
}

export default function OrgTreeClient({ companies, departments, employees, empMap, roleLevel }: Props) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  const [search, setSearch] = useState('');

  const holdingCompany = companies.find(c => c.is_holding);
  const subsidiaries   = companies.filter(c => !c.is_holding);

  // Companies expanded by default; departments and employee lists collapsed
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(
    () => new Set(companies.map(c => c.id)),
  );
  const [expandedDepts, setExpandedDepts]         = useState<Set<string>>(new Set());
  const [expandedEmpLists, setExpandedEmpLists]   = useState<Set<string>>(new Set());
  const [holdingOpen, setHoldingOpen]             = useState(true);

  const toggleCompany = (id: string) =>
    setExpandedCompanies(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleDept = (id: string) =>
    setExpandedDepts(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleEmpList = (id: string) =>
    setExpandedEmpLists(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Search ──────────────────────────────────────────────────────────────────

  const searchTerm = search.toLowerCase().trim();

  const matchedEmpIds = useMemo(() => {
    if (!searchTerm) return new Set<string>();
    return new Set(
      employees
        .filter(e =>
          e.full_name_ar?.toLowerCase().includes(searchTerm) ||
          e.full_name_en?.toLowerCase().includes(searchTerm) ||
          e.employee_code?.toLowerCase().includes(searchTerm) ||
          e.title_ar?.toLowerCase().includes(searchTerm) ||
          e.title_en?.toLowerCase().includes(searchTerm),
        )
        .map(e => e.id),
    );
  }, [searchTerm, employees]);

  const searchExpandedDepts = useMemo(() => {
    if (!searchTerm) return new Set<string>();
    return new Set(
      employees.filter(e => matchedEmpIds.has(e.id) && e.department_id).map(e => e.department_id as string),
    );
  }, [searchTerm, matchedEmpIds, employees]);

  const searchExpandedCompanies = useMemo(() => {
    if (!searchTerm) return new Set<string>();
    const fromDepts     = new Set(departments.filter(d => searchExpandedDepts.has(d.id)).map(d => d.company_id as string));
    const fromDirectEmps = new Set(employees.filter(e => matchedEmpIds.has(e.id)).map(e => e.company_id as string));
    return new Set([...fromDepts, ...fromDirectEmps]);
  }, [searchTerm, searchExpandedDepts, matchedEmpIds, departments, employees]);

  const effExpandedCompanies = searchTerm ? searchExpandedCompanies : expandedCompanies;
  const effExpandedDepts     = searchTerm ? searchExpandedDepts     : expandedDepts;
  // When searching, also auto-expand employee lists in matching depts
  const effExpandedEmpLists  = searchTerm ? searchExpandedDepts     : expandedEmpLists;
  const effHoldingOpen       = searchTerm ? searchExpandedCompanies.has(holdingCompany?.id) : holdingOpen;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const getName = (emp: any) =>
    emp ? (isAr ? emp.full_name_ar : emp.full_name_en || emp.full_name_ar) : null;

  const getTitle = (emp: any) =>
    emp ? (isAr ? emp.title_ar : emp.title_en || emp.title_ar) : null;

  const empCountByCompany = useMemo(() => {
    const m = new Map<string, number>();
    employees.forEach(e => { if (e.company_id) m.set(e.company_id, (m.get(e.company_id) || 0) + 1); });
    return m;
  }, [employees]);

  const shouldShow = (emp: any) => !searchTerm || matchedEmpIds.has(emp.id);

  // ── Sub-renderers ────────────────────────────────────────────────────────────

  function GradeBadge({ grade }: { grade: string }) {
    if (!grade) return null;
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${gradeColor(grade)}`}>
        {grade}
      </span>
    );
  }

  function EmployeeRow({ emp }: { emp: any }) {
    const highlighted = !!searchTerm && matchedEmpIds.has(emp.id);
    const title = getTitle(emp);
    return (
      <div className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg transition-colors ${highlighted ? 'bg-yellow-50 border border-yellow-200' : 'hover:bg-slate-50'}`}>
        <span className="text-sm shrink-0 text-slate-400">👤</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-700 truncate">{getName(emp) || '—'}</p>
          {(emp.employee_code || title) && (
            <p className="text-xs text-slate-400 truncate">
              {emp.employee_code}{title ? ` · ${title}` : ''}
            </p>
          )}
        </div>
        {emp.grade && <GradeBadge grade={emp.grade} />}
      </div>
    );
  }

  function HeadRow({ head }: { head: any }) {
    const highlighted = !!searchTerm && matchedEmpIds.has(head.id);
    const title = getTitle(head);
    return (
      <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${highlighted ? 'bg-yellow-50 border border-yellow-200' : 'bg-white border border-slate-100'}`}>
        <span className="text-base shrink-0">📋</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 truncate">{getName(head)}</p>
          {(head.employee_code || title) && (
            <p className="text-xs text-slate-400 truncate">
              {head.employee_code}{title ? ` · ${title}` : ''}
            </p>
          )}
        </div>
        {head.grade && <GradeBadge grade={head.grade} />}
      </div>
    );
  }

  function DeptNode({ dept, companyEmps }: { dept: any; companyEmps: any[] }) {
    const head       = dept.head_employee_id ? empMap[dept.head_employee_id] : null;
    const allDeptEmps = companyEmps.filter(e => e.department_id === dept.id);
    // Non-head employees, sorted by grade descending
    const nonHeadEmps = allDeptEmps
      .filter(e => e.id !== dept.head_employee_id)
      .sort((a, b) => gradeNum(b.grade) - gradeNum(a.grade));
    const visibleNonHead = nonHeadEmps.filter(shouldShow);
    const headMatches    = head && shouldShow(head);

    // In search mode, skip dept if nothing matches
    if (searchTerm && !headMatches && visibleNonHead.length === 0) return null;

    const isDeptOpen    = effExpandedDepts.has(dept.id);
    const isEmpListOpen = effExpandedEmpLists.has(dept.id);
    const nonHeadCount  = nonHeadEmps.length;
    const totalCount    = allDeptEmps.length;

    return (
      <div className="ms-6 mt-1.5">
        {/* Dept header — toggles dept expansion */}
        <div
          className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors"
          onClick={() => toggleDept(dept.id)}
        >
          <span className="text-slate-400 text-xs w-4 shrink-0">{isDeptOpen ? '▼' : '▶'}</span>
          <span className="text-base">🏢</span>
          <p className="text-sm font-semibold text-slate-800 flex-1 truncate">
            {isAr ? dept.name_ar : (dept.name_en || dept.name_ar)}
          </p>
          <span className="text-xs text-slate-400 bg-slate-200 rounded-full px-2 py-0.5 shrink-0">
            {totalCount}
          </span>
        </div>

        {/* Dept body — head + employee list */}
        {isDeptOpen && (
          <div className="ms-6 mt-1 space-y-1.5 border-s-2 border-slate-100 ps-3">
            {/* Department head row — always first */}
            {head ? (
              <HeadRow head={head} />
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                <span className="text-base shrink-0">📋</span>
                <p className="text-xs text-amber-600 font-medium">
                  {isAr ? 'لم يُعيّن رئيس القسم' : 'No head assigned'}
                </p>
              </div>
            )}

            {/* Employee list — separate collapsible */}
            {nonHeadCount > 0 && (
              <div>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => toggleEmpList(dept.id)}
                >
                  <span className="text-slate-400 text-xs w-4 shrink-0">{isEmpListOpen ? '▼' : '▶'}</span>
                  <span className="text-sm">👥</span>
                  <p className="text-sm text-slate-600 flex-1">
                    {isAr ? 'الموظفون' : 'Employees'}
                  </p>
                  <span className="text-xs text-slate-400 bg-slate-200 rounded-full px-2 py-0.5 shrink-0">
                    {nonHeadCount}
                  </span>
                </div>

                {isEmpListOpen && (
                  <div className="ms-4 mt-0.5 space-y-0.5 border-s-2 border-slate-100 ps-2">
                    {(searchTerm ? visibleNonHead : nonHeadEmps).map(e => (
                      <EmployeeRow key={e.id} emp={e} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {nonHeadCount === 0 && !searchTerm && (
              <p className="text-xs text-slate-400 ps-2 py-1 italic">
                {isAr ? 'لا يوجد موظفون آخرون' : 'No other employees'}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  function CeoRow({ emp }: { emp: any }) {
    const highlighted = !!searchTerm && matchedEmpIds.has(emp.id);
    const title = getTitle(emp);
    return (
      <div className={`flex items-center gap-2.5 mx-1 mt-2 mb-1 px-3 py-2.5 rounded-xl ${highlighted ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50/60 border border-blue-100'}`}>
        <span className="text-lg shrink-0">👔</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-blue-900 truncate">{getName(emp)}</p>
          {(emp.employee_code || title) && (
            <p className="text-xs text-blue-400 truncate">
              {emp.employee_code}{title ? ` · ${title}` : ''}
            </p>
          )}
        </div>
        {emp.grade && <GradeBadge grade={emp.grade} />}
      </div>
    );
  }

  function CompanyNode({ company }: { company: any }) {
    const companyDepts = departments.filter(d => d.company_id === company.id);
    const companyEmps  = employees.filter(e => e.company_id === company.id);
    const deptlessEmps = companyEmps.filter(e => !e.department_id).filter(shouldShow);
    const ceo          = company.ceo_employee_id ? empMap[company.ceo_employee_id] : null;

    if (searchTerm && !companyEmps.some(e => matchedEmpIds.has(e.id))) return null;

    const isOpen = effExpandedCompanies.has(company.id);
    const count  = companyEmps.length;

    return (
      <div className="ms-8 mt-2">
        {/* Company header */}
        <div
          className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-3 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => toggleCompany(company.id)}
        >
          <span className="text-blue-400 text-xs w-4 shrink-0">{isOpen ? '▼' : '▶'}</span>
          <span className="text-lg">🏢</span>
          <p className="text-sm font-bold text-slate-900 flex-1 truncate">
            {isAr ? company.name_ar : (company.name_en || company.name_ar)}
          </p>
          <span className="text-xs text-blue-400 bg-blue-100 rounded-full px-2 py-0.5 shrink-0">{count}</span>
        </div>

        {isOpen && (
          <div className="mt-0.5">
            {/* CEO shown at company level */}
            {ceo && <CeoRow emp={ceo} />}
            {/* Departments */}
            {companyDepts.map(d => <DeptNode key={d.id} dept={d} companyEmps={companyEmps} />)}
            {/* Dept-less employees */}
            {deptlessEmps.length > 0 && (
              <div className="ms-6 mt-1.5">
                <div className="border border-dashed border-slate-200 rounded-xl px-3 py-2 bg-white">
                  <p className="text-xs text-slate-400 mb-1 font-medium">
                    {isAr ? 'بدون قسم' : 'No Department'}
                  </p>
                  {deptlessEmps.map(e => <EmployeeRow key={e.id} emp={e} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isAr ? 'الهيكل التنظيمي' : 'Org Structure'}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {isAr
            ? `${companies.length} شركة · ${departments.length} قسم · ${employees.length} موظف`
            : `${companies.length} companies · ${departments.length} departments · ${employees.length} employees`}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder={isAr ? 'ابحث بالاسم أو الكود أو المسمى الوظيفي...' : 'Search by name, code, or title...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field ps-9 pe-9 w-full"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Tree */}
      <div className="card p-4">
        {/* Holding company at root */}
        {holdingCompany && (
          <div className="mb-3">
            <div
              className="flex items-center gap-3 bg-gradient-to-r from-slate-900 to-blue-900 text-white rounded-2xl px-4 py-3.5 cursor-pointer"
              onClick={() => setHoldingOpen(o => !o)}
            >
              <span className="text-slate-300 text-xs w-4 shrink-0">{effHoldingOpen ? '▼' : '▶'}</span>
              <span className="text-xl">🏛️</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">
                  {isAr ? holdingCompany.name_ar : (holdingCompany.name_en || holdingCompany.name_ar)}
                </p>
                {(() => {
                  const ceo = holdingCompany.ceo_employee_id ? empMap[holdingCompany.ceo_employee_id] : null;
                  return ceo
                    ? <p className="text-xs text-blue-200 truncate">👔 {getName(ceo)}</p>
                    : <p className="text-xs text-slate-400">{isAr ? 'لم يُعيّن رئيس' : 'No head assigned'}</p>;
                })()}
              </div>
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 shrink-0">
                {employees.filter(e => e.company_id === holdingCompany.id).length}
              </span>
            </div>

            {effHoldingOpen && (() => {
              const holdingDepts = departments.filter(d => d.company_id === holdingCompany.id);
              const holdingEmps  = employees.filter(e => e.company_id === holdingCompany.id);
              const holdingCeo   = holdingCompany.ceo_employee_id ? empMap[holdingCompany.ceo_employee_id] : null;
              const holdingDeptlessEmps = holdingEmps.filter(e => !e.department_id).filter(shouldShow);
              return (
                <div className="mt-0.5">
                  {holdingCeo && <CeoRow emp={holdingCeo} />}
                  {holdingDepts.map(d => <DeptNode key={d.id} dept={d} companyEmps={holdingEmps} />)}
                  {holdingDeptlessEmps.length > 0 && (
                    <div className="ms-6 mt-1.5">
                      <div className="border border-dashed border-slate-200 rounded-xl px-3 py-2 bg-white">
                        <p className="text-xs text-slate-400 mb-1 font-medium">{isAr ? 'بدون قسم' : 'No Department'}</p>
                        {holdingDeptlessEmps.map(e => <EmployeeRow key={e.id} emp={e} />)}
                      </div>
                    </div>
                  )}
                  {subsidiaries.map(c => <CompanyNode key={c.id} company={c} />)}
                </div>
              );
            })()}
          </div>
        )}

        {/* No holding: flat company list */}
        {!holdingCompany && companies.map(c => <CompanyNode key={c.id} company={c} />)}

        {companies.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-4xl mb-3">🏛️</p>
            <p className="text-slate-400 text-sm">{isAr ? 'لا توجد بيانات' : 'No data available'}</p>
          </div>
        )}

        {searchTerm && matchedEmpIds.size === 0 && (
          <div className="py-8 text-center">
            <p className="text-slate-400 text-sm">{isAr ? 'لا توجد نتائج' : 'No results found'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
