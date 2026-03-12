'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import Image from 'next/image';

export default function LoginPage() {
  const { lang, toggle } = useLanguage();
  const isAr = lang === 'ar';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(isAr ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
      } else {
        window.location.href = '/dashboard';
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-32 h-32 mx-auto mb-8 flex items-center justify-center">
            <Image src="/logo.png" alt="Eagle Eye" width={128} height={128} className="object-contain" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            {isAr ? 'عين النسر' : 'Eagle Eye'}
          </h1>
          <p className="text-blue-200 text-lg mb-2">Eagle Eye Platform</p>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            {isAr
              ? 'منصة متكاملة لإدارة الطلبات والعلاقات الحكومية'
              : 'Integrated platform for request management and government relations'}
          </p>
        </div>
        <div className="absolute bottom-8 text-slate-500 text-xs">
          © 2026 Eagle Eye. All rights reserved.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Image src="/logo.png" alt="Eagle Eye" width={64} height={64} className="mx-auto mb-3 object-contain" />
            <h1 className="text-2xl font-bold text-slate-900">{isAr ? 'عين النسر' : 'Eagle Eye'}</h1>
          </div>

          {/* Language toggle */}
          <div className="flex justify-end mb-6">
            <button
              onClick={toggle}
              className="text-sm text-slate-500 hover:text-blue-600 border border-slate-200 rounded-full px-4 py-1.5 hover:border-blue-300 transition-colors bg-white"
            >
              {isAr ? 'English' : 'العربية'}
            </button>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {isAr ? 'تسجيل الدخول' : 'Sign In'}
            </h2>
            <p className="text-slate-500 text-sm mb-8">
              {isAr ? 'أدخل بيانات حسابك للمتابعة' : 'Enter your credentials to continue'}
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {isAr ? 'البريد الإلكتروني' : 'Email'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={isAr ? 'example@company.com' : 'example@company.com'}
                  required
                  className="input-field"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {isAr ? 'كلمة المرور' : 'Password'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-field"
                  dir="ltr"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full text-center"
              >
                {loading
                  ? (isAr ? 'جارٍ الدخول...' : 'Signing in...')
                  : (isAr ? 'تسجيل الدخول' : 'Sign In')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
