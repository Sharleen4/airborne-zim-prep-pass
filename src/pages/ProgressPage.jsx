import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useTabState } from "@/hooks/useTabState";
import { TrendingUp, Target, BookOpen, Award, Sparkles, CheckCircle2, RefreshCw, WifiOff, ChevronDown, ChevronRight, Lock, Crown } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import SyncStatusBar from "@/components/SyncStatusBar";
import { getCachedResults, getCachedTopicProgress, getCachedAllTopics } from "@/lib/offlineCache";
import { useOffline } from "@/lib/useOffline";
import { usePlan } from "@/lib/usePlan";
import { useActiveChild } from "@/lib/ActiveChildContext";
import { filterForActiveChild } from "@/lib/childScope";

export default function ProgressPage() {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const { isFree } = usePlan();
  const { activeChild, activeChildId, childProfiles } = useActiveChild();
  const { scrollContainerRef } = useTabState('progress');
  const [results, setResults] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topicProgressList, setTopicProgressList] = useState([]);
  const [topics, setTopics] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subjectStats, setSubjectStats] = useState([]);
  const [expandedSubject, setExpandedSubject] = useState(null);

  useEffect(() => {
    if (!user) return;
    base44.analytics.track({ eventName: "page_view", properties: { page: "progress", user_email: user.email } });
    async function load() {
      const { getCachedSubjects } = await import("@/lib/offlineCache");
      const [resRaw, subsRaw, tpRaw, tps] = await Promise.all([
        getCachedResults(user.email),
        getCachedSubjects(),
        getCachedTopicProgress(user.email),
        getCachedAllTopics(),
      ]);
      // Scope to the active child (legacy records flow to the oldest child).
      const res = filterForActiveChild(resRaw, activeChildId, childProfiles);
      const tp = filterForActiveChild(tpRaw, activeChildId, childProfiles);
      // Also only show subjects for this child's grade (admins/no-child = all).
      const subs = activeChild
        ? subsRaw.filter(s => s.grade === activeChild.grade)
        : subsRaw;
      setResults(res);
      setSubjects(subs);
      setTopicProgressList(tp);
      setTopics(tps);

      // Resolve any missing topic names referenced by progress/result records.
      // getCachedAllTopics caps at 200, so some topic_ids may not be in `tps`.
      const knownIds = new Set(tps.map(t => t.id));
      const referencedIds = [
        ...tp.map(p => p.topic_id),
        ...res.map(r => r.topic_id),
      ];
      const missingIds = [...new Set(referencedIds.filter(id => id && !knownIds.has(id)))];
      if (missingIds.length > 0 && navigator.onLine) {
        try {
          const fetched = await Promise.all(
            missingIds.map(id => base44.entities.Topic.filter({ id }).then(arr => arr?.[0] || null).catch(() => null))
          );
          const extra = fetched.filter(Boolean);
          if (extra.length > 0) {
            setTopics(prev => [...prev, ...extra]);
            const { offlineDB } = await import("@/lib/offlineDB");
            offlineDB.putMany(offlineDB.STORES.topics, extra).catch(() => {});
          }
        } catch {}
      }

      // Build per-subject stats
      const stats = subs.map(sub => {
        const subResults = res.filter(r => r.subject_id === sub.id);
        const avg = subResults.length
          ? Math.round(subResults.reduce((s, r) => s + (r.percentage || 0), 0) / subResults.length)
          : null;
        const subTopicProgress = tp.filter(t => t.subject_id === sub.id);
        return {
          subject: sub,
          avg,
          sessions: subResults.length,
          studied: subTopicProgress.filter(t => t.status === "studied").length,
          needsRevision: subTopicProgress.filter(t => t.status === "needs_revision").length,
          topicProgress: subTopicProgress,
        };
      }).filter(s => s.sessions > 0 || s.studied > 0 || s.needsRevision > 0);
      setSubjectStats(stats);

      setLoading(false);
    }
    load();
  }, [user, activeChildId, activeChild?.grade, childProfiles?.length]);

  const overallAvg = results.length
    ? Math.round(results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length)
    : 0;

  const bySession = {
    practice: results.filter(r => r.session_type === "practice"),
    mock_exam: results.filter(r => r.session_type === "mock_exam"),
    topic_test: results.filter(r => r.session_type === "topic_test")
  };

  // Free plan: limited to the last 3 sessions on the chart. Premium: last 10.
  const chartLimit = isFree ? 3 : 10;
  const chartData = results.slice(0, chartLimit).reverse().map((r, i) => ({
    name: `#${i + 1}`,
    score: r.percentage || 0,
    type: r.session_type
  }));

  const getWeakAnalysis = async () => {
    if (!results.length || isOffline) return;
    setAnalysing(true);
    const summary = results.slice(0, 20).map(r => ({
      type: r.session_type,
      score: r.percentage,
      date: r.created_date
    }));
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an academic performance analyst for Zimbabwe Grade 7 students.

Student results summary: ${JSON.stringify(summary)}
Total sessions: ${results.length}
Overall average: ${overallAvg}%

Analyse and provide:
- weak_areas: 2-3 identified weak areas
- strong_areas: 2-3 strong areas
- priority_topics: top 3 topics to revise
- study_plan: brief 3-day study plan
- motivation: short encouraging message (2 sentences)`,
      response_json_schema: {
        type: "object",
        properties: {
          weak_areas: { type: "array", items: { type: "string" } },
          strong_areas: { type: "array", items: { type: "string" } },
          priority_topics: { type: "array", items: { type: "string" } },
          study_plan: { type: "string" },
          motivation: { type: "string" }
        }
      }
    });
    setAiAnalysis(res);
    setAnalysing(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      <SyncStatusBar />
      <div ref={scrollContainerRef} className="overflow-y-auto" style={{ height: 'calc(100vh - 60px)' }}>
      <div className="bg-gradient-to-br from-accent to-emerald-600 text-white px-6 pt-12 pb-16">
        <h1 className="text-2xl font-bold">My Progress</h1>
        <p className="text-white/70 mt-1">Track your ZIMSEC readiness</p>
        {isOffline && (
          <div className="mt-3 flex items-center gap-2 bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-xs font-medium">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
            Offline — showing cached results
          </div>
        )}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{overallAvg}%</p>
            <p className="text-xs text-white/70 mt-1">Average</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{results.length}</p>
            <p className="text-xs text-white/70 mt-1">Sessions</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{bySession.mock_exam.length}</p>
            <p className="text-xs text-white/70 mt-1">Mock Exams</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-6 space-y-4 pb-4">
        {/* Free plan upgrade nudge */}
        {isFree && (
          <Link
            to="/payment"
            className="block bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-md"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Free plan — limited analytics</p>
              <p className="text-xs text-white/85">Upgrade for full history, per-topic breakdown & AI insights.</p>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          </Link>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-foreground">Recent Performance</p>
              {isFree && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">Last 3 only</span>}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barSize={20}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.score >= 70 ? "#22c55e" : entry.score >= 50 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Session breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Practice", count: bySession.practice.length, avg: bySession.practice.length ? Math.round(bySession.practice.reduce((s, r) => s + r.percentage, 0) / bySession.practice.length) : 0 },
            { label: "Tests", count: bySession.topic_test.length, avg: bySession.topic_test.length ? Math.round(bySession.topic_test.reduce((s, r) => s + r.percentage, 0) / bySession.topic_test.length) : 0 },
            { label: "Mock", count: bySession.mock_exam.length, avg: bySession.mock_exam.length ? Math.round(bySession.mock_exam.reduce((s, r) => s + r.percentage, 0) / bySession.mock_exam.length) : 0 },
          ].map(item => (
            <div key={item.label} className="bg-card rounded-2xl p-3 shadow-sm border border-border text-center">
              <p className="text-xl font-bold text-foreground">{item.avg}%</p>
              <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.count} sessions</p>
            </div>
          ))}
        </div>

        {/* Subject-by-Subject Progress */}
        {subjectStats.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <p className="font-semibold text-foreground">📊 Progress by Subject</p>
            {subjectStats.map(({ subject, avg, sessions, studied, needsRevision, topicProgress }) => {
              const isExpanded = expandedSubject === subject.id;
              return (
                <div key={subject.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <button
                    onClick={() => !isFree && setExpandedSubject(isExpanded ? null : subject.id)}
                    className="w-full flex items-center gap-3 p-4 text-left"
                  >
                    <span className="text-2xl flex-shrink-0">{subject.icon || "📚"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">{subject.grade} · {sessions} session{sessions !== 1 ? "s" : ""}</p>
                      {avg !== null && (
                        <div className="mt-1.5 w-full bg-muted rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${avg}%`, backgroundColor: avg >= 70 ? "#22c55e" : avg >= 50 ? "#f59e0b" : "#ef4444" }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {avg !== null && (
                        <p className={`text-lg font-bold ${avg >= 70 ? "text-green-600" : avg >= 50 ? "text-amber-500" : "text-red-500"}`}>{avg}%</p>
                      )}
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        {studied > 0 && <span className="text-xs text-green-600 font-medium">✓{studied}</span>}
                        {needsRevision > 0 && <span className="text-xs text-orange-500 font-medium">↺{needsRevision}</span>}
                      </div>
                    </div>
                    {isFree
                      ? <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      : isExpanded
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                  {!isFree && isExpanded && topicProgress.length > 0 && (
                    <div className="border-t border-border px-4 pb-3 pt-2 space-y-1.5 bg-secondary/30">
                      {topicProgress.map(tp => {
                        const topic = topics.find(t => t.id === tp.topic_id);
                        return (
                          <div key={tp.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${tp.status === "studied" ? "bg-green-500/10" : "bg-orange-500/10"}`}>
                            {tp.status === "studied"
                              ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                              : <RefreshCw className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                            <span className="flex-1 font-medium text-foreground">{topic?.name || "Topic"}</span>
                            {tp.last_score != null && (
                              <span className={`text-xs font-semibold ${tp.status === "studied" ? "text-green-600" : "text-orange-500"}`}>{tp.last_score}%</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Topic Progress Breakdown — premium only */}
        {!isFree && topicProgressList.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-4 shadow-sm border border-border">
            <p className="font-semibold text-foreground mb-3">📚 Topic Progress</p>
            <div className="flex gap-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /> {topicProgressList.filter(t => t.status === "studied").length} Done</span>
              <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-orange-500" /> {topicProgressList.filter(t => t.status === "needs_revision").length} Need Revision</span>
            </div>
            <div className="space-y-2">
              {topicProgressList.map((tp) => {
                const topic = topics.find(t => t.id === tp.topic_id);
                return (
                  <div key={tp.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${tp.status === "studied" ? "bg-green-500/10" : "bg-orange-500/10"}`}>
                    {tp.status === "studied"
                      ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      : <RefreshCw className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                    <span className="flex-1 font-medium text-foreground">{topic?.name || "Topic"}</span>
                    {tp.status === "studied" && tp.studied_date && (
                      <span className="text-xs text-muted-foreground">{tp.studied_date}</span>
                    )}
                    {tp.status === "needs_revision" && tp.last_score != null && (
                      <span className="text-xs font-semibold text-orange-600">{tp.last_score}%</span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* AI Analysis */}
        {isFree ? (
          <Link
            to="/payment"
            className="w-full bg-card border-2 border-dashed border-amber-300 rounded-2xl p-4 flex items-center gap-3 hover:border-amber-500 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Weakness Analysis
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Premium only — unlock personalised study plans & insights.</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
          </Link>
        ) : !aiAnalysis ? (
          <div>
            <button
              onClick={getWeakAnalysis}
              disabled={analysing || results.length === 0 || isOffline}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {analysing
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analysing...</>
                : <><Sparkles className="w-4 h-4" />AI Weakness Analysis</>}
            </button>
            {isOffline && (
              <p className="text-xs text-center text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <WifiOff className="w-3 h-3" /> Connect to the internet for AI-powered insights
              </p>
            )}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {aiAnalysis.weak_areas?.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                <p className="font-semibold text-red-500 mb-2 flex items-center gap-2"><Target className="w-4 h-4" />Weak Areas</p>
                {aiAnalysis.weak_areas.map((w, i) => <p key={i} className="text-sm text-red-500">• {w}</p>)}
              </div>
            )}
            {aiAnalysis.strong_areas?.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                <p className="font-semibold text-green-600 mb-2 flex items-center gap-2"><Award className="w-4 h-4" />Strong Areas</p>
                {aiAnalysis.strong_areas.map((s, i) => <p key={i} className="text-sm text-green-600">• {s}</p>)}
              </div>
            )}
            {aiAnalysis.priority_topics?.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                <p className="font-semibold text-blue-500 mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4" />Priority Topics</p>
                {aiAnalysis.priority_topics.map((t, i) => <p key={i} className="text-sm text-blue-500">• {t}</p>)}
              </div>
            )}
            {aiAnalysis.study_plan && (
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="font-semibold text-foreground mb-2">📅 Study Plan</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{aiAnalysis.study_plan}</p>
              </div>
            )}
            {aiAnalysis.motivation && (
              <div className="bg-gradient-to-r from-primary to-violet-700 rounded-2xl p-4 text-white">
                <p className="text-sm font-medium">{aiAnalysis.motivation}</p>
              </div>
            )}
          </motion.div>
        )}

        {results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No results yet</p>
            <p className="text-sm">Start practising to see your progress here</p>
          </div>
        )}
      </div>
      </div>

    </div>
  );
}
