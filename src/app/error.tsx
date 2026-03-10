'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('[Eagle Eye] Error:', error.digest ?? 'client error'); }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-10 text-center max-w-md w-full">
          <img src="/logo.png" alt="Eagle Eye" className="w-16 h-16 rounded-xl object-contain mx-auto mb-5" />
          <span className="text-4xl block mb-3">⚠️</span>
          <h2 className="text-xl font-bold text-slate-900 mb-1">حدث خطأ غير متوقع</h2>
          <p className="text-sm text-slate-500 mb-1">An unexpected error occurred</p>
          {error.digest && <p className="text-xs text-slate-400 mb-4 font-mono">ID: {error.digest}</p>}
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-eagle-600 text-white text-sm font-semibold hover:bg-eagle-700 transition-colors">
              إعادة المحاولة / Try Again
            </button>
            <a href="/dashboard" className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
              الرئيسية / Dashboard
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
