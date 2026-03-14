import Link from 'next/link';
import NovusLogo from '@/components/brand/NovusLogo';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-800 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <NovusLogo variant="notfound" size={80} showText={false} />
        </div>
        <p className="text-8xl font-black text-blue-500/40 mb-4 select-none">404</p>
        <h2 className="text-2xl font-bold text-white mb-2">الصفحة غير موجودة / Page Not Found</h2>
        <p className="text-slate-400 mb-8">هذه الصفحة غير موجودة أو تم نقلها.</p>
        <Link href="/dashboard" className="bg-blue-600 text-white rounded-xl px-6 py-2.5 font-semibold hover:bg-blue-500 transition-colors">
          العودة للرئيسية / Go Home
        </Link>
      </div>
    </div>
  );
}
