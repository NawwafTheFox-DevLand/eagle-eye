'use client';

import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createBrowserClient } from '@supabase/ssr';

export default function SettingsPage() {
  const { lang, toggle } = useLanguage();

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</h1>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-slate-900">{lang === 'ar' ? 'اللغة' : 'Language'}</h3>
            <p className="text-sm text-slate-500">{lang === 'ar' ? 'تغيير لغة الواجهة' : 'Change interface language'}</p>
          </div>
          <button onClick={toggle}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors">
            {lang === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        <hr className="border-slate-100" />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-slate-900">{lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</h3>
            <p className="text-sm text-slate-500">{lang === 'ar' ? 'الخروج من حسابك' : 'Sign out of your account'}</p>
          </div>
          <button onClick={handleLogout}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
            {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-medium text-slate-900 mb-2">{lang === 'ar' ? 'معلومات النظام' : 'System Info'}</h3>
        <div className="text-sm text-slate-500 space-y-1">
          <p>Eagle Eye عين النسر — v1.0</p>
          <p>© 2026 Mansour Holding — منصور القابضة</p>
        </div>
      </div>
    </div>
  );
}
