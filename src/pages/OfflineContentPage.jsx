import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, DownloadCloud, RefreshCw, WifiOff, Database, BookOpen } from "lucide-react";
import SyncStatusBar from "@/components/SyncStatusBar";
import {
  fetchRemoteSubjects,
  loadContentPackageSummary,
  syncSubjectContentPackage,
} from "@/lib/contentPackageSync";

function formatDate(value) {
  if (!value) return "Not synced yet";
  try {
    return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "Not synced yet";
  }
}

export default function OfflineContentPage() {
  const [packages, setPackages] = useState([]);
  const [grade, setGrade] = useState("all");
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const summary = await loadContentPackageSummary();
    setPackages(summary.sort((a, b) => `${a.subject.grade}${a.subject.name}`.localeCompare(`${b.subject.grade}${b.subject.name}`)));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const grades = useMemo(() => {
    const set = new Set(packages.map((pkg) => pkg.subject.grade).filter(Boolean));
    return ["all", ...Array.from(set).sort()];
  }, [packages]);

  const visiblePackages = grade === "all"
    ? packages
    : packages.filter((pkg) => pkg.subject.grade === grade);

  const refreshFromBase44 = async () => {
    setMessage("Checking available content...");
    setRefreshing(true);
    try {
      const subjects = await fetchRemoteSubjects();
      await load();
      setMessage(`Found ${subjects.length} subject${subjects.length === 1 ? "" : "s"} available for offline sync.`);
    } catch (error) {
      setMessage(error?.message || "Could not refresh content.");
    } finally {
      setRefreshing(false);
    }
  };

  const syncPackage = async (pkg) => {
    setMessage("");
    setSyncingId(pkg.id);
    try {
      const result = await syncSubjectContentPackage(pkg.subject);
      await load();
      const baseMessage = `${pkg.subject.grade || ""} ${pkg.subject.name}: synced ${result.counts.topics} topics, ${result.counts.notes} notes, ${result.counts.questions} questions, and ${result.counts.practiceTests} exercises.`;
      setMessage(
        result.counts.topics > 0 && result.counts.notes === 0
          ? `${baseMessage} No published notes were found online for this subject yet.`
          : baseMessage
      );
    } catch (error) {
      setMessage(error?.message || "Content sync failed.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 font-jakarta">
      <SyncStatusBar />
      <div className="bg-gradient-to-br from-primary to-violet-700 px-6 pb-8 text-white" style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}>
        <Link to="/profile" className="mb-4 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Offline Content</h1>
            <p className="mt-1 text-sm text-white/75">Download subjects, notes, and questions for offline use.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 pt-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-foreground">Offline Content</p>
              <p className="text-xs text-muted-foreground">Refresh available content, then sync each subject you want offline.</p>
            </div>
            <button
              onClick={refreshFromBase44}
              disabled={refreshing || !navigator.onLine}
              className="flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          {!navigator.onLine && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <WifiOff className="h-4 w-4" /> Connect to internet to pull content updates.
            </div>
          )}
          {message && (
            <p className="mt-3 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-foreground">{message}</p>
          )}
        </div>

        {grades.length > 2 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {grades.map((g) => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-bold ${
                  grade === g ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground"
                }`}
              >
                {g === "all" ? "All grades" : g}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : visiblePackages.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" />
            <p className="font-bold text-foreground">No content found yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Tap Refresh to check available offline content.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visiblePackages.map((pkg) => {
              const downloaded = !!pkg.package;
              const syncing = syncingId === pkg.id;
              return (
                <div key={pkg.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-extrabold text-foreground">{pkg.subject.name}</p>
                        {downloaded && <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-500" />}
                      </div>
                      <p className="text-xs font-semibold text-muted-foreground">{pkg.subject.grade || "Ungraded"}</p>
                    </div>
                    <button
                      onClick={() => syncPackage(pkg)}
                      disabled={syncing || !navigator.onLine}
                      className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                      {downloaded ? "Update" : "Sync"}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    <Stat label="Topics" value={pkg.package?.counts?.topics ?? pkg.counts.topics} />
                    <Stat label="Notes" value={pkg.package?.counts?.notes ?? pkg.counts.notes} />
                    <Stat label="Questions" value={pkg.package?.counts?.questions ?? pkg.counts.questions} />
                    <Stat label="Exercises" value={pkg.package?.counts?.practiceTests ?? pkg.counts.practiceTests} />
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Last synced: {formatDate(pkg.package?.synced_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl bg-secondary p-2 text-center">
      <p className="text-base font-extrabold text-foreground">{value || 0}</p>
      <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
