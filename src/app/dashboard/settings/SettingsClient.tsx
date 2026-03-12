'use client';
import { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { createClient } from '@/lib/supabase/client';

export default function SettingsClient({ userEmail }: { userEmail: string }) {
  const { lang, toggle } = useLanguage();
  const isAr = lang === 'ar';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 8) {
      setPwError(isAr ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(isAr ? 'كلمة المرور الجديدة لا تتطابق' : 'Passwords do not match');
      return;
    }

    setPwLoading(true);
    try {
      const supabase = createClient();
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: userEmail, password: currentPassword });
      if (signInError) {
        setPwError(isAr ? 'كلمة المرور الحالية غير صحيحة' : 'Current password is incorrect');
        return;
      }
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setPwError(isAr ? 'فشل تغيير كلمة المرور: ' + updateError.message : 'Failed to update password: ' + updateError.message);
        return;
      }
      setPwSuccess(isAr ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'الإعدادات' : 'Settings'}</h1>
        <p className="text-slate-500 text-sm mt-1">{isAr ? 'تفضيلات الحساب' : 'Account preferences'}</p>
      </div>

      {/* Language */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-slate-900">{isAr ? 'اللغة' : 'Language'}</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => lang !== 'ar' && toggle()}
            className={`flex-1 py-3 rounded-xl border-2 font-medium transition-colors text-sm ${lang === 'ar' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
          >
            العربية
          </button>
          <button
            onClick={() => lang !== 'en' && toggle()}
            className={`flex-1 py-3 rounded-xl border-2 font-medium transition-colors text-sm ${lang === 'en' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
          >
            English
          </button>
        </div>
        <p className="text-xs text-slate-400">
          {isAr ? 'اللغة الحالية: عربي (RTL)' : 'Current: English (LTR)'}
        </p>
      </div>

      {/* Password change */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-slate-900">{isAr ? 'تغيير كلمة المرور' : 'Change Password'}</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {isAr ? 'كلمة المرور الحالية' : 'Current Password'}
            </label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
              className="input-field" dir="ltr" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {isAr ? 'كلمة المرور الجديدة' : 'New Password'}
            </label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="input-field" dir="ltr" required minLength={8} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {isAr ? 'تأكيد كلمة المرور الجديدة' : 'Confirm New Password'}
            </label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              className="input-field" dir="ltr" required />
          </div>
          {pwError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{pwError}</p>}
          {pwSuccess && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">{pwSuccess}</p>}
          <button type="submit" disabled={pwLoading} className="btn-primary">
            {pwLoading ? (isAr ? 'جارٍ الحفظ...' : 'Saving...') : (isAr ? 'حفظ كلمة المرور' : 'Save Password')}
          </button>
        </form>
      </div>
    </div>
  );
}
