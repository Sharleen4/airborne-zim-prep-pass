import { Pencil, Trash2, Calendar, Clock } from "lucide-react";
import { DAYS_SHORT, getGoalType, getDuration } from "@/lib/studyPlanHelpers";

// Compact card showing a single study plan in the parent dashboard.
export default function StudyPlanCard({ plan, childName, onEdit, onDelete }) {
  const totalMinsPerWeek = (plan.sessions || []).reduce(
    (sum, s) => sum + (s.duration_minutes || 0) * (s.days_of_week?.length || 0),
    0
  );

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-foreground text-sm truncate">{plan.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            For {childName || plan.child_name} · {plan.sessions?.length || 0} session{plan.sessions?.length !== 1 ? "s" : ""}
          </p>
          {totalMinsPerWeek > 0 && (
            <p className="text-xs text-primary font-semibold mt-1">
              ⏱️ ~{totalMinsPerWeek} min/week
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => onEdit(plan)} className="text-muted-foreground hover:text-primary">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(plan)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {(plan.sessions || []).slice(0, 3).map((s, idx) => {
          const goal = getGoalType(s.goal_type);
          const dur = getDuration(s.duration_minutes);
          const daysLabel = (s.days_of_week || []).map(d => DAYS_SHORT[d]).join(", ") || "Any day";
          return (
            <div key={s.id || idx} className="bg-secondary/50 rounded-xl px-3 py-2 flex items-center gap-2 text-xs">
              <span className="text-base">{goal.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {goal.label} · {s.target_quantity || goal.suggest(s.duration_minutes || 20)} {goal.unit}
                </p>
                <p className="text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{dur.label}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{daysLabel}</span>
                  {s.start_time && <span>· {s.start_time}</span>}
                </p>
              </div>
            </div>
          );
        })}
        {(plan.sessions?.length || 0) > 3 && (
          <p className="text-xs text-muted-foreground text-center">+{plan.sessions.length - 3} more</p>
        )}
      </div>
    </div>
  );
}