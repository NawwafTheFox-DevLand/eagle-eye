import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import OrgTreeClient from './OrgTreeClient';

export default async function OrgTreePage() {
  const employee = await getSessionEmployee();
  if (!employee) redirect('/login');

  const roles = employee.roles?.map((r: any) => r.role) || [];
  const isAdmin = roles.includes('super_admin') || roles.includes('ceo');
  const isCompanyAdmin = roles.includes('company_admin');
  const isDeptManager = roles.includes('department_manager');

  // Regular employees have no access
  if (!isAdmin && !isCompanyAdmin && !isDeptManager) redirect('/dashboard');

  const service = await createServiceClient();

  // Fetch employees
  let empQuery = service.from('employees')
    .select('id, employee_code, full_name_ar, full_name_en, company_id, department_id, title_ar, grade, is_active')
    .eq('is_active', true);

  if (isDeptManager && !isAdmin && !isCompanyAdmin) {
    empQuery = empQuery.eq('department_id', employee.department_id);
  } else if (isCompanyAdmin && !isAdmin) {
    empQuery = empQuery.eq('company_id', employee.company_id);
  }

  const [{ data: employees }, { data: companies }, { data: departments }, { data: userRoles }] = await Promise.all([
    empQuery,
    service.from('companies').select('id, name_ar, name_en, code, is_holding, ceo_employee_id').order('name_ar'),
    service.from('departments').select('id, name_ar, name_en, code, company_id, head_employee_id').order('name_ar'),
    service.from('user_roles').select('employee_id, role'),
  ]);

  // Filter companies/depts by scope
  let scopedCompanies = companies || [];
  let scopedDepts = departments || [];
  if (isCompanyAdmin && !isAdmin) {
    scopedCompanies = scopedCompanies.filter((c: any) => c.id === employee.company_id);
    scopedDepts = scopedDepts.filter((d: any) => d.company_id === employee.company_id);
  } else if (isDeptManager && !isAdmin && !isCompanyAdmin) {
    scopedCompanies = scopedCompanies.filter((c: any) => c.id === employee.company_id);
    scopedDepts = scopedDepts.filter((d: any) => d.id === employee.department_id);
  }

  return (
    <OrgTreeClient
      employees={employees || []}
      companies={scopedCompanies}
      departments={scopedDepts}
      userRoles={userRoles || []}
      currentEmployeeId={employee.id}
      viewerRole={isAdmin ? 'admin' : isCompanyAdmin ? 'company_admin' : 'dept_manager'}
    />
  );
}
