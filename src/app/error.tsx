'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">حدث خطأ / An Error Occurred</h2>
          <p className="text-slate-500 text-sm mb-6">{error.message || 'Something went wrong.'}</p>
          {error.digest && <p className="text-xs text-slate-400 mb-4 font-mono">digest: {error.digest}</p>}
          <button
            onClick={reset}
            className="bg-blue-600 text-white rounded-xl px-6 py-2.5 font-semibold hover:bg-blue-700 transition-colors"
          >
            حاول مجدداً / Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
