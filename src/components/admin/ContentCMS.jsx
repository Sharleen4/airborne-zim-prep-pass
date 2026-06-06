import { useState, useEffect, useCallback } from "react";
import "react-quill/dist/quill.snow.css";
import { base44 } from "@/api/base44Client";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, Check, X,
  BookOpen, ToggleLeft, ToggleRight, GripVertical, Save, AlertCircle,
  Zap, Eye, EyeOff, FileText, HelpCircle, Send, RefreshCw, Lock, Unlock
} from "lucide-react";
import ReactQuill from "react-quill";
import { toast } from "sonner";

// ─── Rich Text Editor wrapper ─────────────────────────────────────────────
function RichTextEditor({ value, onChange }) {
  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <ReactQuill
        value={value || ""}
        onChange={onChange}
        theme="snow"
        modules={{ toolbar: [["bold", "italic", "underline"], [{ list: "ordered" }, { list: "bullet" }], ["clean"]] }}
        style={{ fontSize: "13px" }}
      />
    </div>
  );
}

const NOTE_FIELDS = [
  { key: "overview", label: "Overview" },
  { key: "key_definitions", label: "Key Definitions" },
  { key: "key_concepts", label: "Key Concepts" },
  { key: "zimbabwe_examples", label: "Zimbabwe Examples" },
  { key: "important_facts", label: "Important Facts" },
  { key: "common_mistakes", label: "Common Mistakes" },
  { key: "summary", label: "Summary" },
  { key: "exam_tips", label: "Exam Tips" },
];

// ─── Note Editor (inline) ─────────────────────────────────────────────────
function NoteEditor({ topicId, subjectId, onClose }) {
  const [note, setNote] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    base44.entities.Note.filter({ topic_id: topicId }).then(notes => {
      const existing = notes[0] || null;
      setNote(existing);
      setForm(existing ? { ...existing } : { overview: "", key_definitions: "", key_concepts: "", zimbabwe_examples: "", important_facts: "", common_mistakes: "", summary: "", exam_tips: "", is_active: false });
      setLoading(false);
    });
  }, [topicId]);

  const save = async () => {
    setSaving(true);
    const payload = { ...form, topic_id: topicId, subject_id: subjectId };
    delete payload.id; delete payload.created_date; delete payload.updated_date; delete payload.created_by;
    if (note) {
      const updated = await base44.entities.Note.update(note.id, payload);
      setNote(updated);
      setForm({ ...updated });
    } else {
      const created = await base44.entities.Note.create(payload);
      setNote(created);
      setForm({ ...created });
    }
    setSaving(false);
    toast.success("Note saved.");
  };

  const publish = async () => {
    if (!note) { toast.error("Save the note first."); return; }
    const updated = await base44.entities.Note.update(note.id, { is_active: !note.is_active, review_status: !note.is_active ? "published" : "approved" });
    setNote(updated);
    setForm(f => ({ ...f, is_active: updated.is_active }));
    toast.success(updated.is_active ? "Note published — visible to students." : "Note unpublished.");
  };

  const generateNote = async () => {
    setGenerating(true);
    try {
      const topicRes = await base44.entities.Topic.filter({ id: topicId });
      const topic = topicRes[0];
      const result = await base44.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        prompt: `You are a friendly teacher writing study notes for Grade 7 pupils in Zimbabwe aged 12-13.
Topic: ${topic?.name || topicId}
Learning Objectives: ${topic?.learning_objectives?.replace(/<[^>]+>/g, " ") || "General understanding"}
Rules: Simple words, short sentences (max 15 words), Zimbabwe real-life examples (sadza, Harare, Victoria Falls, farm, market).
Return JSON with keys: overview, key_definitions, key_concepts, zimbabwe_examples, important_facts, common_mistakes, summary, exam_tips`,
        response_json_schema: {
          type: "object",
          properties: {
            overview: { type: "string" }, key_definitions: { type: "string" }, key_concepts: { type: "string" },
            zimbabwe_examples: { type: "string" }, important_facts: { type: "string" },
            common_mistakes: { type: "string" }, summary: { type: "string" }, exam_tips: { type: "string" }
          }
        }
      });
      setForm(f => ({ ...f, ...result }));
      toast.success("AI notes generated — review and save.");
    } catch (e) {
      toast.error("Generation failed: " + e.message);
    }
    setGenerating(false);
  };

  if (loading) return <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="bg-white dark:bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <p className="font-semibold text-sm">{note ? "Edit Note" : "Create Note"}</p>
          {note && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${note.is_active ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {note.is_active ? "Live" : "Draft"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateNote} disabled={generating} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50">
            {generating ? <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Zap className="w-3 h-3" />}
            AI Generate
          </button>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      </div>

      {NOTE_FIELDS.map(({ key, label }) => (
        <div key={key}>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">{label}</label>
          <textarea
            value={form[key] || ""}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm h-16 resize-none bg-background text-foreground"
            placeholder={`Enter ${label.toLowerCase()}...`}
          />
        </div>
      ))}

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="flex-1 bg-primary text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1 disabled:opacity-40">
          {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
        {note && (
          <button onClick={publish} className={`flex-1 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1 ${note.is_active ? "bg-amber-500 text-white" : "bg-green-500 text-white"}`}>
            {note.is_active ? <><EyeOff className="w-3.5 h-3.5" /> Unpublish</> : <><Send className="w-3.5 h-3.5" /> Publish</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Questions Editor (inline) ────────────────────────────────────────────
function QuestionsEditor({ topicId, subjectId, onClose }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [savingQ, setSavingQ] = useState(false);

  const load = useCallback(() => {
    base44.entities.Question.filter({ topic_id: topicId }).then(qs => {
      setQuestions(qs.sort((a, b) => (a.created_date > b.created_date ? 1 : -1)));
      setLoading(false);
    });
  }, [topicId]);

  useEffect(() => { load(); }, [load]);

  const generateQuestions = async () => {
    setGenerating(true);
    try {
      const topicRes = await base44.entities.Topic.filter({ id: topicId });
      const topic = topicRes[0];
      const result = await base44.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        prompt: `Generate 20 multiple-choice questions for ZIMSEC Grade 7, Topic: "${topic?.name || topicId}".
Rules:
- Simple English suitable for 12-13 year olds.
- Use Zimbabwe-based examples (sadza, Harare, Victoria Falls, etc.)
- Each question must have exactly 4 options labelled A, B, C, D.
- Spread correct answers across A-D evenly.
- Provide a 1-2 sentence explanation for each.
- Mix difficulty: Easy, Standard, Advanced.`,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { label: { type: "string" }, text: { type: "string" } },
                      required: ["label", "text"]
                    }
                  },
                  correct_answer: { type: "string" },
                  explanation: { type: "string" },
                  difficulty: { type: "string" }
                },
                required: ["question_text", "options", "correct_answer"]
              }
            }
          },
          required: ["questions"]
        }
      });
      const qs = (result?.questions || []).filter(q => q.question_text && q.correct_answer && q.options?.length >= 2);
      if (qs.length === 0) {
        toast.error("AI returned no valid questions. Try again.");
        setGenerating(false);
        return;
      }
      for (const q of qs) {
        await base44.entities.Question.create({
          topic_id: topicId, subject_id: subjectId,
          question_text: q.question_text, options: q.options,
          correct_answer: q.correct_answer, explanation: q.explanation || "",
          difficulty: q.difficulty || "Standard", question_type: "mcq", marks: 1, is_active: false,
        });
      }
      load();
      toast.success(`${qs.length} questions generated (draft).`);
    } catch (e) {
      console.error("[generateQuestions]", e);
      toast.error("Generation failed: " + (e?.message || "Unknown error"));
    }
    setGenerating(false);
  };

  const deleteQ = async (id) => {
    if (!confirm("Delete this question?")) return;
    await base44.entities.Question.delete(id);
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const togglePublish = async (q) => {
    const updated = await base44.entities.Question.update(q.id, { is_active: !q.is_active });
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, is_active: updated.is_active } : x));
    toast.success(updated.is_active ? "Question published." : "Question unpublished.");
  };

  const saveEditedQ = async () => {
    if (!editingQ) return;
    setSavingQ(true);
    const { id, created_date, updated_date, created_by, ...fields } = editingQ;
    if (id) {
      const updated = await base44.entities.Question.update(id, fields);
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updated } : q));
    } else {
      const created = await base44.entities.Question.create(fields);
      setQuestions(prev => [created, ...prev]);
    }
    setEditingQ(null);
    setSavingQ(false);
    toast.success("Question saved.");
  };

  const DIFF_COLORS = { Easy: "bg-green-100 text-green-700", Standard: "bg-blue-100 text-blue-700", Advanced: "bg-red-100 text-red-700" };

  if (loading) return <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-primary" />
          <p className="font-semibold text-sm">Questions ({questions.length})</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateQuestions} disabled={generating} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50">
            {generating ? <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Zap className="w-3 h-3" />}
            Generate 20
          </button>
          <button
            onClick={() => setEditingQ({ topic_id: topicId, subject_id: subjectId, question_text: "", options: [{ label: "A", text: "" }, { label: "B", text: "" }, { label: "C", text: "" }, { label: "D", text: "" }], correct_answer: "A", explanation: "", difficulty: "Standard", question_type: "mcq", marks: 1, is_active: false })}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary text-white"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      </div>

      {/* Inline question editor */}
      {editingQ && (
        <div className="bg-white dark:bg-card border border-primary/30 rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">{editingQ.id ? "Edit Question" : "New Question"}</p>
          <textarea value={editingQ.question_text} onChange={e => setEditingQ(q => ({ ...q, question_text: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2 text-sm h-20 resize-none bg-background text-foreground" placeholder="Question text..." />
          <div className="space-y-1.5">
            {(editingQ.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">{opt.label}.</span>
                <input value={opt.text} onChange={e => setEditingQ(q => ({ ...q, options: q.options.map((o, j) => j === i ? { ...o, text: e.target.value } : o) }))} className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background text-foreground" placeholder={`Option ${opt.label}`} />
                <input type="radio" checked={editingQ.correct_answer === opt.label} onChange={() => setEditingQ(q => ({ ...q, correct_answer: opt.label }))} className="w-4 h-4 accent-green-500" title="Mark as correct" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={editingQ.difficulty} onChange={e => setEditingQ(q => ({ ...q, difficulty: e.target.value }))} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
              {["Easy", "Standard", "Advanced"].map(d => <option key={d}>{d}</option>)}
            </select>
            <select value={editingQ.is_active ? "published" : "draft"} onChange={e => setEditingQ(q => ({ ...q, is_active: e.target.value === "published" }))} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published (live)</option>
            </select>
          </div>
          <textarea value={editingQ.explanation} onChange={e => setEditingQ(q => ({ ...q, explanation: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2 text-sm h-16 resize-none bg-background text-foreground" placeholder="Explanation..." />
          <div className="flex gap-2">
            <button onClick={saveEditedQ} disabled={savingQ} className="flex-1 bg-primary text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1 disabled:opacity-40">
              {savingQ ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3 h-3" />} Save
            </button>
            <button onClick={() => setEditingQ(null)} className="flex-1 border border-border text-xs font-semibold py-2 rounded-xl">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {questions.length === 0 && !editingQ && (
          <p className="text-center text-muted-foreground text-xs py-4">No questions yet — add manually or generate with AI.</p>
        )}
        {questions.map(q => (
          <div key={q.id} className={`bg-white dark:bg-card border rounded-xl p-3 flex items-start gap-2 ${q.is_active ? "border-green-300/60" : "border-border"}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${DIFF_COLORS[q.difficulty] || DIFF_COLORS.Standard}`}>{q.difficulty}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${q.is_active ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{q.is_active ? "Live" : "Draft"}</span>
                <span className="text-[10px] text-muted-foreground">Ans: {q.correct_answer}</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed line-clamp-2">{q.question_text}</p>
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button onClick={() => togglePublish(q)} title={q.is_active ? "Unpublish" : "Publish"} className={`p-1 rounded-lg ${q.is_active ? "text-amber-500 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"}`}>
                {q.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setEditingQ({ ...q })} className="p-1 rounded-lg text-muted-foreground hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => deleteQ(q.id)} className="p-1 rounded-lg text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Topic Row ────────────────────────────────────────────────────────────
function TopicRow({ topic, questionCount, totalCount = 0, onUpdate, onDelete, onRefreshCounts }) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [form, setForm] = useState({ name: topic.name, learning_objectives: topic.learning_objectives || "", order: topic.order || 0, is_free: !!topic.is_free });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const updated = await base44.entities.Topic.update(topic.id, { name: form.name, learning_objectives: form.learning_objectives, order: Number(form.order), is_free: !!form.is_free });
    onUpdate({ ...topic, ...updated });
    setEditing(false);
    setSaving(false);
  };

  const toggleActive = async () => {
    const updated = await base44.entities.Topic.update(topic.id, { is_active: !topic.is_active });
    onUpdate({ ...topic, ...updated });
  };

  const toggleFree = async () => {
    const updated = await base44.entities.Topic.update(topic.id, { is_free: !topic.is_free });
    onUpdate({ ...topic, ...updated });
  };

  const toggleSection = (section) => {
    if (activeSection === section) { setActiveSection(null); setExpanded(false); }
    else { setActiveSection(section); setExpanded(true); }
  };

  if (editing) {
    return (
      <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm text-foreground">Editing Topic</p>
          <button onClick={() => setEditing(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input className="col-span-2 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" placeholder="Topic name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input type="number" className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" placeholder="Order" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Learning Objectives</label>
          <RichTextEditor value={form.learning_objectives} onChange={v => setForm(f => ({ ...f, learning_objectives: v }))} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer bg-secondary/40 rounded-xl px-3 py-2.5">
          <input
            type="checkbox"
            checked={!!form.is_free}
            onChange={e => setForm(f => ({ ...f, is_free: e.target.checked }))}
            className="w-4 h-4 accent-green-500"
          />
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Unlock className="w-3.5 h-3.5 text-green-600" />
            Free topic <span className="font-normal text-muted-foreground">— accessible to free-plan users</span>
          </span>
        </label>
        <button onClick={save} disabled={saving || !form.name.trim()} className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />} Save Topic
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all ${topic.is_active === false ? "border-amber-400/40 opacity-60" : "border-border"}`}>
      <div className="flex items-center gap-2 px-3 py-3">
        <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-3 h-3 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{topic.name}</p>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0 font-mono">#{topic.order || 0}</span>
        {(() => {
          // RULE: a topic is "good" if it has 20+ total questions (any status). Below 20 = lacking.
          const total = Math.max(totalCount || 0, questionCount || 0);
          const lacking = total < 20;
          const draftCount = Math.max(0, total - questionCount);
          const colorClass = lacking
            ? "bg-orange-100 text-orange-700"
            : "bg-green-100 text-green-700";
          const title = lacking
            ? `⚠️ Lacking — ${total} question${total !== 1 ? "s" : ""} total. Needs ${20 - total} more.`
            : `✅ Good — ${total} total question${total !== 1 ? "s" : ""} (${questionCount} live${draftCount > 0 ? `, ${draftCount} draft` : ""})`;
          return (
            <span
              title={title}
              className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${colorClass}`}
            >
              {total}/20 {lacking ? "⚠️" : "✅"}
            </span>
          );
        })()}
        <button
          onClick={toggleFree}
          title={topic.is_free ? "Free topic — accessible to free users. Click to lock (premium-only)." : "Premium-only topic. Click to make free."}
          className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${topic.is_free ? "border-green-400 bg-green-50 text-green-700" : "border-amber-300 bg-amber-50 text-amber-700"}`}
        >
          {topic.is_free ? <><Unlock className="w-3 h-3" /> FREE</> : <><Lock className="w-3 h-3" /> PREMIUM</>}
        </button>
        <button onClick={() => toggleSection("notes")} title="Edit Notes" className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg border transition-colors ${activeSection === "notes" ? "border-blue-400 bg-blue-50 text-blue-700" : "border-border text-muted-foreground hover:bg-secondary"}`}>
          <FileText className="w-3 h-3" /> Notes
        </button>
        <button onClick={() => toggleSection("questions")} title="Edit Questions" className={`flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg border transition-colors ${activeSection === "questions" ? "border-violet-400 bg-violet-50 text-violet-700" : "border-border text-muted-foreground hover:bg-secondary"}`}>
          <HelpCircle className="w-3 h-3" /> Q's
        </button>
        <button onClick={toggleActive} className="flex-shrink-0" title={topic.is_active === false ? "Activate" : "Deactivate"}>
          {topic.is_active === false
            ? <ToggleLeft className="w-5 h-5 text-muted-foreground hover:text-green-600 transition-colors" />
            : <ToggleRight className="w-5 h-5 text-green-600 hover:text-muted-foreground transition-colors" />}
        </button>
        <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary flex-shrink-0"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(topic.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      {expanded && activeSection && (
        <div className="border-t border-border bg-secondary/10 p-4">
          {activeSection === "notes" && <NoteEditor topicId={topic.id} subjectId={topic.subject_id} onClose={() => { setActiveSection(null); setExpanded(false); }} />}
          {activeSection === "questions" && <QuestionsEditor topicId={topic.id} subjectId={topic.subject_id} onClose={() => { setActiveSection(null); setExpanded(false); onRefreshCounts?.(); }} />}
        </div>
      )}
    </div>
  );
}

// ─── Subject Block ────────────────────────────────────────────────────────
function SubjectBlock({ subject, allTopics, questionCounts, totalCounts, onSubjectUpdate, onSubjectDelete, onRefreshCounts }) {
  const [expanded, setExpanded] = useState(false);
  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: subject.name, icon: subject.icon || "📚", description: subject.description || "" });
  const [addingTopic, setAddingTopic] = useState(false);
  const [newTopic, setNewTopic] = useState({ name: "", learning_objectives: "", order: 0 });
  const [topics, setTopics] = useState(allTopics.filter(t => t.subject_id === subject.id).sort((a, b) => (a.order || 0) - (b.order || 0)));
  const [savingSubject, setSavingSubject] = useState(false);
  const [savingTopic, setSavingTopic] = useState(false);
  const [filter, setFilter] = useState("active");

  useEffect(() => {
    setTopics(allTopics.filter(t => t.subject_id === subject.id).sort((a, b) => (a.order || 0) - (b.order || 0)));
  }, [allTopics, subject.id]);

  const saveSubject = async () => {
    setSavingSubject(true);
    const updated = await base44.entities.Subject.update(subject.id, subjectForm);
    onSubjectUpdate({ ...subject, ...updated });
    setEditingSubject(false);
    setSavingSubject(false);
  };

  const addTopic = async () => {
    if (!newTopic.name.trim()) return;
    setSavingTopic(true);
    const saved = await base44.entities.Topic.create({ subject_id: subject.id, name: newTopic.name, learning_objectives: newTopic.learning_objectives, order: Number(newTopic.order), is_active: true });
    setTopics(prev => [...prev, saved].sort((a, b) => (a.order || 0) - (b.order || 0)));
    setNewTopic({ name: "", learning_objectives: "", order: 0 });
    setAddingTopic(false);
    setSavingTopic(false);
  };

  const updateTopic = (updated) => setTopics(prev => prev.map(t => t.id === updated.id ? updated : t).sort((a, b) => (a.order || 0) - (b.order || 0)));
  const deleteTopic = async (id) => { if (!confirm("Delete this topic?")) return; await base44.entities.Topic.delete(id); setTopics(prev => prev.filter(t => t.id !== id)); };

  const activeCount = topics.filter(t => t.is_active !== false).length;
  const inactiveCount = topics.filter(t => t.is_active === false).length;
  // A topic is "lacking" ONLY if its TOTAL questions (any status) are below 20.
  // Topics that have 20+ drafts/approved questions are NOT lacking — admin only needs to publish them.
  // This matches the orange ⚠️ badge on each topic row.
  const isTopicLacking = (t) => {
    if (t.is_active === false) return false;
    // Fall back to live count if totalCounts isn't populated (e.g. stale backend response).
    const total = totalCounts[t.id] ?? questionCounts[t.id] ?? 0;
    return total < 20;
  };
  const lackingTopics = topics.filter(isTopicLacking);
  const lackingCount = lackingTopics.length;
  const visibleTopics = topics.filter(t => {
    if (filter === "active") return t.is_active !== false;
    if (filter === "inactive") return t.is_active === false;
    if (filter === "lacking") return isTopicLacking(t);
    return true;
  });

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {editingSubject ? (
        <div className="p-4 space-y-3 border-b border-border">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">Edit Subject</p>
            <button onClick={() => setEditingSubject(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground text-center" placeholder="Icon" value={subjectForm.icon} onChange={e => setSubjectForm(f => ({ ...f, icon: e.target.value }))} />
            <input className="col-span-3 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" placeholder="Subject name *" value={subjectForm.name} onChange={e => setSubjectForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <input className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" placeholder="Description (optional)" value={subjectForm.description} onChange={e => setSubjectForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-2">
            <button onClick={saveSubject} disabled={savingSubject || !subjectForm.name.trim()} className="flex-1 bg-primary text-white text-sm font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40">
              {savingSubject ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
            <button onClick={() => onSubjectDelete(subject.id)} className="border border-destructive text-destructive text-sm font-semibold py-2 px-4 rounded-xl hover:bg-destructive/5">Delete Subject</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-secondary/40 transition-colors" onClick={() => setExpanded(e => !e)}>
          <span className="text-2xl flex-shrink-0">{subject.icon || "📚"}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground">{subject.name}</p>
            <p className="text-xs text-muted-foreground">
              {subject.grade} · {activeCount} active topic{activeCount !== 1 ? "s" : ""}
              {inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ""}
              {lackingCount > 0 && <span className="text-orange-600 font-semibold"> · ⚠️ {lackingCount} lacking (under 20 Qs)</span>}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={e => { e.stopPropagation(); setEditingSubject(true); setExpanded(true); }} className="text-muted-foreground hover:text-primary p-1"><Pencil className="w-4 h-4" /></button>
            <button onClick={async e => { e.stopPropagation(); await base44.entities.Subject.update(subject.id, { is_active: !subject.is_active }); onSubjectUpdate({ ...subject, is_active: !subject.is_active }); }} className="text-muted-foreground hover:text-primary p-1" title={subject.is_active === false ? "Publish" : "Unpublish"}>
              {subject.is_active === false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            <button onClick={e => { e.stopPropagation(); onSubjectDelete(subject.id); }} className="text-muted-foreground hover:text-destructive p-1" title="Delete subject"><Trash2 className="w-4 h-4" /></button>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
        </div>
      )}

      {expanded && (
        <div className="border-t border-border bg-secondary/20 p-4 space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: "active", label: `Active (${activeCount})` },
              { key: "lacking", label: `⚠️ Lacking — under 20 Qs (${lackingCount})` },
              { key: "inactive", label: `Inactive (${inactiveCount})` },
              { key: "all", label: `All (${topics.length})` },
            ].map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${filter === tab.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>{tab.label}</button>
            ))}
            <div className="flex-1" />
            <button onClick={() => { setAddingTopic(true); setExpanded(true); }} className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary text-white flex items-center gap-1"><Plus className="w-3 h-3" /> Add Topic</button>
          </div>

          {addingTopic && (
            <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">New Topic</p>
                <button onClick={() => setAddingTopic(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input className="col-span-2 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" placeholder="Topic name *" value={newTopic.name} onChange={e => setNewTopic(f => ({ ...f, name: e.target.value }))} />
                <input type="number" className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" placeholder="Order" value={newTopic.order} onChange={e => setNewTopic(f => ({ ...f, order: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Learning Objectives</label>
                <RichTextEditor value={newTopic.learning_objectives} onChange={v => setNewTopic(f => ({ ...f, learning_objectives: v }))} />
              </div>
              <button onClick={addTopic} disabled={savingTopic || !newTopic.name.trim()} className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">
                {savingTopic ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />} Add Topic
              </button>
            </div>
          )}

          <div className="space-y-2">
            {visibleTopics.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">{filter === "inactive" ? "No inactive topics" : "No topics yet — add one above"}</div>
            ) : (
              visibleTopics.map(t => (
                <TopicRow key={t.id} topic={t} questionCount={questionCounts[t.id] ?? 0} totalCount={totalCounts[t.id] ?? 0} onUpdate={updateTopic} onDelete={deleteTopic} onRefreshCounts={onRefreshCounts} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main CMS Component ───────────────────────────────────────────────────
export default function ContentCMS() {
  const [subjects, setSubjects] = useState([]);
  const [allTopics, setAllTopics] = useState([]);
  const [questionCounts, setQuestionCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshingCounts, setRefreshingCounts] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [addingSubject, setAddingSubject] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: "", grade: "Grade 7", icon: "📚", description: "" });
  const [saving, setSaving] = useState(false);

  const [totalCounts, setTotalCounts] = useState({});

  const refreshCounts = async () => {
    setRefreshingCounts(true);
    const res = await base44.functions.invoke("getTopicQuestionCounts", {}).catch(() => ({ data: { counts: {}, totalCounts: {} } }));
    setQuestionCounts(res?.data?.counts || {});
    setTotalCounts(res?.data?.totalCounts || {});
    setRefreshingCounts(false);
  };

  useEffect(() => {
    Promise.all([
      base44.entities.Subject.list(),
      base44.entities.Topic.list("order", 1000),
      base44.functions.invoke("getTopicQuestionCounts", {}).catch(() => ({ data: { counts: {}, totalCounts: {} } })),
    ]).then(([s, t, countsRes]) => {
      setSubjects(s.sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name)));
      setAllTopics(t);
      setQuestionCounts(countsRes?.data?.counts || {});
      setTotalCounts(countsRes?.data?.totalCounts || {});
      setLoading(false);
    });
  }, []);

  const createSubject = async () => {
    if (!subjectForm.name.trim()) return;
    setSaving(true);
    const saved = await base44.entities.Subject.create({ ...subjectForm, is_active: true });
    setSubjects(prev => [...prev, saved].sort((a, b) => a.grade.localeCompare(b.grade) || a.name.localeCompare(b.name)));
    setSubjectForm({ name: "", grade: "Grade 7", icon: "📚", description: "" });
    setAddingSubject(false);
    setSaving(false);
  };

  const updateSubject = (updated) => setSubjects(prev => prev.map(s => s.id === updated.id ? updated : s));
  const deleteSubject = async (id) => {
    if (!confirm("Delete this subject and all its topics? This cannot be undone.")) return;
    await base44.entities.Subject.delete(id);
    setSubjects(prev => prev.filter(s => s.id !== id));
    setAllTopics(prev => prev.filter(t => t.subject_id !== id));
  };

  const filteredSubjects = gradeFilter === "all" ? subjects : subjects.filter(s => s.grade === gradeFilter);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Content CMS</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{subjects.length} subjects · {allTopics.length} topics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshCounts}
            disabled={refreshingCounts}
            title="Refresh question counts"
            className="border border-border text-muted-foreground px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingCounts ? "animate-spin" : ""}`} />
            {refreshingCounts ? "Refreshing..." : "Refresh counts"}
          </button>
          <button onClick={() => setAddingSubject(true)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" /> Add Subject</button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {["all", "Grade 4", "Grade 5", "Grade 6", "Grade 7"].map(g => (
          <button key={g} onClick={() => setGradeFilter(g)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-colors ${gradeFilter === g ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}>
            {g === "all" ? "All Grades" : g}
          </button>
        ))}
      </div>

      {addingSubject && (
        <div className="bg-card border border-primary/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">New Subject</p>
            <button onClick={() => setAddingSubject(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <input className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground text-center" placeholder="Icon" value={subjectForm.icon} onChange={e => setSubjectForm(f => ({ ...f, icon: e.target.value }))} />
            <input className="col-span-3 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" placeholder="Subject name *" value={subjectForm.name} onChange={e => setSubjectForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={subjectForm.grade} onChange={e => setSubjectForm(f => ({ ...f, grade: e.target.value }))} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
              {["Grade 4", "Grade 5", "Grade 6", "Grade 7"].map(g => <option key={g}>{g}</option>)}
            </select>
            <input className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" placeholder="Description (optional)" value={subjectForm.description} onChange={e => setSubjectForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <button onClick={createSubject} disabled={saving || !subjectForm.name.trim()} className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />} Create Subject
          </button>
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>📏 <strong>Rule:</strong> a topic is good when it has <strong>20+ total questions</strong> (any status). Below 20 = lacking ⚠️. Click a subject to expand its topics; use <strong>Notes</strong> / <strong>Q's</strong> to edit content inline.</span>
      </div>

      <div className="space-y-3">
        {filteredSubjects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold">No subjects found</p>
          </div>
        ) : (
          filteredSubjects.map(subject => (
            <SubjectBlock key={subject.id} subject={subject} allTopics={allTopics} questionCounts={questionCounts} totalCounts={totalCounts} onSubjectUpdate={updateSubject} onSubjectDelete={deleteSubject} onRefreshCounts={refreshCounts} />
          ))
        )}
      </div>
    </div>
  );
}