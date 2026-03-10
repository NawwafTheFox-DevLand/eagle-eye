export default function RequestsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-2">
          <div className="h-7 bg-slate-200 rounded-xl w-32" />
          <div className="h-4 bg-slate-100 rounded w-20" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 bg-slate-200 rounded-xl w-32" />
          <div className="h-10 bg-slate-200 rounded-xl w-32" />
          <div className="h-10 bg-slate-200 rounded-xl w-28" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 bg-slate-100 rounded-xl flex-1 min-w-[140px]" />
          ))}
        </div>
      </div>

      {/* Request list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-50">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 bg-slate-200 rounded w-24" />
                  <div className="h-5 bg-slate-100 rounded-full w-20" />
                  <div className="h-5 bg-slate-100 rounded w-14" />
                </div>
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
              <div className="h-3 bg-slate-100 rounded w-20 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
