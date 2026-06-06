import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Pencil, Trash2, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import CurriculumTopicEditModal from "./CurriculumTopicEditModal";

const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

export default function CurriculumBrowser({ topics, onTopicsChange }) {
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const subjects = useMemo(
    () => [...new Set(topics.map(t => t.subject).filter(Boolean))].sort(),
    [topics]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topics.filter(t => {
      if (grade && t.grade !== grade) return false;
      if (subject && t.subject !== subject) return false;
      if (q) {
        const hay = [t.subject, t.topic, t.subtopic, t.curriculum_code, ...(t.learning_objectives || [])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [topics, grade, subject, search]);

  const deleteTopic = async (t) => {
    const label = `${t.subject} · ${t.grade} · ${t.topic}${t.subtopic ? " — " + t.subtopic : ""}`;
    if (!window.confirm(`Delete this curriculum topic?\n\n${label}\n\nThis cannot be undone.`)) return;
    try {
      await base44.entities.CurriculumTopic.delete(t.id);
      onTopicsChange(topics.filter(x => x.id !== t.id));
      if (expanded === t.id) setExpanded(null);
    } catch (e) {
      alert(`Failed to delete: ${e?.message || e}`);
    }
  };

  const deleteSubject = async () => {
    if (!subject) return;
    const scope = grade ? `${subject} (${grade})` : `${subject} (ALL grades)`;
    const toDelete = topics.filter(t => t.subject === subject && (!grade || t.grade === grade));
    if (toDelete.length === 0) return;
    if (!window.confirm(`Delete ALL ${toDelete.length} curriculum topic(s) under ${scope}?\n\nThis cannot be undone.`)) return;
    setBusy(true);
    try {
      await Promise.all(toDelete.map(t => base44.entities.CurriculumTopic.delete(t.id).catch(() => null)));
      const deletedIds = new Set(toDelete.map(t => t.id));
      onTopicsChange(topics.filter(t => !deletedIds.has(t.id)));
      setExpanded(null);
    } catch (e) {
      alert(`Failed to delete subject: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <p className="font-bold text-sm">Browse, edit & delete topics</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search topic, objective or code..."
          className="w-full border border-border rounded-xl pl-9 pr-3 py-2 text-sm bg-background text-foreground"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select value={grade} onChange={e => setGrade(e.target.value)} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
          <option value="">All grades</option>
          {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={subject} onChange={e => setSubject(e.target.value)} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{filtered.length} topic{filtered.length !== 1 ? "s" : ""}</p>
        {subject && (
          <button
            onClick={deleteSubject}
            disabled={busy}
            className="text-[11px] font-bold text-destructive hover:bg-destructive/10 border border-destructive/30 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Trash2 className="w-3 h-3" /> Delete {subject}{grade ? ` · ${grade}` : ""}
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No topics match your filters.</p>
        ) : filtered.map(t => (
          <div key={t.id} className="border border-border rounded-xl bg-background overflow-hidden">
            <div className="p-3 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{t.topic}{t.subtopic ? ` — ${t.subtopic}` : ""}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t.subject} · {t.grade}
                  {t.curriculum_code ? ` · ${t.curriculum_code}` : ""}
                  {t.term ? ` · T${t.term}` : ""}
                  {t.week ? ` · Wk${t.week}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
                  title="View details"
                >
                  {expanded === t.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setEditing(t)}
                  className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteTopic(t)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {expanded === t.id && (
              <div className="border-t border-border p-3 bg-secondary/30 space-y-2">
                <ListBlock title="Learning Objectives" items={t.learning_objectives} />
                <ListBlock title="Suggested Activities" items={t.suggested_activities} />
                <ListBlock title="Heritage-Based Competencies" items={t.heritage_based_competencies} />
                <ListBlock title="Assessment Suggestions" items={t.assessment_suggestions} />
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <CurriculumTopicEditModal
          topic={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            onTopicsChange(topics.map(t => t.id === updated.id ? { ...t, ...updated } : t));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ListBlock({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
      <ul className="list-disc pl-5 text-xs text-foreground space-y-0.5">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}