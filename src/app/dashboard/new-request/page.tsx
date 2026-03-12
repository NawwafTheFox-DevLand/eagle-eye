import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import NewRequestForm from './NewRequestForm';

export const dynamic = 'force-dynamic';

function getRoleLevel(roles: { role: string }[], isHolding: boolean): string {
  if (roles.some(r => r.role === 'super_admin')) return 'super_admin';
  if (roles.some(r => r.role === 'ceo') && isHolding) return 'holding_ceo';
  if (roles.some(r => r.role === 'ceo') && !isHolding) return 'company_ceo';
  if (roles.some(r => r.role === 'department_manager')) return 'dept_head';
  return 'employee';
}

const ROLE_ORDER = ['employee', 'dept_head', 'company_ceo', 'holding_ceo', 'super_admin'];

function canSeeConfig(configLevel: string | null, roleLevel: string): boolean {
  const configIdx = ROLE_ORDER.indexOf(configLevel || 'employee');
  const roleIdx = ROLE_ORDER.indexOf(roleLevel);
  return roleIdx >= configIdx;
}

export default async function NewRequestPage() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const service = await createServiceClient();

    const { data: emp } = await service
      .from('employees')
      .select('id, auth_user_id, company_id, department_id, full_name_ar, full_name_en, employee_code')
      .eq('auth_user_id', user.id)
      .single();
    if (!emp) redirect('/login');

    const [{ data: roleRows }, { data: company }, { data: allCompanies }, { data: allDepts }, { data: allConfigs }] = await Promise.all([
      service.from('user_roles').select('role, company_id').eq('employee_id', emp.id).eq('is_active', true),
      emp.company_id
        ? service.from('companies').select('id, name_ar, name_en, code, is_holding').eq('id', emp.company_id).single()
        : Promise.resolve({ data: null }),
      service.from('companies').select('id, name_ar, name_en, code, is_holding').order('name_ar'),
      service.from('departments').select('id, name_ar, name_en, code, company_id').eq('is_active', true).order('name_ar'),
      service.from('request_type_configs').select('id, request_type, name_ar, name_en, icon, min_role_level, requires_ceo, requires_hr, requires_finance, is_routine_eligible').eq('is_active', true),
    ]);

    const roles = roleRows || [];
    const isHolding = (company as any)?.is_holding === true;
    const roleLevel = getRoleLevel(roles, isHolding);

    const filteredConfigs = (allConfigs || []).filter(c => canSeeConfig(c.min_role_level, roleLevel));
    const employee = { ...emp, roles, company: company || null };

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">طلب جديد / New Request</h1>
          <p className="text-slate-500 text-sm mt-1">اختر نوع الطلب واملأ البيانات المطلوبة</p>
        </div>
        <NewRequestForm
          configs={filteredConfigs}
          companies={allCompanies || []}
          departments={allDepts || []}
          employee={employee}
        />
      </div>
    );
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    return (
      <div className="max-w-3xl mx-auto p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm font-mono">
        <strong>خطأ:</strong> {String(err?.message ?? err)}
      </div>
    );
  }
}
