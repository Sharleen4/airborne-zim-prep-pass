import { useState } from "react";
import { ChevronDown, ChevronUp, AlertTriangle, RefreshCw } from "lucide-react";

export default function CurriculumPreviewTable({ rows, errors, duplicates }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState("all"); // all | errors | duplicates | valid

  if (!rows?.length) return null;

  const errorIdx = new Set(errors.map(e => e.rowIndex));
  const dupeIdx = new Set(
    duplicates.map(d => d.row._index).filter(i => i !== undefined)
  );

  const filtered = rows.filter(r => {
    if (filter === "errors") return errorIdx.has(r._index);
    if (filter === "duplicates") return dupeIdx.has(r._index);
    if (filter === "valid") return !errorIdx.has(r._index) && !dupeIdx.has(r._index);
    return true;
  });

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <p className="font-bold text-sm text-foreground">Preview ({filtered.length} of {rows.length})</p>
        <div className="flex gap-1 text-xs">
          <FilterChip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
          <FilterChip label={`Valid`} active={filter === "valid"} onClick={() => setFilter("valid")} />
          <FilterChip label={`Errors`} active={filter === "errors"} onClick={() => setFilter("errors")} count={errors.length} variant="error" />
          <FilterChip label={`Duplicates`} active={filter === "duplicates"} onClick={() => setFilter("duplicates")} count={duplicates.length} variant="warn" />
        </div>
      </div>

      <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-secondary/60 sticky top-0">
            <tr className="text-left text-muted-foreground">
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Subject</th>
              <th className="px-3 py-2 font-semibold">Grade</th>
              <th className="px-3 py-2 font-semibold">Topic / Subtopic</th>
              <th className="px-3 py-2 font-semibold">Code</th>
              <th className="px-3 py-2 font-semibold">Term/Wk</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No rows in this view.</td></tr>
            ) : filtered.map(r => {
              const rowErrors = errors.find(e => e.rowIndex === r._index);
              const isDupe = dupeIdx.has(r._index);
              const isOpen = expanded === r._index;
              return (
                <>
                  <tr
                    key={r._index}
                    onClick={() => setExpanded(isOpen ? null : r._index)}
                    className={`border-t border-border cursor-pointer hover:bg-secondary/30 ${rowErrors ? "bg-red-500/5" : isDupe ? "bg-amber-500/5" : ""}`}
                  >
                    <td className="px-3 py-2 text-muted-foreground">{r._index + 2}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{r.subject || "—"}</td>
                    <td className="px-3 py-2">{r.grade || "—"}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-foreground truncate max-w-[200px]">{r.topic || "—"}</p>
                      {r.subtopic && <p className="text-muted-foreground truncate max-w-[200px]">{r.subtopic}</p>}
                    </td>
                    <td className="px-3 py-2 font-mono">{r.curriculum_code || "—"}</td>
                    <td className="px-3 py-2">{r.term ? `T${r.term}` : "—"}{r.week ? ` / W${r.week}` : ""}</td>
                    <td className="px-3 py-2">
                      {rowErrors ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-semibold"><AlertTriangle className="w-3 h-3" /> Error</span>
                      ) : isDupe ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold"><RefreshCw className="w-3 h-3" /> Duplicate</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Ready</span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-secondary/30 border-t border-border">
                      <td colSpan={7} className="px-4 py-3 space-y-2">
                        {rowErrors && (
                          <div className="bg-red-500/10 text-red-700 text-xs p-2 rounded-lg">
                            <strong>Errors:</strong> {rowErrors.errors.join("; ")}
                          </div>
                        )}
                        <DetailList label="Learning Objectives" items={r.learning_objectives} />
                        <DetailList label="Suggested Activities" items={r.suggested_activities} />
                        <DetailList label="Heritage-Based Competencies" items={r.heritage_based_competencies} />
                        <DetailList label="Assessment Suggestions" items={r.assessment_suggestions} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick, count, variant }) {
  const base = "px-2.5 py-1 rounded-full font-semibold transition-colors border";
  const activeCls = variant === "error" ? "bg-red-500 text-white border-red-500"
    : variant === "warn" ? "bg-amber-500 text-white border-amber-500"
    : "bg-primary text-white border-primary";
  const inactiveCls = "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80";
  return (
    <button onClick={onClick} className={`${base} ${active ? activeCls : inactiveCls}`}>
      {label}{count !== undefined ? ` (${count})` : ""}
    </button>
  );
}

function DetailList({ label, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
      <ul className="list-disc pl-5 text-xs text-foreground">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}