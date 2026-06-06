import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, BookOpen, Calendar, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { usePlan } from "@/lib/usePlan";
import UpgradeOfferModal from "@/components/premium/UpgradeOfferModal";

export default function AssignHomeworkModal({ parentEmail, children, onClose, onAssigned }) {
  const { isPremium, loading: planLoading } = usePlan();

  // Free-plan parents see the upgrade offer instead of the homework form.
  if (!planLoading && !isPremium) {
    return (
      <UpgradeOfferModal
        featureName="Homework Assignment"
        featureMessage="Assign personalised practice to your child and track their progress. Upgrade for only $7 for the entire year."
        onClose={onClose}
      />
    );
  }

  return <AssignHomeworkModalInner parentEmail={parentEmail} children={children} onClose={onClose} onAssigned={onAssigned} />;
}

function AssignHomeworkModalInner({ parentEmail, children, onClose, onAssigned }) {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({
    child_profile_id: "",
    subject_id: "",
    topic_ids: [],
    title: "",
    description: "",
    due_date: "",
  });
  const [saving, setSaving] = useState(false);

  const [loadingTopics, setLoadingTopics] = useState(false);

  useEffect(() => {
    base44.entities.Subject.filter({ is_active: true }).then(setSubjects);
  }, []);

  // When child changes, reset subject/topic so the parent picks from the right grade
  useEffect(() => {
    setForm(f => ({ ...f, subject_id: "", topic_ids: [] }));
    setTopics([]);
  }, [form.child_profile_id]);

  useEffect(() => {
    if (form.subject_id) {
      setLoadingTopics(true);
      base44.entities.Topic.filter({ subject_id: form.subject_id, is_active: true }, "order", 100)
        .then(t => setTopics(t || []))
        .finally(() => setLoadingTopics(false));
    } else {
      setTopics([]);
    }
    setForm(f => ({ ...f, topic_ids: [] }));
  }, [form.subject_id]);

  // Subjects filtered to the chosen child's grade
  const selectedChild = children.find(c => c.id === form.child_profile_id);
  const filteredSubjects = selectedChild
    ? subjects.filter(s => s.grade === selectedChild.grade)
    : subjects;

  // Auto-suggest a title from the chosen subject/topics if the parent hasn't typed one
  const suggestedTitle = (() => {
    const subj = subjects.find(s => s.id === form.subject_id);
    if (!subj) return "";
    if (form.topic_ids.length === 1) {
      const t = topics.find(x => x.id === form.topic_ids[0]);
      return t ? `${subj.name}: ${t.name}` : `${subj.name} practice`;
    }
    if (form.topic_ids.length > 1) return `${subj.name} — ${form.topic_ids.length} topics`;
    return `${subj.name} practice`;
  })();

  const toggleTopic = (id) => {
    setForm(f => ({
      ...f,
      topic_ids: f.topic_ids.includes(id)
        ? f.topic_ids.filter(t => t !== id)
        : [...f.topic_ids, id],
    }));
  };

  const handleSave = async () => {
    if (!form.child_profile_id || !form.subject_id || !form.due_date) return;
    setSaving(true);
    const child = children.find(c => c.id === form.child_profile_id);
    const finalTitle = form.title.trim() || suggestedTitle;
    const saved = await base44.entities.HomeworkAssignment.create({
      ...form,
      title: finalTitle,
      parent_email: parentEmail,
      child_name: child?.child_name || "",
      status: "assigned",
    });
    onAssigned(saved);
    setSaving(false);
    onClose();
  };

  const isValid = form.child_profile_id && form.subject_id && form.due_date;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="bg-card w-full rounded-t-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-foreground">Assign Homework</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Child */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Child *</label>
          <select
            value={form.child_profile_id}
            onChange={e => setForm(f => ({ ...f, child_profile_id: e.target.value }))}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
          >
            <option value="">Select child...</option>
            {children.map(c => (
              <option key={c.id} value={c.id}>{c.avatar_emoji} {c.child_name} — {c.grade}</option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Subject *</label>
          <select
            value={form.subject_id}
            onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}
            disabled={!form.child_profile_id}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background disabled:opacity-50"
          >
            <option value="">{form.child_profile_id ? "Select subject..." : "Pick a child first"}</option>
            {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
          {form.child_profile_id && filteredSubjects.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1.5">No subjects available for this grade yet.</p>
          )}
        </div>

        {/* Topics */}
        {form.subject_id && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Topics (optional)
              {topics.length > 0 && <span className="text-muted-foreground/70 font-normal normal-case"> — {topics.length} available</span>}
            </label>
            {loadingTopics ? (
              <div className="text-xs text-muted-foreground py-3 text-center">Loading topics…</div>
            ) : topics.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No topics found for this subject.</p>
            ) : (
              <div
                className="space-y-1.5 max-h-64 overflow-y-auto pr-1 rounded-xl border border-border bg-background/50 p-2"
                style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", touchAction: "pan-y" }}
              >
                {topics.map(t => (
                  <button
                    key={t.id}
                    onClick={() => toggleTopic(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm border transition-colors flex items-center gap-2 ${
                      form.topic_ids.includes(t.id)
                        ? "bg-primary/10 border-primary text-primary font-semibold"
                        : "border-border text-foreground"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 flex-shrink-0" /> {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Title (auto-suggested) */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
            Title <span className="text-muted-foreground/70 font-normal normal-case">— short name your child will see</span>
          </label>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder={suggestedTitle || "e.g. Fractions Practice"}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
          />
          {!form.title.trim() && suggestedTitle && (
            <p className="text-xs text-muted-foreground mt-1.5">Will use: <span className="font-medium text-foreground">{suggestedTitle}</span></p>
          )}
        </div>

        {/* Due Date */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Due Date *
          </label>
          <input
            type="date"
            value={form.due_date}
            onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Instructions (optional)</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Any extra notes for your child..."
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background h-20 resize-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
          Assign Homework
        </button>
      </motion.div>
    </div>
  );
}