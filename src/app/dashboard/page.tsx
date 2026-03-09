import { createClient } from '@/lib/supabase/server';
import { getSessionEmployee } from '@/app/actions/requests';
import Link from 'next/link';

function KPICard({ title, value, icon, color, subtitle }: { title: string; value: string | number; icon: string; color: string; subtitle: string }) {
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
  const employee = await getSessionEmployee();
  const name = employee?.full_name_ar || employee?.full_name_en || 'المستخدم';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';

  // Live KPIs
  const { count: pendingCount } = await supabase
    .from('approval_steps').select('*', { count: 'exact', head: true })
    .eq('approver_id', employee?.id).eq('status', 'pending');

  const { count: myOpenCount } = await supabase
    .from('requests').select('*', { count: 'exact', head: true })
    .eq('requester_id', employee?.id)
    .not('status', 'in', '("completed","cancelled","archived","rejected")');

  const { count: completedCount } = await supabase
    .from('requests').select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  const { count: overdueCount } = await supabase
    .from('requests').select('*', { count: 'exact', head: true })
    .eq('sla_breached', true)
    .not('status', 'in', '("completed","cancelled","archived","rejected")');

  // Recent requests
  const { data: recentRequests } = await supabase
    .from('requests')
    .select('id, request_number, subject, request_type, status, created_at, requester:employees!requester_id(full_name_ar)')
    .order('created_at', { ascending: false })
    .limit(5);

  const statusLabels: Record<string, string> = {
    draft: 'مسودة', submitted: 'مقدم', under_review: 'قيد المراجعة',
    approved: 'موافق عليه', rejected: 'مرفوض', completed: 'مكتمل',
    pending_clarification: 'بانتظار توضيح', cancelled: 'ملغي',
  };

  const statusColors: Record<string, string> = {
    draft: '#94A3B8', submitted: '#3B82F6', under_review: '#8B5CF6',
    approved: '#10B981', rejected: '#EF4444', completed: '#059669',
    pending_clarification: '#F59E0B', cancelled: '#6B7280',
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting}، {name}</h1>
        <p className="text-slate-500 text-sm mt-1">{employee?.company?.name_ar} — {new Intl.DateTimeFormat('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard title="بانتظار إجرائي" value={pendingCount ?? 0} icon="⏳" color="amber" subtitle="طلبات تحتاج موافقتي" />
        <KPICard title="طلباتي المفتوحة" value={myOpenCount ?? 0} icon="📋" color="blue" subtitle="قيد المعالجة" />
        <KPICard title="مكتملة" value={completedCount ?? 0} icon="✅" color="green" subtitle="تم إنجازها" />
        <KPICard title="متأخرة" value={overdueCount ?? 0} icon="🔴" color="red" subtitle="تجاوزت SLA" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">النشاط الأخير</h2>
            <Link href="/dashboard/requests" className="text-xs text-eagle-600 hover:underline">عرض الكل</Link>
          </div>
          {!recentRequests || recentRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <span className="text-3xl block mb-3">📋</span>
              <p className="text-sm font-medium">لا يوجد نشاط حديث</p>
              <p className="text-xs mt-1">ابدأ بإنشاء طلب جديد</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentRequests.map((req: any) => (
                <Link key={req.id} href={`/dashboard/requests/${req.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: statusColors[req.status] || '#94A3B8' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{req.subject}</p>
                    <p className="text-xs text-slate-500">{req.requester?.full_name_ar} • <span dir="ltr">{req.request_number}</span></p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: (statusColors[req.status] || '#94A3B8') + '15', color: statusColors[req.status] || '#94A3B8' }}>
                    {statusLabels[req.status] || req.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-900 mb-4">إجراءات سريعة</h3>
            <div className="space-y-2">
              {[{ label: 'طلب داخلي عام', href: '/dashboard/new-request', icon: '📝' },
                { label: 'طلب صرف مالي', href: '/dashboard/new-request', icon: '💰' },
                { label: 'طلب إجازة', href: '/dashboard/new-request', icon: '🏖️' },
                { label: 'طلب بين الشركات', href: '/dashboard/new-request', icon: '🏢' }].map(a => (
                <Link key={a.label} href={a.href} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors group">
                  <span className="text-lg">{a.icon}</span>
                  <span className="text-sm text-slate-700 group-hover:text-eagle-600 font-medium">{a.label}</span>
                  <svg className="w-4 h-4 text-slate-300 ms-auto group-hover:text-eagle-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
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
