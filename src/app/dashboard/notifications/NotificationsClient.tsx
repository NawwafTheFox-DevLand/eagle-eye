'use client';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';

interface Notif {
  id: string;
  type: string;
  title_ar: string | null;
  title_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
}

export default function NotificationsClient({ notifications }: { notifications: Notif[] }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';

  function timeAgo(dateStr: string) {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return isAr ? 'الآن' : 'Just now';
    if (diff < 3600) return isAr ? `منذ ${Math.floor(diff / 60)} دقيقة` : `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return isAr ? `منذ ${Math.floor(diff / 3600)} ساعة` : `${Math.floor(diff / 3600)}h ago`;
    return isAr ? `منذ ${Math.floor(diff / 86400)} يوم` : `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'الإشعارات' : 'Notifications'}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {notifications.length === 0
            ? (isAr ? 'لا توجد إشعارات' : 'No notifications')
            : isAr ? `${notifications.length} إشعار` : `${notifications.length} notifications`}
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-4">🔔</p>
          <p className="text-slate-500">{isAr ? 'لا توجد إشعارات' : 'No notifications yet'}</p>
        </div>
      ) : (
        <div className="card divide-y divide-slate-50">
          {notifications.map(n => {
            const title = isAr ? (n.title_ar || n.title_en) : (n.title_en || n.title_ar);
            const body  = isAr ? (n.body_ar || n.body_en) : (n.body_en || n.body_ar);
            const inner = (
              <div className={`flex gap-4 px-5 py-4 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!n.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium text-slate-900 ${!n.is_read ? 'font-semibold' : ''}`}>{title}</p>
                  {body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{body}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            );
            return n.action_url
              ? <Link key={n.id} href={n.action_url}>{inner}</Link>
              : <div key={n.id}>{inner}</div>;
          })}
        </div>
      )}
    </div>
  );
}
