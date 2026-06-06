import { BookOpen, ChevronDown } from "lucide-react";

// Small reusable header used to group lists by subject on the teacher dashboard.
// When onToggle is provided, it renders as a collapsible button with a chevron
// that rotates based on `expanded`. Otherwise it renders as a static header.
export default function SubjectGroupHeader({ subject, count, expanded = true, onToggle }) {
  const inner = (
    <>
      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-3.5 h-3.5" />
      </div>
      <h3 className="font-bold text-sm text-foreground flex-1 text-left truncate">{subject}</h3>
      <span className="text-[10px] font-bold uppercase tracking-wide bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
        {count}
      </span>
      {onToggle && (
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`} />
      )}
    </>
  );

  if (onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 mt-4 mb-2 first:mt-0 px-2 py-1.5 -mx-2 rounded-xl hover:bg-secondary/60 transition-colors"
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-4 mb-2 first:mt-0">
      {inner}
    </div>
  );
}

// Group an array of items by a derived subject key. Returns an array of
// { subject, items } sorted alphabetically, with an "Other" bucket last.
export function groupBySubject(items, getSubject) {
  const buckets = new Map();
  for (const it of items || []) {
    const raw = getSubject(it);
    const key = (raw && String(raw).trim()) || "Other";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(it);
  }
  const groups = Array.from(buckets.entries()).map(([subject, items]) => ({ subject, items }));
  groups.sort((a, b) => {
    if (a.subject === "Other") return 1;
    if (b.subject === "Other") return -1;
    return a.subject.localeCompare(b.subject);
  });
  return groups;
}