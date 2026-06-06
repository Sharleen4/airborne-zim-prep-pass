export default function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-background font-jakarta animate-pulse">
      {/* Header skeleton */}
      <div className="bg-gradient-to-br from-primary to-violet-700 px-6 pt-12 pb-16">
        <div className="h-3 bg-white/20 rounded w-28 mb-2" />
        <div className="h-6 bg-white/20 rounded w-36 mb-1" />
        <div className="h-3 bg-white/20 rounded w-48 mt-2" />
        <div className="mt-4 bg-white/15 rounded-xl h-14" />
      </div>

      <div className="px-6 pt-4 pb-24 space-y-6">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-border h-20" />
          <div className="bg-white rounded-2xl p-4 border border-border h-20" />
        </div>

        {/* Subjects */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 bg-muted rounded w-28" />
            <div className="h-3 bg-muted rounded w-14" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-border flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}