'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDateTime } from '@/lib/utils';

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

export default function NotificationsClient({ notifications }: { notifications: any[] }) {
  const { lang } = useLanguage();

  const t = {
    ar: { title: 'الإشعارات', empty: 'لا توجد إشعارات', emptyHint: 'ستظهر هنا إشعارات الطلبات والموافقات' },
    en: { title: 'Notifications', empty: 'No notifications', emptyHint: 'Request and approval notifications will appear here' },
  }[lang];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          {notifications.length > 0 && (
            <p className="text-sm text-slate-500 mt-1">{notifications.length}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <span className="text-4xl mb-4 block">🔔</span>
            <p className="font-medium">{t.empty}</p>
            <p className="text-sm mt-1">{t.emptyHint}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notifications.map((n: any) => {
              const title = lang === 'ar' ? (n.title_ar || n.title_en) : (n.title_en || n.title_ar);
              const body  = lang === 'ar' ? (n.body_ar  || n.body_en)  : (n.body_en  || n.body_ar);
              const icon  = typeIcons[n.type] || '🔔';
              const Inner = (
                <div className={`flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/40' : ''}`}>
                  <span className="text-xl mt-0.5 shrink-0">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    {body && <p className="text-sm text-slate-600 mt-0.5">{body}</p>}
                    <p className="text-xs text-slate-400 mt-1">{formatDateTime(n.created_at, lang)}</p>
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-eagle-500 mt-2 shrink-0" />}
                </div>
              );
              return n.action_url ? (
                <Link key={n.id} href={n.action_url}>{Inner}</Link>
              ) : (
                <div key={n.id}>{Inner}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
