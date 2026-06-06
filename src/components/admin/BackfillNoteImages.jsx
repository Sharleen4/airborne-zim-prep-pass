import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function BackfillNoteImages() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);
  const [total, setTotal] = useState(null);
  const [processed, setProcessed] = useState(0);

  const run = async () => {
    setRunning(true);
    setDone(false);
    setLog([]);
    setProcessed(0);

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const res = await base44.functions.invoke("backfillNoteImages", { batchSize: 3, offset });
      const data = res.data;

      if (total === null) setTotal(data.totalWithoutImage);
      setProcessed(p => p + (data.results?.length || 0));
      setLog(prev => [...prev, ...(data.results || [])]);

      hasMore = data.hasMore;
      offset = data.nextOffset;

      // Small delay to avoid hammering the API
      if (hasMore) await new Promise(r => setTimeout(r, 500));
    }

    setRunning(false);
    setDone(true);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Image className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">Backfill Note Images</p>
          <p className="text-xs text-muted-foreground">Generate header illustrations for all notes that don't have one yet</p>
        </div>
      </div>

      {total !== null && (
        <div className="text-xs text-muted-foreground font-medium">
          Progress: {processed} / {total} notes
          <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-1.5 bg-primary rounded-full transition-all"
              style={{ width: total > 0 ? `${Math.round((processed / total) * 100)}%` : "0%" }}
            />
          </div>
        </div>
      )}

      <button
        onClick={run}
        disabled={running}
        className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {running ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Generating images...</>
        ) : done ? (
          <><CheckCircle className="w-4 h-4" /> Done! Run again</>
        ) : (
          <><Image className="w-4 h-4" /> Start Backfill</>
        )}
      </button>

      {log.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {log.map((r, i) => (
            <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${r.status === "done" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
              {r.status === "done" ? <CheckCircle className="w-3 h-3 flex-shrink-0" /> : <AlertCircle className="w-3 h-3 flex-shrink-0" />}
              <span>{r.topic}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}