import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Upload, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle,
  Loader2, Sparkles, FileText, BookOpen, X, Download
} from "lucide-react";

const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

const NOTES_CSV_TEMPLATE = `topic_name,overview,key_definitions,key_concepts,zimbabwe_examples,important_facts,common_mistakes,summary,exam_tips
Fractions,Fractions represent parts of a whole.,Numerator: top number. Denominator: bottom number.,To add fractions with same denominator add numerators.,Chipo shared 3/8 of bread...,Always simplify your answer.,Forgetting to simplify.,Fractions = parts of a whole.,Always check if fraction can be simplified.`;

const QUESTIONS_CSV_TEMPLATE = `question_text,optA,optB,optC,optD,correct_answer,explanation,difficulty
What is 2+2?,3,4,5,6,B,2+2 equals 4,Easy
Capital of Zimbabwe?,Harare,Bulawayo,Mutare,Gweru,A,Harare is the capital,Easy`;

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

function download(filename, content) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Notes Uploader Section ───────────────────────────────────────────────────
function NotesUploader({ subjectId, topicId, grade, subjectName, topicName, onSaved }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setRows(parseCSV(ev.target.result));
    reader.readAsText(f);
  };

  const addBlankRow = () => setRows(prev => [...prev, {
    topic_name: topicName || "",
    overview: "", key_definitions: "", key_concepts: "",
    zimbabwe_examples: "", important_facts: "", common_mistakes: "", summary: "", exam_tips: ""
  }]);

  const handleChange = (idx, field, val) => setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const handleRemove = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    let saved = 0;
    for (const row of rows) {
      await base44.entities.Note.create({
        topic_id: topicId,
        subject_id: subjectId,
        overview: row.overview || "",
        key_definitions: row.key_definitions || "",
        key_concepts: row.key_concepts || "",
        zimbabwe_examples: row.zimbabwe_examples || "",
        important_facts: row.important_facts || "",
        common_mistakes: row.common_mistakes || "",
        summary: row.summary || "",
        exam_tips: row.exam_tips || "",
        is_active: false,
        review_status: "pending_review",
        suggested_grade: grade,
        suggested_subject: subjectName,
        suggested_topic: row.topic_name || topicName,
      });
      saved++;
    }
    setResult({ saved });
    setRows([]);
    setSaving(false);
    if (onSaved) onSaved(saved);
  };

  const NOTE_FIELDS = ["overview","key_definitions","key_concepts","zimbabwe_examples","important_facts","common_mistakes","summary","exam_tips"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">Upload Notes (CSV or manual)</p>
        <button onClick={() => download("notes_template.csv", NOTES_CSV_TEMPLATE)} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
          <Download className="w-3 h-3" /> Template
        </button>
      </div>

      {rows.length === 0 && (
        <div className="flex gap-2">
          <label className="flex-1 flex flex-col items-center gap-1.5 border-2 border-dashed border-border rounded-xl p-3 cursor-pointer hover:border-primary/40 transition-colors text-center">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">Upload CSV</p>
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
          <button onClick={addBlankRow}
            className="flex-1 border-2 border-dashed border-border rounded-xl p-3 text-xs font-semibold text-muted-foreground hover:border-primary/40 flex flex-col items-center gap-1.5">
            <Plus className="w-5 h-5" /> Manual Entry
          </button>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 font-semibold flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" /> {result.saved} note(s) saved for review.
          <button onClick={() => setResult(null)} className="ml-auto underline font-normal">Add more</button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row, idx) => (
            <div key={idx} className="border border-border rounded-xl p-3 space-y-2 bg-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">Note {idx + 1}</span>
                <button onClick={() => handleRemove(idx)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" /></button>
              </div>
              {NOTE_FIELDS.map(field => (
                <div key={field}>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{field.replace(/_/g," ")}</label>
                  <textarea value={row[field] || ""} onChange={e => handleChange(idx, field, e.target.value)}
                    rows={2} className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground resize-none mt-0.5" />
                </div>
              ))}
            </div>
          ))}
          <button onClick={handleSave} disabled={saving || rows.length === 0}
            className="w-full bg-green-600 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-40">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
            Save {rows.length} Note(s) to Review
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Questions Uploader Section ───────────────────────────────────────────────
function QuestionsUploader({ subjectId, topicId, grade, subjectName, topicName, onSaved }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [gapFilling, setGapFilling] = useState(false);
  const [result, setResult] = useState(null);

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
        prompt: `Question: ${r.question_text}\nOptions: A) ${r.optA}  B) ${r.optB}  C) ${r.optC}  D) ${r.optD}\nCorrect: ${r.correct_answer}\nSubject: ${subjectName}, Topic: ${topicName}\nWrite a 1-2 sentence explanation for why ${r.correct_answer} is correct.`,
        model: "gemini_3_flash",
      });
      updated[i] = { ...r, explanation: typeof res === "string" ? res : "" };
      setRows([...updated]);
    }
    setGapFilling(false);
  };

  const handleSave = async () => {
    setSaving(true);
    for (const row of validRows) {
      await base44.entities.Question.create({
        topic_id: topicId,
        subject_id: subjectId,
        question_text: row.question_text,
        options: [
          { label: "A", text: row.optA || "" },
          { label: "B", text: row.optB || "" },
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
        paper_type: "topic",
        suggested_grade: grade,
        suggested_subject: subjectName,
        suggested_topic: topicName,
      });
    }
    setResult({ saved: validRows.length, skipped: rows.length - validRows.length });
    setRows([]);
    setSaving(false);
    if (onSaved) onSaved(validRows.length);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-muted-foreground">Upload Questions (CSV or manual)</p>
        <button onClick={() => download("questions_template.csv", QUESTIONS_CSV_TEMPLATE)} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
          <Download className="w-3 h-3" /> Template
        </button>
      </div>

      {rows.length === 0 && (
        <div className="flex gap-2">
          <label className="flex-1 flex flex-col items-center gap-1.5 border-2 border-dashed border-border rounded-xl p-3 cursor-pointer hover:border-primary/40 transition-colors text-center">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">Upload CSV</p>
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
          <button onClick={addBlankRow}
            className="flex-1 border-2 border-dashed border-border rounded-xl p-3 text-xs font-semibold text-muted-foreground hover:border-primary/40 flex flex-col items-center gap-1.5">
            <Plus className="w-5 h-5" /> Manual Entry
          </button>
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-xs text-green-700 font-semibold flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" /> {result.saved} question(s) saved for review. {result.skipped > 0 && <span className="text-amber-600">{result.skipped} skipped.</span>}
          <button onClick={() => setResult(null)} className="ml-auto underline font-normal">Add more</button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">{rows.length} rows · {validRows.length} valid</span>
            {missingExplanations > 0 && (
              <button onClick={gapFillExplanations} disabled={gapFilling}
                className="flex items-center gap-1 text-xs font-semibold text-violet-700 border border-violet-300 px-2 py-1 rounded-lg disabled:opacity-40">
                {gapFilling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Fill {missingExplanations} Explanations
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {rows.map((row, idx) => (
              <div key={idx} className="border border-border rounded-xl p-2.5 bg-card space-y-1.5 text-xs">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-muted-foreground w-4">{idx+1}.</span>
                  <div className="flex-1 space-y-1.5">
                    <textarea value={row.question_text || ""} onChange={e => handleChange(idx, "question_text", e.target.value)}
                      rows={2} placeholder="Question *"
                      className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground resize-none" />
                    <div className="grid grid-cols-2 gap-1">
                      {["optA","optB","optC","optD"].map(o => (
                        <input key={o} value={row[o]||""} onChange={e => handleChange(idx, o, e.target.value)}
                          placeholder={`Option ${o.slice(3)}`}
                          className="border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground" />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <select value={row.correct_answer||""} onChange={e => handleChange(idx,"correct_answer",e.target.value)}
                        className="border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground">
                        <option value="">Ans*</option>
                        {["A","B","C","D"].map(l=><option key={l}>{l}</option>)}
                      </select>
                      <select value={row.difficulty||"Standard"} onChange={e => handleChange(idx,"difficulty",e.target.value)}
                        className="border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground">
                        {["Easy","Standard","Advanced"].map(d=><option key={d}>{d}</option>)}
                      </select>
                      <button onClick={() => handleRemove(idx)} className="ml-auto text-xs text-destructive border border-destructive/30 rounded-lg px-2 py-1">✕</button>
                    </div>
                    <input value={row.explanation||""} onChange={e => handleChange(idx,"explanation",e.target.value)}
                      placeholder="Explanation (or AI fill above)"
                      className="w-full border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setRows(prev => [...prev, { question_text:"",optA:"",optB:"",optC:"",optD:"",correct_answer:"",difficulty:"Standard",explanation:"" }])}
            className="w-full border border-dashed border-border text-xs py-2 rounded-lg text-muted-foreground hover:border-primary/40">
            + Add another question
          </button>
          <button onClick={handleSave} disabled={saving || validRows.length === 0}
            className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 disabled:opacity-40">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Save {validRows.length} Question(s) to Review
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BulkContentUploader() {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  const [grade, setGrade] = useState("Grade 7");
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [contentType, setContentType] = useState("questions"); // "questions" | "notes" | "both"
  const [activeSection, setActiveSection] = useState(null); // "notes" | "questions"

  const [savedNotes, setSavedNotes] = useState(0);
  const [savedQuestions, setSavedQuestions] = useState(0);

  useEffect(() => {
    Promise.all([
      base44.entities.Subject.list(),
      base44.entities.Topic.list("order", 1000),
    ]).then(([s, t]) => { setSubjects(s); setTopics(t); setLoading(false); });
  }, []);

  const filteredSubjects = subjects.filter(s => s.grade === grade);
  const filteredTopics = topics.filter(t => t.subject_id === subjectId && t.is_active !== false);

  const selectedSubject = subjects.find(s => s.id === subjectId);
  const selectedTopic = topics.find(t => t.id === topicId);

  const canProceed = subjectId && topicId;

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-10">
      <div>
        <h2 className="text-lg font-bold text-foreground">Bulk Content Uploader</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Upload notes and/or questions for a specific topic. All go to Review before publishing.</p>
      </div>

      {/* Step 1: Select Target */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">Step 1 — Select Target</p>

        <div className="grid grid-cols-2 gap-2">
          <select value={grade} onChange={e => { setGrade(e.target.value); setSubjectId(""); setTopicId(""); }}
            className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
            {GRADES.map(g => <option key={g}>{g}</option>)}
          </select>
          <select value={subjectId} onChange={e => { setSubjectId(e.target.value); setTopicId(""); }}
            className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
            <option value="">Select Subject *</option>
            {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <select value={topicId} onChange={e => setTopicId(e.target.value)} disabled={!subjectId}
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground disabled:opacity-50">
          <option value="">Select Topic *</option>
          {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {canProceed && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 text-xs text-primary font-semibold">
            ✓ Target: {selectedSubject?.name} → {selectedTopic?.name} ({grade})
          </div>
        )}
      </div>

      {/* Step 2: Choose Content Type */}
      {canProceed && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">Step 2 — What are you uploading?</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "questions", label: "Questions", icon: "❓" },
              { key: "notes", label: "Notes", icon: "📖" },
              { key: "both", label: "Both", icon: "📦" },
            ].map(opt => (
              <button key={opt.key} onClick={() => { setContentType(opt.key); setActiveSection(opt.key === "both" ? "notes" : opt.key); }}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-colors ${contentType === opt.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                <span className="text-base">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Upload sections */}
      {canProceed && activeSection && (
        <div className="space-y-4">
          {/* Saved banner */}
          {(savedNotes > 0 || savedQuestions > 0) && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-xs text-green-700 font-semibold">
              ✅ Session: {savedNotes} note(s) + {savedQuestions} question(s) saved to Review queue.
            </div>
          )}

          {/* Notes section */}
          {(contentType === "notes" || contentType === "both") && (
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold text-foreground">Notes for {selectedTopic?.name}</p>
              </div>
              <NotesUploader
                subjectId={subjectId} topicId={topicId}
                grade={grade} subjectName={selectedSubject?.name} topicName={selectedTopic?.name}
                onSaved={n => setSavedNotes(prev => prev + n)}
              />
            </div>
          )}

          {/* Questions section */}
          {(contentType === "questions" || contentType === "both") && (
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <p className="text-sm font-bold text-foreground">Questions for {selectedTopic?.name}</p>
              </div>
              <QuestionsUploader
                subjectId={subjectId} topicId={topicId}
                grade={grade} subjectName={selectedSubject?.name} topicName={selectedTopic?.name}
                onSaved={n => setSavedQuestions(prev => prev + n)}
              />
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
            📋 All uploads go to <strong>Draft</strong> status. Go to the <strong>Review</strong> tab to approve and publish content for students.
          </div>
        </div>
      )}
    </div>
  );
}