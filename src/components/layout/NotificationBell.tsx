'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { getRecentNotifications, markAllNotificationsRead, markNotificationRead } from '@/app/actions/notifications';
import { relativeTime } from '@/lib/utils';

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

interface Props {
  employeeId: string;
  initialUnread: number;
}

export default function NotificationBell({ employeeId, initialUnread }: Props) {
  const { lang } = useLanguage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isAr = lang === 'ar';

  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync unread count when layout re-runs (new navigation)
  useEffect(() => {
    setUnreadCount(initialUnread);
  }, [initialUnread]);

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  // Load notifications when dropdown first opens
  useEffect(() => {
    if (isOpen && !loaded) {
      startTransition(async () => {
        const data = await getRecentNotifications();
        setNotifications(data);
        setLoaded(true);
      });
    }
  }, [isOpen, loaded]);

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`notif-${employeeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${employeeId}` },
        (payload) => {
          setUnreadCount(c => c + 1);
          setNotifications(prev => [payload.new as any, ...prev].slice(0, 8));
          setLoaded(true); // so the list shows the new one even if never opened
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [employeeId]);

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      router.refresh();
    });
  }

  async function handleMarkOne(notifId: string) {
    await markNotificationRead(notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`relative p-2 rounded-xl transition-colors ${isOpen ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
        aria-label={isAr ? 'الإشعارات' : 'Notifications'}
      >
        <span className="text-lg">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute end-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              {isAr ? 'الإشعارات' : 'Notifications'}
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">{unreadCount}</span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="text-xs text-eagle-600 hover:underline disabled:opacity-50 font-medium"
              >
                {isAr ? 'قراءة الكل' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-50">
            {!loaded ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <span className="animate-pulse">{isAr ? 'جاري التحميل...' : 'Loading...'}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <span className="text-3xl mb-3 block">🔔</span>
                <p className="text-sm font-medium">{isAr ? 'لا توجد إشعارات' : 'No notifications'}</p>
                <p className="text-xs mt-1">{isAr ? 'ستظهر هنا إشعاراتك' : 'Your notifications will appear here'}</p>
              </div>
            ) : (
              notifications.map((n: any) => {
                const title = isAr ? (n.title_ar || n.title_en) : (n.title_en || n.title_ar);
                const body  = isAr ? (n.body_ar  || n.body_en)  : (n.body_en  || n.body_ar);
                const icon  = typeIcons[n.type] || '🔔';

                const inner = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                    onClick={() => { if (!n.is_read) handleMarkOne(n.id); }}
                  >
                    <span className="text-base mt-0.5 shrink-0">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs leading-snug ${!n.is_read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>{title}</p>
                      {body && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{body}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">{relativeTime(n.created_at, lang)}</p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-eagle-500 mt-1.5 shrink-0 animate-pulse" />}
                  </div>
                );

                return n.action_url ? (
                  <Link
                    key={n.id}
                    href={n.action_url}
                    onClick={() => { if (!n.is_read) handleMarkOne(n.id); setIsOpen(false); }}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs text-eagle-600 font-semibold hover:underline"
            >
              {isAr ? 'عرض جميع الإشعارات ←' : 'View all notifications →'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
