import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, CheckCircle, XCircle, ChevronDown, ChevronUp, AlertCircle, Globe } from "lucide-react";

export default function PreloadQuestions() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [minCount, setMinCount] = useState(20);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState([]); // live per-topic progress
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [topicCounts, setTopicCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  // Bulk-all state
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkLog, setBulkLog] = useState([]);
  const [bulkSummary, setBulkSummary] = useState(null);

  const runBulkAllGrades = async () => {
    if (bulkLoading) return;
    setBulkLoading(true);
    setBulkLog([]);
    setBulkSummary(null);

    let totalGenerated = 0;
    let totalProcessed = 0;
    let safety = 0;

    try {
      // Loop until the function reports `remaining: 0`. Safety cap of 60 batches.
      while (safety++ < 60) {
        const res = await base44.functions.invoke("bulkGenerateAllQuestions", {
          minQuestions: 10,
          batchSize: 6,
        });
        const data = res?.data || {};
        if (data.error) throw new Error(data.error);

        const generatedThisRun = (data.results || []).reduce((sum, r) => sum + (r.generated || 0), 0);
        totalGenerated += generatedThisRun;
        totalProcessed += data.processed || 0;

        setBulkLog((log) => [
          ...log,
          ...(data.results || []).map((r) => ({
            topic: r.topic,
            grade: r.grade,
            subject: r.subject,
            generated: r.generated,
            error: r.error,
          })),
        ]);

        if ((data.remaining || 0) === 0) {
          setBulkSummary({
            totalGenerated,
            totalProcessed,
            message: data.message || "All topics now have enough questions.",
          });
          break;
        }
      }
    } catch (e) {
      setBulkSummary({ totalGenerated, totalProcessed, error: e.message });
    } finally {
      setBulkLoading(false);
    }
  };

  useEffect(() => {
    base44.entities.Subject.filter({ is_active: true }).then(setSubjects);
  }, []);

  const loadTopicCounts = async (subjectId) => {
    if (!subjectId) return;
    setLoadingCounts(true);
    try {
      const topics = await base44.entities.Topic.filter({ subject_id: subjectId, is_active: true }, "order", 200);
      const counts = {};
      await Promise.all(topics.map(async (t) => {
        const allQs = await base44.entities.Question.filter({ topic_id: t.id, is_active: true }, "created_date", 200);
        counts[t.id] = { name: t.name, count: allQs.length, objectives: t.learning_objectives || "" };
      }));
      setTopicCounts(counts);
    } catch (e) {
      console.error(e);
    }
    setLoadingCounts(false);
  };

  const handleSubjectChange = (id) => {
    setSelectedSubjectId(id);
    setSummary(null);
    setError(null);
    setProgress([]);
    setTopicCounts({});
    if (id) loadTopicCounts(id);
  };

  const handlePreload = async () => {
    if (!selectedSubjectId) return;
    setLoading(true);
    setSummary(null);
    setError(null);
    setProgress([]);

    const subject = subjects.find(s => s.id === selectedSubjectId);
    const topicsToFill = Object.entries(topicCounts)
      .filter(([, v]) => v.count < minCount)
      .map(([id, v]) => ({ id, name: v.name, count: v.count, objectives: v.objectives }));

    let totalGenerated = 0;
    const results = [];

    for (const topic of topicsToFill) {
      const needed = minCount - topic.count;
      setProgress(p => [...p, { topicName: topic.name, status: "generating", needed }]);

      try {
        // Fetch existing question texts for deduplication
        const existing = await base44.entities.Question.filter(
          { topic_id: topic.id, is_active: true },
          "created_date", 200
        );
        const existingTexts = new Set(existing.map(q => q.question_text?.trim().toLowerCase()));

        const isEnglish = topic.name?.toLowerCase().includes("english") ||
          topic.name?.toLowerCase().includes("comprehension") ||
          topic.name?.toLowerCase().includes("reading");

        const result = await base44.integrations.Core.InvokeLLM({
          model: "gemini_3_flash",
          prompt: `You are a ZIMSEC exam question setter for Grade 7 Zimbabwe students.

Generate ${needed} MCQ practice questions for:
Subject: ${subject.name}
Topic: ${topic.name}
Learning Objectives: ${topic.objectives || "General understanding of " + topic.name}

ZIMSEC Syllabus Rules:
- All questions must align with the ZIMSEC Grade 7 syllabus for this topic.
- Base questions directly on the learning objectives above.
- Use simple, clear English that a 12-year-old can understand.
- Short sentences. No difficult words unless the topic requires them.
- Use Zimbabwe-based examples and contexts where possible (sadza, mealie meal, Harare, cattle, Victoria Falls, market, etc).
- Spread correct answers evenly across A, B, C and D — do NOT cluster on one letter.
- Each explanation must be 1-2 simple sentences.
- Difficulty mix: 40% Easy, 40% Standard, 20% Advanced.
${isEnglish ? "- For comprehension topics include a short passage (3-6 sentences, Zimbabwe context) in comprehension_passage." : "- Leave comprehension_passage empty."}

Return JSON with a "questions" array. Each question:
- question_text
- comprehension_passage (optional, only for comprehension/reading)
- options: [{label: "A"/"B"/"C"/"D", text: "..."}]
- correct_answer (letter only: A/B/C/D)
- explanation
- difficulty (Easy / Standard / Advanced)`,
          response_json_schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question_text: { type: "string" },
                    comprehension_passage: { type: "string" },
                    options: { type: "array", items: { type: "object" } },
                    correct_answer: { type: "string" },
                    explanation: { type: "string" },
                    difficulty: { type: "string" }
                  }
                }
              }
            }
          }
        });

        const generated = (result?.questions || []).filter(q =>
          q.question_text && q.correct_answer && q.options?.length >= 2 &&
          !existingTexts.has(q.question_text?.trim().toLowerCase())
        );

        await Promise.all(generated.map(q =>
          base44.entities.Question.create({
            topic_id: topic.id,
            subject_id: selectedSubjectId,
            question_text: q.question_text,
            comprehension_passage: q.comprehension_passage || "",
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation || "",
            difficulty: q.difficulty || "Standard",
            question_type: q.comprehension_passage ? "comprehension" : "mcq",
            marks: 1,
            is_active: true,
          })
        ));

        totalGenerated += generated.length;
        results.push({ topicName: topic.name, status: "generated", generated: generated.length });
        setProgress(p => p.map(x => x.topicName === topic.name
          ? { ...x, status: "done", generated: generated.length }
          : x
        ));
      } catch (err) {
        console.error(`Error for topic ${topic.name}:`, err);
        results.push({ topicName: topic.name, status: "error", error: err.message });
        setProgress(p => p.map(x => x.topicName === topic.name
          ? { ...x, status: "error", error: err.message }
          : x
        ));
      }
    }

    setSummary({
      totalGenerated,
      totalSkipped: Object.values(topicCounts).filter(v => v.count >= minCount).length,
      totalTopics: Object.keys(topicCounts).length,
      results,
    });

    // Refresh counts
    loadTopicCounts(selectedSubjectId);
    setLoading(false);
  };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const topicList = Object.entries(topicCounts);
  const topicsNeedingQuestions = topicList.filter(([, v]) => v.count < minCount).length;
  const errors = summary?.results?.filter(r => r.status === "error") || [];

  return (
    <div className="space-y-5">
      {/* Bulk: ALL grades & subjects */}
      <div className="bg-gradient-to-br from-violet-600 to-primary rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold">Backfill ALL Grades & Subjects</h3>
            <p className="text-xs text-white/80">Ensures every topic across every grade has at least 10 questions ready</p>
          </div>
        </div>
        <button
          onClick={runBulkAllGrades}
          disabled={bulkLoading}
          className="w-full bg-white text-primary font-bold py-3 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {bulkLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Generating... {bulkLog.length} topic{bulkLog.length !== 1 ? "s" : ""} done
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" /> Run Full Backfill (all grades)
            </>
          )}
        </button>

        {bulkLog.length > 0 && (
          <div className="mt-3 bg-white/10 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
            {bulkLog.slice(-30).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {r.error ? (
                  <XCircle className="w-3 h-3 text-red-300 flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-3 h-3 text-green-300 flex-shrink-0" />
                )}
                <span className="flex-1 truncate text-white/90">
                  {r.grade} · {r.subject} · {r.topic}
                </span>
                <span className="font-semibold text-white">
                  {r.error ? "err" : `+${r.generated}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {bulkSummary && (
          <div className="mt-3 bg-white/15 rounded-xl p-3 text-sm">
            {bulkSummary.error ? (
              <p className="text-red-200">Stopped: {bulkSummary.error}</p>
            ) : (
              <p className="text-white font-semibold">
                ✅ Done — generated {bulkSummary.totalGenerated} new questions across {bulkSummary.totalProcessed} topics.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl p-5 border border-primary/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Preload Questions (single subject)</h3>
            <p className="text-xs text-muted-foreground">Bulk-generate ZIMSEC-aligned questions for topics below the minimum</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Subject picker */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Select Subject</label>
            <select
              value={selectedSubjectId}
              onChange={e => handleSubjectChange(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground"
            >
              <option value="">Choose a subject...</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.icon} {s.name} — {s.grade}</option>
              ))}
            </select>
          </div>

          {/* Min questions per topic */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              Minimum questions per topic
            </label>
            <div className="flex items-center gap-3">
              {[10, 15, 20, 25].map(n => (
                <button
                  key={n}
                  onClick={() => setMinCount(n)}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${minCount === n ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Topic preview */}
      {selectedSubjectId && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-foreground">
              {selectedSubject?.icon} {selectedSubject?.name} — Topic Status
            </p>
            {loadingCounts && (
              <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            )}
          </div>

          {!loadingCounts && topicList.length > 0 && (
            <>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-700 font-medium">
                  <CheckCircle className="w-3 h-3" />
                  {topicList.filter(([, v]) => v.count >= minCount).length} ready
                </span>
                <span className="flex items-center gap-1 text-orange-700 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  {topicsNeedingQuestions} need questions
                </span>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {topicList.map(([id, { name, count }]) => (
                  <div key={id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-secondary/40">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${count >= minCount ? "bg-green-500" : count > 0 ? "bg-orange-400" : "bg-red-400"}`} />
                    <span className="flex-1 text-xs font-medium text-foreground truncate">{name}</span>
                    <span className={`text-xs font-semibold ${count >= minCount ? "text-green-600" : "text-orange-600"}`}>
                      {count} Qs
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {topicsNeedingQuestions > 0 && !loadingCounts && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-amber-600 font-medium">
              ⚡ Will backfill {topicsNeedingQuestions} topic{topicsNeedingQuestions !== 1 ? "s" : ""} to {minCount} questions each
            </div>
          )}
          {topicList.length > 0 && topicsNeedingQuestions === 0 && !loadingCounts && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2 text-xs text-green-600 font-medium">
              ✅ All topics already have {minCount}+ questions — nothing to generate
            </div>
          )}
        </div>
      )}

      {/* Run button */}
      <button
        onClick={handlePreload}
        disabled={!selectedSubjectId || loading || loadingCounts || (topicList.length > 0 && topicsNeedingQuestions === 0)}
        className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating... ({progress.filter(p => p.status === "done" || p.status === "error").length}/{progress.length} topics done)
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Backfill Questions for {selectedSubject?.name || "Subject"}
          </>
        )}
      </button>

      {/* Live progress */}
      {loading && progress.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Live Progress</p>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {progress.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/40 text-xs">
                {p.status === "generating" && <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />}
                {p.status === "done" && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                {p.status === "error" && <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />}
                <span className="flex-1 font-medium text-foreground truncate">{p.topicName}</span>
                {p.status === "generating" && <span className="text-muted-foreground">generating {p.needed}...</span>}
                {p.status === "done" && <span className="text-green-600 font-semibold">+{p.generated}</span>}
                {p.status === "error" && <span className="text-destructive">failed</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 space-y-2">
            <p className="font-bold text-green-600 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Backfill Complete
            </p>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="bg-card rounded-xl p-2 text-center border border-green-500/30">
                <p className="text-xl font-bold text-green-600">{summary.totalGenerated}</p>
                <p className="text-xs text-green-600">Generated</p>
              </div>
              <div className="bg-card rounded-xl p-2 text-center border border-border">
                <p className="text-xl font-bold text-foreground">{summary.totalSkipped}</p>
                <p className="text-xs text-muted-foreground">Already OK</p>
              </div>
              <div className="bg-card rounded-xl p-2 text-center border border-border">
                <p className="text-xl font-bold text-foreground">{summary.totalTopics}</p>
                <p className="text-xs text-muted-foreground">Topics</p>
              </div>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                <XCircle className="w-3 h-3" /> {errors.length} topic(s) had errors
              </p>
              {errors.map((e, i) => (
                <p key={i} className="text-xs text-destructive">• {e.topicName}: {e.error}</p>
              ))}
            </div>
          )}

          {summary.results?.length > 0 && (
            <div>
              <button
                onClick={() => setShowDetails(d => !d)}
                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
              >
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetails ? "Hide" : "Show"} topic details
              </button>
              {showDetails && (
                <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                  {summary.results.map((r, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${r.status === "generated" ? "bg-green-500/10" : "bg-secondary/40"}`}>
                      <span className="font-medium text-foreground truncate flex-1">{r.topicName}</span>
                      {r.status === "generated"
                        ? <span className="text-green-700 font-semibold ml-2">+{r.generated} generated</span>
                        : <span className="text-destructive ml-2">error</span>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
          <XCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}