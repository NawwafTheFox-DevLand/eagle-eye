import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center max-w-md w-full">
        <img src="/logo.png" alt="Eagle Eye" className="w-14 h-14 rounded-xl object-contain mx-auto mb-5" />
        <span className="text-4xl block mb-3">🔍</span>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">404</h1>
        <h2 className="text-lg font-semibold text-slate-700 mb-2">الصفحة غير موجودة</h2>
        <p className="text-sm text-slate-500 mb-6">Page not found — تعذّر العثور على الصفحة المطلوبة</p>
        <Link href="/dashboard" className="px-6 py-2.5 rounded-xl bg-eagle-600 text-white text-sm font-medium hover:bg-eagle-700 transition-colors inline-block">
          العودة للرئيسية / Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
