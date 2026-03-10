import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  
  // Get current user from cookies (middleware already ensures they're logged in)
  const { data: { user } } = await supabase.auth.getUser();

  // Load employee data — if no user or no employee, show minimal layout
  let employee = null;
  let unreadCount = 0;
  let pendingCount = 0;

  if (user) {
    const { data } = await supabase
      .from('employees')
      .select('*, company:companies(*), department:departments(*), position:positions(*), roles:user_roles(*)')
      .eq('auth_user_id', user.id)
      .single();
    employee = data;

    if (employee) {
      const { count: uc } = await supabase
        .from('notifications').select('*', { count: 'exact', head: true })
        .eq('recipient_id', employee.id).eq('is_read', false);
      unreadCount = uc ?? 0;

      const { count: pc } = await supabase
        .from('approval_steps').select('*', { count: 'exact', head: true })
        .eq('approver_id', employee.id).eq('status', 'pending');
      pendingCount = pc ?? 0;
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir="rtl">
      <Sidebar employee={employee} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar employee={employee} unreadCount={unreadCount} pendingCount={pendingCount} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
