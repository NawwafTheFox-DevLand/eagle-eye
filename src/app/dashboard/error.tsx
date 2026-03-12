'use client';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-xl mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800 space-y-3">
      <p className="font-bold text-base">خطأ / Error</p>
      <p className="text-sm font-mono">{error.message || 'Unknown error'}</p>
      {error.digest && <p className="text-xs text-red-500 font-mono">digest: {error.digest}</p>}
      <button onClick={reset} className="mt-2 px-4 py-2 bg-red-700 text-white rounded-lg text-sm hover:bg-red-800">
        حاول مجدداً / Try Again
      </button>
    </div>
  );
}
