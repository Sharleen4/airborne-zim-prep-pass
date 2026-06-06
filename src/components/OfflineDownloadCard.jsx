import { useState, useEffect } from "react";
import { Download, CheckCircle2, WifiOff, Database, RefreshCw } from "lucide-react";
import { backgroundCacheAll } from "@/lib/backgroundSync";
import { getOfflineSummary } from "@/lib/offlineCache";

// User-facing card that lets the student/parent actively download all content
// for offline use. Shows progress and what's currently cached.
export default function OfflineDownloadCard() {
  const [summary, setSummary] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const loadSummary = async () => {
    const s = await getOfflineSummary();
    setSummary(s);
  };

  useEffect(() => {
    loadSummary();
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handleDownload = async () => {
    if (!isOnline || downloading) return;
    setDownloading(true);
    setDone(false);
    try {
      await backgroundCacheAll({ force: true });
      await loadSummary();
      setDone(true);
      setTimeout(() => setDone(false), 4000);
    } finally {
      setDownloading(false);
    }
  };

  const totalCached =
    (summary?.subjects || 0) +
    (summary?.topics || 0) +
    (summary?.questions || 0) +
    (summary?.notes || 0) +
    (summary?.mockExams || 0);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          {isOnline ? (
            <Download className="w-5 h-5 text-emerald-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-orange-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">Offline Mode</p>
          <p className="text-xs text-muted-foreground">
            {isOnline ? "Download all content to study without internet" : "You're offline — using saved content"}
          </p>
        </div>
      </div>

      {summary && (
        <div className="px-5 py-3 grid grid-cols-3 gap-2 bg-secondary/30 border-b border-border">
          <Stat label="Topics" value={summary.topics} />
          <Stat label="Questions" value={summary.questions} />
          <Stat label="Notes" value={summary.notes} />
        </div>
      )}

      <div className="px-5 py-4 space-y-2">
        <button
          onClick={handleDownload}
          disabled={!isOnline || downloading}
          className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50 transition-colors"
        >
          {downloading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Downloading content...
            </>
          ) : done ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Saved for offline use
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              {totalCached > 0 ? "Update offline content" : "Download for offline"}
            </>
          )}
        </button>
        {!isOnline && (
          <p className="text-xs text-orange-600 text-center">
            Reconnect to the internet to download more content.
          </p>
        )}
        {downloading && (
          <p className="text-xs text-muted-foreground text-center">
            This may take 1–2 minutes. Keep the app open.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-base font-extrabold text-foreground">{value || 0}</p>
      <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
    </div>
  );
}