import { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, AlertTriangle, CheckCircle2, FileText, HelpCircle, BookOpen, Download, Sparkles } from "lucide-react";

/**
 * Cross-references every CurriculumTopic against the student-facing
 * Subject/Topic/Note/Question entities and reports the gaps:
 *
 *   - Missing student-facing Topic (no Topic in the relevant Subject matches the
 *     curriculum topic name)
 *   - Topic exists but has NO Note
 *   - Topic exists but has NO Question
 *
 * Read-only — surfaces what is missing so the admin can go and fix it.
 */
export default function GapAnalysisModal({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState(null);
  const [filter, setFilter] = useState({ grade: "", subject: "", type: "all" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProgress("Loading curriculum topics...");
        const curriculum = await base44.entities.CurriculumTopic.list("-created_date", 5000);
        if (cancelled) return;

        setProgress("Loading subjects & topics...");
        const [subjects, topics] = await Promise.all([
          base44.entities.Subject.filter({ is_active: true }, "-created_date", 200),
          base44.entities.Topic.filter({ is_active: true }, "-created_date", 2000),
        ]);
        if (cancelled) return;

        setProgress("Loading notes & questions (this may take a moment)...");
        const [notes, questions] = await Promise.all([
          base44.entities.Note.list("-created_date", 5000).catch(() => []),
          base44.entities.Question.filter({ is_active: true }, "-created_date", 10000).catch(() => []),
        ]);
        if (cancelled) return;

        setProgress("Analysing gaps...");
        const report = analyseGaps({ curriculum, subjects, topics, notes, questions });
        if (cancelled) return;
        setResults(report);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Failed to load data");
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    if (!results) return [];
    return results.rows.filter(r => {
      if (filter.grade && r.grade !== filter.grade) return false;
      if (filter.subject && r.subject !== filter.subject) return false;
      if (filter.type === "missing_topic" && r.status.hasTopic) return false;
      if (filter.type === "missing_note" && r.status.hasNote) return false;
      if (filter.type === "missing_questions" && r.status.hasQuestions) return false;
      if (filter.type === "complete" && !(r.status.hasTopic && r.status.hasNote && r.status.hasQuestions)) return false;
      return true;
    });
  }, [results, filter]);

  const downloadCsv = () => {
    if (!rows.length) return;
    const header = ["Grade", "Subject", "Topic", "Subtopic", "Has Topic?", "Has Note?", "Has Questions?", "Question Count", "Curriculum Code"];
    const lines = [header.join(",")];
    rows.forEach(r => {
      lines.push([
        r.grade,
        csv(r.subject),
        csv(r.topic),
        csv(r.subtopic || ""),
        r.status.hasTopic ? "Yes" : "NO",
        r.status.hasNote ? "Yes" : "NO",
        r.status.hasQuestions ? "Yes" : "NO",
        r.status.questionCount,
        r.code || "",
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `curriculum-gap-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div
        className="bg-card rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-extrabold text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Curriculum Gap Analysis
            </h2>
            <p className="text-white/80 text-xs">
              Find curriculum topics that are missing student-facing content (topic / notes / questions).
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{progress || "Loading..."}</p>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-4 text-sm">
              {error}
            </div>
          ) : results && (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <StatCard label="Curriculum topics" value={results.totals.total} icon={BookOpen} color="text-primary" />
                <StatCard label="Missing topic" value={results.totals.missingTopic} icon={AlertTriangle} color="text-amber-600" />
                <StatCard label="Missing notes" value={results.totals.missingNote} icon={FileText} color="text-rose-600" />
                <StatCard label="Missing questions" value={results.totals.missingQuestions} icon={HelpCircle} color="text-violet-600" />
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <Select
                  value={filter.grade}
                  onChange={(v) => setFilter(f => ({ ...f, grade: v }))}
                  placeholder="All grades"
                  options={results.grades}
                />
                <Select
                  value={filter.subject}
                  onChange={(v) => setFilter(f => ({ ...f, subject: v }))}
                  placeholder="All subjects"
                  options={results.subjects}
                />
                <Select
                  value={filter.type}
                  onChange={(v) => setFilter(f => ({ ...f, type: v }))}
                  placeholder="All gaps"
                  options={[
                    { value: "all", label: "All topics" },
                    { value: "missing_topic", label: "Missing topic only" },
                    { value: "missing_note", label: "Missing notes only" },
                    { value: "missing_questions", label: "Missing questions only" },
                    { value: "complete", label: "Fully covered only" },
                  ]}
                />
                <button
                  onClick={downloadCsv}
                  disabled={!rows.length}
                  className="border border-border rounded-xl px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:bg-secondary disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>

              <p className="text-xs text-muted-foreground mb-2">{rows.length} topic{rows.length !== 1 ? "s" : ""}</p>

              {/* Rows */}
              <div className="space-y-1.5">
                {rows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-70" />
                    No topics match the current filter.
                  </div>
                ) : (
                  rows.map((r, i) => <GapRow key={i} row={r} />)
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function GapRow({ row }) {
  const { hasTopic, hasNote, hasQuestions, questionCount } = row.status;
  const allGood = hasTopic && hasNote && hasQuestions;
  return (
    <div className={`border rounded-xl p-3 flex items-start gap-3 ${allGood ? "bg-emerald-500/5 border-emerald-500/20" : "bg-card border-border"}`}>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-foreground truncate">
          {row.topic}{row.subtopic ? ` — ${row.subtopic}` : ""}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {row.subject} · {row.grade}{row.code ? ` · ${row.code}` : ""}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Chip ok={hasTopic} label={hasTopic ? "Topic ✓" : "No topic"} />
          <Chip ok={hasNote} label={hasNote ? "Notes ✓" : "No notes"} />
          <Chip ok={hasQuestions} label={hasQuestions ? `${questionCount} questions ✓` : "No questions"} />
        </div>
      </div>
      {allGood ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      )}
    </div>
  );
}

function Chip({ ok, label }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
      ok
        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300"
        : "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300"
    }`}>
      {label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <p className="text-2xl font-extrabold text-foreground leading-none">{value}</p>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

function Select({ value, onChange, placeholder, options }) {
  const opts = options.map(o => typeof o === "string" ? { value: o, label: o } : o);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground font-semibold"
    >
      <option value="">{placeholder}</option>
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── Analysis logic ─────────────────────────────────────────────────────────

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function analyseGaps({ curriculum, subjects, topics, notes, questions }) {
  // Build lookup: subjects keyed by (name, grade)
  const subjectByKey = new Map();
  subjects.forEach(s => {
    subjectByKey.set(`${norm(s.name)}|${s.grade}`, s);
  });

  // Topics grouped by subject_id
  const topicsBySubject = new Map();
  topics.forEach(t => {
    if (!t.subject_id) return;
    if (!topicsBySubject.has(t.subject_id)) topicsBySubject.set(t.subject_id, []);
    topicsBySubject.get(t.subject_id).push(t);
  });

  // Notes / questions keyed by topic_id
  const noteByTopic = new Set();
  notes.forEach(n => { if (n.topic_id) noteByTopic.add(n.topic_id); });
  const questionsByTopic = new Map();
  questions.forEach(q => {
    if (!q.topic_id) return;
    questionsByTopic.set(q.topic_id, (questionsByTopic.get(q.topic_id) || 0) + 1);
  });

  const rows = curriculum.map(c => {
    // Find the matching student-facing subject
    const subjectKey = `${norm(c.subject)}|${c.grade}`;
    const subject = subjectByKey.get(subjectKey);

    // Look for a Topic in that subject whose name matches the curriculum topic
    let topic = null;
    if (subject) {
      const list = topicsBySubject.get(subject.id) || [];
      const cNorm = norm(c.topic);
      const sNorm = norm(c.subtopic);
      topic = list.find(t => {
        const tNorm = norm(t.name);
        if (!tNorm) return false;
        // Match if topic name equals curriculum topic OR contains subtopic
        if (tNorm === cNorm) return true;
        if (sNorm && tNorm === sNorm) return true;
        if (cNorm && tNorm.includes(cNorm)) return true;
        if (sNorm && tNorm.includes(sNorm)) return true;
        return false;
      });
    }

    const hasTopic = !!topic;
    const hasNote = hasTopic && noteByTopic.has(topic.id);
    const qCount = hasTopic ? (questionsByTopic.get(topic.id) || 0) : 0;
    const hasQuestions = qCount > 0;

    return {
      id: c.id,
      grade: c.grade,
      subject: c.subject,
      topic: c.topic,
      subtopic: c.subtopic,
      code: c.curriculum_code,
      status: { hasTopic, hasNote, hasQuestions, questionCount: qCount },
    };
  });

  const totals = {
    total: rows.length,
    missingTopic: rows.filter(r => !r.status.hasTopic).length,
    missingNote: rows.filter(r => !r.status.hasNote).length,
    missingQuestions: rows.filter(r => !r.status.hasQuestions).length,
  };

  const grades = [...new Set(rows.map(r => r.grade).filter(Boolean))].sort();
  const subjectsList = [...new Set(rows.map(r => r.subject).filter(Boolean))].sort();

  // Sort: most-broken first (no topic > no note > no questions)
  rows.sort((a, b) => {
    const score = (r) =>
      (r.status.hasTopic ? 0 : 4) +
      (r.status.hasNote ? 0 : 2) +
      (r.status.hasQuestions ? 0 : 1);
    return score(b) - score(a);
  });

  return { rows, totals, grades, subjects: subjectsList };
}

function csv(s) {
  const v = String(s || "");
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}