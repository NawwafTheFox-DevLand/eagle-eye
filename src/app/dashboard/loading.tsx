export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-slate-200 rounded-xl w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="kpi-card space-y-3">
            <div className="h-4 bg-slate-100 rounded w-24" />
            <div className="h-8 bg-slate-100 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 h-64" />
    </div>
  );
}
