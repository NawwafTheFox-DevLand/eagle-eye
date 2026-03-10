'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-10 text-center max-w-md w-full">
          <span className="text-5xl block mb-4">⚠️</span>
          <h2 className="text-xl font-bold text-slate-900 mb-2">حدث خطأ غير متوقع</h2>
          <p className="text-sm text-slate-500 mb-1">An unexpected error occurred</p>
          {error.digest && <p className="text-xs text-slate-400 mb-6 font-mono">{error.digest}</p>}
          <button onClick={reset} className="px-6 py-2.5 rounded-xl bg-eagle-600 text-white text-sm font-medium hover:bg-eagle-700 transition-colors">
            إعادة المحاولة / Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
