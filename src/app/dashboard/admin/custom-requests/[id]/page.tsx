import { redirect, notFound } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getCustomRequestType } from '@/app/actions/custom-requests';
import EditCustomTypeForm from './EditCustomTypeForm';

export const dynamic = 'force-dynamic';

export default async function EditCustomTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();
  const { data: emp } = await service.from('employees').select('id, company_id').eq('auth_user_id', user.id).single();
  if (!emp) redirect('/login');

  const { data: roleRows } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', emp.id)
    .eq('is_active', true);

  const roles = (roleRows || []).map((r: any) => r.role);
  const canAccess = roles.some((r: string) => ['department_manager', 'ceo', 'super_admin'].includes(r));
  if (!canAccess) redirect('/dashboard');

  const [typeData, { data: allCompanies }, { data: allDepts }] = await Promise.all([
    getCustomRequestType(id),
    service.from('companies').select('id, name_ar, name_en, code').eq('is_active', true).order('name_ar'),
    service.from('departments').select('id, name_ar, name_en, code, company_id').eq('is_active', true).order('name_ar'),
  ]);

  if (!typeData) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          تعديل النوع / Edit Type — {typeData.name_en}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{typeData.code}</p>
      </div>
      <EditCustomTypeForm
        typeId={id}
        initialData={typeData}
        companies={allCompanies || []}
        departments={allDepts || []}
        employeeCompanyId={emp.company_id || ''}
      />
    </div>
  );
}
