import { redirect } from 'next/navigation';
import { getLocalSession } from '@/lib/supabase/session';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getLocalSession();
  if (!user) redirect('/login');

  const { data: employee } = await supabase
    .from('employees')
    .select('*, company:companies(*), department:departments(*), position:positions(*), roles:user_roles(*)')
    .eq('auth_user_id', user.id)
    .single();

  const { count: unreadCount } = await supabase
    .from('notifications').select('*', { count: 'exact', head: true })
    .eq('recipient_id', employee?.id).eq('is_read', false);

  const { count: pendingCount } = await supabase
    .from('approval_steps').select('*', { count: 'exact', head: true })
    .eq('approver_id', employee?.id).eq('status', 'pending');

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir="rtl">
      <Sidebar employee={employee} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar employee={employee} unreadCount={unreadCount ?? 0} pendingCount={pendingCount ?? 0} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-[1600px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
