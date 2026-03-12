import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-8xl font-black text-blue-600 mb-4">404</p>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">الصفحة غير موجودة / Page Not Found</h2>
        <p className="text-slate-500 mb-8">هذه الصفحة غير موجودة أو تم نقلها.</p>
        <Link href="/dashboard" className="bg-blue-600 text-white rounded-xl px-6 py-2.5 font-semibold hover:bg-blue-700 transition-colors">
          العودة للرئيسية / Go Home
        </Link>
      </div>
    </div>
  );
}
