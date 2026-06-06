import { useState, useEffect } from "react";
import { WifiOff, BookOpen, HelpCircle, FileText, TrendingUp, X, Database, AlertCircle } from "lucide-react";
import { getOfflineSummary } from "@/lib/offlineCache";
import { getPendingCount } from "@/lib/syncManager";

export default function OfflineContentSheet({ trigger }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (open) {
      getOfflineSummary().then(setSummary);
      getPendingCount().then(setPendingCount);
    }
  }, [open]);

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setOpen(false)}>
          <div
            className="w-full bg-white rounded-t-3xl p-6 space-y-5 animate-in slide-in-from-bottom"
            style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <WifiOff className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">Offline Content</h3>
                  <p className="text-xs text-muted-foreground">Available without internet</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!summary ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                <Row icon={<BookOpen className="w-4 h-4 text-primary" />} label="Subjects cached" value={summary.subjects} color="bg-primary/10" />
                <Row icon={<Database className="w-4 h-4 text-violet-500" />} label="Topics cached" value={summary.topics} color="bg-violet-100" />
                <Row icon={<HelpCircle className="w-4 h-4 text-orange-500" />} label="Practice questions" value={summary.questions} color="bg-orange-100" />
                <Row icon={<FileText className="w-4 h-4 text-emerald-600" />} label="Study notes" value={summary.notes} color="bg-emerald-100" />
                <Row icon={<TrendingUp className="w-4 h-4 text-blue-500" />} label="Saved results" value={summary.results} color="bg-blue-100" />
                <Row icon={<FileText className="w-4 h-4 text-purple-500" />} label="Mock exams" value={summary.mockExams} color="bg-purple-100" />
              </div>
            )}

            {pendingCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-sm text-orange-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1">⏳ {pendingCount} changes pending sync</p>
                    <p>Go online to automatically sync your results and edits.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">💡 How to save more offline</p>
              <p>Open a subject page and tap <strong>"Save Offline"</strong> to cache all its topics, notes, and questions.</p>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="w-full border border-border text-sm font-semibold py-3 rounded-xl text-muted-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ icon, label, value, color }) {
  const hasContent = value > 0;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${hasContent ? "border-border bg-white" : "border-dashed border-border bg-muted/30 opacity-60"}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hasContent ? "Available offline" : "Not cached yet"}</p>
      </div>
      <span className={`text-sm font-bold ${hasContent ? "text-foreground" : "text-muted-foreground"}`}>
        {value}
      </span>
    </div>
  );
}