import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let notifications: any[] = [];
  if (user) {
    const { data: emp } = await supabase.from('employees').select('id').eq('auth_user_id', user.id).single();
    if (emp) {
      const { data } = await supabase.from('notifications').select('*').eq('recipient_id', emp.id).order('created_at', { ascending: false }).limit(50);
      notifications = data || [];
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">الإشعارات</h1>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
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
