import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Clock, FileText,
  CheckCircle, Upload, Loader2, AlertTriangle, Eye, Sparkles, X
} from "lucide-react";

const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

// ─── Step 1: Create/Select Mock Exam ─────────────────────────────────────────
function MockExamForm({ subjects, onCreated }) {
  const [form, setForm] = useState({
    title: "", subject_id: "", grade: "Grade 7",
    duration_minutes: 60, total_marks: 40, instructions: "Answer all questions."
  });
  const [saving, setSaving] = useState(false);

  const filteredSubjects = subjects.filter(s => s.grade === form.grade);

  const handleCreate = async () => {
    if (!form.title || !form.subject_id) return;
    setSaving(true);
    const saved = await base44.entities.MockExam.create({
      ...form,
      question_ids: [],
      is_active: false,
    });
    onCreated(saved);
    setSaving(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <p className="font-bold text-sm text-foreground">Step 1 — Create Mock Exam</p>

      <div className="grid grid-cols-2 gap-3">
        <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value, subject_id: "" }))}
          className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
          {GRADES.map(g => <option key={g}>{g}</option>)}
        </select>
        <select value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}
          className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
          <option value="">Select Subject *</option>
          {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        placeholder="Exam title e.g. Grade 7 Maths Mock Exam 1 *"
        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" />

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input type="number" value={form.duration_minutes} min={5}
            onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))}
            className="flex-1 text-sm bg-transparent text-foreground focus:outline-none" />
          <span className="text-xs text-muted-foreground">min</span>
        </div>
        <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2">
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input type="number" value={form.total_marks} min={1}
            onChange={e => setForm(f => ({ ...f, total_marks: Number(e.target.value) }))}
            className="flex-1 text-sm bg-transparent text-foreground focus:outline-none" />
          <span className="text-xs text-muted-foreground">marks</span>
        </div>
      </div>

      <textarea value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
        placeholder="Exam instructions..."
        rows={2}
        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground resize-none" />

      <button onClick={handleCreate} disabled={saving || !form.title || !form.subject_id}
        className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Create Mock Exam & Add Questions
      </button>
    </div>
  );
}

// ─── Step 2: Bulk Question Upload (CSV or Paste) ──────────────────────────────
const CSV_TEMPLATE = `question_text,optA,optB,optC,optD,correct_answer,explanation,difficulty
What is 2+2?,3,4,5,6,B,2+2 equals 4,Easy
What is the capital of Zimbabwe?,Harare,Bulawayo,Mutare,Gweru,A,Harare is the capital,Easy`;

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
      else { cur += line[i]; }
    }
    vals.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").replace(/^"|"$/g, ""); });
    return obj;
  });
}

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "mock_exam_questions_template.csv"; a.click();
  URL.revokeObjectURL(url);
}

function QuestionRow({ q, idx, onChange, onRemove }) {
  const hasIssues = !q.correct_answer || !q.optA || !q.optB;
  return (
    <div className={`rounded-xl border p-3 space-y-2 text-xs ${hasIssues ? "border-amber-400/60 bg-amber-50/30" : "border-border bg-card"}`}>
      <div className="flex items-start gap-2">
        <span className="font-bold text-muted-foreground w-5 flex-shrink-0 mt-1">{idx + 1}.</span>
        <div className="flex-1 space-y-2">
          <textarea value={q.question_text || ""} onChange={e => onChange(idx, "question_text", e.target.value)}
            rows={2} placeholder="Question text *"
            className="w-full border border-border rounded-lg px-2 py-1.5 text-xs bg-background text-foreground resize-none" />
          <div className="grid grid-cols-2 gap-2">
            {["optA","optB","optC","optD"].map(opt => (
              <input key={opt} value={q[opt] || ""} onChange={e => onChange(idx, opt, e.target.value)}
                placeholder={`Option ${opt.slice(3)} *`}
                className="border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select value={q.correct_answer || ""} onChange={e => onChange(idx, "correct_answer", e.target.value)}
              className="border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground">
              <option value="">Answer *</option>
              {["A","B","C","D"].map(l => <option key={l}>{l}</option>)}
            </select>
            <select value={q.difficulty || "Standard"} onChange={e => onChange(idx, "difficulty", e.target.value)}
              className="border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground">
              {["Easy","Standard","Advanced"].map(d => <option key={d}>{d}</option>)}
            </select>
            <button onClick={() => onRemove(idx)} className="text-xs text-destructive border border-destructive/30 rounded-lg px-2 py-1 hover:bg-destructive/5">
              Remove
            </button>
          </div>
          <input value={q.explanation || ""} onChange={e => onChange(idx, "explanation", e.target.value)}
            placeholder="Explanation (AI will fill if blank)"
            className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground" />
        </div>
      </div>
    </div>
  );
}

function BulkQuestionUploader({ exam, subjects, onQuestionsAdded }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [gapFilling, setGapFilling] = useState(false);
  const [result, setResult] = useState(null);
  const [inputMode, setInputMode] = useState("csv"); // "csv" | "manual"

  const subject = subjects.find(s => s.id === exam.subject_id);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setRows(parseCSV(ev.target.result));
    reader.readAsText(f);
  };

  const addBlankRow = () => setRows(prev => [...prev, { question_text: "", optA: "", optB: "", optC: "", optD: "", correct_answer: "", difficulty: "Standard", explanation: "" }]);

  const handleChange = (idx, field, val) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const handleRemove = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const validRows = rows.filter(r => r.question_text && r.correct_answer && r.optA && r.optB);
  const missingExplanations = rows.filter(r => !r.explanation?.trim()).length;

  const gapFillExplanations = async () => {
    setGapFilling(true);
    const updated = [...rows];
    for (let i = 0; i < updated.length; i++) {
      const r = updated[i];
      if (r.explanation?.trim()) continue;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Question: ${r.question_text}\nOptions: A) ${r.optA}  B) ${r.optB}  C) ${r.optC}  D) ${r.optD}\nCorrect Answer: ${r.correct_answer}\n\nWrite a 1-2 sentence explanation for why ${r.correct_answer} is correct. Subject: ${subject?.name || ""}`,
        model: "gemini_3_flash",
      });
      updated[i] = { ...r, explanation: typeof res === "string" ? res : res?.explanation || "" };
      setRows([...updated]);
    }
    setGapFilling(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const newIds = [...(exam.question_ids || [])];
    for (const row of validRows) {
      const saved = await base44.entities.Question.create({
        subject_id: exam.subject_id,
        question_text: row.question_text,
        options: [
          { label: "A", text: row.optA },
          { label: "B", text: row.optB },
          { label: "C", text: row.optC || "" },
          { label: "D", text: row.optD || "" },
        ],
        correct_answer: row.correct_answer,
        explanation: row.explanation || "",
        difficulty: row.difficulty || "Standard",
        question_type: "mcq",
        marks: 1,
        is_active: false,
        review_status: "pending_review",
        paper_type: "mock_exam",
        suggested_subject: subject?.name || "",
        suggested_grade: exam.grade,
      });
      newIds.push(saved.id);
    }
    await base44.entities.MockExam.update(exam.id, { question_ids: newIds, total_marks: newIds.length });
    setResult({ added: validRows.length, skipped: rows.length - validRows.length });
    setRows([]);
    setSaving(false);
    onQuestionsAdded(newIds.length);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
        <p className="font-bold">📋 Uploading questions for: <span className="text-blue-900">{exam.title}</span></p>
        <p>{exam.grade} · {subject?.name} · {exam.duration_minutes} min · Target: {exam.total_marks} marks</p>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setInputMode("csv")}
          className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${inputMode === "csv" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
          📂 Upload CSV
        </button>
        <button onClick={() => { setInputMode("manual"); if (rows.length === 0) addBlankRow(); }}
          className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${inputMode === "manual" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
          ✏️ Manual Entry
        </button>
      </div>

      {inputMode === "csv" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">CSV columns: question_text, optA, optB, optC, optD, correct_answer, explanation, difficulty</p>
            <button onClick={downloadTemplate} className="text-xs text-primary font-semibold hover:underline">Download Template</button>
          </div>
          <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-5 cursor-pointer hover:border-primary/40 transition-colors">
            <Upload className="w-6 h-6 text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Click to upload CSV</p>
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
        </div>
      )}

      {inputMode === "manual" && (
        <button onClick={addBlankRow}
          className="w-full border-2 border-dashed border-border rounded-xl py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/40 flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> Add Question
        </button>
      )}

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">{rows.length} questions · {validRows.length} valid · {rows.length - validRows.length} issues</span>
            {missingExplanations > 0 && (
              <button onClick={gapFillExplanations} disabled={gapFilling}
                className="flex items-center gap-1 text-xs font-semibold text-violet-700 border border-violet-300 px-2 py-1 rounded-lg hover:bg-violet-50 disabled:opacity-40">
                {gapFilling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Fill {missingExplanations} Missing Explanations
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {rows.map((q, idx) => (
              <QuestionRow key={idx} q={q} idx={idx} onChange={handleChange} onRemove={handleRemove} />
            ))}
          </div>

          <button onClick={handleSave} disabled={saving || validRows.length === 0}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Save {validRows.length} Questions to Review Queue
          </button>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-700 font-semibold">
          <CheckCircle className="w-4 h-4" />
          {result.added} questions saved for review.
          {result.skipped > 0 && <span className="text-amber-600 ml-1">{result.skipped} skipped (invalid).</span>}
          <button onClick={() => setResult(null)} className="ml-auto text-xs font-normal underline">Add more</button>
        </div>
      )}
    </div>
  );
}

// ─── Exam Card ────────────────────────────────────────────────────────────────
function ExamCard({ exam, subjects, onDelete, onPublish, onAddQuestions }) {
  const [open, setOpen] = useState(false);
  const subject = subjects.find(s => s.id === exam.subject_id);
  const qCount = (exam.question_ids || []).length;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-xs">
          {exam.exam_number ? `#${exam.exam_number}` : "🎓"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{exam.title}</p>
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            <span className="text-xs text-muted-foreground">{exam.grade} · {subject?.name} · {exam.duration_minutes}min</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${qCount === 0 ? "bg-red-100 text-red-700" : qCount < exam.total_marks ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
              {qCount}/{exam.total_marks} Qs
            </span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${exam.is_active ? "bg-green-100 text-green-700" : "bg-secondary text-muted-foreground"}`}>
              {exam.is_active ? "Published" : "Draft"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => onAddQuestions(exam)}
            className="text-xs font-semibold text-primary border border-primary/30 px-2 py-1 rounded-lg hover:bg-primary/5">
            + Questions
          </button>
          {!exam.is_active && qCount > 0 && (
            <button onClick={() => onPublish(exam)}
              className="text-xs font-semibold text-green-700 border border-green-300 px-2 py-1 rounded-lg hover:bg-green-50">
              Publish
            </button>
          )}
          <button onClick={() => setOpen(o => !o)} className="text-muted-foreground">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={() => onDelete(exam.id)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {open && exam.instructions && (
        <div className="border-t border-border bg-secondary/20 px-4 py-3 text-xs text-muted-foreground">
          📋 {exam.instructions}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MockExamBuilder() {
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "create" | "upload"
  const [activeExam, setActiveExam] = useState(null);
  const [filterGrade, setFilterGrade] = useState("all");

  useEffect(() => {
    Promise.all([
      base44.entities.Subject.list(),
      base44.entities.MockExam.list("-created_date", 100),
    ]).then(([s, e]) => { setSubjects(s); setExams(e); setLoading(false); });
  }, []);

  const handleCreated = (exam) => {
    setExams(prev => [exam, ...prev]);
    setActiveExam(exam);
    setView("upload");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this mock exam?")) return;
    await base44.entities.MockExam.delete(id);
    setExams(prev => prev.filter(e => e.id !== id));
  };

  const handlePublish = async (exam) => {
    await base44.entities.MockExam.update(exam.id, { is_active: true });
    setExams(prev => prev.map(e => e.id === exam.id ? { ...e, is_active: true } : e));
  };

  const handleQuestionsAdded = (newCount) => {
    setExams(prev => prev.map(e => e.id === activeExam?.id ? { ...e, total_marks: newCount } : e));
    setActiveExam(prev => prev ? { ...prev, total_marks: newCount } : prev);
  };

  const displayed = filterGrade === "all" ? exams : exams.filter(e => e.grade === filterGrade);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Mock Exam Builder</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Create exams, bulk upload questions, review then publish.</p>
        </div>
        {view === "list" && (
          <button onClick={() => setView("create")}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Exam
          </button>
        )}
        {view !== "list" && (
          <button onClick={() => { setView("list"); setActiveExam(null); }}
            className="text-sm font-semibold text-muted-foreground border border-border px-3 py-2 rounded-xl hover:bg-secondary flex items-center gap-1">
            <X className="w-4 h-4" /> Cancel
          </button>
        )}
      </div>

      {view === "create" && <MockExamForm subjects={subjects} onCreated={handleCreated} />}

      {view === "upload" && activeExam && (
        <div className="space-y-4">
          <BulkQuestionUploader exam={activeExam} subjects={subjects} onQuestionsAdded={handleQuestionsAdded} />
          <button onClick={() => setView("list")}
            className="w-full border border-border text-sm font-semibold py-2.5 rounded-xl text-muted-foreground hover:bg-secondary flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" /> Done — Review Questions in Review Tab
          </button>
        </div>
      )}

      {view === "list" && (
        <div className="space-y-4">
          {/* Grade filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {["all", ...GRADES].map(g => (
              <button key={g} onClick={() => setFilterGrade(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-colors ${filterGrade === g ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {g === "all" ? "All Grades" : g}
              </button>
            ))}
          </div>

          {displayed.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-semibold">No mock exams yet — click "New Exam" to start</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map(exam => (
                <ExamCard key={exam.id} exam={exam} subjects={subjects}
                  onDelete={handleDelete} onPublish={handlePublish}
                  onAddQuestions={e => { setActiveExam(e); setView("upload"); }} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}