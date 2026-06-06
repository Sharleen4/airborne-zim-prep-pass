import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { DURATION_OPTIONS, GOAL_TYPES, DAYS_SHORT, getGoalType } from "@/lib/studyPlanHelpers";

// Form for a single session inside the study plan builder.
export default function SessionBuilder({ session, subjects, topics, onChange, onRemove, index }) {
  const [topicSearch, setTopicSearch] = useState("");
  const goalType = getGoalType(session.goal_type);

  // Auto-update target_quantity suggestion when duration or goal type changes
  useEffect(() => {
    if (!session.target_quantity || session._auto) {
      onChange({
        ...session,
        target_quantity: goalType.suggest(session.duration_minutes || 20),
        _auto: true,
      });
    }
  }, [session.duration_minutes, session.goal_type]);

  const toggleDay = (day) => {
    const days = session.days_of_week || [];
    const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort();
    onChange({ ...session, days_of_week: next });
  };

  const filteredTopics = topics
    .filter(t => !session.subject_id || t.subject_id === session.subject_id)
    .filter(t => !topicSearch || t.name?.toLowerCase().includes(topicSearch.toLowerCase()))
    .slice(0, 20);

  return (
    <div className="bg-secondary/40 border border-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm text-foreground">Session {index + 1}</p>
        <button onClick={onRemove} className="text-destructive hover:opacity-80">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Duration */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Duration</p>
        <div className="grid grid-cols-5 gap-1.5">
          {DURATION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onChange({ ...session, duration_minutes: opt.value })}
              className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                session.duration_minutes === opt.value
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              <div>{opt.emoji}</div>
              <div className="mt-0.5">{opt.label}</div>
            </button>
          ))}
        </div>
        {/* Custom duration */}
        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">Or custom:</label>
          <input
            type="number"
            min="1"
            max="240"
            placeholder="e.g. 15"
            value={DURATION_OPTIONS.some(o => o.value === session.duration_minutes) ? "" : (session.duration_minutes || "")}
            onChange={e => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v > 0) onChange({ ...session, duration_minutes: v });
            }}
            className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-card"
          />
          <span className="text-xs text-muted-foreground">min</span>
        </div>
      </div>

      {/* Goal type */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Activity</p>
        <div className="grid grid-cols-2 gap-2">
          {GOAL_TYPES.map(g => (
            <button
              key={g.value}
              onClick={() => onChange({ ...session, goal_type: g.value, _auto: true })}
              className={`py-2.5 px-2 rounded-xl text-xs font-semibold border text-left flex items-center gap-2 transition-colors ${
                session.goal_type === g.value
                  ? "bg-primary/10 text-primary border-primary"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              <span className="text-base">{g.emoji}</span>
              <span>{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subject + Topic */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Focus on (optional)</p>
        <select
          value={session.subject_id || ""}
          onChange={e => onChange({ ...session, subject_id: e.target.value, topic_id: "" })}
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-card mb-2"
        >
          <option value="">Any subject</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>{s.icon || "📚"} {s.name}</option>
          ))}
        </select>

        {session.subject_id && (
          <>
            <input
              value={topicSearch}
              onChange={e => setTopicSearch(e.target.value)}
              placeholder="Search topics..."
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-card mb-2"
            />
            <select
              value={session.topic_id || ""}
              onChange={e => onChange({ ...session, topic_id: e.target.value })}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-card"
            >
              <option value="">Any topic</option>
              {filteredTopics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Target quantity */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Goal: {session.target_quantity || goalType.suggest(session.duration_minutes || 20)} {goalType.unit}
        </p>
        <input
          type="number"
          min="1"
          value={session.target_quantity || ""}
          onChange={e => onChange({ ...session, target_quantity: parseInt(e.target.value) || 1, _auto: false })}
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-card"
        />
      </div>

      {/* Days of week */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Repeat on</p>
        <div className="grid grid-cols-7 gap-1">
          {DAYS_SHORT.map((day, idx) => {
            const active = (session.days_of_week || []).includes(idx);
            return (
              <button
                key={day}
                onClick={() => toggleDay(idx)}
                className={`py-2 rounded-xl text-[11px] font-bold border transition-colors ${
                  active
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Start time (optional)</p>
        <input
          type="time"
          value={session.start_time || ""}
          onChange={e => onChange({ ...session, start_time: e.target.value })}
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-card"
        />
      </div>
    </div>
  );
}