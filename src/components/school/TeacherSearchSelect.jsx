import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Search, X } from "lucide-react";

/**
 * Searchable teacher picker. Lets the school admin type to filter teachers
 * by name OR email, and select one. Falls back to free-typed email if no match.
 *
 * Props:
 *  - teachers: [{ id, full_name, user_email }]
 *  - value: currently selected email (string)
 *  - onChange: (email: string) => void
 *  - placeholder?: string
 *  - allowFreeText?: boolean (default true) — allow typing an email not in the list
 */
export default function TeacherSearchSelect({
  teachers = [],
  value = "",
  onChange,
  placeholder = "Search teacher by name or email…",
  allowFreeText = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const withEmail = useMemo(
    () => teachers.filter(t => t.user_email),
    [teachers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return withEmail;
    return withEmail.filter(t =>
      (t.full_name || "").toLowerCase().includes(q) ||
      (t.user_email || "").toLowerCase().includes(q)
    );
  }, [withEmail, query]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const selected = withEmail.find(t => t.user_email === value);
  const displayLabel = selected
    ? `${selected.full_name} — ${selected.user_email}`
    : value || "";

  const pick = (email) => {
    onChange?.(email);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger / current value */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 border border-input rounded-md px-3 py-2 text-sm bg-background text-left"
      >
        <span className={displayLabel ? "text-foreground truncate" : "text-muted-foreground truncate"}>
          {displayLabel || "Pick a teacher"}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); pick(""); }}
              className="text-muted-foreground hover:text-destructive p-0.5"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted-foreground text-center">
                {withEmail.length === 0
                  ? "No teachers with an email yet."
                  : "No teachers match your search."}
              </div>
            ) : (
              filtered.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t.user_email)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary text-sm ${value === t.user_email ? "bg-primary/5" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{t.full_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{t.user_email}</p>
                  </div>
                  {value === t.user_email && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              ))
            )}
          </div>

          {allowFreeText && query.trim() && query.includes("@") && !filtered.some(t => t.user_email === query.trim()) && (
            <button
              type="button"
              onClick={() => pick(query.trim())}
              className="w-full text-left px-3 py-2 border-t border-border text-xs font-semibold text-primary hover:bg-primary/5"
            >
              Use “{query.trim()}”
            </button>
          )}
        </div>
      )}
    </div>
  );
}