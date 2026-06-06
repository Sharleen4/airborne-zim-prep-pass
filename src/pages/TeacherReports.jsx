import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TeacherLayout from "@/components/teacher/TeacherLayout";
import TeacherFeatureLock from "@/components/teacher/TeacherFeatureLock";
import { useTeacherAllocation } from "@/lib/useTeacherAllocation";
import { Loader2, ChevronRight, BarChart3, TrendingDown, Plus, CloudUpload, CloudOff, Wifi } from "lucide-react";
import RecordResultModal from "@/components/teacher/RecordResultModal";
import TeacherRecordsList from "@/components/teacher/TeacherRecordsList";
import { listLocalRecords, syncPendingRecords } from "@/lib/teacherRecordsStore";

export default function TeacherReports() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [records, setRecords] = useState([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const allocation = useTeacherAllocation(user);

  const loadRecords = useCallback(async () => {
    if (!user?.email) return;
    const local = await listLocalRecords(user.email);
    setRecords(local);
  }, [user?.email]);

  const handleSync = useCallback(async () => {
    if (!user?.email || !navigator.onLine) return;
    setSyncing(true);
    try {
      const res = await syncPendingRecords(user.email);
      if (res.pending > 0) {
        setSyncMsg(`Synced ${res.synced} of ${res.pending} record(s)`);
        setTimeout(() => setSyncMsg(""), 3000);
      }
      await loadRecords();
    } finally {
      setSyncing(false);
    }
  }, [user?.email, loadRecords]);

  useEffect(() => {
    if (!user) return;
    base44.entities.SchoolClass.filter({ teacher_email: user.email, is_active: true }, "-created_date", 100)
      .then(setClasses)
      .finally(() => setLoading(false));
    loadRecords();
  }, [user, loadRecords]);

  // Auto-sync when coming online or on mount
  useEffect(() => {
    if (!user?.email) return;
    handleSync();
    const onOnline = () => { setOnline(true); handleSync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [user?.email, handleSync]);

  if (!user) return null;

  if (!allocation.loading && !allocation.allocated) {
    return (
      <TeacherLayout title="Reports" subtitle="Locked" showBack>
        <TeacherFeatureLock feature="Reports" hasProfile={allocation.hasProfile} />
      </TeacherLayout>
    );
  }

  const pendingCount = records.filter(r => !r.synced).length;

  return (
    <TeacherLayout title="Reports" subtitle="Class performance & records" showBack>
      {/* Offline-capable records section */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-bold text-sm text-foreground">Student Records</p>
            <p className="text-[11px] text-muted-foreground">Log tests, exams & exercises — even offline</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-white text-xs font-semibold px-3 py-2 rounded-xl inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Record result
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-[10px] font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-full ${online ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
            {online ? <><Wifi className="w-3 h-3" /> Online</> : <><CloudOff className="w-3 h-3" /> Offline</>}
          </span>
          {pendingCount > 0 && (
            <span className="text-[10px] font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-700">
              {pendingCount} pending sync
            </span>
          )}
          {online && pendingCount > 0 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="text-[10px] font-semibold inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary disabled:opacity-60"
            >
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
              Sync now
            </button>
          )}
          {syncMsg && <span className="text-[10px] text-emerald-600">{syncMsg}</span>}
        </div>

        <TeacherRecordsList records={records} onChanged={loadRecords} />
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : classes.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <BarChart3 className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="font-semibold text-foreground">No classes to report on</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Link to="/teacher/topic-trends" className="bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-2xl p-4 flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Topic Trends</p>
              <p className="text-xs text-white/80">See which topics consistently score lowest</p>
            </div>
            <ChevronRight className="w-4 h-4 text-white/80" />
          </Link>
          <p className="text-sm text-muted-foreground mb-2">Or tap a class for detailed performance.</p>
          {classes.map(c => (
            <Link to={`/teacher/classes/${c.id}`} key={c.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 hover:border-primary/30 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-lg">📊</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.grade} · {c.student_emails?.length || 0} students</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <RecordResultModal
          user={user}
          classes={classes}
          onClose={() => setShowModal(false)}
          onSaved={async () => {
            setShowModal(false);
            await loadRecords();
            if (navigator.onLine) handleSync();
          }}
        />
      )}
    </TeacherLayout>
  );
}