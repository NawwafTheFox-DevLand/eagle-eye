'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { toggleCustomRequestType } from '@/app/actions/custom-requests';

interface CustomType {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  flow_mode: 'free' | 'fixed';
  allowed_creators: 'own_dept' | 'own_company' | 'all';
  is_active: boolean;
  requires_ceo: boolean;
  requires_hr: boolean;
  requires_finance: boolean;
  step_count: number;
  creator: { full_name_ar: string; full_name_en: string } | null;
  must_end_dept: { name_ar: string; name_en: string } | null;
  created_at: string;
}

const CREATOR_LABELS = {
  own_dept:    { ar: 'قسمي فقط',    en: 'Own dept only' },
  own_company: { ar: 'شركتي',        en: 'My company'    },
  all:         { ar: 'الجميع',       en: 'All'           },
};

export default function CustomRequestsClient({ types }: { types: CustomType[] }) {
  const { lang } = useLanguage();
  const isAr = lang === 'ar';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleToggle(id: string, currentActive: boolean) {
    setTogglingId(id);
    setError('');
    const result = await toggleCustomRequestType(id, !currentActive);
    setTogglingId(null);
    if (result.error) {
      setError(result.error);
    } else {
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isAr ? 'أنواع الطلبات المخصصة' : 'Custom Request Types'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAr
              ? `${types.length} نوع مخصص`
              : `${types.length} custom type${types.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/dashboard/admin/custom-requests/new"
          className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-xl"
        >
          {isAr ? '+ نوع جديد' : '+ New Type'}
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {types.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-slate-500">
            {isAr ? 'لا توجد أنواع مخصصة بعد' : 'No custom types yet'}
          </p>
          <Link
            href="/dashboard/admin/custom-requests/new"
            className="mt-4 inline-block btn-primary px-5 py-2 text-sm rounded-xl"
          >
            {isAr ? 'إنشاء أول نوع' : 'Create first type'}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {types.map(t => {
            const name = isAr ? t.name_ar : t.name_en;
            const desc = isAr ? t.description_ar : t.description_en;
            const creatorLabel = CREATOR_LABELS[t.allowed_creators];
            const mustEnd = t.must_end_dept
              ? (isAr ? t.must_end_dept.name_ar : t.must_end_dept.name_en)
              : null;
            const creatorName = t.creator
              ? (isAr ? t.creator.full_name_ar : t.creator.full_name_en)
              : null;

            return (
              <div
                key={t.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm flex flex-col gap-3 transition-opacity ${
                  t.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-3xl shrink-0">{t.icon || '📝'}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 text-sm leading-snug truncate">{name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{t.code}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {t.is_active ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Inactive')}
                  </span>
                </div>

                {/* Description */}
                {desc && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{desc}</p>
                )}

                {/* Meta badges */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    t.flow_mode === 'fixed'
                      ? 'bg-violet-100 text-violet-700'
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    {t.flow_mode === 'fixed'
                      ? (isAr ? `ثابت (${t.step_count} خطوات)` : `Fixed (${t.step_count} steps)`)
                      : (isAr ? 'حر' : 'Free flow')}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                    {isAr ? creatorLabel.ar : creatorLabel.en}
                  </span>
                  {t.requires_ceo && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">CEO</span>
                  )}
                  {t.requires_hr && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">HR</span>
                  )}
                  {t.requires_finance && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">
                      {isAr ? 'مالية' : 'Finance'}
                    </span>
                  )}
                  {mustEnd && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-600">
                      {isAr ? `ينتهي في: ${mustEnd}` : `Ends at: ${mustEnd}`}
                    </span>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-auto">
                  <p className="text-[11px] text-slate-400">
                    {creatorName && (isAr ? `أنشأه: ${creatorName}` : `By: ${creatorName}`)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/admin/custom-requests/${t.id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50"
                    >
                      {isAr ? 'تعديل' : 'Edit'}
                    </Link>
                    <button
                      onClick={() => handleToggle(t.id, t.is_active)}
                      disabled={togglingId === t.id || isPending}
                      className={`text-xs font-medium transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50 ${
                        t.is_active
                          ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-800'
                          : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800'
                      }`}
                    >
                      {togglingId === t.id
                        ? '...'
                        : t.is_active
                          ? (isAr ? 'تعطيل' : 'Deactivate')
                          : (isAr ? 'تفعيل' : 'Activate')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
