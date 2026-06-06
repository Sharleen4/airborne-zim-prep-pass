import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Save, Loader2 } from "lucide-react";

const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

function textToList(s) {
  return String(s || "").split("\n").map(x => x.trim()).filter(Boolean);
}

export default function CurriculumTopicEditModal({ topic, onClose, onSaved }) {
  const [form, setForm] = useState({
    subject: topic.subject || "",
    grade: topic.grade || "Grade 4",
    topic: topic.topic || "",
    subtopic: topic.subtopic || "",
    curriculum_code: topic.curriculum_code || "",
    term: topic.term || "",
    week: topic.week || "",
    learning_objectives: (topic.learning_objectives || []).join("\n"),
    suggested_activities: (topic.suggested_activities || []).join("\n"),
    heritage_based_competencies: (topic.heritage_based_competencies || []).join("\n"),
    assessment_suggestions: (topic.assessment_suggestions || []).join("\n"),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.subject.trim() || !form.topic.trim()) {
      setErr("Subject and topic are required");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const payload = {
        subject: form.subject.trim(),
        grade: form.grade,
        topic: form.topic.trim(),
        subtopic: form.subtopic.trim() || undefined,
        curriculum_code: form.curriculum_code.trim() || undefined,
        term: form.term ? Number(form.term) : undefined,
        week: form.week ? Number(form.week) : undefined,
        learning_objectives: textToList(form.learning_objectives),
        suggested_activities: textToList(form.suggested_activities),
        heritage_based_competencies: textToList(form.heritage_based_competencies),
        assessment_suggestions: textToList(form.assessment_suggestions),
      };
      const updated = await base44.entities.CurriculumTopic.update(topic.id, payload);
      onSaved({ ...topic, ...payload, id: topic.id, ...(updated || {}) });
    } catch (e) {
      setErr(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 flex items-end sm:items-center sm:justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card text-foreground w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="font-bold">Edit Curriculum Topic</p>
            <p className="text-xs text-muted-foreground">Update topic details, objectives and activities.</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Subject *">
              <input value={form.subject} onChange={e => set("subject", e.target.value)} className="input" />
            </Field>
            <Field label="Grade *">
              <select value={form.grade} onChange={e => set("grade", e.target.value)} className="input">
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Topic *">
            <input value={form.topic} onChange={e => set("topic", e.target.value)} className="input" />
          </Field>
          <Field label="Subtopic">
            <input value={form.subtopic} onChange={e => set("subtopic", e.target.value)} className="input" />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Curriculum Code">
              <input value={form.curriculum_code} onChange={e => set("curriculum_code", e.target.value)} className="input" />
            </Field>
            <Field label="Term">
              <input type="number" min={1} max={3} value={form.term} onChange={e => set("term", e.target.value)} className="input" />
            </Field>
            <Field label="Week">
              <input type="number" min={1} max={20} value={form.week} onChange={e => set("week", e.target.value)} className="input" />
            </Field>
          </div>

          <Field label="Learning Objectives (one per line)">
            <textarea rows={4} value={form.learning_objectives} onChange={e => set("learning_objectives", e.target.value)} className="input" />
          </Field>
          <Field label="Suggested Activities (one per line)">
            <textarea rows={3} value={form.suggested_activities} onChange={e => set("suggested_activities", e.target.value)} className="input" />
          </Field>
          <Field label="Heritage-Based Competencies (one per line)">
            <textarea rows={3} value={form.heritage_based_competencies} onChange={e => set("heritage_based_competencies", e.target.value)} className="input" />
          </Field>
          <Field label="Assessment Suggestions (one per line)">
            <textarea rows={3} value={form.assessment_suggestions} onChange={e => set("assessment_suggestions", e.target.value)} className="input" />
          </Field>

          {err && <p className="text-xs text-destructive">{err}</p>}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white inline-flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save</>}
          </button>
        </div>

        <style>{`.input{width:100%;border:1px solid hsl(var(--border));border-radius:0.75rem;padding:0.5rem 0.75rem;font-size:0.875rem;background:hsl(var(--background));color:hsl(var(--foreground));}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  );
}