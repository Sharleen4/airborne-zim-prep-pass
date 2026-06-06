import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { X, Loader2, CalendarPlus, Check } from "lucide-react";

// Modal that schedules one or more saved lessons to a class on one or more dates.
// If multiple lessons are selected and multiple dates are provided, lessons are
// distributed sequentially: lesson[i] -> date[i % dates.length].
export default function ScheduleLessonsModal({ lessons, onClose, onSaved }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [profile, setProfile] = useState(null);
  const [classId, setClassId] = useState("");
  const [dates, setDates] = useState([new Date().toISOString().slice(0, 10)]);
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      base44.entities.TeacherProfile.filter({ user_email: user.email, is_active: true }, "-created_date", 1),
      base44.entities.SchoolClass.filter({ teacher_email: user.email, is_active: true }, "name", 100),
    ])
      .then(([profs, cls]) => {
        setProfile(profs[0] || null);
        setClasses(cls);
        if (cls.length === 1) setClassId(cls[0].id);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const selectedClass = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);

  const updateDate = (i, v) => setDates(prev => prev.map((d, idx) => idx === i ? v : d));
  const addDate = () => setDates(prev => [...prev, new Date().toISOString().slice(0, 10)]);
  const removeDate = (i) => setDates(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const handleSave = async () => {
    setError("");
    if (!classId) { setError("Please choose a class."); return; }
    const cleanDates = dates.map(d => (d || "").trim()).filter(Boolean);
    if (cleanDates.length === 0) { setError("Please add at least one date."); return; }
    if (!profile?.school_id) { setError("You're not linked to a school."); return; }

    setSaving(true);
    try {
      const records = lessons.map((l, i) => {
        const date = cleanDates[i % cleanDates.length];
        return {
          teacher_email: user.email,
          school_id: profile.school_id,
          class_id: classId,
          class_name: selectedClass?.name || "",
          saved_lesson_id: l.id,
          lesson_title: l.lesson_title,
          subject: l.subject,
          grade: l.grade,
          scheduled_date: date,
          start_time: startTime || undefined,
          duration_minutes: duration ? Number(duration) : undefined,
          notes: notes || undefined,
          status: "scheduled",
          is_active: true,
          description: `${l.subject} · ${selectedClass?.name || ""} · ${date}`,
        };
      });
      await base44.entities.LessonSchedule.bulkCreate(records);
      onSaved?.();
    } catch (e) {
      setError(e.message || "Could not schedule lessons.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between z-10">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Schedule lessons</p>
            <h2 className="font-bold text-foreground">{lessons.length} lesson{lessons.length !== 1 ? "s" : ""} selected</h2>
          </div>
          <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Selected lessons preview */}
              <div className="bg-secondary/40 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                {lessons.map(l => (
                  <div key={l.id} className="text-xs text-foreground flex items-center gap-2">
                    <Check className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">{l.lesson_title} <span className="text-muted-foreground">· {l.subject} · {l.grade}</span></span>
                  </div>
                ))}
              </div>

              {/* Class */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Class</label>
                {classes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">You don't have any classes yet.</p>
                ) : (
                  <select
                    value={classId}
                    onChange={e => setClassId(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                  >
                    <option value="">Choose a class…</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} · {c.grade}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Dates */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-foreground">Date{dates.length > 1 ? "s" : ""}</label>
                  <button type="button" onClick={addDate} className="text-xs font-semibold text-primary">+ Add date</button>
                </div>
                <div className="space-y-2">
                  {dates.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="date"
                        value={d}
                        onChange={e => updateDate(i, e.target.value)}
                        className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                      />
                      {dates.length > 1 && (
                        <button onClick={() => removeDate(i)} className="text-xs text-destructive font-semibold px-2">Remove</button>
                      )}
                    </div>
                  ))}
                </div>
                {lessons.length > 1 && dates.length > 1 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Lessons will be assigned to dates in order, looping if needed.
                  </p>
                )}
              </div>

              {/* Optional time + duration */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Start time (optional)</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Duration min (optional)</label>
                  <input
                    type="number"
                    min="0"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                    placeholder="e.g. 40"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                  placeholder="Anything to remember for this lesson…"
                />
              </div>

              {error && <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-xl">{error}</div>}

              <button
                onClick={handleSave}
                disabled={saving || classes.length === 0}
                className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />}
                {saving ? "Scheduling…" : `Schedule ${lessons.length} lesson${lessons.length !== 1 ? "s" : ""}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}