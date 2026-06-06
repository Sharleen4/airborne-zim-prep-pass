import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Upload, CheckCircle, XCircle, Loader2, Trash2,
  ChevronDown, ChevronUp, AlertTriangle, BookOpen, HelpCircle, FileSpreadsheet,
  Clock, FileText, Edit3, ShieldCheck, Eye, RotateCcw, ClipboardPaste, FileType
} from "lucide-react";
import NotesCsvUploader from "./NotesCsvUploader";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAPER_TYPES = [
  { value: "topic",      label: "Topic Questions", icon: "📖" },
  { value: "exam_paper", label: "Full ZIMSEC Paper", icon: "📝" },
  { value: "mock_exam",  label: "Mock Exam Paper",   icon: "🎓" },
];

const DEFAULT_DURATIONS = { topic: null, exam_paper: 120, mock_exam: 60 };
const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

const STATUS_META = {
  pending_review: { label: "Pending Review", color: "bg-amber-100 text-amber-700 border-amber-300" },
  approved:       { label: "Approved",       color: "bg-green-100 text-green-700 border-green-300" },
  rejected:       { label: "Rejected",       color: "bg-red-100 text-red-700 border-red-300" },
};

// ─── AI Prompts ───────────────────────────────────────────────────────────────
const buildQuestionsPrompt = (content) => {
  // Count how many numbered questions appear in the content so we can tell the AI exactly how many to extract
  const numberedMatches = content ? (content.match(/^##?\s*\*?\*?\d+\.|^\d+\./gm) || []) : [];
  const expectedCount = numberedMatches.length > 0 ? numberedMatches.length : "all";

  return `You are a ZIMSEC curriculum expert and teacher. Your ONLY task is to parse the content below and return a JSON array containing EVERY single numbered question.

EXPECTED OUTPUT: ${expectedCount} question objects. You MUST return exactly ${expectedCount} questions — one per numbered item in the content.

The content format may be:
- Raw exam paper text with numbered questions and A/B/C/D options
- Structured markdown where correct answers are marked with **bold text** and/or ✅ emoji
- A mix of both

PARSING RULES — follow exactly:
1. Each heading like "## 1." or "## **1.**" or "1." starts a NEW question. Never merge two numbered items.
2. Options are lines starting with A., B., C., D. — extract the text after the letter.
3. The correct answer letter: look for the option whose text is wrapped in **...** or followed by ✅, OR look for "**Answer:** X" line. Use whichever is present. Strip ** and ✅ from the option text itself.
4. Explanation: if a line starts with "**Explanation:**", use that text verbatim. Otherwise generate a 1-2 sentence explanation.
5. Clean all markdown (**, ##, ✅) from question_text and option texts before outputting.
6. Every question MUST have: question_text, 4 options, correct_answer (letter only), explanation, grade, subject_name, topic_name, difficulty, answer_source, explanation_source.
7. grade: detect from content header (e.g. "Grade 7"). Default "Grade 7" if unclear.
8. subject_name: detect from content header (e.g. "Social Sciences"). Carry same subject for all questions if it's one paper.
9. topic_name: infer the specific sub-topic each question tests.
10. difficulty: "Easy", "Standard", or "Advanced".
11. answer_source: "pdf" if answer was explicitly marked in content, "inferred" if you determined it yourself.
12. explanation_source: "pdf" if explanation came from content, "generated" if you wrote it.

Return ONLY a single valid JSON object — no commentary, no markdown fences:
{"questions":[{"question_text":"...","question_type":"mcq","options":[{"label":"A","text":"..."},{"label":"B","text":"..."},{"label":"C","text":"..."},{"label":"D","text":"..."}],"correct_answer":"B","explanation":"...","answer_source":"pdf","explanation_source":"pdf","grade":"Grade 7","subject_name":"Social Sciences","topic_name":"...","difficulty":"Standard"}]}

--- CONTENT TO PARSE ---
${content || ""}`;
};

const buildNotesPrompt = (content) => `You are a ZIMSEC curriculum expert. Extract study notes from the content below.
For each distinct topic found, create a structured note with:
1. Grade level: MUST be exactly one of: "Grade 4", "Grade 5", "Grade 6", "Grade 7"
2. Subject name (e.g. "Mathematics", "English", "Science", "Social Studies", "Social Sciences")
3. Topic name (the specific topic)
4. overview: 2-3 sentence summary
5. key_definitions: key terms and definitions
6. key_concepts: main concepts explained
7. zimbabwe_examples: Zimbabwe-based examples
8. important_facts: critical facts to remember
9. common_mistakes: common exam mistakes
10. summary: brief bullet summary
11. exam_tips: specific exam advice

Return ONLY valid JSON:
{ "notes": [{ "grade": "Grade 7", "subject_name": "...", "topic_name": "...", "overview": "...", "key_definitions": "...", "key_concepts": "...", "zimbabwe_examples": "...", "important_facts": "...", "common_mistakes": "...", "summary": "...", "exam_tips": "..." }] }
${content ? "\n\n--- CONTENT ---\n" + content : ""}`;

// ─── Small Helpers ────────────────────────────────────────────────────────────
function Badge({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${ok ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-600 border-red-300"}`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {label}
    </span>
  );
}

function FieldRow({ label, children }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      {children}
    </div>
  );
}

// ─── Inline Editable Extracted Item ──────────────────────────────────────────
function ExtractedItem({ item, idx, uploadType, subjects, topics, onChange }) {
  const [open, setOpen] = useState(false);

  const filteredSubjects = subjects.filter(s => !item.grade || s.grade === item.grade);
  const matchedSubject = subjects.find(s =>
    s.name.toLowerCase().trim() === (item.subject_name || "").toLowerCase().trim() &&
    s.grade === item.grade
  );
  const matchedTopic = topics.find(t =>
    t.name.toLowerCase().trim() === (item.topic_name || "").toLowerCase().trim() &&
    (!matchedSubject || t.subject_id === matchedSubject?.id)
  );
  const filteredTopics = topics.filter(t => !matchedSubject || t.subject_id === matchedSubject?.id);

  const gradeOk   = GRADES.includes(item.grade);
  const subjectOk = !!matchedSubject;
  const topicOk   = !!matchedTopic;
  const isVerified = gradeOk && subjectOk;

  return (
    <div className={`rounded-2xl border overflow-hidden ${isVerified ? "border-green-300/60" : "border-amber-400/60"}`}>
    <div className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none ${isVerified ? "bg-green-50/50 hover:bg-green-50" : "bg-amber-50/50 hover:bg-amber-50"}`} onClick={() => setOpen(o => !o)}>
      <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[10px] font-bold ${isVerified ? "bg-green-500 text-white" : "bg-amber-400 text-white"}`}>
        {isVerified ? <CheckCircle className="w-3 h-3" /> : idx + 1}
      </span>
      <p className="text-xs font-semibold text-foreground flex-1 truncate">
        {uploadType === "questions" ? (item.question_text || <span className="italic text-muted-foreground">No question text — click to fix</span>) : (item.topic_name || "Untitled Note")}
      </p>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!gradeOk   && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Grade</span>}
        {!subjectOk && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Subject</span>}
        {!topicOk   && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Topic</span>}
        {isVerified && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">✓ Verified</span>}
      </div>
      <span className="text-muted-foreground p-0.5 flex-shrink-0">
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </span>
    </div>

      {open && (
        <div className="p-3 space-y-2.5 bg-card border-t border-border">
          <FieldRow label="Grade *">
            <select
              value={item.grade || ""}
              onChange={e => onChange(idx, "grade", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs bg-background text-foreground ${!gradeOk ? "border-red-400" : "border-border"}`}
            >
              <option value="">— Select Grade —</option>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
          </FieldRow>

          <FieldRow label="Subject *">
            <select
              value={item.subject_name || ""}
              onChange={e => onChange(idx, "subject_name", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs bg-background text-foreground ${!subjectOk ? "border-red-400" : "border-border"}`}
            >
              <option value="">— Select Subject —</option>
              {filteredSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </FieldRow>

          <FieldRow label="Topic *">
            <select
              value={item.topic_name || ""}
              onChange={e => onChange(idx, "topic_name", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs bg-background text-foreground ${!topicOk ? "border-amber-400" : "border-border"}`}
            >
              <option value="">— Select Topic —</option>
              {filteredTopics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </FieldRow>

          {uploadType === "questions" && (
            <>
              <FieldRow label="Question Text">
                <textarea
                  value={item.question_text || ""}
                  onChange={e => onChange(idx, "question_text", e.target.value)}
                  rows={2}
                  className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground resize-none"
                />
              </FieldRow>
              {item.options?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Options</p>
                  {item.options.map(o => (
                    <div key={o.label} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${o.label === item.correct_answer ? "bg-green-100 text-green-700 font-semibold" : "bg-muted text-muted-foreground"}`}>
                      <span className="font-bold w-4">{o.label}.</span>
                      <span className="flex-1">{o.text}</span>
                      {o.label === item.correct_answer && <CheckCircle className="w-3 h-3 flex-shrink-0" />}
                    </div>
                  ))}
                </div>
              )}
              <FieldRow label="Correct Answer">
                <select
                  value={item.correct_answer || ""}
                  onChange={e => onChange(idx, "correct_answer", e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground"
                >
                  <option value="">— Select —</option>
                  {(item.options || []).map(o => <option key={o.label} value={o.label}>{o.label}: {o.text}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Explanation">
                <textarea
                  value={item.explanation || ""}
                  onChange={e => onChange(idx, "explanation", e.target.value)}
                  rows={2}
                  className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground resize-none"
                />
              </FieldRow>
              <div className="flex gap-2">
                <FieldRow label="Difficulty">
                  <select
                    value={item.difficulty || "Standard"}
                    onChange={e => onChange(idx, "difficulty", e.target.value)}
                    className="border border-border rounded-xl px-2 py-1.5 text-xs bg-background text-foreground"
                  >
                    {["Easy","Standard","Advanced"].map(d => <option key={d}>{d}</option>)}
                  </select>
                </FieldRow>
              </div>
            </>
          )}

          {uploadType === "notes" && item.overview && (
            <FieldRow label="Overview">
              <p className="text-xs text-foreground bg-secondary/40 rounded-lg px-2 py-1.5">{item.overview}</p>
            </FieldRow>
          )}

          {uploadType === "questions" && (
            <div className="flex flex-wrap gap-1 pt-1">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${item.answer_source === "inferred" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                {item.answer_source === "inferred" ? "🤖 Answer inferred" : "✅ Answer from PDF"}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${item.explanation_source === "generated" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-green-50 text-green-700 border-green-200"}`}>
                {item.explanation_source === "generated" ? "🤖 Explanation generated" : "✅ Explanation from PDF"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Question Review Card ─────────────────────────────────────────────────────
function QuestionCard({ q, subjects, topics, onApprove, onReject, onDelete, onUpdateField, approvingId }) {
  const [expanded, setExpanded] = useState(false);

  const matchedSubject = subjects.find(s => s.id === q.subject_id);
  const matchedTopic   = topics.find(t => t.id === q.topic_id);

  const gradeOk   = !!q.suggested_grade;
  const subjectOk = !!matchedSubject;
  const topicOk   = !!matchedTopic;
  const canPublish = gradeOk && subjectOk && topicOk;

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden ${canPublish ? "border-border" : "border-amber-400/50"}`}>
      <div className="p-4 space-y-2">
        <p className="text-sm font-medium text-foreground">{q.question_text}</p>

        <div className="flex flex-wrap gap-1.5">
          <Badge ok={gradeOk}   label={q.suggested_grade || "No Grade"} />
          <Badge ok={subjectOk} label={matchedSubject?.name || (q.suggested_subject || "No Subject")} />
          <Badge ok={topicOk}   label={matchedTopic?.name   || (q.suggested_topic   || "No Topic")} />
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{q.difficulty || "Standard"}</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {q.paper_type === "exam_paper" && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-indigo-50 text-indigo-700 border-indigo-300">
              📝 ZIMSEC Exam Paper{q.duration_minutes ? ` · ${q.duration_minutes} min` : ""}
            </span>
          )}
          {q.paper_type === "mock_exam" && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-teal-50 text-teal-700 border-teal-300">
              🎓 Mock Exam{q.duration_minutes ? ` · ${q.duration_minutes} min` : ""}
            </span>
          )}
          {q.paper_type === "topic" && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-secondary text-muted-foreground border-border">📖 Topic</span>
          )}
          {q.answer_source === "inferred" && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-blue-50 text-blue-700 border-blue-300">🤖 Answer inferred</span>
          )}
          {q.explanation_source === "generated" && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-violet-50 text-violet-700 border-violet-300">🤖 Explanation AI</span>
          )}
        </div>

        {!canPublish && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              Fix before publishing:{" "}
              {!gradeOk && "grade "}{!subjectOk && "subject "}{!topicOk && "topic"}
            </p>
          </div>
        )}

        <button onClick={() => setExpanded(e => !e)} className="text-xs text-primary font-semibold flex items-center gap-1">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
          {expanded ? "Hide editor" : "Edit & Fix"}
        </button>

        {expanded && (
          <div className="space-y-2 pt-1 border-t border-border mt-2">
            <select
              value={q.paper_type || "topic"}
              onChange={e => onUpdateField(q.id, "paper_type", e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground"
            >
              {PAPER_TYPES.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
            </select>
            {(q.paper_type === "exam_paper" || q.paper_type === "mock_exam") && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <input
                  type="number"
                  value={q.duration_minutes || ""}
                  onChange={e => onUpdateField(q.id, "duration_minutes", Number(e.target.value))}
                  placeholder="Duration (minutes)"
                  className="flex-1 border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground"
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
            )}
            <select
              value={q.suggested_grade || ""}
              onChange={e => onUpdateField(q.id, "suggested_grade", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs bg-background text-foreground ${!gradeOk ? "border-red-400" : "border-border"}`}
            >
              <option value="">— Select Grade —</option>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
            <select
              value={q.subject_id || ""}
              onChange={e => onUpdateField(q.id, "subject_id", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs bg-background text-foreground ${!subjectOk ? "border-red-400" : "border-border"}`}
            >
              <option value="">— Assign Subject —</option>
              {subjects.filter(s => !q.suggested_grade || s.grade === q.suggested_grade).map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
              ))}
            </select>
            <select
              value={q.topic_id || ""}
              onChange={e => onUpdateField(q.id, "topic_id", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs bg-background text-foreground ${!topicOk ? "border-amber-400" : "border-border"}`}
            >
              <option value="">— Assign Topic —</option>
              {topics.filter(t => !q.subject_id || t.subject_id === q.subject_id).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {q.options?.length > 0 && (
              <div className="space-y-1">
                {q.options.map(o => (
                  <p key={o.label} className={`text-xs px-2 py-1.5 rounded-lg ${o.label === q.correct_answer ? "bg-green-100 text-green-700 font-semibold" : "bg-muted text-muted-foreground"}`}>
                    {o.label}. {o.text} {o.label === q.correct_answer && "✓"}
                  </p>
                ))}
              </div>
            )}
            {q.explanation && <p className="text-xs text-muted-foreground italic">💡 {q.explanation}</p>}
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 pb-4">
        {q.review_status === "pending_review" && (
          <>
            <button
              onClick={() => onApprove(q)}
              disabled={!canPublish || approvingId === q.id}
              className="flex-1 bg-green-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1 disabled:opacity-40"
              title={!canPublish ? "Fix grade, subject and topic first" : "Approve & Publish"}
            >
              {approvingId === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
              {canPublish ? "Approve & Publish" : "Fix Issues First"}
            </button>
            <button onClick={() => onReject(q)} className="border border-red-300 text-red-600 text-xs font-semibold py-2 px-3 rounded-xl flex items-center gap-1">
              <XCircle className="w-3 h-3" />
            </button>
          </>
        )}
        {q.review_status === "approved" && (
          <span className="text-xs text-green-600 font-semibold flex-1 flex items-center gap-1 py-2">
            <CheckCircle className="w-3.5 h-3.5" /> Live & Published
          </span>
        )}
        {q.review_status === "rejected" && (
          <button onClick={() => onUpdateField(q.id, "review_status", "pending_review")} className="flex-1 border border-amber-300 text-amber-600 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
            <RotateCcw className="w-3 h-3" /> Restore to Review
          </button>
        )}
        <button onClick={() => onDelete(q.id)} className="text-muted-foreground hover:text-destructive p-2">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Note Review Card ─────────────────────────────────────────────────────────
function NoteCard({ n, subjects, topics, onApprove, onReject, onDelete, onUpdateField, approvingId }) {
  const [expanded, setExpanded] = useState(false);

  const matchedSubject = subjects.find(s => s.id === n.subject_id);
  const matchedTopic   = topics.find(t => t.id === n.topic_id);

  const gradeOk   = !!n.suggested_grade;
  const subjectOk = !!matchedSubject;
  const topicOk   = !!matchedTopic;
  const canPublish = gradeOk && subjectOk && topicOk;

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden ${canPublish ? "border-border" : "border-amber-400/50"}`}>
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-sm font-semibold text-foreground">{n.suggested_topic || matchedTopic?.name || "Untitled Note"}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Badge ok={gradeOk}   label={n.suggested_grade || "No Grade"} />
          <Badge ok={subjectOk} label={matchedSubject?.name || (n.suggested_subject || "No Subject")} />
          <Badge ok={topicOk}   label={matchedTopic?.name   || (n.suggested_topic   || "No Topic")} />
        </div>

        {n.overview && (
          <p className="text-xs text-muted-foreground line-clamp-2 bg-secondary/40 rounded-lg px-2 py-1.5">{n.overview}</p>
        )}

        {!canPublish && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700 font-medium">
              Fix before publishing:{" "}
              {!gradeOk && "grade "}{!subjectOk && "subject "}{!topicOk && "topic"}
            </p>
          </div>
        )}

        <button onClick={() => setExpanded(e => !e)} className="text-xs text-primary font-semibold flex items-center gap-1">
          {expanded ? <ChevronUp className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
          {expanded ? "Hide editor" : "Edit & Fix"}
        </button>

        {expanded && (
          <div className="space-y-3 pt-1 border-t border-border mt-2">
            <select
              value={n.suggested_grade || ""}
              onChange={e => onUpdateField(n.id, "suggested_grade", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs bg-background text-foreground ${!gradeOk ? "border-red-400" : "border-border"}`}
            >
              <option value="">— Select Grade —</option>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
            <select
              value={n.subject_id || ""}
              onChange={e => onUpdateField(n.id, "subject_id", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs bg-background text-foreground ${!subjectOk ? "border-red-400" : "border-border"}`}
            >
              <option value="">— Assign Subject —</option>
              {subjects.filter(s => !n.suggested_grade || s.grade === n.suggested_grade).map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
              ))}
            </select>
            <select
              value={n.topic_id || ""}
              onChange={e => onUpdateField(n.id, "topic_id", e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs bg-background text-foreground ${!topicOk ? "border-amber-400" : "border-border"}`}
            >
              <option value="">— Assign Topic —</option>
              {topics.filter(t => !n.subject_id || t.subject_id === n.subject_id).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-primary/10 px-3 py-2 text-xs font-bold text-primary flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Note Content Preview
              </div>
              <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
                {[
                  { label: "Overview",          key: "overview" },
                  { label: "Key Definitions",   key: "key_definitions" },
                  { label: "Key Concepts",      key: "key_concepts" },
                  { label: "Zimbabwe Examples", key: "zimbabwe_examples" },
                  { label: "Important Facts",   key: "important_facts" },
                  { label: "Common Mistakes",   key: "common_mistakes" },
                  { label: "Summary",           key: "summary" },
                  { label: "Exam Tips",         key: "exam_tips" },
                ].map(({ label, key }) => n[key] ? (
                  <div key={key}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-line mt-0.5">{n[key]}</p>
                  </div>
                ) : null)}
                {!n.overview && !n.key_concepts && (
                  <p className="text-xs text-muted-foreground italic">No content extracted</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 pb-4">
        {n.review_status === "pending_review" && (
          <>
            <button
              onClick={() => onApprove(n)}
              disabled={!canPublish || approvingId === n.id}
              className="flex-1 bg-green-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1 disabled:opacity-40"
              title={!canPublish ? "Fix grade, subject and topic first" : "Approve & Publish"}
            >
              {approvingId === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
              {canPublish ? "Approve & Publish" : "Fix Issues First"}
            </button>
            <button onClick={() => onReject(n)} className="border border-red-300 text-red-600 text-xs font-semibold py-2 px-3 rounded-xl flex items-center gap-1">
              <XCircle className="w-3 h-3" />
            </button>
          </>
        )}
        {n.review_status === "approved" && (
          <span className="text-xs text-green-600 font-semibold flex-1 flex items-center gap-1 py-2">
            <CheckCircle className="w-3.5 h-3.5" /> Live & Published
          </span>
        )}
        {n.review_status === "rejected" && (
          <button onClick={() => onUpdateField(n.id, "review_status", "pending_review")} className="flex-1 border border-amber-300 text-amber-600 text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
            <RotateCcw className="w-3 h-3" /> Restore to Review
          </button>
        )}
        <button onClick={() => onDelete(n.id)} className="text-muted-foreground hover:text-destructive p-2">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PdfUploadReview() {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics]     = useState([]);

  const [uploadType, setUploadType] = useState("questions");
  const [paperType, setPaperType]   = useState("topic");
  const [duration, setDuration]     = useState(60);
  const [file, setFile]             = useState(null);
  const [inputMode, setInputMode]   = useState("file");
  const [pasteText, setPasteText]   = useState("");
  const [step, setStep]             = useState("upload");
  const [extracted, setExtracted]   = useState([]);
  const [extractError, setExtractError] = useState(null);

  const [questionDrafts, setQuestionDrafts] = useState([]);
  const [noteDrafts, setNoteDrafts]         = useState([]);
  const [reviewType, setReviewType]         = useState("questions");
  const [filterStatus, setFilterStatus]     = useState("pending_review");
  const [approvingId, setApprovingId]       = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Subject.list(),
      base44.entities.Topic.list(),
    ]).then(([s, t]) => { setSubjects(s); setTopics(t); });
    loadAllDrafts();
  }, []);

  const loadAllDrafts = async () => {
    const [qs, ns] = await Promise.all([
      base44.entities.Question.filter({ is_active: false }),
      base44.entities.Note.filter({ is_active: false }),
    ]);
    setQuestionDrafts(qs.filter(q => q.review_status));
    setNoteDrafts(ns.filter(n => n.review_status));
  };

  const resolveIds = (item) => {
    const subject = subjects.find(s =>
      s.name.toLowerCase().trim() === (item.subject_name || "").toLowerCase().trim() &&
      s.grade === item.grade
    );
    const topic = topics.find(t =>
      t.name.toLowerCase().trim() === (item.topic_name || "").toLowerCase().trim() &&
      (!subject || t.subject_id === subject?.id)
    );
    return { subject_id: subject?.id || null, topic_id: topic?.id || null };
  };

  const updateExtracted = (idx, field, value) => {
    setExtracted(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const verifiedCount = extracted.filter(item => {
    const s = subjects.find(s => s.name.toLowerCase().trim() === (item.subject_name || "").toLowerCase().trim() && s.grade === item.grade);
    return GRADES.includes(item.grade) && !!s;
  }).length;
  const unverifiedCount = extracted.length - verifiedCount;

  // ── Upload & Extract ──────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (inputMode === "file" && !file) return;
    if (inputMode === "paste" && !pasteText.trim()) return;
    setStep("extracting");
    setExtractError(null);

    let file_url = null;
    let pasteContent = null;

    if (inputMode === "paste") {
      pasteContent = pasteText.trim();
    } else {
      try {
        const uploaded = await base44.integrations.Core.UploadFile({ file });
        file_url = uploaded.file_url;
      } catch (e) {
        setExtractError("Failed to upload file: " + (e.message || "Unknown error"));
        setStep("upload");
        return;
      }

      if (file.name?.toLowerCase().endsWith(".docx")) {
        try {
          const docxRes = await base44.functions.invoke("extractDocxText", { file_url });
          pasteContent = docxRes.data?.text || "";
          if (!pasteContent.trim()) {
            setExtractError("Could not extract text from the .docx file.");
            setStep("upload");
            return;
          }
          file_url = null;
        } catch (e) {
          setExtractError("Failed to read .docx file: " + (e.message || "Unknown error"));
          setStep("upload");
          return;
        }
      }
    }

    try {
      if (uploadType === "questions") {
        const prompt = buildQuestionsPrompt(pasteContent);
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: pasteContent ? prompt : buildQuestionsPrompt(null),
          ...(file_url ? { file_urls: [file_url] } : {}),
          model: "gemini_3_1_pro",
          response_json_schema: {
            type: "object",
            properties: { questions: { type: "array", items: { type: "object" } } }
          }
        });
        const questions = result?.questions || [];
        if (questions.length === 0) {
          setExtractError("No questions found. Make sure the PDF contains selectable text and numbered questions. Try using 'Paste Text' mode instead.");
          setStep("upload");
          return;
        }
        setExtracted(questions.map((q, i) => ({ ...q, _id: i })));
      } else {
        const prompt = buildNotesPrompt(pasteContent);
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: pasteContent ? prompt : buildNotesPrompt(null),
          ...(file_url ? { file_urls: [file_url] } : {}),
          model: "gemini_3_1_pro",
          response_json_schema: {
            type: "object",
            properties: { notes: { type: "array", items: { type: "object" } } }
          }
        });
        const notes = result?.notes || [];
        if (notes.length === 0) {
          setExtractError("No notes found. Try using 'Paste Text' mode instead.");
          setStep("upload");
          return;
        }
        setExtracted(notes.map((n, i) => ({ ...n, _id: i })));
      }
      setStep("review");
    } catch (e) {
      setExtractError("AI extraction failed: " + (e.message || "Unknown error. Please try again."));
      setStep("upload");
    }
  };

  // ── Save as Drafts ────────────────────────────────────────────────────────
  const saveAsDrafts = async () => {
    setStep("saving");

    if (uploadType === "questions") {
      for (const q of extracted.filter(q => q.question_text?.trim())) {
        const { subject_id, topic_id } = resolveIds(q);
        await base44.entities.Question.create({
          question_text: q.question_text,
          question_type: q.question_type || "mcq",
          options: q.options || [],
          correct_answer: q.correct_answer || "",
          explanation: q.explanation || "",
          difficulty: q.difficulty || "Standard",
          marks: 1,
          subject_id,
          topic_id,
          is_active: false,
          review_status: "pending_review",
          suggested_grade: q.grade,
          suggested_subject: q.subject_name,
          suggested_topic: q.topic_name,
          answer_source: q.answer_source || "inferred",
          explanation_source: q.explanation_source || "generated",
          paper_type: paperType,
          duration_minutes: (paperType === "exam_paper" || paperType === "mock_exam") ? duration : null,
        });
      }
    } else {
      for (const n of extracted) {
        const { subject_id, topic_id } = resolveIds(n);
        await base44.entities.Note.create({
          topic_id,
          subject_id,
          overview: n.overview || "",
          key_definitions: n.key_definitions || "",
          key_concepts: n.key_concepts || "",
          zimbabwe_examples: n.zimbabwe_examples || "",
          important_facts: n.important_facts || "",
          common_mistakes: n.common_mistakes || "",
          summary: n.summary || "",
          exam_tips: n.exam_tips || "",
          is_active: false,
          review_status: "pending_review",
          suggested_grade: n.grade,
          suggested_subject: n.subject_name,
          suggested_topic: n.topic_name,
        });
      }
    }

    setStep("done");
    setFile(null);
    setExtracted([]);
    setReviewType(uploadType === "notes" ? "notes" : "questions");
    loadAllDrafts();
  };

  // ── Review Actions ────────────────────────────────────────────────────────
  const approveQuestion = async (q) => {
    if (!q.subject_id || !q.topic_id) return;
    setApprovingId(q.id);
    await base44.entities.Question.update(q.id, { is_active: true, review_status: "approved" });
    setQuestionDrafts(prev => prev.map(d => d.id === q.id ? { ...d, is_active: true, review_status: "approved" } : d));
    setApprovingId(null);
  };

  const rejectQuestion = async (q) => {
    await base44.entities.Question.update(q.id, { review_status: "rejected" });
    setQuestionDrafts(prev => prev.map(d => d.id === q.id ? { ...d, review_status: "rejected" } : d));
  };

  const deleteQuestion = async (id) => {
    await base44.entities.Question.delete(id);
    setQuestionDrafts(prev => prev.filter(d => d.id !== id));
  };

  const updateQuestionField = async (id, field, value) => {
    await base44.entities.Question.update(id, { [field]: value });
    setQuestionDrafts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const approveNote = async (n) => {
    if (!n.subject_id || !n.topic_id) return;
    setApprovingId(n.id);
    await base44.entities.Note.update(n.id, { is_active: true, review_status: "approved" });
    setNoteDrafts(prev => prev.map(d => d.id === n.id ? { ...d, is_active: true, review_status: "approved" } : d));
    setApprovingId(null);
  };

  const rejectNote = async (n) => {
    await base44.entities.Note.update(n.id, { review_status: "rejected" });
    setNoteDrafts(prev => prev.map(d => d.id === n.id ? { ...d, review_status: "rejected" } : d));
  };

  const deleteNote = async (id) => {
    await base44.entities.Note.delete(id);
    setNoteDrafts(prev => prev.filter(d => d.id !== id));
  };

  const updateNoteField = async (id, field, value) => {
    await base44.entities.Note.update(id, { [field]: value });
    setNoteDrafts(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const activeDrafts = reviewType === "questions" ? questionDrafts : noteDrafts;
  const displayed    = activeDrafts.filter(d => d.review_status === filterStatus);
  const counts       = {
    pending_review: activeDrafts.filter(d => d.review_status === "pending_review").length,
    approved:       activeDrafts.filter(d => d.review_status === "approved").length,
    rejected:       activeDrafts.filter(d => d.review_status === "rejected").length,
  };

  const resetUpload = () => {
    setStep("upload");
    setFile(null);
    setExtracted([]);
    setPasteText("");
    setInputMode("file");
    setExtractError(null);
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-lg font-bold text-foreground">📄 PDF Upload &amp; Review</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Upload → AI extracts all questions → You verify &amp; correct → Save to drafts → Approve to publish.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        {[
          { key: "upload", label: "1. Upload" },
          { key: "review", label: "2. Verify" },
          { key: "done",   label: "3. Approve" },
        ].map((s, i) => {
          const active = s.key === step || (s.key === "upload" && step === "extracting") || (s.key === "review" && step === "saving");
          const done   = (s.key === "upload" && ["review","saving","done"].includes(step)) ||
                         (s.key === "review" && step === "done");
          return (
            <div key={s.key} className="flex items-center gap-1.5">
              {i > 0 && <div className="w-4 h-px bg-border" />}
              <span className={`px-2.5 py-1 rounded-full border ${done ? "bg-green-500 border-green-500 text-white" : active ? "bg-primary border-primary text-white" : "bg-secondary border-border text-muted-foreground"}`}>
                {done ? "✓" : s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Upload Panel */}
      {(step === "upload" || step === "extracting") && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <p className="font-semibold text-sm text-foreground">Step 1 — Select content type &amp; upload</p>

          {/* Content type */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "questions",  icon: <HelpCircle className="w-4 h-4" />,      label: "Questions" },
              { key: "notes",      icon: <BookOpen className="w-4 h-4" />,         label: "Notes (PDF)" },
              { key: "notes_csv",  icon: <FileSpreadsheet className="w-4 h-4" />,  label: "Notes (CSV)" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => { setUploadType(t.key); setExtracted([]); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-colors ${uploadType === t.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Paper type */}
          {uploadType === "questions" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Paper Type</p>
              <div className="grid grid-cols-3 gap-2">
                {PAPER_TYPES.map(pt => (
                  <button
                    key={pt.value}
                    onClick={() => { setPaperType(pt.value); if (DEFAULT_DURATIONS[pt.value]) setDuration(DEFAULT_DURATIONS[pt.value]); }}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border-2 text-xs font-semibold transition-colors ${paperType === pt.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    <span className="text-base">{pt.icon}</span>
                    <span className="text-center leading-tight">{pt.label}</span>
                  </button>
                ))}
              </div>
              {(paperType === "exam_paper" || paperType === "mock_exam") && (
                <div className="flex items-center gap-3 bg-secondary/40 rounded-xl px-3 py-2.5">
                  <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs font-semibold text-foreground">Exam Duration:</span>
                  <input
                    type="number" value={duration} min={5} max={300}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="w-20 border border-border rounded-lg px-2 py-1 text-xs bg-background text-foreground text-center"
                  />
                  <span className="text-xs text-muted-foreground">minutes</span>
                </div>
              )}
            </div>
          )}

          {/* CSV uploader */}
          {uploadType === "notes_csv" && (
            <NotesCsvUploader onSaved={() => { setReviewType("notes"); loadAllDrafts(); }} />
          )}

          {/* Input mode + file/paste */}
          {uploadType !== "notes_csv" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setInputMode("file")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-semibold text-sm transition-colors ${inputMode === "file" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  <FileType className="w-4 h-4" /> Upload File
                </button>
                <button
                  onClick={() => setInputMode("paste")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-semibold text-sm transition-colors ${inputMode === "paste" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  <ClipboardPaste className="w-4 h-4" /> Paste Text
                </button>
              </div>

              {inputMode === "file" && (
                <label className={`flex flex-col items-center gap-2 border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors ${file ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <Upload className="w-7 h-7 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">{file ? file.name : "Click to select file"}</p>
                  <p className="text-xs text-muted-foreground">PDF or DOCX — must contain selectable text</p>
                  <input type="file" accept=".pdf,.docx" className="hidden" onChange={e => setFile(e.target.files[0])} />
                </label>
              )}

              {inputMode === "paste" && (
                <div className="space-y-2">
                  <textarea
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    placeholder={`Paste ${uploadType === "questions" ? "exam questions with numbered items (1. 2. 3. ...)" : "study notes"} here…`}
                    rows={8}
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{pasteText.length} characters</p>
                </div>
              )}

              {extractError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Extraction failed</p>
                    <p className="text-xs mt-0.5">{extractError}</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={(inputMode === "file" ? !file : !pasteText.trim()) || step === "extracting"}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {step === "extracting"
                  ? <><Loader2 className="w-4 h-4 animate-spin" />AI is reading — this may take 30–60 seconds…</>
                  : `Extract ${uploadType === "questions" ? "Questions" : "Notes"} with AI`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Review Panel */}
      {(step === "review" || step === "saving") && extracted.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-foreground">
              Step 2 — Verify &amp; Correct ({extracted.length} {uploadType === "questions" ? "questions" : "notes"} found)
            </p>
            <button onClick={resetUpload} className="text-xs text-muted-foreground underline">Start over</button>
          </div>

          <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${unverifiedCount === 0 ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
            <div className="flex-1 space-y-1">
              <p className={`text-sm font-bold ${unverifiedCount === 0 ? "text-green-700" : "text-amber-700"}`}>
                {unverifiedCount === 0
                  ? `✅ All ${extracted.length} items verified — ready to save`
                  : `⚠️ ${unverifiedCount} item${unverifiedCount !== 1 ? "s" : ""} need fixing (${verifiedCount} verified)`}
              </p>
              <p className="text-xs text-muted-foreground">
                Expand each item to assign the correct grade, subject and topic.
              </p>
            </div>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {extracted.map((item, idx) => (
              <ExtractedItem
                key={item._id}
                item={item}
                idx={idx}
                uploadType={uploadType}
                subjects={subjects}
                topics={topics}
                onChange={updateExtracted}
              />
            ))}
          </div>

          <button
            onClick={saveAsDrafts}
            disabled={step === "saving"}
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {step === "saving"
              ? <><Loader2 className="w-4 h-4 animate-spin" />Saving to Review Queue…</>
              : <>
                  <FileText className="w-4 h-4" />
                  Save {extracted.length} {uploadType === "questions" ? "Questions" : "Notes"} to Review Queue
                  {unverifiedCount > 0 && <span className="text-xs opacity-75">(incl. {unverifiedCount} unverified)</span>}
                </>}
          </button>

          {unverifiedCount > 0 && (
            <p className="text-xs text-center text-amber-600">
              ⚠️ Unverified items will save without a subject/topic link — fix them in the review queue below.
            </p>
          )}
        </div>
      )}

      {/* Done Banner */}
      {step === "done" && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-green-700 text-sm">Saved to Review Queue</p>
            <p className="text-xs text-green-600 mt-0.5">Use the queue below to approve each item. Only approved items go live for students.</p>
          </div>
          <button onClick={resetUpload} className="text-xs text-green-700 font-semibold border border-green-300 px-3 py-1.5 rounded-xl hover:bg-green-100 flex-shrink-0">
            Upload More
          </button>
        </div>
      )}

      {/* Review Queue */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground">Step 3 — Review Queue</h3>
            <p className="text-xs text-muted-foreground">Fix any remaining issues, then approve to publish.</p>
          </div>
          <button onClick={loadAllDrafts} className="text-xs text-primary font-semibold border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary/5">Refresh</button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setReviewType("questions")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-semibold text-sm transition-colors ${reviewType === "questions" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            <HelpCircle className="w-4 h-4" /> Questions
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${questionDrafts.filter(d => d.review_status === "pending_review").length > 0 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
              {questionDrafts.filter(d => d.review_status === "pending_review").length}
            </span>
          </button>
          <button
            onClick={() => setReviewType("notes")}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-semibold text-sm transition-colors ${reviewType === "notes" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            <BookOpen className="w-4 h-4" /> Notes
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${noteDrafts.filter(d => d.review_status === "pending_review").length > 0 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
              {noteDrafts.filter(d => d.review_status === "pending_review").length}
            </span>
          </button>
        </div>

        <div className="flex gap-2">
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`flex-1 text-xs font-bold py-1.5 rounded-xl border transition-colors ${filterStatus === key ? meta.color : "bg-secondary border-border text-muted-foreground"}`}
            >
              {meta.label} ({counts[key] || 0})
            </button>
          ))}
        </div>

        {displayed.length === 0 && (
          <div className="text-center py-10 text-muted-foreground text-sm bg-card rounded-2xl border border-border">
            No {reviewType} in "{STATUS_META[filterStatus]?.label}".
          </div>
        )}

        <div className="space-y-3">
          {reviewType === "questions" && displayed.map(q => (
            <QuestionCard
              key={q.id} q={q} subjects={subjects} topics={topics}
              onApprove={approveQuestion} onReject={rejectQuestion}
              onDelete={deleteQuestion} onUpdateField={updateQuestionField}
              approvingId={approvingId}
            />
          ))}
          {reviewType === "notes" && displayed.map(n => (
            <NoteCard
              key={n.id} n={n} subjects={subjects} topics={topics}
              onApprove={approveNote} onReject={rejectNote}
              onDelete={deleteNote} onUpdateField={updateNoteField}
              approvingId={approvingId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}