import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TeacherLayout from "@/components/teacher/TeacherLayout";
import TeacherFeatureLock from "@/components/teacher/TeacherFeatureLock";
import { useTeacherAllocation } from "@/lib/useTeacherAllocation";
import { Loader2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2, CheckCircle2, Clock } from "lucide-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function monthName(d) {
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

export default function TeacherSchedule() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState(startOfMonth(new Date()));
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(ymd(new Date()));
  const allocation = useTeacherAllocation(user);

  useEffect(() => {
    if (!user) return;
    if (!allocation.allocated && !allocation.loading) { setLoading(false); return; }
    setLoading(true);
    base44.entities.LessonSchedule
      .filter({ teacher_email: user.email, is_active: true }, "scheduled_date", 500)
      .then(setSchedules)
      .finally(() => setLoading(false));
  }, [user, allocation.allocated, allocation.loading]);

  const byDate = useMemo(() => {
    const map = new Map();
    for (const s of schedules) {
      if (!map.has(s.scheduled_date)) map.set(s.scheduled_date, []);
      map.get(s.scheduled_date).push(s);
    }
    return map;
  }, [schedules]);

  // Build a Monday-first 6-week grid for the current month
  const grid = useMemo(() => {
    const first = startOfMonth(cursor);
    const last = endOfMonth(cursor);
    const startDay = (first.getDay() + 6) % 7; // Mon=0 ... Sun=6
    const cells = [];
    for (let i = 0; i < startDay; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() - (startDay - i));
      cells.push({ date: d, inMonth: false });
    }
    for (let day = 1; day <= last.getDate(); day++) {
      cells.push({ date: new Date(first.getFullYear(), first.getMonth(), day), inMonth: true });
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const lastCell = cells[cells.length - 1].date;
      const d = new Date(lastCell);
      d.setDate(lastCell.getDate() + 1);
      cells.push({ date: d, inMonth: d.getMonth() === cursor.getMonth() });
      if (cells.length >= 42) break;
    }
    return cells;
  }, [cursor]);

  const selectedItems = byDate.get(selectedDate) || [];

  const markDelivered = async (id) => {
    await base44.entities.LessonSchedule.update(id, { status: "delivered" });
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: "delivered" } : s));
  };

  const removeItem = async (id) => {
    if (!confirm("Remove this scheduled lesson?")) return;
    await base44.entities.LessonSchedule.update(id, { is_active: false });
    setSchedules(prev => prev.filter(s => s.id !== id));
  };

  if (user && !allocation.loading && !allocation.allocated) {
    return (
      <TeacherLayout title="Lesson Schedule" subtitle="Locked" showBack>
        <TeacherFeatureLock feature="Lesson Schedule" hasProfile={allocation.hasProfile} />
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="Lesson Schedule" subtitle="Plan when each lesson is delivered" showBack>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              className="p-2 rounded-lg hover:bg-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="font-bold text-foreground text-sm">{monthName(cursor)}</p>
            <button
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              className="p-2 rounded-lg hover:bg-secondary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-[10px] font-bold text-muted-foreground text-center uppercase">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell, idx) => {
              const key = ymd(cell.date);
              const items = byDate.get(key) || [];
              const isSelected = key === selectedDate;
              const isToday = key === ymd(new Date());
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(key)}
                  className={`aspect-square rounded-lg border text-left p-1 flex flex-col ${
                    isSelected ? "border-primary bg-primary/10" : "border-border bg-card"
                  } ${cell.inMonth ? "" : "opacity-40"}`}
                >
                  <span className={`text-[10px] font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                    {cell.date.getDate()}
                  </span>
                  {items.length > 0 && (
                    <div className="mt-auto flex items-center gap-0.5">
                      {items.slice(0, 3).map((_, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary" />
                      ))}
                      {items.length > 3 && <span className="text-[8px] text-muted-foreground ml-0.5">+{items.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected day list */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-foreground text-sm">
                {new Date(selectedDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              <span className="text-xs text-muted-foreground">{selectedItems.length} scheduled</span>
            </div>
            {selectedItems.length === 0 ? (
              <div className="bg-card rounded-2xl border border-border p-6 text-center">
                <CalendarIcon className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No lessons scheduled for this day.</p>
                <Link to="/teacher/lessons" className="mt-2 inline-block text-primary font-semibold text-xs">Schedule from Saved Lessons →</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedItems.map(s => (
                  <div key={s.id} className={`bg-card rounded-2xl border p-3 ${s.status === "delivered" ? "border-emerald-300" : "border-border"}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{s.lesson_title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {s.class_name || "Class"} · {s.subject || ""}{s.grade ? ` · ${s.grade}` : ""}
                        </p>
                        {(s.start_time || s.duration_minutes) && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {s.start_time || ""}{s.start_time && s.duration_minutes ? " · " : ""}{s.duration_minutes ? `${s.duration_minutes} min` : ""}
                          </p>
                        )}
                        {s.notes && <p className="text-xs text-foreground mt-1 italic">"{s.notes}"</p>}
                      </div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        s.status === "delivered" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"
                      }`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {s.status !== "delivered" && (
                        <button
                          onClick={() => markDelivered(s.id)}
                          className="bg-emerald-500/10 text-emerald-700 text-xs font-semibold py-1.5 px-2 rounded-lg flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Mark delivered
                        </button>
                      )}
                      <button
                        onClick={() => removeItem(s.id)}
                        className="bg-destructive/10 text-destructive text-xs font-semibold py-1.5 px-2 rounded-lg flex items-center gap-1 ml-auto"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </TeacherLayout>
  );
}