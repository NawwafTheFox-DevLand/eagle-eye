import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getAllCustomRequestTypes } from '@/app/actions/custom-requests';
import CustomRequestsClient from './CustomRequestsClient';

export const dynamic = 'force-dynamic';

export default async function CustomRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = await createServiceClient();
  const { data: emp } = await service.from('employees').select('id').eq('auth_user_id', user.id).single();
  if (!emp) redirect('/login');

  const { data: roleRows } = await service
    .from('user_roles')
    .select('role')
    .eq('employee_id', emp.id)
    .eq('is_active', true);

  const roles = (roleRows || []).map((r: any) => r.role);
  const canAccess = roles.some((r: string) => ['department_manager', 'ceo', 'super_admin'].includes(r));
  if (!canAccess) redirect('/dashboard');

  const types = await getAllCustomRequestTypes();

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <CustomRequestsClient types={types as any[]} />
    </div>
  );
}
