import { createClient } from '@/lib/supabase/server';
import { getLocalSession } from '@/lib/supabase/session';

function KPICard({ title, value, icon, color, subtitle }: { title: string; value: string; icon: string; color: string; subtitle: string }) {
  const colors: Record<string, string> = { amber: 'bg-amber-50 border-amber-100', blue: 'bg-blue-50 border-blue-100', green: 'bg-emerald-50 border-emerald-100', red: 'bg-red-50 border-red-100' };
  return (
    <div className={`kpi-card ${colors[color] || ''}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getLocalSession();
  const { data: employee } = await supabase.from('employees').select('*, company:companies(*), roles:user_roles(*)').eq('auth_user_id', user?.id).single();
  const name = employee?.full_name_ar || employee?.full_name_en || 'المستخدم';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting}، {name}</h1>
        <p className="text-slate-500 text-sm mt-1">{employee?.company?.name_ar} — {new Intl.DateTimeFormat('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard title="بانتظار إجرائي" value="—" icon="⏳" color="amber" subtitle="طلبات تحتاج موافقتي" />
        <KPICard title="طلباتي المفتوحة" value="—" icon="📋" color="blue" subtitle="قيد المعالجة" />
        <KPICard title="مكتملة هذا الشهر" value="—" icon="✅" color="green" subtitle="تم إنجازها" />
        <KPICard title="متأخرة" value="—" icon="🔴" color="red" subtitle="تجاوزت SLA" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100"><h2 className="font-semibold text-slate-900">النشاط الأخير</h2></div>
          <div className="p-6 flex flex-col items-center justify-center py-12 text-slate-400">
            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-sm font-medium">لا يوجد نشاط حديث</p>
            <p className="text-xs mt-1">ابدأ بإنشاء طلب جديد</p>
          </div>
        </div>
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">إجراءات سريعة</h3>
            <div className="space-y-2">
              {[{ label: 'طلب داخلي عام', href: '/dashboard/new-request?type=general_internal', icon: '📝' },
                { label: 'طلب صرف مالي', href: '/dashboard/new-request?type=fund_disbursement', icon: '💰' },
                { label: 'طلب إجازة', href: '/dashboard/new-request?type=leave_approval', icon: '🏖️' },
                { label: 'طلب بين الشركات', href: '/dashboard/new-request?type=intercompany', icon: '🏢' }].map(action => (
                <a key={action.href} href={action.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <span className="text-lg">{action.icon}</span>
                  <span className="text-sm text-slate-700 group-hover:text-eagle-600 font-medium">{action.label}</span>
                  <svg className="w-4 h-4 text-slate-300 ms-auto group-hover:text-eagle-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </a>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-3">حالة النظام</h3>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-sm text-slate-600">النظام يعمل بشكل طبيعي</span></div>
            <p className="text-xs text-slate-400 mt-2">Eagle Eye v1.0 — عين النسر</p>
          </div>
        </div>
      </div>
    </div>
  );
}
