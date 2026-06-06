import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2, Plus, Sparkles, AlertTriangle, Check, Users } from "lucide-react";
import { EXERCISE_TYPES, DIFFICULTIES, newQuestionId, validateQuestion } from "@/lib/exerciseHelpers";
import QuestionEditorRow from "./QuestionEditorRow";
import ExerciseQuestionGenerator from "./ExerciseQuestionGenerator";

const emptyQuestion = () => ({
  id: newQuestionId(),
  type: "mcq",
  prompt: "",
  options: ["", ""],
  correct_answer: "",
  difficulty: "medium",
  marks: 1,
});

export default function ExerciseFormModal({ teacher, classes, schoolId, exercise, prefill, onClose, onSaved }) {
  const isEdit = !!exercise;

  // Build instructions text from a curriculum topic's learning objectives.
  const prefillInstructions = prefill?.learning_objectives?.length
    ? `Learning objectives:\n${prefill.learning_objectives.map(o => `• ${o}`).join("\n")}`
    : "";
  const prefillTitle = prefill
    ? `${prefill.topic}${prefill.subtopic ? " — " + prefill.subtopic : ""}`
    : "";
  // If prefill has a grade, auto-pick the first matching class; otherwise fall back to the teacher's first class.
  const prefillClassId = prefill
    ? (classes.find(c => c.grade === prefill.grade)?.id || classes[0]?.id || "")
    : "";

  const [subjects, setSubjects] = useState([]);
  // For NEW exercises, teachers can select multiple classes at once.
  // For EDITs, we stick with the single class the exercise is already tied to.
  const [selectedClassIds, setSelectedClassIds] = useState(
    isEdit
      ? [exercise.class_id]
      : (prefillClassId ? [prefillClassId] : [])
  );
  const [form, setForm] = useState({
    class_id: exercise?.class_id || prefillClassId,
    subject_id: exercise?.subject_id || "",
    title: exercise?.title || prefillTitle,
    instructions: exercise?.instructions || prefillInstructions,
    due_date: exercise?.due_date || "",
    exercise_type: exercise?.exercise_type || "homework",
    difficulty: exercise?.difficulty || "mixed",
    duration_minutes: exercise?.duration_minutes ?? "",
    auto_marked: exercise?.auto_marked ?? false,
    release_answers: exercise?.release_answers ?? false,
    questions: exercise?.questions?.length ? exercise.questions : [],
    topic_ids: exercise?.topic_ids || (prefill ? [prefill.id] : []),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    base44.entities.Subject.filter({ is_active: true }, "name", 200).then(setSubjects).catch(() => {});
  }, []);

  // Once subjects load, auto-match the curriculum topic's subject by name.
  // Tries exact match first, then substring either direction (e.g. "Maths" ↔ "Mathematics").
  useEffect(() => {
    if (!prefill?.subject || form.subject_id || subjects.length === 0) return;
    const targetGrade = prefill.grade;
    const key = prefill.subject.trim().toLowerCase();
    const gradeOk = (s) => !targetGrade || !s.grade || s.grade === targetGrade;
    const pool = subjects.filter(gradeOk);
    const exact = pool.find(s => (s.name || "").trim().toLowerCase() === key);
    const partial = !exact && pool.find(s => {
      const n = (s.name || "").trim().toLowerCase();
      return n && (n.includes(key) || key.includes(n));
    });
    const match = exact || partial;
    if (match) setForm(f => ({ ...f, subject_id: match.id }));
  }, [subjects, prefill, form.subject_id]);

  // Use the first selected class as the "reference" for grade-based subject filtering.
  const referenceClassId = isEdit ? form.class_id : (selectedClassIds[0] || form.class_id);
  const selectedClass = classes.find(c => c.id === referenceClassId);

  const toggleClass = (id) => {
    setSelectedClassIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  const selectAllClasses = () => {
    if (selectedClassIds.length === classes.length) setSelectedClassIds([]);
    else setSelectedClassIds(classes.map(c => c.id));
  };
  // Filter to subjects for this class's grade, then dedupe by name (case-insensitive, trimmed)
  // so typos like "Maths" vs "Mathematics" don't both appear — keep the most recently updated one.
  const filteredSubjects = (() => {
    const pool = selectedClass
      ? subjects.filter(s => !s.grade || s.grade === selectedClass.grade)
      : subjects;
    const byKey = new Map();
    for (const s of pool) {
      const key = (s.name || "").trim().toLowerCase();
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, s);
    }
    return Array.from(byKey.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  })();

  const addQuestion = () => setForm(f => ({ ...f, questions: [...f.questions, emptyQuestion()], auto_marked: true }));
  const updateQuestion = (i, q) => setForm(f => ({ ...f, questions: f.questions.map((x, idx) => idx === i ? q : x) }));
  const removeQuestion = (i) => setForm(f => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }));
  const appendQuestions = (newQs) => setForm(f => ({ ...f, questions: [...f.questions, ...newQs], auto_marked: true }));

  const validateQuestions = () => {
    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];
      if (!q.prompt?.trim()) return `Question ${i + 1}: prompt is required`;
      if (!q.correct_answer?.trim()) return `Question ${i + 1}: correct answer is required`;
      if (q.type === "mcq") {
        const opts = (q.options || []).filter(o => o.trim());
        if (opts.length < 2) return `Question ${i + 1}: at least 2 options needed`;
        if (!opts.includes(q.correct_answer)) return `Question ${i + 1}: mark a correct option`;
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const qErr = form.auto_marked && form.questions.length === 0
      ? "Auto-marked exercise needs at least one question"
      : validateQuestions();
    if (qErr) { setErr(qErr); return; }

    setSaving(true);
    try {
      const basePayload = {
        teacher_email: teacher.email,
        school_id: schoolId,
        subject_id: form.subject_id,
        title: form.title.trim(),
        instructions: form.instructions.trim(),
        due_date: form.due_date,
        assigned_date: new Date().toISOString().split("T")[0],
        exercise_type: form.exercise_type,
        difficulty: form.difficulty,
        duration_minutes: form.duration_minutes === "" ? undefined : Number(form.duration_minutes),
        auto_marked: form.auto_marked,
        release_answers: form.release_answers,
        questions: form.questions,
        topic_ids: form.topic_ids,
        is_active: true,
      };
      if (isEdit) {
        await base44.entities.SchoolHomework.update(exercise.id, {
          ...basePayload,
          class_id: form.class_id,
          grade: selectedClass?.grade,
        });
      } else {
        // Assign to every selected class (one SchoolHomework record per class).
        const targets = selectedClassIds
          .map(id => classes.find(c => c.id === id))
          .filter(Boolean);
        if (targets.length === 0) { setErr("Pick at least one class"); setSaving(false); return; }
        await Promise.all(
          targets.map(c =>
            base44.entities.SchoolHomework.create({
              ...basePayload,
              class_id: c.id,
              grade: c.grade,
            })
          )
        );
      }
      onSaved?.();
    } catch (e2) {
      setErr(e2.message || "Could not save exercise");
    } finally {
      setSaving(false);
    }
  };

  const isTimed = ["mock_exam", "test", "quiz"].includes(form.exercise_type);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between z-10">
          <h3 className="font-bold text-base text-foreground">{isEdit ? "Edit Exercise" : "Create Exercise"}</h3>
          <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <Select value={form.exercise_type} onValueChange={v => setForm({ ...form, exercise_type: v })}>
            <SelectTrigger><SelectValue placeholder="Exercise type *" /></SelectTrigger>
            <SelectContent>
              {EXERCISE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.emoji} {t.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {isEdit ? (
            <Select value={form.class_id} onValueChange={v => setForm({ ...form, class_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select class *" /></SelectTrigger>
              <SelectContent>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.grade})</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <div className="border border-border rounded-xl p-3 space-y-2 bg-background">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Assign to classes * ({selectedClassIds.length} selected)
                </p>
                {classes.length > 1 && (
                  <button
                    type="button"
                    onClick={selectAllClasses}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {selectedClassIds.length === classes.length ? "Clear all" : "Select all"}
                  </button>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {classes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">No classes yet</p>
                ) : classes.map(c => {
                  const checked = selectedClassIds.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggleClass(c.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                        checked ? "bg-primary/10 border-primary/40" : "bg-card border-border hover:bg-secondary"
                      }`}
                    >
                      <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${
                        checked ? "bg-primary border-primary" : "border-border"
                      }`}>
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className="text-sm font-semibold text-foreground flex-1 truncate">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground">{c.grade}</span>
                    </button>
                  );
                })}
              </div>
              {selectedClassIds.length > 1 && (
                <p className="text-[11px] text-muted-foreground">
                  ✨ One exercise will be created for each class ({selectedClassIds.length} total).
                </p>
              )}
            </div>
          )}

          <Select value={form.subject_id} onValueChange={v => setForm({ ...form, subject_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select subject *" /></SelectTrigger>
            <SelectContent>
              {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <Textarea placeholder="Instructions" rows={3} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Due date *</label>
              <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Difficulty</label>
              <Select value={form.difficulty} onValueChange={v => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isTimed && (
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Time limit (minutes)</label>
              <Input type="number" min="1" placeholder="e.g. 30" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
            </div>
          )}

          {/* Auto-marking toggles — prominent pill switches so teachers clearly see them. */}
          <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-3 space-y-3">
            <ToggleRow
              icon={<Sparkles className="w-4 h-4 text-primary" />}
              title="Auto-mark structured questions"
              subtitle="MCQ, true/false, fill-in & short answer are graded instantly."
              checked={form.auto_marked}
              onChange={(v) => setForm({ ...form, auto_marked: v })}
            />
            <ToggleRow
              title="Release answers to students"
              subtitle={'If off, students see only "Submitted" — score & correct answers hidden until you release.'}
              checked={form.release_answers}
              onChange={(v) => setForm({ ...form, release_answers: v })}
            />
          </div>

          {/* AI question generator — only when creating an exercise from a curriculum topic */}
          {prefill && !isEdit && (
            <ExerciseQuestionGenerator
              prefill={prefill}
              difficulty={form.difficulty}
              onAppend={appendQuestions}
            />
          )}

          {/* Questions — always visible when editing or when auto-mark is on, so teachers can
              view / edit / add / delete questions at any time. */}
          {(form.auto_marked || isEdit || form.questions.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Questions ({form.questions.length})</p>
                <button type="button" onClick={addQuestion} className="text-xs font-bold text-primary inline-flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add question
                </button>
              </div>

              {(() => {
                const badCount = form.questions.filter(q => validateQuestion(q).length > 0).length;
                if (badCount === 0) return null;
                return (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-900">
                      <span className="font-bold">{badCount} question{badCount !== 1 ? "s" : ""} need attention.</span>{" "}
                      Each one is highlighted below — fix the issue or tap the trash icon to delete it before saving.
                    </p>
                  </div>
                );
              })()}
              {form.questions.length === 0 ? (
                <button type="button" onClick={addQuestion} className="w-full border-2 border-dashed border-border rounded-2xl p-4 text-sm text-muted-foreground">
                  + Tap to add your first question
                </button>
              ) : (
                form.questions.map((q, i) => (
                  <QuestionEditorRow
                    key={q.id}
                    index={i}
                    question={q}
                    onChange={(nq) => updateQuestion(i, nq)}
                    onRemove={() => removeQuestion(i)}
                  />
                ))
              )}
            </div>
          )}

          {err && <p className="text-xs text-destructive">{err}</p>}

          <button
            type="submit"
            disabled={
              saving ||
              !form.title.trim() ||
              !form.subject_id ||
              !form.due_date ||
              (isEdit ? !form.class_id : selectedClassIds.length === 0)
            }
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving
              ? "Saving..."
              : isEdit
                ? "Update Exercise"
                : selectedClassIds.length > 1
                  ? `Create for ${selectedClassIds.length} classes`
                  : "Create Exercise"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ToggleRow({ icon, title, subtitle, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground flex items-center gap-1">
          {icon}
          {title}
        </p>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors border-2 ${
          checked ? "bg-primary border-primary" : "bg-muted border-border"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}