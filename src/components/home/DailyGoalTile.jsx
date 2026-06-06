import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Target, CheckCircle2 } from "lucide-react";
import { loadDailyGoal, DAILY_GOAL_TARGET } from "@/lib/dailyGoal";

// Compact 1-column tile version of the Daily Goal — designed to sit next to
// the Leaderboard tile in the 3-tile quick-actions row on the home page.
export default function DailyGoalTile({ userEmail, childId, practiceTopicId }) {
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
  const complete = done >= DAILY_GOAL_TARGET;
  const href = practiceTopicId ? `/practice/${practiceTopicId}` : "/practice";

  return (
    <Link to={href} className="bg-card rounded-2xl p-3 shadow-md border border-border flex flex-col gap-2 hover:shadow-lg transition-all hover:-translate-y-0.5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${complete ? "bg-gradient-to-br from-green-400 to-emerald-500" : "bg-gradient-to-br from-amber-400 to-orange-500"}`}>
        {complete ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Target className="w-5 h-5 text-white" />}
      </div>
      <div>
        <div className="flex items-center justify-between">
          <p className="font-bold text-xs text-foreground leading-tight">Daily Goal</p>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-orange-500">
            <Flame className="w-3 h-3" />{state.streak || 0}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {complete ? "Done today 🎉" : `${done}/${DAILY_GOAL_TARGET} questions`}
        </p>
      </div>
    </Link>
  );
}