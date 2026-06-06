export default function TopicCardSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden animate-pulse">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded-lg w-40" />
                <div className="h-3 bg-muted rounded-lg w-64 max-w-full" />
              </div>
            </div>
          </div>
          <div className="px-4 pb-4 grid grid-cols-3 gap-2">
            <div className="h-16 bg-muted rounded-xl" />
            <div className="h-16 bg-muted rounded-xl" />
            <div className="h-16 bg-muted rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}