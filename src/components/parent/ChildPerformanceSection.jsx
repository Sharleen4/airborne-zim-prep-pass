import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, BookOpen, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { filterForActiveChild } from "@/lib/childScope";

function ScoreBar({ label, pct, color = "#6366f1" }) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-xs text-muted-foreground w-20 truncate flex-shrink-0">{label}</p>
      <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-xs font-bold text-foreground w-8 text-right flex-shrink-0">{pct}%</p>
    </div>
  );
}

function ChildReport({ child, childProfiles, subjects }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const parentEmail = user?.email;
    if (!parentEmail) { setLoading(false); return; }
    // Family-plan model: all results live under the parent's email, scoped by child_id.
    // Legacy records (no child_id) belong to the oldest child profile.
    Promise.all([
      base44.entities.StudentResult.filter({ student_email: parentEmail }, "-created_date", 500),
      base44.entities.TopicProgress.filter({ student_email: parentEmail }),
    ]).then(([allResults, allProgress]) => {
      const results = filterForActiveChild(allResults, child.id, childProfiles);
      const progress = filterForActiveChild(allProgress, child.id, childProfiles);
      // Per-subject averages
      const bySubject = {};
      results.forEach(r => {
        if (!r.subject_id || r.percentage == null) return;
        if (!bySubject[r.subject_id]) bySubject[r.subject_id] = { scores: [], name: "" };
        bySubject[r.subject_id].scores.push(r.percentage);
      });

      const subjectChartData = Object.entries(bySubject).map(([sid, v]) => {
        const sub = subjects.find(s => s.id === sid);
        const avg = Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length);
        return { name: sub?.name?.slice(0, 8) || "Other", avg, full: sub?.name || "Other" };
      });

      // Topic completion
      const studied = progress.filter(p => p.status === "studied").length;
      const needsRevision = progress.filter(p => p.status === "needs_revision").length;
      const total = progress.length;

      // Recent scores (last 7)
      const recentScores = results.slice(0, 7).map((r, i) => ({
        name: `#${results.length - i}`,
        score: r.percentage || 0,
      })).reverse();

      // Overall avg
      const overallAvg = results.length
        ? Math.round(results.reduce((a, r) => a + (r.percentage || 0), 0) / results.length)
        : null;

      setData({ subjectChartData, studied, needsRevision, total, recentScores, overallAvg, sessionCount: results.length });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [child.id, user?.email, childProfiles?.length]);

  const toggleExpanded = () => setExpanded(e => !e);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Child header — always visible */}
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
          {child.avatar_emoji || "🧒"}
        </div>
        <div className="flex-1 text-left">
          <p className="font-bold text-sm text-foreground">{child.child_name}</p>
          <p className="text-xs text-muted-foreground">{child.grade}</p>
        </div>
        {data?.overallAvg != null && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
            data.overallAvg >= 70 ? "bg-green-100 text-green-700" :
            data.overallAvg >= 50 ? "bg-amber-100 text-amber-700" :
            "bg-red-100 text-red-700"
          }`}>
            Avg {data.overallAvg}%
          </span>
        )}
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-4 space-y-5">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : !data || data.sessionCount === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No practice sessions yet.</p>
              ) : (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Sessions", value: data.sessionCount, icon: "📝" },
                      { label: "Topics Done", value: data.studied, icon: "✅" },
                      { label: "To Revise", value: data.needsRevision, icon: "🔄" },
                    ].map(s => (
                      <div key={s.label} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                        <p className="text-base">{s.icon}</p>
                        <p className="text-lg font-bold text-foreground">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Topic completion bar */}
                  {data.total > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-primary" /> Topic Completion
                        </p>
                        <p className="text-xs text-muted-foreground">{data.studied}/{data.total} studied</p>
                      </div>
                      <div className="bg-secondary rounded-full h-3 overflow-hidden">
                        <div
                          className="h-3 rounded-full bg-accent transition-all"
                          style={{ width: `${Math.round((data.studied / data.total) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {Math.round((data.studied / data.total) * 100)}% of topics covered
                      </p>
                    </div>
                  )}

                  {/* Recent score trend */}
                  {data.recentScores.length > 1 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" /> Recent Quiz Scores
                      </p>
                      <ResponsiveContainer width="100%" height={100}>
                        <BarChart data={data.recentScores} barSize={18}>
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} hide />
                          <Tooltip
                            formatter={(v) => [`${v}%`, "Score"]}
                            contentStyle={{ fontSize: 11, borderRadius: 8 }}
                          />
                          <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                            {data.recentScores.map((entry, idx) => (
                              <Cell
                                key={idx}
                                fill={entry.score >= 70 ? "#22c55e" : entry.score >= 50 ? "#f59e0b" : "#ef4444"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Per-subject averages */}
                  {data.subjectChartData.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-primary" /> Average Score by Subject
                      </p>
                      <div className="space-y-2">
                        {data.subjectChartData.map((s, i) => (
                          <ScoreBar
                            key={i}
                            label={s.full}
                            pct={s.avg}
                            color={s.avg >= 70 ? "#22c55e" : s.avg >= 50 ? "#f59e0b" : "#ef4444"}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ChildPerformanceSection({ children, subjects }) {
  if (children.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-foreground flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" /> Child Performance
      </h2>
      <p className="text-xs text-muted-foreground -mt-1">Tap a child to see their scores and progress.</p>
      <div className="space-y-3">
        {children.map(child => (
          <ChildReport key={child.id} child={child} childProfiles={children} subjects={subjects} />
        ))}
      </div>
    </div>
  );
}