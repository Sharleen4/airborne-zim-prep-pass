import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CalendarClock, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { getTodaysSessions, getGoalType, getDuration, sessionStartHref, todayKey } from "@/lib/studyPlanHelpers";

// Shows TODAY's study sessions for the active child on the home page.
export default function TodayStudyPlanCard({ parentEmail, childId, childName }) {
  const [plan, setPlan] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!parentEmail || !childId) { setLoading(false); return; }
    Promise.all([
      base44.entities.StudyPlan.filter({ parent_email: parentEmail, child_id: childId, status: "active" }, "-created_date", 5),
      base44.entities.StudySessionLog.filter({ child_id: childId, completed_date: todayKey() }, "-created_date", 50),
    ]).then(([plans, lgs]) => {
      setPlan(plans[0] || null);
      setLogs(lgs || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [parentEmail, childId]);

  if (loading || !plan) return null;

  const todays = getTodaysSessions(plan);
  if (todays.length === 0) return null;

  const completedIds = new Set(logs.map(l => l.session_id));
  const doneCount = todays.filter(s => completedIds.has(s.id)).length;
  const allDone = doneCount === todays.length;

  const markComplete = async (session) => {
    if (completedIds.has(session.id)) return;
    const log = await base44.entities.StudySessionLog.create({
      study_plan_id: plan.id,
      session_id: session.id,
      child_id: childId,
      completed_date: todayKey(),
      actual_minutes: session.duration_minutes,
    });
    setLogs(prev => [log, ...prev]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-4 shadow-sm border border-border"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${allDone ? "bg-green-500/15" : "bg-primary/15"}`}>
          {allDone ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <CalendarClock className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">{plan.name}</p>
          <p className="font-bold text-sm text-foreground leading-tight">
            {allDone
              ? `All done${childName ? `, ${childName.split(" ")[0]}` : ""}! 🎉`
              : `Today's plan · ${doneCount}/${todays.length} done`}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {todays.map((s, idx) => {
          const goal = getGoalType(s.goal_type);
          const dur = getDuration(s.duration_minutes);
          const done = completedIds.has(s.id);
          return (
            <div
              key={s.id || idx}
              className={`rounded-xl px-3 py-2.5 flex items-center gap-3 border ${done ? "bg-green-500/5 border-green-500/30" : "bg-secondary/50 border-border"}`}
            >
              <span className="text-xl">{goal.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {goal.label} · {s.target_quantity || ""} {goal.unit}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{dur.label}</span>
                  {s.start_time && <span>· {s.start_time}</span>}
                </p>
              </div>
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              ) : (
                <Link
                  to={sessionStartHref(s)}
                  onClick={() => markComplete(s)}
                  className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0"
                >
                  Start <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}