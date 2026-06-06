import { CloudOff, CloudUpload, CheckCircle2, Trash2, FileText } from "lucide-react";
import { deleteLocalRecord } from "@/lib/teacherRecordsStore";

const TYPE_COLORS = {
  test: "bg-violet-500/10 text-violet-600",
  exam: "bg-rose-500/10 text-rose-600",
  exercise: "bg-emerald-500/10 text-emerald-600",
  quiz: "bg-amber-500/10 text-amber-600",
  assignment: "bg-blue-500/10 text-blue-600",
  project: "bg-fuchsia-500/10 text-fuchsia-600",
  other: "bg-slate-500/10 text-slate-600",
};

export default function TeacherRecordsList({ records, onChanged }) {
  if (!records || records.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 text-center">
        <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm font-semibold text-foreground">No records yet</p>
        <p className="text-xs text-muted-foreground mt-1">Tap "Record result" above to log a test, exam or exercise.</p>
      </div>
    );
  }

  const sorted = [...records].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  const handleDelete = async (local_id) => {
    if (!confirm("Delete this record?")) return;
    await deleteLocalRecord(local_id);
    onChanged?.();
  };

  return (
    <div className="space-y-2">
      {sorted.map(r => (
        <div key={r.local_id} className="bg-card rounded-2xl border border-border p-3 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[r.record_type] || TYPE_COLORS.other}`}>
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-sm text-foreground truncate">{r.student_name}</p>
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-secondary px-1.5 py-0.5 rounded">
                {r.record_type}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {r.title}{r.subject ? ` · ${r.subject}` : ""}{r.class_name ? ` · ${r.class_name}` : ""}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {r.score != null && r.out_of != null && (
                <span className="text-xs font-semibold text-foreground">
                  {r.score}/{r.out_of} ({r.percentage ?? "—"}%)
                </span>
              )}
              {r.date_taken && <span className="text-[10px] text-muted-foreground">{r.date_taken}</span>}
              {r.synced ? (
                <span className="text-[10px] text-emerald-600 inline-flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" /> Synced
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 inline-flex items-center gap-0.5">
                  <CloudOff className="w-3 h-3" /> Pending
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => handleDelete(r.local_id)}
            className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg"
            title="Delete record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}