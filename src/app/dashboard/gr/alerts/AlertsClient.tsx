'use client';
import { useState, useTransition } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDate, formatDateTime } from '@/lib/utils';
import { acknowledgeGRAlert, createRenewalTaskFromAlert } from '@/app/actions/gr';

type FilterTab = 'all' | 'unacknowledged' | 'license_expiry' | 'deadline';

const alertTypeIcons: Record<string, string> = {
  expiry_90: '📅',
  expiry_60: '⏰',
  expiry_30: '⚡',
  expiry_7: '🚨',
  expired: '💀',
  deadline: '⏳',
};

const alertTypeColors: Record<string, string> = {
  expiry_90: 'bg-slate-100 text-slate-600',
  expiry_60: 'bg-blue-100 text-blue-700',
  expiry_30: 'bg-amber-100 text-amber-700',
  expiry_7: 'bg-red-100 text-red-700',
  expired: 'bg-red-200 text-red-900',
  deadline: 'bg-violet-100 text-violet-700',
};

const alertTypeLabels: Record<string, { ar: string; en: string }> = {
  expiry_90: { ar: 'انتهاء خلال 90 يوم', en: 'Expiry in 90d' },
  expiry_60: { ar: 'انتهاء خلال 60 يوم', en: 'Expiry in 60d' },
  expiry_30: { ar: 'انتهاء خلال 30 يوم', en: 'Expiry in 30d' },
  expiry_7: { ar: 'انتهاء خلال 7 أيام', en: 'Expiry in 7d' },
  expired: { ar: 'منتهي الصلاحية', en: 'Expired' },
  deadline: { ar: 'موعد نهائي', en: 'Deadline' },
};

const expiryAlertTypes = new Set(['expiry_90', 'expiry_60', 'expiry_30', 'expiry_7', 'expired']);
const renewalEligibleTypes = new Set(['expiry_30', 'expiry_7', 'expired']);

interface Props {
  alerts: any[];
  entities: any[];
  licenses: any[];
}

function AlertCard({ alert, lang, entityMap, licenseMap, onReload }: {
  alert: any;
  lang: 'ar' | 'en';
  entityMap: Map<string, any>;
  licenseMap: Map<string, any>;
  onReload: () => void;
}) {
  const [isAckPending, startAckTransition] = useTransition();
  const [isRenewPending, startRenewTransition] = useTransition();
  const [ackError, setAckError] = useState('');
  const [renewError, setRenewError] = useState('');

  const entity = alert.entity_id ? entityMap.get(alert.entity_id) : null;
  const license = alert.license_id ? licenseMap.get(alert.license_id) : null;
  const icon = alertTypeIcons[alert.alert_type] || '🔔';
  const colorClass = alertTypeColors[alert.alert_type] || 'bg-slate-100 text-slate-600';
  const typeLabel = alertTypeLabels[alert.alert_type]?.[lang] || alert.alert_type;
  const message = lang === 'ar' ? alert.message_ar : alert.message_en;
  const canCreateRenewal = renewalEligibleTypes.has(alert.alert_type) && !alert.task_id && alert.entity_id && alert.license_id;

  function handleAcknowledge() {
    setAckError('');
    startAckTransition(async () => {
      try {
        await acknowledgeGRAlert(alert.id);
        onReload();
      } catch (e: any) {
        setAckError(e.message);
      }
    });
  }

  function handleCreateRenewal() {
    setRenewError('');
    startRenewTransition(async () => {
      try {
        await createRenewalTaskFromAlert(alert.id, alert.entity_id, alert.license_id);
        onReload();
      } catch (e: any) {
        setRenewError(e.message);
      }
    });
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 ${alert.is_acknowledged ? 'border-slate-100 opacity-70' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>{typeLabel}</span>
            {alert.is_acknowledged && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                ✓ {lang === 'ar' ? 'تمت الإشارة' : 'Acknowledged'}
              </span>
            )}
          </div>
          {message && <p className="text-sm text-slate-800 mb-1">{message}</p>}
          <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500">
            {entity && <span>🏢 {lang === 'ar' ? entity.name_ar : entity.name_en || entity.name_ar}</span>}
            {license && <span>📜 {license.license_number || license.license_type}</span>}
            {alert.alert_date && <span>{formatDate(alert.alert_date, lang)}</span>}
          </div>
          {alert.is_acknowledged && alert.acknowledged_at && (
            <p className="text-xs text-emerald-600 mt-1">
              {lang === 'ar' ? 'تمت الإشارة في:' : 'Acknowledged:'} {formatDateTime(alert.acknowledged_at, lang)}
            </p>
          )}

          {/* Actions */}
          {!alert.is_acknowledged && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {ackError && <p className="text-xs text-red-600 w-full">{ackError}</p>}
              {renewError && <p className="text-xs text-red-600 w-full">{renewError}</p>}
              <button
                onClick={handleAcknowledge}
                disabled={isAckPending}
                className="text-xs px-3 py-1.5 rounded-lg font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                {isAckPending ? (lang === 'ar' ? 'جاري...' : '...') : (lang === 'ar' ? '✓ إشارة كمعالج' : '✓ Acknowledge')}
              </button>
              {canCreateRenewal && (
                <button
                  onClick={handleCreateRenewal}
                  disabled={isRenewPending}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  {isRenewPending ? (lang === 'ar' ? 'جاري...' : '...') : (lang === 'ar' ? '🔄 إنشاء مهمة تجديد' : '🔄 Create Renewal Task')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertsClient({ alerts: initialAlerts, entities, licenses }: Props) {
  const { lang } = useLanguage();
  const [alerts, setAlerts] = useState(initialAlerts);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const entityMap = new Map(entities.map((e: any) => [e.id, e]));
  const licenseMap = new Map(licenses.map((l: any) => [l.id, l]));

  function handleReload() {
    window.location.reload();
  }

  const tabs: { key: FilterTab; ar: string; en: string }[] = [
    { key: 'all', ar: 'الكل', en: 'All' },
    { key: 'unacknowledged', ar: 'غير معالجة', en: 'Unacknowledged' },
    { key: 'license_expiry', ar: 'انتهاء تراخيص', en: 'License Expiry' },
    { key: 'deadline', ar: 'المواعيد النهائية', en: 'Deadline' },
  ];

  const filtered = alerts.filter((a: any) => {
    if (activeTab === 'unacknowledged') return !a.is_acknowledged;
    if (activeTab === 'license_expiry') return expiryAlertTypes.has(a.alert_type);
    if (activeTab === 'deadline') return a.alert_type === 'deadline';
    return true;
  });

  const unackCount = alerts.filter((a: any) => !a.is_acknowledged).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'التنبيهات' : 'Alerts'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {filtered.length} {lang === 'ar' ? 'تنبيه' : 'alerts'}
            {unackCount > 0 && <span className="ms-2 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{unackCount} {lang === 'ar' ? 'غير معالج' : 'unacknowledged'}</span>}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-slate-100">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {lang === 'ar' ? t.ar : t.en}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <span className="text-4xl block mb-3">🔔</span>
          <p className="font-medium">{lang === 'ar' ? 'لا توجد تنبيهات' : 'No alerts'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert: any) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              lang={lang}
              entityMap={entityMap}
              licenseMap={licenseMap}
              onReload={handleReload}
            />
          ))}
        </div>
      )}
    </div>
  );
}
