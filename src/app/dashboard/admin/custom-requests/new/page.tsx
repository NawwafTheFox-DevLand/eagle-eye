import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import NewCustomTypeForm from './NewCustomTypeForm';

export const dynamic = 'force-dynamic';

export default async function NewCustomTypePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();
  const { data: emp } = await service.from('employees')
    .select('id, company_id, department_id').eq('auth_user_id', user.id).single();
  if (!emp) redirect('/login');

  const { data: roleRows } = await service.from('user_roles')
    .select('role').eq('employee_id', emp.id).eq('is_active', true);
  const roles = (roleRows || []).map((r: any) => r.role as string);
  const canAccess = roles.some(r => ['department_manager', 'ceo', 'super_admin'].includes(r));
  if (!canAccess) redirect('/dashboard');

  const [{ data: allCompanies }, { data: allDepts }] = await Promise.all([
    service.from('companies').select('id, name_ar, name_en, code').eq('is_active', true).order('name_ar'),
    service.from('departments').select('id, name_ar, name_en, code, company_id').eq('is_active', true).order('name_ar'),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">📝 إنشاء نوع طلب مخصص / Create Custom Request Type</h1>
        <p className="text-slate-500 text-sm mt-1">حدد بيانات النوع والمسار والحقول المخصصة</p>
      </div>
      <NewCustomTypeForm
        companies={allCompanies || []}
        departments={allDepts || []}
        employeeCompanyId={emp.company_id || ''}
      />
    </div>
  );
}
