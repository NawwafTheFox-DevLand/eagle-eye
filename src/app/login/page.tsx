'use client';
import { useState } from 'react';

const translations = {
  ar: {
    title: 'عين النسر', subtitle: 'Eagle Eye', company: 'منصور القابضة',
    tagline: 'منصة الطلبات الداخلية وسير العمل',
    email: 'البريد الإلكتروني', password: 'كلمة المرور',
    signin: 'تسجيل الدخول', loading: 'جاري التحقق...',
    error_invalid: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    confidential: 'منصة داخلية سرية — للموظفين المعتمدين فقط',
  },
  en: {
    title: 'Eagle Eye', subtitle: 'عين النسر', company: 'Mansour Holding',
    tagline: 'Internal Workflow & Request Platform',
    email: 'Email address', password: 'Password',
    signin: 'Sign in', loading: 'Verifying...',
    error_invalid: 'Invalid email or password',
    confidential: 'Confidential internal platform — authorized personnel only',
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const t = translations[lang];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) { setError(t.error_invalid); setLoading(false); return; }
      window.location.replace('/dashboard');
    } catch { setError(t.error_invalid); setLoading(false); }
  }

  return (
    <div className="min-h-screen flex" dir={dir}>
      <div className="hidden lg:flex lg:w-[55%] relative eagle-gradient overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 40px)' }} />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="relative flex flex-col items-center justify-center w-full px-16 text-white">
          <div className="mb-8 animate-float">
            <div className="w-32 h-32 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-2xl">
              <svg width="80" height="80" viewBox="0 0 512 512" fill="none">
                <circle cx="256" cy="270" r="30" fill="#D4A843" opacity="0.9"/>
                <circle cx="256" cy="270" r="14" fill="#0A3558"/>
                <path d="M 256 140 Q 170 120, 80 180 Q 50 200, 35 240 Q 100 195, 170 200 Q 200 220, 220 245 Z" fill="white" opacity="0.9"/>
                <path d="M 256 140 Q 342 120, 432 180 Q 462 200, 477 240 Q 412 195, 342 200 Q 312 220, 292 245 Z" fill="white" opacity="0.9"/>
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-2 tracking-wide">عين النسر</h1>
          <p className="text-xl font-light text-white/80 mb-1 tracking-wider">EAGLE EYE</p>
          <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-gold-400 to-transparent my-6" />
          <p className="text-lg font-medium text-white/90 mb-2">منصور القابضة</p>
          <p className="text-sm text-white/60">Mansour Holding</p>
          <div className="mt-12 text-center max-w-md">
            <p className="text-white/50 text-sm leading-relaxed">{t.tagline}</p>
          </div>
          <div className="absolute bottom-8 flex items-center gap-3 text-white/30 text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
            <span>نظام آمن ومشفر</span><span className="mx-2">•</span><span>Encrypted & Secure</span>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-slate-50 px-6 relative">
        <button onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
          className="absolute top-6 end-6 text-xs text-slate-500 hover:text-eagle-600 transition-colors px-4 py-2 rounded-full border border-slate-200 hover:border-eagle-300 bg-white shadow-sm">
          {lang === 'ar' ? 'English' : 'العربية'}
        </button>
        <div className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl eagle-gradient flex items-center justify-center shadow-xl mb-4">
              <svg width="36" height="36" viewBox="0 0 512 512" fill="none">
                <circle cx="256" cy="270" r="30" fill="#D4A843"/><circle cx="256" cy="270" r="14" fill="#0A3558"/>
                <path d="M 256 140 Q 170 120, 80 180 Q 50 200, 35 240 Q 100 195, 170 200 Q 200 220, 220 245 Z" fill="white"/>
                <path d="M 256 140 Q 342 120, 432 180 Q 462 200, 477 240 Q 412 195, 342 200 Q 312 220, 292 245 Z" fill="white"/>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-eagle-800">{t.title}</h2>
            <p className="text-sm text-slate-500">{t.company}</p>
          </div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t.signin}</h2>
            <p className="text-sm text-slate-500">{t.confidential}</p>
          </div>
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-slide-up">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t.email}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="input-field" placeholder="name@company.com" dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t.password}</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="input-field" dir="ltr" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed text-base">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  {t.loading}
                </span>
              ) : t.signin}
            </button>
          </form>
          <div className="mt-10 text-center">
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} Mansour Holding — منصور القابضة</p>
            <p className="text-xs text-slate-300 mt-1">Eagle Eye v1.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
