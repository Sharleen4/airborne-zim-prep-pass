import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Sparkles, Lightbulb, AlertCircle, CheckCircle, ChevronDown, ChevronUp,
  Zap, Copy, Check, X, BookOpen
} from "lucide-react";

export default function QuestionQualityAnalyzer() {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [filterTopic, setFilterTopic] = useState("");
  const [search, setSearch] = useState("");
  const [applyingTo, setApplyingTo] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Question.filter({ is_active: true }, "-created_date", 200),
      base44.entities.Topic.list("order", 500),
    ]).then(([q, t]) => {
      setQuestions(q);
      setTopics(t);
      setLoading(false);
    });
  }, []);

  const topicName = (id) => topics.find(t => t.id === id)?.name || "—";

  const analyzeQuestion = async (questionId) => {
    setSelectedQuestionId(questionId);
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await base44.functions.invoke("analyzeQuestionQuality", { questionId });
      setAnalysis(res.data);
    } catch (e) {
      setAnalysis({ error: e.message || "Analysis failed" });
    }
    setAnalyzing(false);
  };

  const applyExplanation = async () => {
    if (!analysis?.analysis?.explanation?.generated_explanation || !selectedQuestionId) return;
    setApplyingTo("explanation");
    const q = questions.find(x => x.id === selectedQuestionId);
    if (!q) return;
    await base44.entities.Question.update(selectedQuestionId, {
      explanation: analysis.analysis.explanation.generated_explanation
    });
    setQuestions(prev => prev.map(x => x.id === selectedQuestionId ? { ...x, explanation: analysis.analysis.explanation.generated_explanation } : x));
    setApplyingTo(null);
  };

  const applyBloomsLevel = async () => {
    if (!analysis?.analysis?.blooms_assessment?.suggested_level || !selectedQuestionId) return;
    setApplyingTo("blooms");
    await base44.entities.Question.update(selectedQuestionId, {
      bloom_level: analysis.analysis.blooms_assessment.suggested_level
    });
    setQuestions(prev => prev.map(x => x.id === selectedQuestionId ? { ...x, bloom_level: analysis.analysis.blooms_assessment.suggested_level } : x));
    setApplyingTo(null);
  };

  const filtered = questions.filter(q => {
    if (filterTopic && q.topic_id !== filterTopic) return false;
    if (search && !q.question_text?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const bloomsLevels = ["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-violet-500 to-primary rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Question Quality Analyzer</p>
            <p className="text-white/70 text-xs">AI-powered analysis: Bloom's Taxonomy, explanations & clarity</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={filterTopic}
          onChange={e => setFilterTopic(e.target.value)}
          className="border border-border rounded-xl px-3 py-2 text-sm bg-card text-foreground"
        >
          <option value="">All topics</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search questions..."
          className="border border-border rounded-xl px-3 py-2 text-sm bg-card text-foreground"
        />
      </div>

      {/* Questions list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold">No questions found</p>
          </div>
        ) : (
          filtered.map(q => {
            const isSelected = selectedQuestionId === q.id;
            const missingExplanation = !q.explanation;
            const noBlooms = !q.bloom_level;

            return (
              <div
                key={q.id}
                className={`bg-card rounded-2xl border transition-all ${isSelected ? "border-primary/50 shadow-md" : "border-border"}`}
              >
                <button
                  onClick={() => analyzeQuestion(q.id)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2">{q.question_text}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {topicName(q.topic_id)}
                      </span>
                      {missingExplanation && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" /> No explanation
                        </span>
                      )}
                      {noBlooms && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Lightbulb className="w-3 h-3" /> No Bloom level
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-muted-foreground flex-shrink-0">
                    {analyzing && isSelected ? (
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Analysis panel */}
                {isSelected && analysis && !analysis.error && (
                  <div className="border-t border-border bg-secondary/20 px-4 py-4 space-y-4">
                    {/* Bloom's Taxonomy */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-600" />
                        <p className="font-semibold text-sm text-foreground">Bloom's Taxonomy</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <strong>Current:</strong> {analysis.analysis.blooms_assessment.current_level || "Not set"}
                        {" "} →{" "}
                        <strong>Suggested:</strong> {analysis.analysis.blooms_assessment.suggested_level}
                      </p>
                      <p className="text-xs text-foreground leading-relaxed">
                        {analysis.analysis.blooms_assessment.reasoning}
                      </p>
                      {analysis.analysis.blooms_assessment.suggested_level && (
                        <button
                          onClick={applyBloomsLevel}
                          disabled={applyingTo === "blooms"}
                          className="text-xs font-semibold text-blue-600 border border-blue-300/50 bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 disabled:opacity-40"
                        >
                          {applyingTo === "blooms" ? "Applying..." : "Apply Suggestion"}
                        </button>
                      )}
                    </div>

                    {/* Explanation */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <p className="font-semibold text-sm text-foreground">Explanation</p>
                      </div>
                      {analysis.analysis.explanation.has_explanation ? (
                        <p className="text-xs text-muted-foreground">
                          <strong>Quality:</strong> {analysis.analysis.explanation.quality}
                        </p>
                      ) : (
                        <p className="text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded-lg p-2">
                          ⚠️ No explanation provided
                        </p>
                      )}
                      {analysis.analysis.explanation.generated_explanation && (
                        <div className="bg-white border border-green-200 rounded-lg p-2.5">
                          <p className="text-xs text-muted-foreground mb-1.5">
                            <strong>Generated explanation:</strong>
                          </p>
                          <p className="text-xs text-foreground leading-relaxed">
                            {analysis.analysis.explanation.generated_explanation}
                          </p>
                          <button
                            onClick={applyExplanation}
                            disabled={applyingTo === "explanation"}
                            className="text-xs font-semibold text-green-600 border border-green-300/50 bg-green-50 px-3 py-1 rounded-lg hover:bg-green-100 mt-2 disabled:opacity-40"
                          >
                            {applyingTo === "explanation" ? "Applying..." : "Use This Explanation"}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Ambiguity */}
                    {analysis.analysis.ambiguity.is_ambiguous && (
                      <div className="space-y-2 bg-red-50 border border-red-200 rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <p className="font-semibold text-sm text-red-700">Ambiguity Issues</p>
                        </div>
                        <ul className="space-y-1">
                          {analysis.analysis.ambiguity.issues.map((issue, i) => (
                            <li key={i} className="text-xs text-red-600 flex gap-1.5">
                              <span className="flex-shrink-0">•</span>
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-red-600 mt-1">
                          <strong>Clarity Score:</strong> {analysis.analysis.ambiguity.clarity_score}/10
                        </p>
                      </div>
                    )}

                    {/* Overall Quality */}
                    <div className="bg-card border border-border rounded-lg p-2.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-foreground">Quality Score</p>
                        <span className={`text-lg font-bold ${
                          analysis.analysis.overall_quality.score >= 4 ? "text-green-600" :
                          analysis.analysis.overall_quality.score >= 3 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {analysis.analysis.overall_quality.score}/5
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Strengths:</p>
                        <ul className="space-y-0.5">
                          {analysis.analysis.overall_quality.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-green-700 flex gap-1.5">
                              <Check className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Improvements:</p>
                        <ul className="space-y-0.5">
                          {analysis.analysis.overall_quality.improvements.map((imp, i) => (
                            <li key={i} className="text-xs text-orange-700 flex gap-1.5">
                              <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {isSelected && analysis?.error && (
                  <div className="border-t border-border bg-red-50 px-4 py-3 text-xs text-red-600">
                    Analysis failed: {analysis.error}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}