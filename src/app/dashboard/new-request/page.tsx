import { createServiceClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import NewRequestForm from './NewRequestForm';

function getRoleLevel(roles: string[], isHoldingCompany: boolean): string {
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('ceo') && isHoldingCompany) return 'holding_ceo';
  if (roles.includes('ceo') && !isHoldingCompany) return 'company_director';
  if (roles.includes('department_manager')) return 'department_manager';
  return 'employee';
}

export default async function NewRequestPage() {
  const [service, employee] = await Promise.all([
    createServiceClient(),
    getSessionEmployee(),
  ]);
  if (!employee) redirect('/login');

  const [
    { data: configs },
    { data: companies },
    { data: departments },
    { data: companyInfo },
  ] = await Promise.all([
    service.from('request_type_configs').select('*').eq('is_active', true).order('name_ar'),
    service.from('companies').select('id, code, name_ar, name_en').eq('is_active', true).order('name_ar'),
    service.from('departments').select('id, code, name_ar, name_en, company_id').eq('is_active', true).order('name_ar'),
    employee.company_id
      ? service.from('companies').select('is_holding').eq('id', employee.company_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const roles: string[] = employee.roles?.map((r: any) => r.role) || [];
  const isHolding = (companyInfo as any)?.is_holding === true;
  const roleLevel = getRoleLevel(roles, isHolding);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">طلب جديد</h1>
        <p className="text-sm text-slate-500 mt-1">اختر نوع الطلب واملأ البيانات المطلوبة</p>
      </div>
      <NewRequestForm
        employee={employee}
        configs={configs || []}
        companies={companies || []}
        departments={departments || []}
        roleLevel={roleLevel}
      />
    </div>
  );
}
