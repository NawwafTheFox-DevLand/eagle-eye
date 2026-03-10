'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createBrowserClient } from '@supabase/ssr';

export default function SettingsPage() {
  const { lang, toggle } = useLanguage();

  // Password change state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pwError, setPwError] = useState('');

  function getSupabase() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async function handleLogout() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');

    if (newPw.length < 8) {
      setPwError(lang === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setPwStatus('loading');
    const supabase = getSupabase();

    // Get current user email to re-authenticate
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      setPwError(lang === 'ar' ? 'تعذّر التحقق من الهوية' : 'Could not verify identity');
      setPwStatus('error');
      return;
    }

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPw,
    });
    if (signInError) {
      setPwError(lang === 'ar' ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
      setPwStatus('error');
      return;
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
    if (updateError) {
      setPwError(lang === 'ar' ? `فشل التحديث: ${updateError.message}` : `Update failed: ${updateError.message}`);
      setPwStatus('error');
      return;
    }

    setPwStatus('success');
    setCurrentPw('');
    setNewPw('');
    setConfirmPw('');
    setTimeout(() => setPwStatus('idle'), 4000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</h1>

      {/* Language + Sign Out */}
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

      {/* Password Change */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-semibold text-slate-900 mb-1">
          {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
        </h3>
        <p className="text-sm text-slate-500 mb-5">
          {lang === 'ar' ? 'أدخل كلمة مرورك الحالية ثم كلمة المرور الجديدة' : 'Enter your current password then choose a new one'}
        </p>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
            </label>
            <input
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              required
              className="input-field w-full"
              autoComplete="current-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              required
              minLength={8}
              className="input-field w-full"
              autoComplete="new-password"
            />
            <p className="text-xs text-slate-400 mt-1">
              {lang === 'ar' ? 'الحد الأدنى 8 أحرف' : 'Minimum 8 characters'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
            </label>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              required
              className="input-field w-full"
              autoComplete="new-password"
            />
          </div>

          {pwError && (
            <p className="text-sm text-red-600 bg-red-50 px-4 py-2.5 rounded-xl">{pwError}</p>
          )}

          {pwStatus === 'success' && (
            <p className="text-sm text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl">
              {lang === 'ar' ? '✓ تم تغيير كلمة المرور بنجاح' : '✓ Password changed successfully'}
            </p>
          )}

          <button
            type="submit"
            disabled={pwStatus === 'loading'}
            className="btn-primary text-sm disabled:opacity-60"
          >
            {pwStatus === 'loading'
              ? (lang === 'ar' ? 'جارٍ التحديث...' : 'Updating...')
              : (lang === 'ar' ? 'تحديث كلمة المرور' : 'Update Password')}
          </button>
        </form>
      </div>

      {/* System Info */}
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
