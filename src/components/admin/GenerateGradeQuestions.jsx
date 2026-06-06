import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Zap, CheckCircle, XCircle, ChevronDown, ChevronUp, Search, Square } from "lucide-react";

const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];
// Cancellable sleep — resolves early if shouldStop becomes true
const sleep = (ms, shouldStop) => new Promise(r => {
  const start = Date.now();
  const tick = () => {
    if (shouldStop?.()) return r();
    if (Date.now() - start >= ms) return r();
    setTimeout(tick, Math.min(200, ms - (Date.now() - start)));
  };
  tick();
});

// Retry transient errors (Network Error, 503, 429, timeout) with exponential backoff
const isTransientError = (err) => {
  const msg = (err?.message || "").toLowerCase();
  const status = err?.status || err?.response?.status;
  return msg.includes("network error") ||
         msg.includes("timeout") ||
         msg.includes("fetch") ||
         status === 503 || status === 502 || status === 504 || status === 429;
};

const withRetry = async (fn, maxAttempts = 4, shouldStop) => {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (shouldStop?.()) throw new Error("Stopped by user");
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isTransientError(err)) throw err;
      // Backoff: 2s, 5s, 10s — keeps a single topic from blocking too long
      const delays = [2000, 5000, 10000];
      const delay = delays[attempt - 1] || 10000;
      console.warn(`Attempt ${attempt} failed (${err.message}), retrying in ${delay}ms...`);
      await sleep(delay, shouldStop);
      if (shouldStop?.()) throw new Error("Stopped by user");
    }
  }
  throw lastErr;
};

export default function GenerateGradeQuestions() {
  const [grade, setGrade] = useState("Grade 7");
  const [selectedSubjectId, setSelectedSubjectId] = useState("all");
  const [minCount, setMinCount] = useState(20);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, subjectName: "" });
  const [running, setRunning] = useState(false);
  const [scan, setScan] = useState(null);
  const [progress, setProgress] = useState([]);
  const [summary, setSummary] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [activeStartedAt, setActiveStartedAt] = useState(null);
  const [tick, setTick] = useState(0);
  const stopRef = useRef(false);

  // Tick every second so the elapsed-time counter on the active topic updates
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Manual scan — uses getTopicQuestionCounts (single call) to avoid rate-limit storms
  const scanGrade = async () => {
    setScanning(true);
    setSummary(null);
    setProgress([]);
    setScan(null);
    setScanError(null);
    setScanProgress({ current: 0, total: 0, subjectName: "Loading subjects & topics..." });

    try {
      // 1. Get all subjects in this grade (single call)
      const subjects = await base44.entities.Subject.filter({ grade, is_active: true });
      if (subjects.length === 0) {
        setScan({ subjects: [], totalSubjects: 0, totalTopicsNeeding: 0, totalToGenerate: 0 });
        setScanning(false);
        return;
      }

      // 2. Get ALL topics for this grade in one go — filter client-side by subject_id
      const subjectIds = new Set(subjects.map(s => s.id));
      const allTopics = await base44.entities.Topic.filter({ is_active: true }, "order", 1000);
      const topicsForGrade = allTopics.filter(t => subjectIds.has(t.subject_id));

      // 3. Get all question counts in ONE backend call (avoids 429 storm).
      // Use TOTAL counts (incl. drafts/pending) so we don't keep re-generating drafts
      // for topics that already have 20+ questions awaiting review.
      let countsMap = {};
      try {
        const res = await base44.functions.invoke("getTopicQuestionCounts", {});
        countsMap = res?.data?.totalCounts || res?.data?.counts || {};
      } catch (e) {
        console.warn("getTopicQuestionCounts failed, falling back:", e);
      }

      // 4. Build breakdown
      const breakdown = [];
      let totalTopicsNeeding = 0;
      let totalToGenerate = 0;

      for (let i = 0; i < subjects.length; i++) {
        const subject = subjects[i];
        setScanProgress({ current: i + 1, total: subjects.length, subjectName: subject.name });

        const subjectTopics = topicsForGrade.filter(t => t.subject_id === subject.id);
        const topicStatus = subjectTopics.map(t => ({
          id: t.id,
          name: t.name,
          count: countsMap[t.id] || 0,
          objectives: t.learning_objectives || "",
        }));
        const needing = topicStatus.filter(t => t.count < minCount);
        totalTopicsNeeding += needing.length;
        totalToGenerate += needing.reduce((s, t) => s + (minCount - t.count), 0);
        breakdown.push({ subject, topics: topicStatus, needing });
      }

      setScan({
        subjects: breakdown,
        totalSubjects: subjects.length,
        totalTopicsNeeding,
        totalToGenerate,
      });
    } catch (e) {
      console.error("Scan failed:", e);
      setScanError(e.message || "Scan failed — try again in a few seconds.");
    }
    setScanning(false);
  };

  const runGenerate = async (retryOnlyFailed = false) => {
    if (!scan) return;
    stopRef.current = false;
    const shouldStop = () => stopRef.current;
    setRunning(true);
    if (!retryOnlyFailed) setSummary(null);

    // Build the list of topics to process
    let topicsToProcess = [];
    if (retryOnlyFailed && summary) {
      const failedKeys = new Set(
        summary.results.filter(r => r.status === "error").map(r => `${r.subjectId}::${r.topicId}`)
      );
      for (const { subject, needing } of scan.subjects) {
        for (const topic of needing) {
          if (failedKeys.has(`${subject.id}::${topic.id}`)) {
            topicsToProcess.push({ subject, topic });
          }
        }
      }
    } else {
      for (const { subject, needing } of scan.subjects) {
        if (selectedSubjectId !== "all" && subject.id !== selectedSubjectId) continue;
        for (const topic of needing) topicsToProcess.push({ subject, topic });
      }
    }

    setProgress(topicsToProcess.map(({ subject, topic }) => ({
      key: `${subject.id}::${topic.id}`,
      subjectName: subject.name,
      topicName: topic.name,
      status: "queued",
      needed: minCount - topic.count,
    })));

    let totalGenerated = retryOnlyFailed ? (summary?.totalGenerated || 0) : 0;
    const results = retryOnlyFailed && summary?.results
      ? summary.results.filter(r => r.status !== "error")
      : [];

    let consecutiveFailures = 0;

    for (const { subject, topic } of topicsToProcess) {
      if (shouldStop()) break;
      const needed = minCount - topic.count;
      const key = `${subject.id}::${topic.id}`;
      setActiveStartedAt(Date.now());
      setProgress(p => p.map(x => x.key === key ? { ...x, status: "generating" } : x));

      try {
        // Include BOTH live & draft questions so we don't generate near-duplicates of
        // questions already waiting in the review queue.
        const existing = await withRetry(() => base44.entities.Question.filter(
          { topic_id: topic.id }, "created_date", 500
        ), 4, shouldStop);
        const existingTexts = new Set(existing.map(q => q.question_text?.trim().toLowerCase()));

        const isEnglish = topic.name?.toLowerCase().includes("english") ||
          topic.name?.toLowerCase().includes("comprehension") ||
          topic.name?.toLowerCase().includes("reading") ||
          subject.name?.toLowerCase().includes("english");

        const result = await withRetry(() => base44.integrations.Core.InvokeLLM({
            model: "gemini_3_flash",
            prompt: `You are a ZIMSEC exam question setter for ${grade} Zimbabwe students.

Generate ${needed} MCQ practice questions for:
Subject: ${subject.name}
Topic: ${topic.name}
Learning Objectives: ${topic.objectives || "General understanding of " + topic.name}

ZIMSEC Syllabus Rules:
- All questions must align with the ZIMSEC ${grade} syllabus for this topic.
- Base questions directly on the learning objectives above.
- Use simple, clear English appropriate for the grade level.
- Short sentences. No difficult words unless the topic requires them.
- Use Zimbabwe-based examples and contexts where possible (sadza, mealie meal, Harare, cattle, Victoria Falls, market, etc).
- Spread correct answers evenly across A, B, C and D — do NOT cluster on one letter.
- Each explanation must be 1-2 simple sentences.
- Difficulty mix: 40% Easy, 40% Standard, 20% Advanced.
${isEnglish ? "- For comprehension topics include a short passage (3-6 sentences, Zimbabwe context) in comprehension_passage." : "- Leave comprehension_passage empty."}

VISUALS — when a diagram would genuinely help (graphs, body parts, geometry shapes, maps, animals, plants, actions, scenes, fractions/charts), set "needs_image": true and write a clear "image_prompt" (1-2 sentences describing exactly what to draw — kid-friendly, Zimbabwean context where relevant). Aim for ~25-35% of questions to have a visual when the topic supports it (e.g. Science body parts, Maths shapes, Geography maps). For pure text/abstract questions, set needs_image: false.

Return JSON with a "questions" array. Each question:
- question_text
- comprehension_passage (optional, only for comprehension/reading)
- options: [{label: "A"/"B"/"C"/"D", text: "..."}]
- correct_answer (letter only: A/B/C/D)
- explanation
- difficulty (Easy / Standard / Advanced)
- needs_image (boolean)
- image_prompt (string, only if needs_image is true)`,
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
                    difficulty: { type: "string" },
                    needs_image: { type: "boolean" },
                    image_prompt: { type: "string" }
                  }
                }
              }
            }
          }
        }), 4, shouldStop);

        const generated = (result?.questions || []).filter(q =>
          q.question_text && q.correct_answer && q.options?.length >= 2 &&
          !existingTexts.has(q.question_text?.trim().toLowerCase())
        );

        // Create sequentially with retry to handle transient errors
        for (const q of generated) {
          if (shouldStop()) break;

          // Generate an image first if the LLM flagged this question as needing a visual.
          // Failure to generate the image must NOT block the question — just save without one.
          let imageUrl = "";
          if (q.needs_image && q.image_prompt?.trim()) {
            try {
              const imgRes = await base44.integrations.Core.GenerateImage({
                prompt: `Kid-friendly educational illustration for a ZIMSEC ${grade} ${subject.name} question. ${q.image_prompt.trim()} Simple, clear, colourful, age-appropriate for 9-13 year olds. No text labels or words in the image.`,
              });
              imageUrl = imgRes?.url || "";
            } catch (imgErr) {
              console.warn(`Image gen failed for question (continuing without image):`, imgErr?.message);
            }
          }

          await withRetry(() => base44.entities.Question.create({
            topic_id: topic.id,
            subject_id: subject.id,
            question_text: q.question_text,
            comprehension_passage: q.comprehension_passage || "",
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation || "",
            difficulty: q.difficulty || "Standard",
            question_type: q.comprehension_passage ? "comprehension" : "mcq",
            marks: 1,
            image_url: imageUrl,
            is_active: false,
            review_status: "pending_review",
            suggested_grade: grade,
            suggested_subject: subject.name,
            suggested_topic: topic.name,
          }), 4, shouldStop);
          await sleep(150, shouldStop);
        }

        totalGenerated += generated.length;
        consecutiveFailures = 0;
        results.push({ subjectId: subject.id, topicId: topic.id, subjectName: subject.name, topicName: topic.name, status: "done", generated: generated.length });
        setProgress(p => p.map(x => x.key === key
          ? { ...x, status: "done", generated: generated.length }
          : x
        ));
      } catch (err) {
        console.error(`Error for ${subject.name} → ${topic.name}:`, err);
        consecutiveFailures++;
        results.push({ subjectId: subject.id, topicId: topic.id, subjectName: subject.name, topicName: topic.name, status: "error", error: err.message });
        setProgress(p => p.map(x => x.key === key
          ? { ...x, status: "error", error: err.message }
          : x
        ));

        // After 3 consecutive failures, take a short cool-down — the LLM is overloaded
        if (consecutiveFailures >= 3) {
          const coolDownMs = 30000;
          console.warn(`${consecutiveFailures} consecutive failures — cooling down ${coolDownMs/1000}s before continuing...`);
          setProgress(p => p.map(x => x.status === "queued"
            ? { ...x, status: "queued", coolingDown: true }
            : x
          ));
          await sleep(coolDownMs, shouldStop);
          setProgress(p => p.map(x => x.coolingDown ? { ...x, coolingDown: false } : x));
          consecutiveFailures = 0;
        }
      }

      // Small pause between topics to avoid hammering the LLM endpoint
      await sleep(1000, shouldStop);
    }

    setActiveStartedAt(null);
    setSummary({ totalGenerated, results, stopped: shouldStop() });
    setRunning(false);
  };

  const stopGeneration = () => {
    stopRef.current = true;
  };

  const doneCount = progress.filter(p => p.status === "done" || p.status === "error").length;
  const errors = summary?.results?.filter(r => r.status === "error") || [];

  // Compute the scope of work for the selected subject (or all)
  const selectedSubjectEntry = scan?.subjects?.find(s => s.subject.id === selectedSubjectId);
  const scopeTopicsNeeding = selectedSubjectId === "all"
    ? (scan?.totalTopicsNeeding || 0)
    : (selectedSubjectEntry?.needing?.length || 0);
  const scopeQsToGenerate = selectedSubjectId === "all"
    ? (scan?.totalToGenerate || 0)
    : (selectedSubjectEntry?.needing?.reduce((s, t) => s + (minCount - t.count), 0) || 0);
  const scopeLabel = selectedSubjectId === "all" ? `ALL ${grade} subjects` : (selectedSubjectEntry?.subject?.name || grade);

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="bg-card rounded-2xl p-5 border border-primary/20">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Generate ALL Subjects for a Grade</h3>
            <p className="text-xs text-muted-foreground">One click to top up every subject in the chosen grade — saves as drafts for review.</p>
          </div>
        </div>
      </div>

      {/* Grade picker */}
      <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
        <p className="text-sm font-bold text-foreground">1. Pick a Grade</p>
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map(g => (
            <button
              key={g}
              onClick={() => { setGrade(g); setScan(null); setSummary(null); }}
              disabled={running || scanning}
              className={`py-2 rounded-xl border-2 text-xs font-semibold transition-colors ${grade === g ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:border-primary/40"} disabled:opacity-40`}
            >
              {g.replace("Grade ", "G")}
            </button>
          ))}
        </div>

        <p className="text-sm font-bold text-foreground pt-1">2. Minimum questions per topic</p>
        <div className="grid grid-cols-4 gap-2">
          {[10, 15, 20, 25].map(n => (
            <button
              key={n}
              onClick={() => { setMinCount(n); setScan(null); setSummary(null); }}
              disabled={running || scanning}
              className={`py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${minCount === n ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:border-primary/40"} disabled:opacity-40`}
            >
              {n}
            </button>
          ))}
        </div>

        <p className="text-sm font-bold text-foreground pt-1">3. Scan the grade</p>
        <button
          onClick={scanGrade}
          disabled={running || scanning}
          className="w-full border-2 border-primary text-primary font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-primary/5"
        >
          {scanning ? (
            <><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> Scanning... {scanProgress.current}/{scanProgress.total} {scanProgress.subjectName ? `· ${scanProgress.subjectName}` : ""}</>
          ) : (
            <><Search className="w-4 h-4" /> {scan ? "Re-scan" : "Scan"} {grade}</>
          )}
        </button>

        {scanError && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive">
            {scanError}
          </div>
        )}
      </div>

      {!scanning && scan && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">📊 Scan Result for {grade}</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-foreground">{scan.totalSubjects}</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Subjects</p>
            </div>
            <div className={`rounded-xl p-3 text-center border ${scan.totalTopicsNeeding > 0 ? "bg-amber-500/10 border-amber-500/30" : "bg-green-500/10 border-green-500/30"}`}>
              <p className={`text-xl font-extrabold ${scan.totalTopicsNeeding > 0 ? "text-amber-700" : "text-green-700"}`}>{scan.totalTopicsNeeding}</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Topics need Qs</p>
            </div>
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 text-center">
              <p className="text-xl font-extrabold text-primary">~{scan.totalToGenerate}</p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Qs to generate</p>
            </div>
          </div>

          {/* Per-subject breakdown — click to select for generation */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Pick a subject to generate (or all)</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            <button
              onClick={() => setSelectedSubjectId("all")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 transition-colors ${selectedSubjectId === "all" ? "border-primary bg-primary/10" : "border-transparent bg-secondary/40 hover:border-primary/30"}`}
            >
              <span className="text-base flex-shrink-0">🌐</span>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-foreground truncate">All subjects in {grade}</p>
                <p className="text-[10px] text-muted-foreground">{scan.totalTopicsNeeding} topics · ~{scan.totalToGenerate} Qs</p>
              </div>
              {selectedSubjectId === "all" && <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />}
            </button>
            {scan.subjects.map(({ subject, topics, needing }) => {
              const toGen = needing.reduce((s, t) => s + (minCount - t.count), 0);
              const isSelected = selectedSubjectId === subject.id;
              const disabled = needing.length === 0;
              return (
                <button
                  key={subject.id}
                  onClick={() => !disabled && setSelectedSubjectId(subject.id)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border-2 transition-colors ${isSelected ? "border-primary bg-primary/10" : "border-transparent bg-secondary/40 hover:border-primary/30"} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span className="text-base flex-shrink-0">{subject.icon || "📚"}</span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-foreground truncate">{subject.name}</p>
                    <p className="text-[10px] text-muted-foreground">{topics.length} topics{needing.length > 0 ? ` · ~${toGen} Qs to generate` : ""}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${needing.length === 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {needing.length === 0 ? "✓ ready" : `${needing.length} need`}
                  </span>
                  {isSelected && <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />}
                </button>
              );
            })}
            {scan.subjects.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">No active subjects for {grade}</p>
            )}
          </div>

          {scan.totalTopicsNeeding === 0 && scan.subjects.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-3 py-2 text-xs text-green-700 font-medium">
              ✅ All topics in {grade} already have {minCount}+ questions — nothing to generate.
            </div>
          )}
        </div>
      )}

      {/* Run / Stop buttons */}
      {running ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2 bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span className="text-sm">{doneCount}/{progress.length} topics</span>
          </div>
          <button
            onClick={stopGeneration}
            disabled={stopRef.current}
            className="bg-destructive text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Square className="w-4 h-4 fill-white" />
            <span className="text-sm">{stopRef.current ? "Stopping..." : "Stop"}</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => runGenerate()}
          disabled={!scan || scanning || scopeTopicsNeeding === 0}
          className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
        >
          <Zap className="w-4 h-4" />
          Generate Questions for {scopeLabel}
        </button>
      )}

      {/* Warning */}
      {scan && scopeTopicsNeeding > 0 && !running && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700 leading-relaxed">
          ⚠️ This will generate ~{scopeQsToGenerate} questions across {scopeTopicsNeeding} topics for <strong>{scopeLabel}</strong>. All questions save as <strong>drafts</strong> and must be approved in the <strong>Review</strong> tab before going live.
        </div>
      )}

      {/* Live progress */}
      {running && progress.length > 0 && (() => {
        const active = progress.find(p => p.status === "generating");
        const coolingDown = !active && progress.some(p => p.coolingDown);
        const elapsedSec = activeStartedAt ? Math.floor((Date.now() - activeStartedAt) / 1000) : 0;
        // Reference tick so this re-renders every second
        void tick;
        return (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            {active && (
              <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-primary truncate">Now generating: {active.topicName}</p>
                  <p className="text-[10px] text-primary/70 truncate">{active.subjectName} · ~{active.needed} questions · {elapsedSec}s elapsed</p>
                </div>
                {elapsedSec > 90 && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0">slow</span>
                )}
              </div>
            )}
            {coolingDown && (
              <div className="bg-amber-100 border border-amber-300 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-600 rounded-full animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-amber-800">⏸ AI service overloaded — cooling down for 60s</p>
                  <p className="text-[10px] text-amber-700">Will automatically resume. You can also stop and try again later.</p>
                </div>
              </div>
            )}
            <p className="text-xs font-semibold text-muted-foreground">Progress ({doneCount}/{progress.length} topics complete)</p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {progress.map((p, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${p.status === "queued" ? "bg-secondary/20 opacity-60" : "bg-secondary/40"}`}>
                  {p.status === "queued" && <div className="w-3 h-3 rounded-full border border-muted-foreground/40 flex-shrink-0" />}
                  {p.status === "generating" && <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin flex-shrink-0" />}
                  {p.status === "done" && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                  {p.status === "error" && <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{p.topicName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.subjectName}</p>
                  </div>
                  {p.status === "queued" && <span className="text-muted-foreground flex-shrink-0">waiting</span>}
                  {p.status === "generating" && <span className="text-primary font-semibold flex-shrink-0">+{p.needed}...</span>}
                  {p.status === "done" && <span className="text-green-600 font-semibold flex-shrink-0">+{p.generated}</span>}
                  {p.status === "error" && <span className="text-destructive flex-shrink-0">failed</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Summary */}
      {summary && (
        <div className="space-y-3">
          <div className={`${summary.stopped ? "bg-amber-500/10 border-amber-500/30" : "bg-green-500/10 border-green-500/30"} border rounded-2xl p-4 space-y-2`}>
            <p className={`font-bold flex items-center gap-2 ${summary.stopped ? "text-amber-700" : "text-green-700"}`}>
              {summary.stopped ? <><Square className="w-5 h-5" /> Stopped</> : <><CheckCircle className="w-5 h-5" /> All Done!</>}
            </p>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-card rounded-xl p-2 text-center border border-green-500/30">
                <p className="text-xl font-bold text-green-600">{summary.totalGenerated}</p>
                <p className="text-xs text-green-600">Questions generated</p>
              </div>
              <div className="bg-card rounded-xl p-2 text-center border border-border">
                <p className="text-xl font-bold text-foreground">{summary.results.length}</p>
                <p className="text-xs text-muted-foreground">Topics processed</p>
              </div>
            </div>
            <p className="text-xs text-green-700 mt-1">
              📋 All questions saved as <strong>drafts</strong>. Go to the <strong>Review</strong> tab to approve and publish.
            </p>
          </div>

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {errors.length} topic(s) had errors
                </p>
                <button
                  onClick={() => runGenerate(true)}
                  disabled={running}
                  className="text-xs font-semibold bg-destructive text-white px-3 py-1.5 rounded-lg hover:bg-destructive/90 disabled:opacity-40 flex items-center gap-1 flex-shrink-0"
                >
                  <Zap className="w-3 h-3" /> Retry failed
                </button>
              </div>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                {errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">• <span className="font-semibold">{e.subjectName}</span> → {e.topicName}: {e.error}</p>
                ))}
              </div>
            </div>
          )}

          {summary.results.length > 0 && (
            <div>
              <button
                onClick={() => setShowDetails(d => !d)}
                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
              >
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showDetails ? "Hide" : "Show"} per-topic details
              </button>
              {showDetails && (
                <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                  {summary.results.map((r, i) => (
                    <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${r.status === "done" ? "bg-green-500/10" : "bg-destructive/10"}`}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{r.topicName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{r.subjectName}</p>
                      </div>
                      {r.status === "done"
                        ? <span className="text-green-700 font-semibold ml-2 flex-shrink-0">+{r.generated}</span>
                        : <span className="text-destructive ml-2 flex-shrink-0">error</span>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}