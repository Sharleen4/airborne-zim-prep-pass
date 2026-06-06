import { useState, useRef, useEffect } from "react";
import { Upload, Download, CheckCircle, XCircle, AlertTriangle, X, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";

// ─── CSV Templates ─────────────────────────────────────────────────────────
const NOTES_TEMPLATE = `overview,key_definitions,key_concepts,zimbabwe_examples,important_facts,common_mistakes,summary,exam_tips
"This topic covers photosynthesis. It is the process plants use to make food. Sunlight is needed for this process.","Photosynthesis: the process by which plants make food using sunlight. Chlorophyll: the green pigment in leaves that absorbs sunlight. Glucose: the sugar produced during photosynthesis.","Plants absorb sunlight through chlorophyll. They take in carbon dioxide from the air. Water is absorbed through the roots. Oxygen is released as a by-product.","Tobacco farms in Mvurwi use sunlight to grow crops. Maize fields in Mashonaland show photosynthesis in action.","Plants need sunlight, water and carbon dioxide to photosynthesise. Photosynthesis happens mainly in the leaves. Oxygen is a by-product of photosynthesis.","Students often confuse respiration with photosynthesis. Remember: photosynthesis makes food, respiration releases energy. Not all plants have green leaves but they still photosynthesise.","Photosynthesis uses sunlight to convert carbon dioxide and water into glucose. Oxygen is released. It occurs in the chloroplasts of leaf cells.","Always state the word equation: carbon dioxide + water → glucose + oxygen. Mention sunlight and chlorophyll in your answer. Use the correct scientific terms."`;


const QUESTIONS_TEMPLATE = [
  "question_text,comprehension_passage,optA,optB,optC,optD,correct_answer,explanation,difficulty,question_type",
  "What is 2 + 2?,,3,4,5,6,B,2 plus 2 equals 4,Easy,mcq",
  "What is the capital of Zimbabwe?,,Harare,Bulawayo,Mutare,Gweru,A,Harare is the capital city of Zimbabwe,Easy,mcq",
  "What did Chipo carry to school?,Chipo woke up early. She packed her bag.,A blue bag,A red bag,A brown basket,A yellow box,A,The passage says Chipo carried a blue bag,Easy,comprehension",
].join("\n");

// ─── Helpers ───────────────────────────────────────────────────────────────
function parseBool(val) {
  if (typeof val === "boolean") return val;
  return String(val).trim().toUpperCase() === "TRUE";
}

function normaliseDifficulty(val) {
  const map = { easy: "Easy", standard: "Standard", advanced: "Advanced" };
  return map[String(val || "Standard").trim().toLowerCase()] || "Standard";
}

function parseCSV(text) {
  // RFC 4180 compliant parser — handles quoted multi-line fields
  const parseFields = (src) => {
    const records = [];
    let fields = [];
    let cur = "";
    let inQuote = false;
    let i = 0;

    while (i < src.length) {
      const ch = src[i];

      if (inQuote) {
        if (ch === '"') {
          // Check for escaped double-quote ""
          if (src[i + 1] === '"') { cur += '"'; i += 2; continue; }
          inQuote = false; i++; continue;
        }
        cur += ch; i++; continue;
      }

      if (ch === '"') { inQuote = true; i++; continue; }

      if (ch === ',') { fields.push(cur.trim()); cur = ""; i++; continue; }

      if (ch === '\r' && src[i + 1] === '\n') {
        fields.push(cur.trim()); records.push(fields); fields = []; cur = ""; i += 2; continue;
      }
      if (ch === '\n') {
        fields.push(cur.trim()); records.push(fields); fields = []; cur = ""; i++; continue;
      }

      cur += ch; i++;
    }

    // Push last field/record
    if (cur || fields.length) { fields.push(cur.trim()); records.push(fields); }
    return records;
  };

  const records = parseFields(text.trim());
  if (records.length < 2) return { headers: [], rows: [] };

  const headers = records[0];
  const rows = records.slice(1).filter(r => r.some(v => v.trim())).map(vals => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
  return { headers, rows };
}

function downloadTemplate(type) {
  const content = type === "notes" ? NOTES_TEMPLATE : QUESTIONS_TEMPLATE;
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}_template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const NOTE_FIELD_KEYS = ["overview", "key_definitions", "key_concepts", "zimbabwe_examples", "important_facts", "common_mistakes", "summary", "exam_tips"];

// ─── Validation ────────────────────────────────────────────────────────────
function validateNotesRow(row) {
  const errs = [];
  if (!row.overview?.trim()) errs.push("overview is required");
  return errs;
}

function validateQuestionsRow(row) {
  const errs = [];
  if (!row.question_text?.trim()) errs.push("question_text is required");
  if (!row.optA?.trim() || !row.optB?.trim() || !row.optC?.trim() || !row.optD?.trim())
    errs.push("optA, optB, optC, optD are all required");
  if (!row.correct_answer?.trim()) errs.push("correct_answer is required");
  if (!["A","B","C","D"].includes(row.correct_answer?.trim().toUpperCase()))
    errs.push(`correct_answer must be A, B, C or D — got "${row.correct_answer}"`);
  return errs;
}

// ─── Transform ─────────────────────────────────────────────────────────────
function transformNote(row, subjectId, topicId) {
  return {
    topic_id: topicId,
    subject_id: subjectId,
    overview: row.overview?.trim() || "",
    key_definitions: row.key_definitions?.trim() || "",
    key_concepts: row.key_concepts?.trim() || "",
    zimbabwe_examples: row.zimbabwe_examples?.trim() || "",
    important_facts: row.important_facts?.trim() || "",
    common_mistakes: row.common_mistakes?.trim() || "",
    summary: row.summary?.trim() || "",
    exam_tips: row.exam_tips?.trim() || "",
    is_ai_generated: false,
    is_active: false,
    review_status: "pending_review",
  };
}

function transformQuestion(row, subjectId, topicId) {
  return {
    topic_id: topicId,
    subject_id: subjectId,
    question_text: row.question_text?.trim(),
    comprehension_passage: row.comprehension_passage?.trim() || "",
    options: [
      { label: "A", text: row.optA?.trim() || "" },
      { label: "B", text: row.optB?.trim() || "" },
      { label: "C", text: row.optC?.trim() || "" },
      { label: "D", text: row.optD?.trim() || "" },
    ],
    correct_answer: row.correct_answer?.trim().toUpperCase(),
    explanation: row.explanation?.trim() || "",
    difficulty: normaliseDifficulty(row.difficulty),
    question_type: row.question_type?.trim() || "mcq",
    marks: row.marks ? Number(row.marks) : 1,
    bloom_level: row.bloom_level?.trim() || "",
    is_active: false,
    review_status: "pending_review",
  };
}

// ─── Main Component ────────────────────────────────────────────────────────
const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

export default function CsvImporter() {
  // Step 1 — Context selection
  const [grade, setGrade] = useState("Grade 7");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [subjectMode, setSubjectMode] = useState("pick"); // "pick" | "type"
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectIcon, setNewSubjectIcon] = useState("📚");
  const [topicMode, setTopicMode] = useState("pick"); // "pick" | "type"
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Step 2 — Import type
  const [importType, setImportType] = useState("questions"); // "notes" | "questions"

  // Step 3 — CSV
  const [parsedRows, setParsedRows] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [headerErrors, setHeaderErrors] = useState([]);
  const [editableRows, setEditableRows] = useState(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const fileRef = useRef();

  // Step 4 — Import result
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [mergeNotice, setMergeNotice] = useState(null);

  const [allSubjects, setAllSubjects] = useState([]);

  // Load ALL subjects once on mount (no filters — get everything, filter client-side)
  useEffect(() => {
    setLoadingSubjects(true);
    base44.entities.Subject.filter({}, "name", 500)
      .then(s => { setAllSubjects(s); setLoadingSubjects(false); })
      .catch(() => setLoadingSubjects(false));
  }, []);

  // Filter subjects by selected grade (client-side)
  useEffect(() => {
    setSelectedSubjectId("");
    setNewSubjectName("");
  }, [grade]);

  // Subjects shown in dropdown = filtered by selected grade only
  const subjects = allSubjects.filter(s => s.grade === grade);

  // Load topics when subject changes
  useEffect(() => {
    setSelectedTopicId("");
    setTopics([]);
    if (!selectedSubjectId) return;
    setLoadingTopics(true);
    base44.entities.Topic.filter({ subject_id: selectedSubjectId }, "order", 200)
      .then(t => { setTopics(t); setLoadingTopics(false); })
      .catch(() => setLoadingTopics(false));
  }, [selectedSubjectId]);

  const resetUpload = () => {
    setParsedRows(null);
    setParseErrors([]);
    setHeaderErrors([]);
    setEditableRows(null);
    setResult(null);
    setMergeNotice(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const REQUIRED_NOTES_COLS = ["overview"];
  const REQUIRED_Q_COLS = ["question_text", "optA", "optB", "optC", "optD", "correct_answer"];

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    resetUpload();
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);

      // Check required headers
      const required = importType === "notes" ? REQUIRED_NOTES_COLS : REQUIRED_Q_COLS;
      const missing = required.filter(col => !headers.includes(col));
      if (missing.length) {
        setHeaderErrors([`Missing required columns: ${missing.join(", ")}`]);
        return;
      }

      // For notes: auto-merge all rows into one by concatenating field values
      let finalRows = rows;
      if (importType === "notes" && rows.length > 1) {
        const merged = {};
        NOTE_FIELD_KEYS.forEach(key => {
          const parts = rows.map(r => (r[key] || "").trim()).filter(Boolean);
          merged[key] = parts.join("\n\n");
        });
        finalRows = [merged];
      }

      // Validate each row
      const errors = [];
      finalRows.forEach((row, i) => {
        const errs = importType === "notes" ? validateNotesRow(row) : validateQuestionsRow(row);
        if (errs.length) errors.push({ row: i + 2, messages: errs });
      });

      setParsedRows(finalRows);
      setParseErrors(errors);
      setEditableRows(finalRows.map(r => ({ ...r })));
      if (importType === "notes" && rows.length > 1) {
        setMergeNotice(`${rows.length} rows detected — automatically merged into 1 note for this topic.`);
      }
    };
    reader.readAsText(f);
  };

  const resolvedTopicId = topicMode === "pick" ? selectedTopicId : null;
  const resolvedTopicName = topicMode === "type" ? newTopicName.trim() : (topics.find(t => t.id === selectedTopicId)?.name || "");
  const resolvedSubjectName = subjectMode === "pick"
    ? (subjects.find(s => s.id === selectedSubjectId)?.name || "")
    : newSubjectName.trim();

  const canUpload = (
    (subjectMode === "pick" && selectedSubjectId) ||
    (subjectMode === "type" && newSubjectName.trim())
  ) && (
    (topicMode === "pick" && selectedTopicId) ||
    (topicMode === "type" && newTopicName.trim())
  );

  const updateCell = (rowIdx, col, val) => {
    setEditableRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, [col]: val } : r));
  };

  const handleImport = async () => {
    if (!editableRows?.length) return;
    setImporting(true);

    let subjectId = selectedSubjectId;
    let topicId = resolvedTopicId;

    // Create new subject if typed
    if (subjectMode === "type" && newSubjectName.trim()) {
      const existing = allSubjects.find(s => s.name.trim().toLowerCase() === newSubjectName.trim().toLowerCase() && s.grade === grade);
      if (existing) {
        subjectId = existing.id;
      } else {
        const created = await base44.entities.Subject.create({
          name: newSubjectName.trim(),
          grade,
          icon: newSubjectIcon.trim() || "📚",
          is_active: true,
        });
        subjectId = created.id;
      }
    }

    // Create new topic if typed
    if (topicMode === "type" && newTopicName.trim()) {
      const existing = topics.find(t => t.name.trim().toLowerCase() === newTopicName.trim().toLowerCase());
      if (existing) {
        topicId = existing.id;
      } else {
        const created = await base44.entities.Topic.create({
          subject_id: subjectId,
          name: newTopicName.trim(),
          is_active: true,
          order: topics.length + 1,
        });
        topicId = created.id;
      }
    }

    let success = 0, failed = 0, failedRows = [];

    for (let i = 0; i < editableRows.length; i++) {
      const row = editableRows[i];
      const errs = importType === "notes" ? validateNotesRow(row) : validateQuestionsRow(row);
      if (errs.length) { failed++; failedRows.push({ row: i + 2, messages: errs }); continue; }

      const data = importType === "notes"
        ? transformNote(row, subjectId, topicId)
        : transformQuestion(row, subjectId, topicId);

      await base44.entities[importType === "notes" ? "Note" : "Question"].create(data);
      success++;
    }

    setResult({ success, failed, failedRows });
    setImporting(false);
    setParsedRows(null);
    setEditableRows(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h2 className="text-lg font-bold text-foreground">CSV Importer</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Import notes or questions in bulk. All content is saved as <strong>drafts</strong> and must be approved in the <strong>Review</strong> tab before going live.
        </p>
      </div>

      {/* ── Step 1: Context ── */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">Step 1 — Select Grade, Subject & Topic</p>

        {/* Grade */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Grade</label>
          <div className="flex flex-wrap gap-2">
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${grade === g ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Subject</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setSubjectMode("pick")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${subjectMode === "pick" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}
            >
              Pick existing
            </button>
            <button
              onClick={() => setSubjectMode("type")}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${subjectMode === "type" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}
            >
              Add new
            </button>
          </div>

          {subjectMode === "pick" ? (
            loadingSubjects ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> Loading subjects...
              </div>
            ) : (
              <>
                <select
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                >
                  <option value="">— select a subject —</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
                {subjects.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">No subjects for {grade} yet — switch to "Add new" to create one.</p>
                )}
              </>
            )
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                placeholder="e.g. Mathematics, English, Science..."
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSubjectIcon}
                  onChange={e => setNewSubjectIcon(e.target.value)}
                  placeholder="Emoji icon e.g. 📚"
                  className="w-24 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground text-center"
                />
                <span className="text-xs text-muted-foreground">Emoji icon (optional)</span>
              </div>
            </div>
          )}
        </div>

        {/* Topic */}
        {(selectedSubjectId || (subjectMode === "type" && newSubjectName.trim())) && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Topic</label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setTopicMode("pick")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${topicMode === "pick" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}
              >
                Pick existing
              </button>
              <button
                onClick={() => setTopicMode("type")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${topicMode === "type" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"}`}
              >
                Type new
              </button>
            </div>

            {topicMode === "pick" ? (
              loadingTopics ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> Loading topics...
                </div>
              ) : (
                <select
                  value={selectedTopicId}
                  onChange={e => setSelectedTopicId(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                >
                  <option value="">— select a topic —</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )
            ) : (
              <input
                type="text"
                value={newTopicName}
                onChange={e => setNewTopicName(e.target.value)}
                placeholder="e.g. Fractions, Forces and Motion..."
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
              />
            )}
          </div>
        )}

        {/* Summary */}
        {canUpload && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2 text-xs text-green-700 font-medium">
            ✅ {grade} → {resolvedSubjectName}{subjectMode === "type" ? " (new)" : ""} → {topicMode === "pick" ? topics.find(t => t.id === selectedTopicId)?.name : `"${newTopicName}" (new)`}
          </div>
        )}
      </div>

      {/* ── Step 2: Import Type ── */}
      {canUpload && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">Step 2 — What are you importing?</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: "questions", label: "Questions", emoji: "❓", desc: "MCQ, comprehension, etc." },
              { key: "notes", label: "Notes", emoji: "📝", desc: "Study notes for the topic" },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => { setImportType(opt.key); resetUpload(); }}
                className={`p-3 rounded-2xl border-2 text-left transition-all ${importType === opt.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
              >
                <div className="text-xl mb-1">{opt.emoji}</div>
                <p className="font-bold text-sm text-foreground">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 3: CSV Upload ── */}
      {canUpload && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Step 3 — Upload CSV</p>
            <button
              onClick={() => setShowTemplate(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {showTemplate ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showTemplate ? "Hide template" : "View template"}
            </button>
          </div>

          {/* Template download */}
          <div className={`space-y-2 ${showTemplate ? "" : "hidden"}`}>
            <div className="bg-secondary/50 border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/80">
                <span className="text-xs font-semibold text-muted-foreground">
                  📄 {importType === "notes" ? "Notes" : "Questions"} CSV Template
                </span>
                <button
                  onClick={() => downloadTemplate(importType)}
                  className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>
              <pre className="text-[10px] text-muted-foreground px-3 py-2 whitespace-pre overflow-x-auto leading-relaxed">
                {importType === "notes" ? NOTES_TEMPLATE : QUESTIONS_TEMPLATE}
              </pre>
            </div>

            {/* Column reference */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 space-y-1">
              <p className="text-xs font-bold text-blue-700 mb-1.5">Column Reference</p>
              <p className="text-[10px] text-blue-600 mb-2 font-medium">💡 Wrap fields containing multiple sentences in double quotes: <span className="font-mono bg-blue-100 px-1 rounded">"Sentence one. Sentence two. Sentence three."</span></p>
              {importType === "questions" ? (
                <>
                  {[
                    ["question_text *", "The question text"],
                    ["comprehension_passage", "Reading passage (leave blank for MCQ)"],
                    ["optA, optB, optC, optD *", "The four answer choices"],
                    ["correct_answer *", "A, B, C or D"],
                    ["explanation", "Why the answer is correct"],
                    ["difficulty", "Easy / Standard / Advanced"],
                    ["question_type", "mcq / comprehension / structured"],
                  ].map(([col, desc]) => (
                    <div key={col} className="flex gap-2 text-xs">
                      <span className="font-mono font-bold text-primary w-40 flex-shrink-0">{col}</span>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {[
                    ["overview *", "2-3 sentence topic overview"],
                    ["key_definitions", "Key terms and definitions"],
                    ["key_concepts", "Main concepts explained"],
                    ["zimbabwe_examples", "Real Zimbabwe examples"],
                    ["important_facts", "Facts to remember"],
                    ["common_mistakes", "Common exam mistakes"],
                    ["summary", "Summary points"],
                    ["exam_tips", "Tips for exam questions"],
                  ].map(([col, desc]) => (
                    <div key={col} className="flex gap-2 text-xs">
                      <span className="font-mono font-bold text-primary w-40 flex-shrink-0">{col}</span>
                      <span className="text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Upload zone */}
          {!parsedRows && !result && (
            <label className="block">
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Click to upload CSV</p>
                <p className="text-xs text-muted-foreground mt-1">CSV files only · {importType === "notes" ? "Notes" : "Questions"} format</p>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
              </div>
            </label>
          )}

          {/* Header errors */}
          {headerErrors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1 text-destructive font-semibold text-xs">
                <XCircle className="w-3.5 h-3.5" /> Invalid CSV format
              </div>
              {headerErrors.map((e, i) => (
                <p key={i} className="text-xs text-destructive">{e}</p>
              ))}
              <button onClick={resetUpload} className="text-xs text-muted-foreground underline mt-1">Try again</button>
            </div>
          )}

          {/* Row validation errors */}
          {parsedRows && parseErrors.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1 max-h-36 overflow-y-auto">
              <div className="flex items-center gap-1 text-amber-700 font-semibold text-xs">
                <AlertTriangle className="w-3.5 h-3.5" /> {parseErrors.length} row(s) have validation issues
              </div>
              {parseErrors.map((e, i) => (
                <div key={i} className="text-xs text-amber-700">
                  <span className="font-semibold">Row {e.row}:</span> {e.messages.join("; ")}
                </div>
              ))}
              <p className="text-xs text-amber-600 mt-1">You can still fix these in the preview below before importing.</p>
            </div>
          )}

          {/* Editable Preview */}
          {editableRows && editableRows.length > 0 && (
            <div className="space-y-3">
              {mergeNotice && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-3 py-2.5 text-xs text-blue-700 font-medium flex items-center gap-2">
                  <span>ℹ️</span> {mergeNotice}
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">
                  ✏️ Preview & Edit — {editableRows.length} row{editableRows.length !== 1 ? "s" : ""} detected
                </p>
                <button onClick={resetUpload} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {editableRows.map((row, i) => (
                  <div key={i} className="bg-secondary/40 border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">Row {i + 2}</span>
                      <button
                        onClick={() => setEditableRows(prev => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    {importType === "questions" && (
                      <>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase">Question *</label>
                          <textarea
                            value={row.question_text || ""}
                            onChange={e => updateCell(i, "question_text", e.target.value)}
                            className="w-full border border-border rounded-lg px-2 py-1 text-xs mt-0.5 resize-none h-14 bg-background text-foreground"
                          />
                        </div>
                        {(row.comprehension_passage || row.question_type === "comprehension") && (
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Passage</label>
                            <textarea
                              value={row.comprehension_passage || ""}
                              onChange={e => updateCell(i, "comprehension_passage", e.target.value)}
                              className="w-full border border-border rounded-lg px-2 py-1 text-xs mt-0.5 resize-none h-12 bg-background text-foreground"
                            />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          {["optA","optB","optC","optD"].map(opt => (
                            <div key={opt}>
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase">{opt} *</label>
                              <input
                                value={row[opt] || ""}
                                onChange={e => updateCell(i, opt, e.target.value)}
                                className="w-full border border-border rounded-lg px-2 py-1 text-xs mt-0.5 bg-background text-foreground"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Answer *</label>
                            <select
                              value={row.correct_answer?.toUpperCase() || "A"}
                              onChange={e => updateCell(i, "correct_answer", e.target.value)}
                              className="w-full border border-border rounded-lg px-2 py-1 text-xs mt-0.5 bg-background text-foreground"
                            >
                              {["A","B","C","D"].map(l => <option key={l}>{l}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Difficulty</label>
                            <select
                              value={row.difficulty || "Standard"}
                              onChange={e => updateCell(i, "difficulty", e.target.value)}
                              className="w-full border border-border rounded-lg px-2 py-1 text-xs mt-0.5 bg-background text-foreground"
                            >
                              {["Easy","Standard","Advanced"].map(d => <option key={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">Type</label>
                            <select
                              value={row.question_type || "mcq"}
                              onChange={e => updateCell(i, "question_type", e.target.value)}
                              className="w-full border border-border rounded-lg px-2 py-1 text-xs mt-0.5 bg-background text-foreground"
                            >
                              {["mcq","comprehension","structured"].map(t => <option key={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase">Explanation</label>
                          <input
                            value={row.explanation || ""}
                            onChange={e => updateCell(i, "explanation", e.target.value)}
                            className="w-full border border-border rounded-lg px-2 py-1 text-xs mt-0.5 bg-background text-foreground"
                          />
                        </div>
                      </>
                    )}

                    {importType === "notes" && (
                      <>
                        {[
                          ["overview", "Overview *"],
                          ["key_definitions", "Key Definitions"],
                          ["key_concepts", "Key Concepts"],
                          ["zimbabwe_examples", "Zimbabwe Examples"],
                          ["important_facts", "Important Facts"],
                          ["common_mistakes", "Common Mistakes"],
                          ["summary", "Summary"],
                          ["exam_tips", "Exam Tips"],
                        ].map(([field, label]) => (
                          <div key={field}>
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</label>
                            <textarea
                              value={row[field] || ""}
                              onChange={e => updateCell(i, field, e.target.value)}
                              className="w-full border border-border rounded-lg px-2 py-1 text-xs mt-0.5 resize-none h-12 bg-background text-foreground"
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5 text-xs text-amber-700 font-medium">
                📋 {editableRows.length} item{editableRows.length !== 1 ? "s" : ""} will be saved as <strong>unpublished drafts</strong>. Go to the <strong>Review</strong> tab to approve and publish them.
              </div>

              <button
                onClick={handleImport}
                disabled={importing || editableRows.length === 0}
                className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {importing
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving drafts...</>
                  : `Save ${editableRows.length} ${importType === "notes" ? "Note" : "Question"}${editableRows.length !== 1 ? "s" : ""} as Drafts`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Result ── */}
      {result && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-green-700 bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">{result.success} item{result.success !== 1 ? "s" : ""} saved as drafts</p>
              <p className="text-xs text-green-600 mt-0.5">Go to the <strong>Review</strong> tab to approve &amp; publish them on the CMS.</p>
            </div>
          </div>

          {result.failed > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 space-y-1 max-h-36 overflow-y-auto">
              <div className="flex items-center gap-1 text-destructive font-semibold text-xs">
                <XCircle className="w-3.5 h-3.5" /> {result.failed} row{result.failed !== 1 ? "s" : ""} failed
              </div>
              {result.failedRows.map((e, i) => (
                <div key={i} className="text-xs text-destructive">
                  <span className="font-medium">Row {e.row}:</span> {e.messages.join("; ")}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => { setResult(null); resetUpload(); }}
            className="w-full border border-border text-sm font-medium py-2.5 rounded-xl text-muted-foreground hover:bg-secondary transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}