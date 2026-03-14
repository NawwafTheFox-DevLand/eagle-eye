'use client';
import NovusLogo from '@/components/brand/NovusLogo';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <NovusLogo variant="error" size={80} showText={false} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">حدث خطأ / An Error Occurred</h2>
          <p className="text-slate-400 text-sm mb-6">{error.message || 'Something went wrong.'}</p>
          {error.digest && <p className="text-xs text-slate-500 mb-6 font-mono">digest: {error.digest}</p>}
          <button
            onClick={reset}
            className="bg-blue-600 text-white rounded-xl px-6 py-2.5 font-semibold hover:bg-blue-500 transition-colors"
          >
            حاول مجدداً / Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
