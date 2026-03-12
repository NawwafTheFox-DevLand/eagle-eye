import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import RolesClient from './RolesClient';

export const dynamic = 'force-dynamic';

export default async function AdminRolesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();

  const { data: me } = await service.from('employees').select('id').eq('auth_user_id', user.id).single();
  if (!me) redirect('/login');

  const { data: roleRows } = await service.from('user_roles').select('role')
    .eq('employee_id', me.id).eq('is_active', true);
  if (!(roleRows || []).some((r: any) => r.role === 'super_admin')) redirect('/dashboard');

  // All user_roles
  const { data: allRoles } = await service.from('user_roles')
    .select('id, employee_id, role, company_id, is_active, created_at')
    .order('created_at', { ascending: false });

  // Batch-fetch employee names
  const empIds = [...new Set((allRoles || []).map((r: any) => r.employee_id).filter(Boolean))] as string[];
  const empMap: Record<string, any> = {};
  if (empIds.length > 0) {
    const { data: emps } = await service.from('employees')
      .select('id, full_name_ar, full_name_en, employee_code').in('id', empIds);
    for (const e of emps || []) empMap[e.id] = e;
  }

  // Batch-fetch company names
  const coIds = [...new Set((allRoles || []).map((r: any) => r.company_id).filter(Boolean))] as string[];
  const coMap: Record<string, any> = {};
  if (coIds.length > 0) {
    const { data: cos } = await service.from('companies').select('id, name_ar, name_en').in('id', coIds);
    for (const c of cos || []) coMap[c.id] = c;
  }

  // All employees + companies for assign dropdown
  const [{ data: allEmps }, { data: companies }] = await Promise.all([
    service.from('employees').select('id, full_name_ar, full_name_en, employee_code').eq('is_active', true).order('full_name_ar'),
    service.from('companies').select('id, name_ar, name_en').order('name_ar'),
  ]);

  return (
    <RolesClient
      roles={allRoles || []}
      empMap={empMap}
      coMap={coMap}
      allEmployees={allEmps || []}
      companies={companies || []}
    />
  );
}
