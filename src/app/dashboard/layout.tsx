import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let employee: any = null;
  let roles: string[] = [];
  let inboxCount = 0;
  let notifCount = 0;
  let isHRHead = false;

  try {
    const service = await createServiceClient();

    const { data: emp } = await service
      .from('employees')
      .select('id, auth_user_id, company_id, department_id, full_name_ar, full_name_en, employee_code, title_ar, title_en, grade')
      .eq('auth_user_id', user.id)
      .single();

    if (emp) {
      const [{ data: roleRows }, { data: company }, { count: ic }, { count: nc }] = await Promise.all([
        service.from('user_roles').select('role').eq('employee_id', emp.id).eq('is_active', true),
        emp.company_id
          ? service.from('companies').select('id, name_ar, name_en, code, is_holding').eq('id', emp.company_id).single()
          : Promise.resolve({ data: null }),
        service.from('requests').select('*', { count: 'exact', head: true })
          .eq('assigned_to', emp.id).in('status', ['in_progress', 'pending_clarification']),
        service.from('notifications').select('*', { count: 'exact', head: true })
          .eq('recipient_id', emp.id).eq('is_read', false),
      ]);

      roles = (roleRows || []).map((r: any) => r.role);
      employee = { ...emp, company, roles };
      inboxCount = ic ?? 0;
      notifCount = nc ?? 0;

      // Determine if the employee is head of an HR department
      if (emp.department_id) {
        const { data: dept } = await service
          .from('departments')
          .select('code, head_employee_id')
          .eq('id', emp.department_id)
          .single();
        isHRHead = dept?.head_employee_id === emp.id && (dept?.code || '').toUpperCase().includes('HR');
      }
    }
  } catch {
    // silently fall through — layout renders with null employee
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir="rtl">
      <Sidebar employee={employee} roles={roles} inboxCount={inboxCount} notifCount={notifCount} isHRHead={isHRHead} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar employee={employee} roles={roles} notifCount={notifCount} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
