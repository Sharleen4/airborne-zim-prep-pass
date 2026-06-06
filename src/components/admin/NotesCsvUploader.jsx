import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Download, Upload, CheckCircle, AlertTriangle, X, Save, ChevronDown, ChevronUp } from "lucide-react";

const NOTE_FIELDS = [
  { key: "topic_name",        label: "Topic Name *",       required: true,  hint: "Must match an existing topic name exactly" },
  { key: "subject_name",      label: "Subject Name *",     required: true,  hint: "Must match an existing subject name exactly (e.g. Mathematics)" },
  { key: "grade",             label: "Grade *",            required: true,  hint: "One of: Grade 4, Grade 5, Grade 6, Grade 7" },
  { key: "overview",          label: "Overview",           required: false, hint: "2-3 sentence summary of the topic" },
  { key: "key_definitions",   label: "Key Definitions",    required: false, hint: "Key terms and their definitions" },
  { key: "key_concepts",      label: "Key Concepts",       required: false, hint: "Main concepts explained clearly" },
  { key: "zimbabwe_examples", label: "Zimbabwe Examples",  required: false, hint: "Real Zimbabwe-based examples or contexts" },
  { key: "important_facts",   label: "Important Facts",    required: false, hint: "Facts to remember" },
  { key: "common_mistakes",   label: "Common Mistakes",    required: false, hint: "Common exam mistakes" },
  { key: "summary",           label: "Summary",            required: false, hint: "Brief summary" },
  { key: "exam_tips",         label: "Exam Tips",          required: false, hint: "Specific exam advice" },
];

const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

const TEMPLATE_ROWS = [
  NOTE_FIELDS.map(f => f.key).join(","),
  "Fractions,Mathematics,Grade 7,Fractions represent parts of a whole. They are written as numerator over denominator.,Numerator: top number. Denominator: bottom number. Equivalent fractions: fractions with the same value.,To add fractions with the same denominator add the numerators and keep the denominator.,'If Chipo has 3/8 of a loaf of bread and eats 1/8 how much is left?,Always simplify your answer. Check numerator is smaller than denominator for proper fractions.,Fractions = parts of a whole. Add same denominators by adding numerators. Simplify answers.,Always check if your fraction can be simplified before writing your final answer.",
];

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    // Handle quoted fields with commas inside
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQuotes = !inQuotes; }
      else if (line[i] === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += line[i]; }
    }
    values.push(current.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || "").replace(/^"|"$/g, ""); });
    return obj;
  });
}

function downloadTemplate() {
  const content = TEMPLATE_ROWS.join("\n");
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "notes_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Editable Row ─────────────────────────────────────────────────────────────
function EditableNoteRow({ row, idx, subjects, topics, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(false);

  const filteredSubjects = subjects.filter(s => !row.grade || s.grade === row.grade);
  const matchedSubject = subjects.find(s =>
    s.name.toLowerCase().trim() === (row.subject_name || "").toLowerCase().trim() &&
    s.grade === row.grade
  );
  const filteredTopics = topics.filter(t => !matchedSubject || t.subject_id === matchedSubject?.id);
  const matchedTopic = topics.find(t =>
    t.name.toLowerCase().trim() === (row.topic_name || "").toLowerCase().trim() &&
    (!matchedSubject || t.subject_id === matchedSubject?.id)
  );

  const gradeOk   = GRADES.includes(row.grade);
  const subjectOk = !!matchedSubject;
  const topicOk   = !!matchedTopic;
  const isValid   = gradeOk && subjectOk && topicOk;

  return (
    <div className={`rounded-2xl border overflow-hidden ${isValid ? "border-border" : "border-amber-400/60"}`}>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary/30">
        <span className="text-xs font-bold text-muted-foreground w-5 flex-shrink-0">{idx + 1}.</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{row.topic_name || "Untitled"}</p>
          <div className="flex flex-wrap gap-1 mt-0.5">
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold border ${gradeOk ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-600 border-red-300"}`}>{row.grade || "No Grade"}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold border ${subjectOk ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-600 border-red-300"}`}>{row.subject_name || "No Subject"}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold border ${topicOk ? "bg-green-50 text-green-700 border-green-300" : "bg-amber-50 text-amber-700 border-amber-300"}`}>{row.topic_name || "No Topic"}{topicOk ? "" : " ⚠️"}</span>
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground p-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={() => onRemove(idx)} className="text-muted-foreground hover:text-destructive p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-2 bg-card">
          {/* Grade, Subject, Topic dropdowns */}
          <div className="grid grid-cols-3 gap-2">
            <select value={row.grade || ""} onChange={e => onChange(idx, "grade", e.target.value)}
              className="border border-border rounded-xl px-2 py-1.5 text-xs bg-background text-foreground">
              <option value="">— Grade —</option>
              {GRADES.map(g => <option key={g}>{g}</option>)}
            </select>
            <select value={row.subject_name || ""} onChange={e => onChange(idx, "subject_name", e.target.value)}
              className="border border-border rounded-xl px-2 py-1.5 text-xs bg-background text-foreground">
              <option value="">— Subject —</option>
              {filteredSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <select value={row.topic_name || ""} onChange={e => onChange(idx, "topic_name", e.target.value)}
              className="border border-border rounded-xl px-2 py-1.5 text-xs bg-background text-foreground">
              <option value="">— Topic —</option>
              {filteredTopics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>

          {/* Content fields */}
          {NOTE_FIELDS.filter(f => !["topic_name","subject_name","grade"].includes(f.key)).map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-muted-foreground mb-0.5 block">{f.label}</label>
              <textarea
                value={row[f.key] || ""}
                onChange={e => onChange(idx, f.key, e.target.value)}
                placeholder={f.hint}
                rows={2}
                className="w-full border border-border rounded-xl px-2 py-1.5 text-xs bg-background text-foreground resize-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function NotesCsvUploader({ onSaved }) {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics]     = useState([]);
  const [rows, setRows]         = useState([]);
  const [saving, setSaving]     = useState(false);
  const [result, setResult]     = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    Promise.all([
      base44.entities.Subject.list(),
      base44.entities.Topic.list(),
    ]).then(([s, t]) => { setSubjects(s); setTopics(t); });
  }, []);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setResult(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result);
      setRows(parsed);
    };
    reader.readAsText(f);
  };

  const handleChange = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const handleRemove = (idx) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  const resolveRow = (row) => {
    const subject = subjects.find(s =>
      s.name.toLowerCase().trim() === (row.subject_name || "").toLowerCase().trim() &&
      s.grade === row.grade
    );
    const topic = topics.find(t =>
      t.name.toLowerCase().trim() === (row.topic_name || "").toLowerCase().trim() &&
      (!subject || t.subject_id === subject?.id)
    );
    return { subject_id: subject?.id || null, topic_id: topic?.id || null };
  };

  const validRows   = rows.filter(r => {
    const sub = subjects.find(s => s.name.toLowerCase().trim() === (r.subject_name || "").toLowerCase().trim() && s.grade === r.grade);
    const top = topics.find(t => t.name.toLowerCase().trim() === (r.topic_name || "").toLowerCase().trim() && (!sub || t.subject_id === sub?.id));
    return GRADES.includes(r.grade) && !!sub && !!top;
  });
  const invalidCount = rows.length - validRows.length;

  const handleSave = async () => {
    if (validRows.length === 0) return;
    setSaving(true);
    let saved = 0;
    for (const row of validRows) {
      const { subject_id, topic_id } = resolveRow(row);
      await base44.entities.Note.create({
        topic_id,
        subject_id,
        overview:          row.overview || "",
        key_definitions:   row.key_definitions || "",
        key_concepts:      row.key_concepts || "",
        zimbabwe_examples: row.zimbabwe_examples || "",
        important_facts:   row.important_facts || "",
        common_mistakes:   row.common_mistakes || "",
        summary:           row.summary || "",
        exam_tips:         row.exam_tips || "",
        is_active:         false,
        review_status:     "pending_review",
        suggested_grade:   row.grade,
        suggested_subject: row.subject_name,
        suggested_topic:   row.topic_name,
      });
      saved++;
    }
    setSaving(false);
    setResult({ saved, skipped: invalidCount });
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
    if (onSaved) onSaved();
  };

  return (
    <div className="space-y-4">
      {/* Header & template */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm text-foreground">Upload Notes via CSV</p>
          <p className="text-xs text-muted-foreground mt-0.5">Fill in the template, upload, fix any errors, then save for review.</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-3 py-2 rounded-xl hover:bg-primary/5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Download Template
        </button>
      </div>

      {/* Schema reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-1">
        <p className="text-xs font-bold text-blue-700">📋 CSV Column Reference</p>
        <div className="grid grid-cols-1 gap-0.5">
          {NOTE_FIELDS.map(f => (
            <div key={f.key} className="flex gap-2 text-xs">
              <span className="font-mono font-bold text-blue-700 w-36 flex-shrink-0">{f.key}{f.required ? " *" : ""}</span>
              <span className="text-blue-600">{f.hint}</span>
            </div>
          ))}
        </div>
      </div>

      {/* File upload */}
      {rows.length === 0 && (
        <label className="flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-xl p-5 cursor-pointer hover:border-primary/40 transition-colors">
          <Upload className="w-6 h-6 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">Click to upload CSV</p>
          <p className="text-xs text-muted-foreground">CSV files only</p>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        </label>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-700 font-semibold">
          <CheckCircle className="w-4 h-4" />
          {result.saved} note{result.saved !== 1 ? "s" : ""} saved for review.
          {result.skipped > 0 && <span className="text-amber-600 ml-1">{result.skipped} skipped (invalid).</span>}
          <button onClick={() => setResult(null)} className="ml-auto text-xs underline font-normal text-green-600">Upload another</button>
        </div>
      )}

      {/* Editable rows */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{rows.length} rows detected — fix any errors below then save</p>
            <button onClick={() => { setRows([]); if (fileRef.current) fileRef.current.value = ""; }} className="text-xs text-muted-foreground hover:text-destructive">Clear</button>
          </div>

          {invalidCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {invalidCount} row{invalidCount !== 1 ? "s" : ""} need{invalidCount === 1 ? "s" : ""} fixing before they can be saved (grade, subject, or topic doesn't match)
            </div>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {rows.map((row, idx) => (
              <EditableNoteRow
                key={idx}
                row={row}
                idx={idx}
                subjects={subjects}
                topics={topics}
                onChange={handleChange}
                onRemove={handleRemove}
              />
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={saving || validRows.length === 0}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
              : <><Save className="w-4 h-4" />Save {validRows.length} Note{validRows.length !== 1 ? "s" : ""} for Review{invalidCount > 0 ? ` (skip ${invalidCount} invalid)` : ""}</>
            }
          </button>
        </div>
      )}
    </div>
  );
}