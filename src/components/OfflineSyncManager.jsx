import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { offlineDB } from "@/lib/offlineDB";
import {
  WifiOff, Wifi, Download, CheckCircle, Clock, X,
  RefreshCw, ChevronDown, ChevronUp, HardDrive, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

export default function OfflineSyncManager() {
  const isOnline = useOnline();
  const [open, setOpen] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [cachedCounts, setCachedCounts] = useState({});
  const [downloadingId, setDownloadingId] = useState(null);
  const [lastSynced, setLastSynced] = useState(() => localStorage.getItem("zama_last_sync") || null);
  const [downloadAll, setDownloadAll] = useState(false);

  // Load subjects + cached counts on open
  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open]);

  const loadData = async () => {
    const [subs, cachedTopics, cachedQuestions, cachedNotes] = await Promise.all([
      offlineDB.getAll(offlineDB.STORES.subjects),
      offlineDB.getAll(offlineDB.STORES.topics),
      offlineDB.getAll(offlineDB.STORES.questions),
      offlineDB.getAll(offlineDB.STORES.notes),
    ]);

    setSubjects(subs.filter(s => s.is_active !== false));

    // Count cached items per subject
    const counts = {};
    subs.forEach(s => {
      const topics = cachedTopics.filter(t => t.subject_id === s.id).length;
      const questions = cachedQuestions.filter(q => q.subject_id === s.id).length;
      const notes = cachedNotes.filter(n => n.subject_id === s.id).length;
      counts[s.id] = { topics, questions, notes };
    });
    setCachedCounts(counts);
  };

  const downloadSubject = async (subject) => {
    if (!isOnline || downloadingId) return;
    setDownloadingId(subject.id);

    try {
      // Fetch all data for this subject
      const [topics, questions, notes] = await Promise.all([
        base44.entities.Topic.filter({ subject_id: subject.id, is_active: true }),
        base44.entities.Question.filter({ subject_id: subject.id, is_active: true }, "-created_date", 500),
        base44.entities.Note.filter({ subject_id: subject.id, is_active: true }, "-created_date", 200),
      ]);

      await Promise.all([
        offlineDB.putMany(offlineDB.STORES.topics, topics),
        offlineDB.putMany(offlineDB.STORES.questions, questions),
        offlineDB.putMany(offlineDB.STORES.notes, notes),
      ]);

      const now = new Date().toISOString();
      localStorage.setItem("zama_last_sync", now);
      setLastSynced(now);
      await loadData();
    } catch (e) {
      console.error("[OfflineSyncManager] Download error:", e);
    }

    setDownloadingId(null);
  };

  const downloadAllSubjects = async () => {
    if (!isOnline || downloadAll) return;
    setDownloadAll(true);
    for (const sub of subjects) {
      await downloadSubject(sub);
    }
    setDownloadAll(false);
  };

  const isDownloaded = (subjectId) => {
    const c = cachedCounts[subjectId];
    return c && c.topics > 0 && c.questions > 0;
  };

  const totalCached = subjects.filter(s => isDownloaded(s.id)).length;

  return (
    <>
      {/* Inline trigger button — styled to match the header buttons */}
      <button
        onClick={() => setOpen(true)}
        className={`flex-shrink-0 border px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors ${
          !isOnline
            ? "bg-orange-500/90 border-orange-400 text-white"
            : totalCached > 0
            ? "bg-white/15 hover:bg-white/25 border-white/20 text-white"
            : "bg-white/15 hover:bg-white/25 border-white/20 text-white"
        }`}
        title="Manage offline content"
      >
        {!isOnline ? (
          <><WifiOff className="w-3.5 h-3.5" /> Offline</>
        ) : (
          <><HardDrive className="w-3.5 h-3.5" /> Offline ({totalCached}/{subjects.length})</>
        )}
      </button>

      {/* Sheet */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => setOpen(false)}>
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
              style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>

              <div className="px-5 pb-2 pt-1 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg text-foreground">Offline Content</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Select subjects to download for offline study
                    </p>
                  </div>
                  <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Status banner */}
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${
                  isOnline
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-orange-50 border border-orange-200 text-orange-800"
                }`}>
                  {isOnline
                    ? <><Wifi className="w-4 h-4 flex-shrink-0" /> Online — downloads available</>
                    : <><WifiOff className="w-4 h-4 flex-shrink-0" /> Offline — using cached content</>
                  }
                  {lastSynced && (
                    <span className="ml-auto text-xs font-normal opacity-70">
                      Last sync: {new Date(lastSynced).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Summary row */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "Downloaded", value: `${totalCached}/${subjects.length}`, icon: CheckCircle, color: "text-green-600" },
                    {
                      label: "Questions",
                      value: Object.values(cachedCounts).reduce((s, c) => s + c.questions, 0),
                      icon: HardDrive,
                      color: "text-primary"
                    },
                    {
                      label: "Notes",
                      value: Object.values(cachedCounts).reduce((s, c) => s + c.notes, 0),
                      icon: HardDrive,
                      color: "text-violet-600"
                    },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-secondary/50 rounded-2xl py-3 px-2">
                      <p className={`text-lg font-extrabold ${color}`}>{value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Download All */}
                {isOnline && (
                  <button
                    onClick={downloadAllSubjects}
                    disabled={!!downloadingId || downloadAll}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {downloadAll
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Downloading all...</>
                      : <><Download className="w-4 h-4" /> Download All Subjects</>
                    }
                  </button>
                )}

                {/* Per-subject list */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Subjects</p>
                  {subjects.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No subjects found</p>
                  )}
                  {subjects.map(sub => {
                    const counts = cachedCounts[sub.id] || { topics: 0, questions: 0, notes: 0 };
                    const downloaded = isDownloaded(sub.id);
                    const isLoadingThis = downloadingId === sub.id;

                    return (
                      <div key={sub.id} className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
                        <span className="text-2xl flex-shrink-0">{sub.icon || "📚"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">{sub.grade}</p>
                          {downloaded && (
                            <div className="flex gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                {counts.topics} topics
                              </span>
                              <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                                {counts.questions} questions
                              </span>
                              {counts.notes > 0 && (
                                <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                                  {counts.notes} notes
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {isLoadingThis ? (
                            <div className="w-8 h-8 flex items-center justify-center">
                              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                          ) : downloaded ? (
                            <button
                              onClick={() => isOnline && downloadSubject(sub)}
                              disabled={!isOnline}
                              className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl hover:bg-green-100 disabled:opacity-50"
                              title="Re-sync"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Synced
                            </button>
                          ) : (
                            <button
                              onClick={() => downloadSubject(sub)}
                              disabled={!isOnline || !!downloadingId}
                              className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl hover:bg-primary/15 disabled:opacity-40"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isOnline && totalCached === 0 && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      You're offline and have no downloaded content. Connect to the internet to download subjects for offline study.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}