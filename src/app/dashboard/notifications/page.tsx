import { createClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import { redirect } from 'next/navigation';
import { formatDateTime } from '@/lib/utils';

export default async function NotificationsPage() {
  const employee = await getSessionEmployee();
  if (!employee) redirect('/login');

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', employee.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">الإشعارات</h1>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {!notifications || notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl mb-4 block">🔔</span>
            <p className="font-medium">لا توجد إشعارات</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((n: any) => (
              <div key={n.id} className={`px-6 py-4 ${n.is_read ? '' : 'bg-blue-50/30'}`}>
                <p className="text-sm font-medium text-slate-900">{n.title_ar || n.title_en}</p>
                <p className="text-xs text-slate-500 mt-1">{n.body_ar || n.body_en}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
