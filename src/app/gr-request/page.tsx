import { verifyGRToken } from '@/lib/utils/gr-token';
import { createServiceClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function GRRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Invalid Link / رابط غير صالح</h1>
          <p className="text-sm text-slate-500">No token provided. / لم يتم توفير رمز.</p>
        </div>
      </div>
    );
  }

  const payload = verifyGRToken(token);

  if (!payload) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-lg font-semibold text-red-700 mb-2">Link Expired or Invalid / رابط منتهي أو غير صالح</h1>
          <p className="text-sm text-slate-500 mb-6">
            This link is no longer valid. Please request a new one from the GR team.
            <br />
            هذا الرابط لم يعد صالحًا. يرجى طلب رابط جديد من فريق الشؤون الحكومية.
          </p>
          <Link href="/login" className="btn-primary text-sm px-6 py-2 rounded-xl">
            Login / تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  const service = await createServiceClient();

  const [{ data: license }, { data: entity }] = await Promise.all([
    service.from('gr_licenses').select('*').eq('id', payload.licenseId as string).maybeSingle(),
    service.from('gr_entities').select('*').eq('id', payload.entityId as string).maybeSingle(),
  ]);

  if (!license || !entity) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">Not Found / غير موجود</h1>
          <p className="text-sm text-slate-500">License or entity record not found.</p>
        </div>
      </div>
    );
  }

  const expiryDate = license.expiry_date ? new Date(license.expiry_date) : null;
  const today = new Date();
  const daysLeft = expiryDate
    ? Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isExpired = daysLeft !== null && daysLeft <= 0;
  const urgencyClass = isExpired
    ? 'bg-red-50 border-red-200 text-red-700'
    : daysLeft !== null && daysLeft <= 30
    ? 'bg-amber-50 border-amber-200 text-amber-700'
    : 'bg-emerald-50 border-emerald-200 text-emerald-700';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl">🏛️</div>
          <div>
            <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">Eagle Eye · عين النسر</p>
            <h1 className="text-lg font-bold text-slate-900">License Renewal Request / طلب تجديد ترخيص</h1>
          </div>
        </div>

        {/* Urgency banner */}
        {daysLeft !== null && (
          <div className={`rounded-xl border px-4 py-3 mb-6 text-sm font-medium ${urgencyClass}`}>
            {isExpired
              ? `License EXPIRED ${Math.abs(daysLeft)} days ago / انتهى الترخيص منذ ${Math.abs(daysLeft)} يومًا`
              : `License expires in ${daysLeft} days / ينتهي الترخيص خلال ${daysLeft} يومًا`}
          </div>
        )}

        {/* License details */}
        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5">Entity / الكيان</p>
              <p className="text-sm font-semibold text-slate-900">{entity.name_ar}</p>
              <p className="text-xs text-slate-500">{entity.name_en}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5">License No. / رقم الترخيص</p>
              <p className="text-sm font-mono font-semibold text-slate-900">{license.license_number}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5">License Type / نوع الترخيص</p>
              <p className="text-sm font-medium text-slate-900">{license.license_type}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5">Expiry Date / تاريخ الانتهاء</p>
              <p className="text-sm font-medium text-slate-900">
                {expiryDate ? expiryDate.toLocaleDateString('ar-SA') : '—'}
              </p>
            </div>
          </div>
          {license.issuing_authority && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-0.5">Issuing Authority / الجهة المصدرة</p>
              <p className="text-sm font-medium text-slate-900">{license.issuing_authority}</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full text-center bg-blue-600 text-white font-semibold rounded-xl py-3 text-sm hover:bg-blue-700 transition-colors"
          >
            Login to Process Renewal / تسجيل الدخول للمعالجة
          </Link>
          <p className="text-center text-xs text-slate-400">
            You will be redirected to Eagle Eye. Access requires a GR team account.
            <br />
            ستتم إعادة توجيهك إلى عين النسر. يتطلب الوصول حسابًا في فريق الشؤون الحكومية.
          </p>
        </div>
      </div>
    </div>
  );
}
