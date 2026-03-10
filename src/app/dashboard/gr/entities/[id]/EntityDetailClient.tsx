'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { formatDate, formatCurrency } from '@/lib/utils';
import { generateLicenseToken } from '@/app/actions/gr';

type Tab = 'overview' | 'licenses' | 'tasks' | 'scales' | 'trademarks';

const groupNames: Record<number, { ar: string; en: string }> = {
  1: { ar: 'منصور للاستثمار القابضة', en: 'Mansour Investment Holding' },
  2: { ar: 'المؤشر اليوم القابضة', en: 'Al-Muasher Al-Yawm' },
  3: { ar: 'منصور للتجارة', en: 'Mansour Trading' },
  4: { ar: 'الشيخ منصور', en: 'Sheikh Mansour' },
};

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending_manager: 'bg-amber-100 text-amber-700',
  pending_finance: 'bg-blue-100 text-blue-700',
  pending_banking: 'bg-violet-100 text-violet-700',
  in_progress: 'bg-cyan-100 text-cyan-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function licenseStatusBadge(expiry: string | null): { label: { ar: string; en: string }; color: string } {
  if (!expiry) return { label: { ar: 'غير محدد', en: 'Unknown' }, color: 'bg-slate-100 text-slate-500' };
  const days = daysUntil(expiry);
  if (days < 0) return { label: { ar: 'منتهي', en: 'Expired' }, color: 'bg-red-100 text-red-700' };
  if (days <= 30) return { label: { ar: `${days} يوم`, en: `${days}d left` }, color: 'bg-amber-100 text-amber-700' };
  if (days <= 90) return { label: { ar: `${days} يوم`, en: `${days}d left` }, color: 'bg-yellow-100 text-yellow-700' };
  return { label: { ar: 'ساري', en: 'Active' }, color: 'bg-emerald-100 text-emerald-700' };
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value || '—'}</p>
    </div>
  );
}

interface Props {
  entity: any;
  licenses: any[];
  tasks: any[];
  scales: any[];
  trademarks: any[];
}

export default function EntityDetailClient({ entity, licenses, tasks, scales, trademarks }: Props) {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function copyRenewalLink(licenseId: string) {
    startTransition(async () => {
      const token = await generateLicenseToken(licenseId, entity.id);
      const url = `${window.location.origin}/gr-request?token=${token}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(licenseId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const tabs: { key: Tab; ar: string; en: string }[] = [
    { key: 'overview', ar: 'نظرة عامة', en: 'Overview' },
    { key: 'licenses', ar: 'التراخيص', en: 'Licenses' },
    { key: 'tasks', ar: 'المهام', en: 'Tasks' },
    { key: 'scales', ar: 'الموازين', en: 'Scales' },
    { key: 'trademarks', ar: 'العلامات التجارية', en: 'Trademarks' },
  ];

  const addr = entity.national_address || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/gr/entities" className="text-sm text-slate-500 hover:text-slate-700">
          {lang === 'ar' ? '← الكيانات' : '← Entities'}
        </Link>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? entity.name_ar : entity.name_en || entity.name_ar}</h1>
            {entity.name_en && entity.name_ar && lang === 'ar' && (
              <p className="text-sm text-slate-500 mt-0.5" dir="ltr">{entity.name_en}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{entity.entity_type}</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{groupNames[entity.group_number]?.[lang] || `Group ${entity.group_number}`}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${entity.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {entity.is_active ? (lang === 'ar' ? 'نشط' : 'Active') : (lang === 'ar' ? 'غير نشط' : 'Inactive')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-100">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {lang === 'ar' ? t.ar : t.en}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Section 1: Core info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'المعلومات الأساسية' : 'Core Information'}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label={lang === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'} value={entity.name_ar} />
              <Field label={lang === 'ar' ? 'الاسم بالإنجليزي' : 'English Name'} value={entity.name_en} />
              <Field label={lang === 'ar' ? 'المجموعة' : 'Group'} value={groupNames[entity.group_number]?.[lang]} />
              <Field label={lang === 'ar' ? 'نوع الكيان' : 'Entity Type'} value={entity.entity_type} />
              <Field label={lang === 'ar' ? 'الهيكل القانوني' : 'Legal Structure'} value={entity.legal_structure} />
            </div>
          </div>

          {/* Section 2: Registrations */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'السجلات والتراخيص' : 'Registrations & Licenses'}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label={lang === 'ar' ? 'رقم السجل التجاري' : 'CR Number'} value={entity.cr_number} />
              <Field label={lang === 'ar' ? 'انتهاء السجل التجاري' : 'CR Expiry'} value={entity.cr_expiry} />
              <Field label={lang === 'ar' ? 'رقم الرخصة البلدية' : 'Municipal License No.'} value={entity.municipal_license_number} />
              <Field label={lang === 'ar' ? 'انتهاء الرخصة البلدية' : 'Municipal License Expiry'} value={entity.municipal_license_expiry} />
              <Field label={lang === 'ar' ? 'رقم رخصة السلامة' : 'Safety Permit No.'} value={entity.safety_permit_number} />
              <Field label={lang === 'ar' ? 'انتهاء رخصة السلامة' : 'Safety Permit Expiry'} value={entity.safety_permit_expiry} />
              <Field label={lang === 'ar' ? 'رقم الرخصة الصناعية' : 'Industrial License No.'} value={entity.industrial_license_number} />
              <Field label={lang === 'ar' ? 'رقم رخصة التشغيل' : 'Operation License No.'} value={entity.operation_license_number} />
              <Field label={lang === 'ar' ? 'رقم التصريح البيئي' : 'Environmental Permit No.'} value={entity.environmental_permit_number} />
              <Field label={lang === 'ar' ? 'رقم الزكاة' : 'Zakat Number'} value={entity.zakat_number} />
              <Field label={lang === 'ar' ? 'الرقم الضريبي' : 'Tax Number'} value={entity.tax_number} />
            </div>
          </div>

          {/* Section 3: Financial */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'المعلومات المالية' : 'Financial Information'}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label={lang === 'ar' ? 'رقم الآيبان' : 'IBAN'} value={entity.iban} />
              <Field label={lang === 'ar' ? 'رقم الحساب البنكي' : 'Bank Account'} value={entity.bank_account} />
              <Field label={lang === 'ar' ? 'رقم اشتراك التأمين' : 'Insurance Subscription No.'} value={entity.insurance_subscription_no} />
            </div>
          </div>

          {/* Section 4: Government files */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'الملفات الحكومية' : 'Government Files'}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label={lang === 'ar' ? 'رقم ملف مكتب العمل' : 'Labor Office File No.'} value={entity.labor_office_file_no} />
              <Field label={lang === 'ar' ? 'رقم اشتراك شموس' : 'Shomos Subscription No.'} value={entity.shomos_subscription_no} />
              <Field label={lang === 'ar' ? 'انتهاء شموس' : 'Shomos Expiry'} value={entity.shomos_expiry} />
              <Field label={lang === 'ar' ? 'رقم عضوية الغرفة التجارية' : 'Chamber Membership No.'} value={entity.chamber_membership_no} />
              <Field label={lang === 'ar' ? 'رقم اشتراك سبيل' : 'Sabil Subscription No.'} value={entity.sabil_subscription_no} />
              <Field label={lang === 'ar' ? 'انتهاء سبيل' : 'Sabil Expiry'} value={entity.sabil_expiry} />
            </div>
          </div>

          {/* Section 5: National Address */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">{lang === 'ar' ? 'العنوان الوطني' : 'National Address'}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label={lang === 'ar' ? 'المدينة' : 'City'} value={addr.city} />
              <Field label={lang === 'ar' ? 'الحي' : 'District'} value={addr.district} />
              <Field label={lang === 'ar' ? 'رقم المبنى' : 'Building No.'} value={addr.building_no} />
              <Field label={lang === 'ar' ? 'الرمز البريدي' : 'Postal Code'} value={addr.postal_code} />
            </div>
          </div>
        </div>
      )}

      {/* Licenses Tab */}
      {tab === 'licenses' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {licenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <span className="text-4xl block mb-3">📜</span>
              <p className="font-medium">{lang === 'ar' ? 'لا توجد تراخيص' : 'No licenses'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الرقم' : 'Number'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الأيام المتبقية' : 'Days Left'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'رابط التجديد' : 'Renewal Link'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {licenses.map((l: any) => {
                    const badge = licenseStatusBadge(l.expiry_date);
                    const days = l.expiry_date ? daysUntil(l.expiry_date) : null;
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{l.license_type}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{l.license_number || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{l.expiry_date || '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{days !== null ? days : '—'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>{badge.label[lang]}</span></td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => copyRenewalLink(l.id)}
                            disabled={isPending}
                            className="text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors disabled:opacity-50"
                          >
                            {copiedId === l.id ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? '🔗 نسخ الرابط' : '🔗 Copy Link')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tasks Tab */}
      {tab === 'tasks' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {tasks.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <span className="text-4xl block mb-3">📋</span>
              <p className="font-medium">{lang === 'ar' ? 'لا توجد مهام' : 'No tasks'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'رقم المهمة' : 'Task No.'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'العنوان' : 'Title'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tasks.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.task_number}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{t.task_type}</td>
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/gr/tasks/${t.id}`} className="font-medium text-slate-900 hover:text-blue-700 hover:underline">{t.title}</Link>
                      </td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[t.status] || 'bg-slate-100 text-slate-600'}`}>{t.status}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{t.due_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Scales Tab */}
      {tab === 'scales' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {scales.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <span className="text-4xl block mb-3">⚖️</span>
              <p className="font-medium">{lang === 'ar' ? 'لا توجد موازين مسجلة' : 'No scales registered'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الرقم التسلسلي' : 'Serial No.'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'رقم ملصق التحقق' : 'Verification Sticker No.'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'انتهاء الملصق' : 'Sticker Expiry'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {scales.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.serial_number || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.verification_sticker_no || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{s.sticker_expiry || '—'}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{s.status || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Trademarks Tab */}
      {tab === 'trademarks' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {trademarks.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <span className="text-4xl block mb-3">™️</span>
              <p className="font-medium">{lang === 'ar' ? 'لا توجد علامات تجارية مسجلة' : 'No trademarks registered'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'اسم العلامة' : 'Trademark Name'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'رقم العلامة' : 'Trademark No.'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'الفئة' : 'Category'}</th>
                    <th className="px-4 py-3 text-start font-medium text-slate-600">{lang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {trademarks.map((tm: any) => (
                    <tr key={tm.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{tm.trademark_name || '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{tm.trademark_number || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{tm.category || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{tm.expiry_date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
