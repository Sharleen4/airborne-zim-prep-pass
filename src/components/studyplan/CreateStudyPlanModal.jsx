import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plus } from "lucide-react";
import { motion } from "framer-motion";
import SessionBuilder from "./SessionBuilder";
import { newSessionId } from "@/lib/studyPlanHelpers";

const defaultSession = () => ({
  id: newSessionId(),
  duration_minutes: 20,
  goal_type: "practice_questions",
  days_of_week: [1, 3, 5], // Mon, Wed, Fri
  start_time: "16:00",
  _auto: true,
});

export default function CreateStudyPlanModal({ parentEmail, children, existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || "Weekly Study Plan");
  const [childId, setChildId] = useState(existing?.child_id || children[0]?.id || "");
  const [sessions, setSessions] = useState(existing?.sessions?.length ? existing.sessions : [defaultSession()]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const child = children.find(c => c.id === childId);
    if (!child) { setSubjects([]); setTopics([]); return; }
    Promise.all([
      base44.entities.Subject.filter({ grade: child.grade }),
      base44.entities.Topic.list(),
    ]).then(([subs, tops]) => {
      const activeSubs = subs.filter(s => s.is_active !== false);
      setSubjects(activeSubs);
      const subIds = new Set(activeSubs.map(s => s.id));
      setTopics(tops.filter(t => subIds.has(t.subject_id) && t.is_active !== false));
    });
  }, [childId, children]);

  const updateSession = (idx, updated) => {
    setSessions(prev => prev.map((s, i) => i === idx ? updated : s));
  };

  const addSession = () => setSessions(prev => [...prev, defaultSession()]);
  const removeSession = (idx) => setSessions(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!name.trim() || !childId || sessions.length === 0) return;
    setSaving(true);
    const child = children.find(c => c.id === childId);
    const payload = {
      parent_email: parentEmail,
      child_id: childId,
      child_name: child?.child_name || "",
      name: name.trim(),
      status: "active",
      sessions: sessions.map(s => {
        const { _auto, ...rest } = s;
        return rest;
      }),
    };
    let saved;
    if (existing) {
      saved = await base44.entities.StudyPlan.update(existing.id, payload);
    } else {
      saved = await base44.entities.StudyPlan.create(payload);
    }
    setSaving(false);
    onSaved(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[300] flex items-end" onClick={onClose}>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full bg-background rounded-t-3xl max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}
      >
        <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between z-10">
          <p className="font-bold text-foreground">{existing ? "Edit Study Plan" : "New Study Plan"}</p>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Plan name */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Plan name *</p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Term 2 Revision"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card"
            />
          </div>

          {/* Child picker */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">For which child *</p>
            <div className="flex gap-2 flex-wrap">
              {children.map(c => (
                <button
                  key={c.id}
                  onClick={() => setChildId(c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    childId === c.id ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="text-base">{c.avatar_emoji || "🧒"}</span>
                  {c.child_name}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm text-foreground">Study Sessions ({sessions.length})</p>
            </div>
            {sessions.map((s, idx) => (
              <SessionBuilder
                key={s.id || idx}
                index={idx}
                session={s}
                subjects={subjects}
                topics={topics}
                onChange={(updated) => updateSession(idx, updated)}
                onRemove={() => removeSession(idx)}
              />
            ))}
            <button
              onClick={addSession}
              className="w-full border-2 border-dashed border-primary/40 text-primary font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-primary/5"
            >
              <Plus className="w-4 h-4" /> Add another session
            </button>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400">
            💡 <strong>Tip:</strong> Short, daily sessions (10–20 min) work better than long, occasional ones. Mix activities to keep your child engaged.
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !childId || sessions.length === 0}
            className="w-full bg-primary text-white font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {existing ? "Save Changes" : "Create Study Plan"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}