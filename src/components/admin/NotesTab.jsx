import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, BookOpen, Pencil, X, Eye, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const NOTE_FIELDS = ["overview", "key_definitions", "key_concepts", "zimbabwe_examples", "important_facts", "common_mistakes", "summary", "exam_tips"];

export default function NotesTab() {
  const [notes, setNotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [showPublished, setShowPublished] = useState(true);
  const [showUnpublished, setShowUnpublished] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Note.list("-created_date", 500),
      base44.entities.Topic.list("order", 500),
      base44.entities.Subject.list(),
    ]).then(([n, t, s]) => {
      setNotes(n);
      setTopics(t);
      setSubjects(s);
      setLoading(false);
    });
  }, []);

  const topicName = (id) => topics.find(t => t.id === id)?.name || "—";
  const subjectForTopic = (topicId) => {
    const topic = topics.find(t => t.id === topicId);
    return subjects.find(s => s.id === topic?.subject_id);
  };

  const openNew = () => {
    setEditingNote({
      id: null,
      topic_id: topics[0]?.id || "",
      subject_id: "",
      is_active: false,
      overview: "", key_definitions: "", key_concepts: "",
      zimbabwe_examples: "", important_facts: "", common_mistakes: "",
      summary: "", exam_tips: "",
    });
  };

  const openEdit = (note) => setEditingNote({ ...note });

  const saveNote = async () => {
    if (!editingNote.topic_id) { alert("Please select a topic."); return; }
    setSaving(true);
    const topic = topics.find(t => t.id === editingNote.topic_id);
    const payload = { ...editingNote, subject_id: topic?.subject_id || editingNote.subject_id };
    delete payload.id;

    if (editingNote.id) {
      const updated = await base44.entities.Note.update(editingNote.id, payload);
      setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, ...updated } : n));
      toast.success("Note saved.");
    } else {
      const created = await base44.entities.Note.create(payload);
      setNotes(prev => [created, ...prev]);
      toast.success("Note created.");
    }
    setSaving(false);
    setEditingNote(null);
  };

  const togglePublish = async (note) => {
    const newActive = !note.is_active;
    await base44.entities.Note.update(note.id, {
      is_active: newActive,
      review_status: newActive ? "published" : "approved",
    });
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, is_active: newActive, review_status: newActive ? "published" : "approved" } : n));
    toast.success(newActive ? "Note published — now visible to students." : "Note unpublished — hidden from students.");
  };

  const deleteNote = async (note) => {
    if (!confirm("Delete this note permanently?")) return;
    await base44.entities.Note.delete(note.id);
    setNotes(prev => prev.filter(n => n.id !== note.id));
    toast.success("Note deleted.");
  };

  const filteredNotes = notes.filter(n => {
    if (filterSubjectId) {
      const topic = topics.find(t => t.id === n.topic_id);
      if (topic?.subject_id !== filterSubjectId) return false;
    }
    if (!showPublished && n.is_active) return false;
    if (!showUnpublished && !n.is_active) return false;
    return true;
  });

  const publishedCount = notes.filter(n => n.is_active).length;
  const draftCount = notes.filter(n => !n.is_active).length;

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Editor modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white dark:bg-card w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{editingNote.id ? "Edit Note" : "New Note"}</h2>
              <button onClick={() => setEditingNote(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Topic *</label>
              <select
                value={editingNote.topic_id}
                onChange={e => setEditingNote(n => ({ ...n, topic_id: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
              >
                <option value="">Select a topic...</option>
                {subjects.map(sub => (
                  <optgroup key={sub.id} label={`${sub.name} (${sub.grade})`}>
                    {topics.filter(t => t.subject_id === sub.id).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {NOTE_FIELDS.map(field => (
              <div key={field}>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block capitalize">{field.replace(/_/g, " ")}</label>
                <textarea
                  value={editingNote[field] || ""}
                  onChange={e => setEditingNote(n => ({ ...n, [field]: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm h-20 resize-none bg-background text-foreground"
                  placeholder={`Enter ${field.replace(/_/g, " ")}...`}
                />
              </div>
            ))}

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!editingNote.is_active}
                  onChange={e => setEditingNote(n => ({ ...n, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-green-500"
                />
                Publish immediately (visible to students)
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveNote}
                disabled={saving}
                className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : "Save Note"}
              </button>
              <button onClick={() => setEditingNote(null)} className="flex-1 border border-border text-sm font-semibold py-2.5 rounded-xl">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Notes ({notes.length})</h2>
        <button onClick={openNew} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add Note
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowPublished(v => !v)}
          className={`rounded-2xl p-3 border text-left transition-colors ${showPublished ? "border-green-400 bg-green-50" : "border-border bg-card opacity-60"}`}
        >
          <p className="text-xs text-muted-foreground">Published (Live)</p>
          <p className="text-2xl font-bold text-green-600">{publishedCount}</p>
        </button>
        <button
          onClick={() => setShowUnpublished(v => !v)}
          className={`rounded-2xl p-3 border text-left transition-colors ${showUnpublished ? "border-amber-400 bg-amber-50" : "border-border bg-card opacity-60"}`}
        >
          <p className="text-xs text-muted-foreground">Draft (Hidden)</p>
          <p className="text-2xl font-bold text-amber-600">{draftCount}</p>
        </button>
      </div>

      {/* Filter */}
      <select
        value={filterSubjectId}
        onChange={e => setFilterSubjectId(e.target.value)}
        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-card text-foreground"
      >
        <option value="">All subjects</option>
        {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
      </select>

      {/* Notes list */}
      <div className="space-y-3">
        {filteredNotes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold">No notes found.</p>
          </div>
        )}
        {filteredNotes.map(note => {
          const isOpen = expandedId === note.id;
          const subject = subjectForTopic(note.topic_id);
          return (
            <div key={note.id} className={`bg-card rounded-2xl border overflow-hidden ${note.is_active ? "border-green-300/60" : "border-border"}`}>
              <div className="flex items-start gap-3 p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${note.is_active ? "bg-green-100" : "bg-amber-100"}`}>
                  <BookOpen className={`w-4 h-4 ${note.is_active ? "text-green-600" : "text-amber-600"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-sm text-foreground">{topicName(note.topic_id)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${note.is_active ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {note.is_active ? "Live" : "Draft"}
                    </span>
                  </div>
                  {subject && <p className="text-xs text-muted-foreground">{subject.name} · {subject.grade}</p>}
                  {note.overview && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.overview}</p>}
                </div>
                <button onClick={() => setExpandedId(isOpen ? null : note.id)} className="text-muted-foreground flex-shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-2 text-xs text-foreground">
                  {NOTE_FIELDS.filter(f => note[f]).map(f => (
                    <div key={f}>
                      <p className="font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">{f.replace(/_/g, " ")}</p>
                      <p className="whitespace-pre-line leading-relaxed">{note[f]}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 px-4 pb-4 pt-1">
                <button
                  onClick={() => togglePublish(note)}
                  className={`flex-1 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1 ${note.is_active ? "bg-amber-500 text-white" : "bg-green-500 text-white"}`}
                >
                  {note.is_active ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</> : <><Eye className="w-3.5 h-3.5" /> Publish</>}
                </button>
                <button
                  onClick={() => openEdit(note)}
                  className="flex-1 border border-primary text-primary text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => deleteNote(note)}
                  className="flex-1 border border-destructive text-destructive text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}