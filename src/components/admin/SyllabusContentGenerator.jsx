import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, BookOpen, HelpCircle, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Zap } from "lucide-react";

export default function SyllabusContentGenerator() {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [curriculumRefs, setCurriculumRefs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedGrade, setSelectedGrade] = useState("Grade 7");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [contentType, setContentType] = useState("questions");
  const [numItems, setNumItems] = useState(15);
  const [minThreshold, setMinThreshold] = useState(10); // skip topics that already have this many
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [showRefList, setShowRefList] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Subject.filter({ is_active: true }),
      base44.entities.Topic.list("order", 500),
      base44.entities.CurriculumReference.list("-created_date", 100),
    ]).then(([s, t, r]) => {
      setSubjects(s);
      setTopics(t);
      setCurriculumRefs(r.filter(r => r.extracted_text && r.extracted_text.length > 50));
      setLoading(false);
    });
  }, []);

  const filteredSubjects = subjects.filter(s => s.grade === selectedGrade);
  const filteredTopics = topics.filter(t => t.subject_id === selectedSubjectId && t.is_active !== false);

  const relevantRefs = curriculumRefs.filter(r =>
    (r.subject_id === selectedSubjectId) ||
    (!r.subject_id && r.grade === selectedGrade)
  );

  const handleGenerate = async () => {
    if (!selectedSubjectId) return;
    setGenerating(true);
    setResults(null);
    setProgress(null);

    const types = contentType === "both" ? ["notes", "questions"] : [contentType];
    const topicsToProcess = selectedTopicId
      ? [filteredTopics.find(t => t.id === selectedTopicId)].filter(Boolean)
      : filteredTopics;

    const totalSteps = types.length * topicsToProcess.length;
    let step = 0;
    const allResults = [];

    for (const type of types) {
      const topicResults = [];
      let totalGenerated = 0;

      for (const topic of topicsToProcess) {
        step++;
        setProgress({ current: step, total: totalSteps, topicName: topic.name, type });
        try {
          const res = await base44.functions.invoke("generateWithCurriculum", {
            subjectId: selectedSubjectId,
            topicId: topic.id,
            contentType: type,
            numItems,
            minThreshold: type === "questions" ? minThreshold : 0,
            grade: selectedGrade,
          });
          const data = res.data;
          totalGenerated += data.generated || 0;
          if (data.topics?.[0]) topicResults.push(data.topics[0]);
        } catch (e) {
          topicResults.push({ topicName: topic.name, status: "error", generated: 0 });
        }
      }

      allResults.push({ type, generated: totalGenerated, topics: topicResults });
    }

    setResults(allResults);
    setGenerating(false);
    setProgress(null);
  };

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const topicsToRun = selectedTopicId ? 1 : filteredTopics.length;
  const estimatedQs = topicsToRun * numItems * (contentType === "both" ? 2 : 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-violet-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">Bulk Content Generator</h3>
            <p className="text-white/70 text-xs">Uses your uploaded curriculum references to generate syllabus-aligned content</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-xs text-blue-700 space-y-1.5">
        <p className="font-bold text-sm text-blue-800">📚 How the AI knows what to generate</p>
        <p>The AI uses documents you upload in the <strong>Curriculum tab</strong> as its primary guide:</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li><strong>Past exam papers</strong> (type: Question Bank) — teaches the AI question style, difficulty &amp; format</li>
          <li><strong>Syllabus</strong> (type: Syllabus) — defines exactly what topics and objectives to cover</li>
          <li><strong>Content summaries</strong> (type: Notes Template) — provides the facts and concepts to test</li>
          <li><strong>Marking schemes</strong> (type: Marking Scheme) — guides correct answers &amp; explanations</li>
        </ul>
        <p className="mt-1 text-blue-600">Without uploads, the AI falls back to general ZIMSEC Grade 7 knowledge.</p>
      </div>

      {/* Configuration */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <p className="font-semibold text-sm text-foreground">Configure Generation</p>

        {/* Grade */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Grade</label>
          <div className="grid grid-cols-4 gap-2">
            {["Grade 4", "Grade 5", "Grade 6", "Grade 7"].map(g => (
              <button
                key={g}
                onClick={() => { setSelectedGrade(g); setSelectedSubjectId(""); setSelectedTopicId(""); }}
                className={`py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                  selectedGrade === g ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {g.replace("Grade ", "G")}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Subject</label>
          {filteredSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-secondary rounded-xl px-3 py-2">No subjects found for {selectedGrade}</p>
          ) : (
            <select
              value={selectedSubjectId}
              onChange={e => { setSelectedSubjectId(e.target.value); setSelectedTopicId(""); }}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
            >
              <option value="">Select a subject...</option>
              {filteredSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Topic — optional */}
        {selectedSubjectId && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Topic <span className="font-normal">(leave blank to generate for ALL {filteredTopics.length} active topics)</span>
            </label>
            <select
              value={selectedTopicId}
              onChange={e => setSelectedTopicId(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
            >
              <option value="">All {filteredTopics.length} active topics</option>
              {filteredTopics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Content Type */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Generate</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "notes", label: "Notes Only", icon: BookOpen },
              { value: "questions", label: "Questions Only", icon: HelpCircle },
              { value: "both", label: "Both", icon: Sparkles },
            ].map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => setContentType(opt.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-semibold transition-colors ${
                    contentType === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Questions per topic */}
        {contentType !== "notes" && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Questions per topic
            </label>
            <div className="flex gap-2">
              {[10, 15, 20, 30].map(n => (
                <button
                  key={n}
                  onClick={() => setNumItems(n)}
                  className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    numItems === n ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Min threshold — skip topics already having enough questions */}
        {contentType !== "notes" && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Skip topics that already have ≥ <span className="text-primary">{minThreshold}</span> questions
            </label>
            <input
              type="range"
              min={0}
              max={50}
              value={minThreshold}
              onChange={e => setMinThreshold(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0 (always generate)</span>
              <span>50</span>
            </div>
          </div>
        )}

        {/* Curriculum References status */}
        {selectedSubjectId && (
          <div className={`rounded-xl border p-3 ${relevantRefs.length > 0 ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
            <button
              onClick={() => setShowRefList(r => !r)}
              className="w-full flex items-center justify-between gap-2 text-left"
            >
              <div className="flex items-center gap-2">
                {relevantRefs.length > 0 ? (
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                )}
                <span className={`font-semibold text-xs ${relevantRefs.length > 0 ? "text-green-700" : "text-amber-700"}`}>
                  {relevantRefs.length > 0
                    ? `${relevantRefs.length} curriculum reference${relevantRefs.length !== 1 ? "s" : ""} will guide the AI`
                    : "No curriculum references uploaded — AI uses general ZIMSEC knowledge"}
                </span>
              </div>
              {relevantRefs.length > 0 && (
                showRefList ? <ChevronUp className="w-3 h-3 text-green-600" /> : <ChevronDown className="w-3 h-3 text-green-600" />
              )}
            </button>
            {showRefList && relevantRefs.length > 0 && (
              <ul className="mt-2 space-y-1">
                {relevantRefs.map(r => (
                  <li key={r.id} className="text-xs text-green-600 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    {r.title} <span className="opacity-70">({r.reference_type})</span>
                  </li>
                ))}
              </ul>
            )}
            {relevantRefs.length === 0 && (
              <p className="text-xs text-amber-700 mt-1">
                Go to the <strong>Curriculum</strong> tab to upload a syllabus or past exam papers for <strong>{selectedGrade}</strong>.
              </p>
            )}
          </div>
        )}

        {/* Estimate */}
        {selectedSubjectId && (
          <div className="bg-secondary/60 rounded-xl px-4 py-2.5 text-xs text-muted-foreground flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>
              Estimated: <strong className="text-foreground">{topicsToRun} topic{topicsToRun !== 1 ? "s" : ""}</strong>
              {contentType !== "notes" && <> × <strong className="text-foreground">{numItems} questions</strong></>}
              {contentType === "both" && <> + <strong className="text-foreground">{topicsToRun} note sets</strong></>}
            </span>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!selectedSubjectId || generating}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {generating ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
          ) : (
            <><Sparkles className="w-4 h-4" />
              {contentType === "both" ? "Generate Notes & Questions" : contentType === "notes" ? "Generate Notes" : `Generate ${numItems} Questions / Topic`}
            </>
          )}
        </button>

        {generating && progress && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-600 font-semibold">
              <span>⏳ Generating {progress.type} — step {progress.current} of {progress.total}</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>
            <div className="w-full bg-blue-500/20 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-blue-600 truncate">📖 {progress.topicName}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {results && results.map((r, i) => (
        <div key={i} className="bg-card rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="font-bold text-foreground">
              {r.type === "notes" ? "📖 Notes" : "❓ Questions"} Generation Complete
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Generated <strong>{r.generated}</strong> {r.type}.
          </p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {(r.topics || []).map((t, j) => (
              <div key={j} className={`flex items-center justify-between text-xs px-3 py-1.5 rounded-lg ${
                t.status === "success" ? "bg-green-500/10 text-green-700" :
                t.status === "skipped" ? "bg-secondary text-muted-foreground" :
                "bg-destructive/10 text-destructive"
              }`}>
                <span>{t.topicName}</span>
                <span className="font-semibold">
                  {t.status === "success" ? `+${t.generated}` :
                   t.status === "skipped" ? "skipped (enough Qs)" : "error"}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}