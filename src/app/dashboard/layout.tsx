import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let employee = null;
  let unreadCount = 0;
  let pendingCount = 0;
  let taskCount = 0;

  if (user) {
    const service = await createServiceClient();

    const { data: emp } = await service
      .from('employees')
      .select('id, auth_user_id, company_id, department_id, full_name_ar, full_name_en')
      .eq('auth_user_id', user.id)
      .single();

    if (emp) {
      const [{ data: roles }, { data: company }, { data: department }, { count: uc }, { count: pc }, { count: tc }] = await Promise.all([
        service.from('user_roles').select('role, company_id').eq('employee_id', emp.id).eq('is_active', true),
        service.from('companies').select('name_ar, name_en, code').eq('id', emp.company_id).single(),
        emp.department_id ? service.from('departments').select('name_ar, name_en, code').eq('id', emp.department_id).single() : Promise.resolve({ data: null }),
        service.from('notifications').select('*', { count: 'exact', head: true }).eq('recipient_id', emp.id).eq('is_read', false),
        service.from('approval_steps').select('*', { count: 'exact', head: true }).eq('approver_id', emp.id).eq('status', 'pending'),
        service.from('requests').select('*', { count: 'exact', head: true }).eq('assigned_to', emp.id).in('status', ['in_progress', 'assigned_to_employee']),
      ]);

      employee = { ...emp, roles: roles || [], company: company, department: department };
      unreadCount = uc ?? 0;
      pendingCount = pc ?? 0;
      taskCount = tc ?? 0;
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir="rtl">
      <Sidebar employee={employee} taskCount={taskCount} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar employee={employee} unreadCount={unreadCount} pendingCount={pendingCount} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
