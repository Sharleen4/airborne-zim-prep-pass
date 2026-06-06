import { CheckCircle, Clock, BookOpen, Calendar, ChevronRight } from "lucide-react";

const STATUS_META = {
  assigned: { label: "Assigned", color: "bg-blue-100 text-blue-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-amber-100 text-amber-700", icon: Clock },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
  reviewed: { label: "Reviewed", color: "bg-purple-100 text-purple-700", icon: CheckCircle },
};

export default function HomeworkCard({ hw, subjectName, onAction, actionLabel, showChild = false }) {
  const meta = STATUS_META[hw.status] || STATUS_META.assigned;
  const Icon = meta.icon;
  const isOverdue = hw.status === "assigned" && hw.due_date && new Date(hw.due_date) < new Date();

  return (
    <div className={`bg-card rounded-2xl border shadow-sm p-4 space-y-2 ${isOverdue ? "border-red-300" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{hw.title}</p>
          {showChild && hw.child_name && (
            <p className="text-xs text-muted-foreground mt-0.5">👤 {hw.child_name}</p>
          )}
          {subjectName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <BookOpen className="w-3 h-3" /> {subjectName}
            </p>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 flex-shrink-0 ${meta.color}`}>
          <Icon className="w-3 h-3" /> {meta.label}
        </span>
      </div>

      {hw.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{hw.description}</p>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className={`flex items-center gap-1 text-xs font-medium ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
          <Calendar className="w-3 h-3" />
          {isOverdue ? "Overdue — " : "Due: "}
          {hw.due_date}
        </div>
        {onAction && (
          <button
            onClick={() => onAction(hw)}
            className="text-xs font-semibold text-primary border border-primary/30 px-3 py-1 rounded-xl flex items-center gap-1 hover:bg-primary/5 transition-colors"
          >
            {actionLabel || "View"} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}