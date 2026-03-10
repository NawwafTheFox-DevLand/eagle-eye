'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDateTime, relativeTime } from '@/lib/utils';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { markAllNotificationsRead, markNotificationRead } from '@/app/actions/notifications';

const typeIcons: Record<string, string> = {
  action_required: '🔔',
  status_update:   '✅',
  sla_warning:     '⚠️',
  sla_breach:      '🚨',
  escalation:      '📣',
  delegation:      '🤝',
  system:          'ℹ️',
  gr_alert:        '📦',
};

const typeLabels: Record<string, { ar: string; en: string }> = {
  action_required: { ar: 'إجراء مطلوب', en: 'Action Required' },
  status_update:   { ar: 'تحديث الحالة',  en: 'Status Update' },
  sla_warning:     { ar: 'تحذير SLA',     en: 'SLA Warning' },
  sla_breach:      { ar: 'انتهاك SLA',    en: 'SLA Breach' },
  escalation:      { ar: 'تصعيد',         en: 'Escalation' },
  delegation:      { ar: 'تفويض',         en: 'Delegation' },
  system:          { ar: 'إشعار النظام',  en: 'System' },
  gr_alert:        { ar: 'تنبيه GR',      en: 'GR Alert' },
};

export default function NotificationsClient({
  notifications: initial,
  employeeId,
}: {
  notifications: any[];
  employeeId: string;
}) {
  const { lang } = useLanguage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isAr = lang === 'ar';

  const [notifications, setNotifications] = useState(initial);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const displayed = tab === 'unread' ? notifications.filter(n => !n.is_read) : notifications;

  // Realtime — prepend new notifications
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`notif-page-${employeeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${employeeId}` },
        (payload) => {
          setNotifications(prev => [payload.new as any, ...prev]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [employeeId]);

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      router.refresh();
    });
  }

  async function handleMarkOne(id: string) {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'الإشعارات' : 'Notifications'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAr
              ? `${notifications.length} إشعار${unreadCount > 0 ? ` — ${unreadCount} غير مقروء` : ''}`
              : `${notifications.length} notification${notifications.length !== 1 ? 's' : ''}${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`
            }
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-sm font-medium text-eagle-700 bg-eagle-50 hover:bg-eagle-100 border border-eagle-200 disabled:opacity-50 transition-colors"
          >
            {isPending ? '...' : (isAr ? 'قراءة جميع الإشعارات' : 'Mark all as read')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'all' ? 'border-eagle-500 text-eagle-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          {isAr ? 'الكل' : 'All'}
          <span className="ms-2 text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{notifications.length}</span>
        </button>
        <button
          onClick={() => setTab('unread')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'unread' ? 'border-red-500 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          {isAr ? 'غير مقروء' : 'Unread'}
          {unreadCount > 0 && (
            <span className="ms-2 text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-bold">{unreadCount}</span>
          )}
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {displayed.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl mb-4 block">🔔</span>
            <p className="font-medium">{isAr ? 'لا توجد إشعارات' : 'No notifications'}</p>
            <p className="text-sm mt-1">{isAr ? 'ستظهر هنا إشعارات الطلبات والموافقات' : 'Request and approval notifications will appear here'}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {displayed.map((n: any) => {
              const title    = isAr ? (n.title_ar || n.title_en) : (n.title_en || n.title_ar);
              const body     = isAr ? (n.body_ar  || n.body_en)  : (n.body_en  || n.body_ar);
              const icon     = typeIcons[n.type] || '🔔';
              const typeText = typeLabels[n.type]?.[lang] || n.type;

              const inner = (
                <div
                  className={`flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/30' : ''}`}
                  onClick={() => { if (!n.is_read) handleMarkOne(n.id); }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-base ${!n.is_read ? 'bg-eagle-100' : 'bg-slate-100'}`}>
                    {icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${!n.is_read ? 'bg-eagle-100 text-eagle-700' : 'bg-slate-100 text-slate-500'}`}>
                        {typeText}
                      </span>
                      <span className="text-[10px] text-slate-400">{relativeTime(n.created_at, lang)}</span>
                    </div>
                    <p className={`text-sm ${!n.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{title}</p>
                    {body && <p className="text-sm text-slate-500 mt-0.5">{body}</p>}
                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.created_at, lang)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-eagle-500 animate-pulse" />
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); handleMarkOne(n.id); }}
                        className="text-[10px] text-slate-400 hover:text-slate-600 whitespace-nowrap"
                      >
                        {isAr ? 'قراءة' : 'Read'}
                      </button>
                    </div>
                  )}
                </div>
              );

              return n.action_url ? (
                <Link key={n.id} href={n.action_url} onClick={() => { if (!n.is_read) handleMarkOne(n.id); }}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
