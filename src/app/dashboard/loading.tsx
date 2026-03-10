export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-7 bg-slate-200 rounded-xl w-56" />
          <div className="h-4 bg-slate-100 rounded w-40" />
        </div>
        <div className="h-6 bg-slate-100 rounded-full w-24" />
      </div>

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
        ))}
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-slate-200 rounded-2xl" />
        <div className="h-72 bg-slate-200 rounded-2xl" />
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-slate-100 rounded-2xl" />
        <div className="h-72 bg-slate-100 rounded-2xl" />
      </div>

      {/* Recent activity + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="h-5 bg-slate-200 rounded w-32" />
          </div>
          <div className="divide-y divide-slate-50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="w-2 h-2 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="h-5 bg-slate-100 rounded-full w-20" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="h-52 bg-slate-200 rounded-2xl" />
          <div className="h-32 bg-slate-100 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
