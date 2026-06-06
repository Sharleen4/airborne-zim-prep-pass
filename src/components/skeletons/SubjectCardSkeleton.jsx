export default function SubjectCardSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-border flex items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded-lg w-32" />
            <div className="h-3 bg-muted rounded-lg w-20" />
          </div>
          <div className="w-4 h-4 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}