import { useEffect, useRef, useState } from "react";
import { Flame, Target, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { loadDailyGoal, DAILY_GOAL_TARGET } from "@/lib/dailyGoal";

// Small "come back every day" widget for the Home page.
// Shows today's progress (X / 5 questions) and the current streak.
export default function DailyGoalCard({ userEmail, childId, childName, practiceTopicId }) {
  const [state, setState] = useState(() => loadDailyGoal(userEmail, childId));

  useEffect(() => {
    setState(loadDailyGoal(userEmail, childId));
    const refresh = () => setState(loadDailyGoal(userEmail, childId));
    window.addEventListener("zama_daily_goal_updated", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("zama_daily_goal_updated", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [userEmail, childId]);

  const done = Math.min(state.questionsToday || 0, DAILY_GOAL_TARGET);
  const pct = Math.round((done / DAILY_GOAL_TARGET) * 100);
  const complete = done >= DAILY_GOAL_TARGET;

  // Celebrate the first time today's goal is reached (per child, per day).
  const celebratedKey = `zama_goal_celebrated_${userEmail || "anon"}_${childId || "default"}_${state.date}`;
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (!complete || celebratedRef.current) return;
    try {
      if (localStorage.getItem(celebratedKey)) { celebratedRef.current = true; return; }
      localStorage.setItem(celebratedKey, "1");
    } catch {}
    celebratedRef.current = true;
    confetti({ particleCount: 90, spread: 75, origin: { y: 0.7 }, zIndex: 9999 });
    toast.success(`Daily goal done! ${state.streak || 1}-day streak 🔥`, { duration: 4000 });
  }, [complete, celebratedKey, state.streak]);

  const practiceHref = practiceTopicId ? `/practice/${practiceTopicId}` : "/practice";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-4 shadow-sm border border-border"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${complete ? "bg-green-500/15" : "bg-amber-500/15"}`}>
          {complete ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Target className="w-5 h-5 text-amber-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide font-bold text-muted-foreground">Daily goal</p>
          <p className="font-bold text-sm text-foreground leading-tight">
            {complete
              ? `Nice work${childName ? `, ${childName.split(" ")[0]}` : ""}! Goal smashed 🎉`
              : `${done} of ${DAILY_GOAL_TARGET} questions today`}
          </p>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          <div className="flex items-center gap-1 text-orange-500 font-extrabold">
            <Flame className="w-4 h-4" />
            <span className="text-lg leading-none">{state.streak || 0}</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">day streak</span>
        </div>
      </div>

      <div className="mt-3 bg-muted rounded-full h-2 overflow-hidden">
        <motion.div
          className={`h-2 rounded-full ${complete ? "bg-green-500" : "bg-gradient-to-r from-amber-400 to-orange-500"}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {!complete && (
        <Link
          to={practiceHref}
          className="mt-3 block w-full text-center bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold py-2.5 rounded-xl transition-colors"
        >
          Practice {DAILY_GOAL_TARGET - done} more to keep the streak 🔥
        </Link>
      )}
    </motion.div>
  );
}