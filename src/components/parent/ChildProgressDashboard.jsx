import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  ClipboardList,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Plus,
  BookOpen,
  CheckCircle,
  Pencil,
  Trash2,
  School as SchoolIcon,
  Clock,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useAuth } from "@/lib/AuthContext";
import { filterForActiveChild } from "@/lib/childScope";
import HomeworkCard from "@/components/homework/HomeworkCard";
import StudyPlanCard from "@/components/studyplan/StudyPlanCard";

/**
 * Unified "My Progress" dashboard for a single child.
 * Merges Performance + Homework + Study Plan into a tabbed view so parents
 * (and kids) see ONE organised study plan instead of three repeating blocks.
 */
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

export default function ChildProgressDashboard({
  child,
  childProfiles,
  subjects,
  homework,
  studyPlans,
  subStatus,
  onAssignHomework,
  onCreateStudyPlan,
  onEditStudyPlan,
  onDeleteStudyPlan,
  onEditChild,
  onDeleteChild,
}) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState("progress");
  const [perf, setPerf] = useState(null);
  const [loadingPerf, setLoadingPerf] = useState(false);
  const [schoolLink, setSchoolLink] = useState(null); // { school, klass } if linked

  // Look up whether this child is linked to a school/class via StudentProfile.
  // This handles the case where the school was added AFTER the child profile existed.
  useEffect(() => {
    if (!child?.id) return;
    let cancelled = false;
    base44.entities.StudentProfile
      .filter({ child_profile_id: child.id, is_active: true }, "-created_date", 1)
      .then(async (list) => {
        if (cancelled) return;
        const sp = list?.[0];
        if (!sp?.school_id || !sp?.class_id) { setSchoolLink(null); return; }
        const [school, klass] = await Promise.all([
          base44.entities.School.filter({ id: sp.school_id }, "-created_date", 1).then(r => r[0]).catch(() => null),
          base44.entities.SchoolClass.filter({ id: sp.class_id }, "-created_date", 1).then(r => r[0]).catch(() => null),
        ]);
        if (!cancelled) setSchoolLink({ school, klass });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [child?.id]);

  // Scope homework + study plans to THIS child only
  const childHomework = useMemo(
    () => homework.filter(h => h.child_profile_id === child.id),
    [homework, child.id]
  );
  const childPlans = useMemo(
    () => studyPlans.filter(p => p.child_id === child.id),
    [studyPlans, child.id]
  );

  // Counts for tab badges
  const pendingHomework = childHomework.filter(
    h => h.status === "assigned" || h.status === "in_progress"
  ).length;

  // Lazy-load performance only when card is expanded
  useEffect(() => {
    if (!expanded || perf || !user?.email) return;
    setLoadingPerf(true);
    Promise.all([
      base44.entities.StudentResult.filter({ student_email: user.email }, "-created_date", 500),
      base44.entities.TopicProgress.filter({ student_email: user.email }),
    ]).then(([allResults, allProgress]) => {
      const results = filterForActiveChild(allResults, child.id, childProfiles);
      const progress = filterForActiveChild(allProgress, child.id, childProfiles);

      const bySubject = {};
      results.forEach(r => {
        if (!r.subject_id || r.percentage == null) return;
        if (!bySubject[r.subject_id]) bySubject[r.subject_id] = [];
        bySubject[r.subject_id].push(r.percentage);
      });
      const subjectChartData = Object.entries(bySubject).map(([sid, scores]) => {
        const sub = subjects.find(s => s.id === sid);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        return { full: sub?.name || "Other", avg };
      });

      const studied = progress.filter(p => p.status === "studied").length;
      const needsRevision = progress.filter(p => p.status === "needs_revision").length;
      const total = progress.length;

      const recentScores = results.slice(0, 7).map((r, i) => ({
        name: `#${results.length - i}`,
        score: r.percentage || 0,
      })).reverse();

      const overallAvg = results.length
        ? Math.round(results.reduce((a, r) => a + (r.percentage || 0), 0) / results.length)
        : null;

      setPerf({
        subjectChartData,
        studied,
        needsRevision,
        total,
        recentScores,
        overallAvg,
        sessionCount: results.length,
      });
      setLoadingPerf(false);
    }).catch(() => setLoadingPerf(false));
  }, [expanded, perf, user?.email, child.id, childProfiles?.length, subjects]);

  const overallAvg = perf?.overallAvg;
  const avgBadge = overallAvg != null && (
    <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${
      overallAvg >= 70 ? "bg-green-100 text-green-700" :
      overallAvg >= 50 ? "bg-amber-100 text-amber-700" :
      "bg-red-100 text-red-700"
    }`}>
      Avg {overallAvg}%
    </span>
  );

  const TabButton = ({ id, icon: Icon, label, badge }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl transition-colors ${
        tab === id ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/70"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {badge > 0 && (
        <span className={`text-[10px] font-bold px-1.5 rounded-full ${
          tab === id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      {/* Header — always visible */}
      <div className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
            {child.avatar_emoji || "🧒"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground truncate">{child.child_name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <p className="text-xs text-muted-foreground">{child.grade}</p>
              {subStatus && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${subStatus.active ? "bg-green-500/15 text-green-700 dark:text-green-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                  {subStatus.active
                    ? <><CheckCircle className="w-2.5 h-2.5" /> {subStatus.isTrial ? `Trial ${subStatus.days_left}d` : "Active"}</>
                    : <><Clock className="w-2.5 h-2.5" /> No access</>
                  }
                </span>
              )}
              {schoolLink?.klass && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full" title={schoolLink.school?.name || ""}>
                  <SchoolIcon className="w-2.5 h-2.5" /> {schoolLink.klass.name}
                </span>
              )}
              {pendingHomework > 0 && (
                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                  {pendingHomework} pending
                </span>
              )}
              {childPlans.length > 0 && (
                <span className="text-[10px] font-bold bg-violet-500/15 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded-full">
                  {childPlans.length} plan{childPlans.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          {avgBadge}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          }
        </button>
        {/* Edit / delete child actions */}
        {(onEditChild || onDeleteChild) && (
          <div className="flex items-center gap-1 flex-shrink-0 pl-1 border-l border-border ml-1">
            {onEditChild && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditChild(child); }}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                title="Edit child"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteChild && (
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteChild(child); }}
                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                title="Remove child"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-4 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2">
                <TabButton id="progress" icon={TrendingUp} label="Progress" />
                <TabButton id="homework" icon={ClipboardList} label="Homework" badge={pendingHomework} />
                <TabButton id="plan" icon={CalendarClock} label="Study Plan" badge={childPlans.length} />
              </div>

              {/* Progress tab */}
              {tab === "progress" && (
                <div className="space-y-4">
                  {loadingPerf ? (
                    <div className="flex justify-center py-6">
                      <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                  ) : !perf || perf.sessionCount === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No practice sessions yet. {child.child_name} hasn't done any quizzes.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Sessions", value: perf.sessionCount, icon: "📝" },
                          { label: "Topics Done", value: perf.studied, icon: "✅" },
                          { label: "To Revise", value: perf.needsRevision, icon: "🔄" },
                        ].map(s => (
                          <div key={s.label} className="bg-secondary/50 rounded-xl p-2.5 text-center">
                            <p className="text-base">{s.icon}</p>
                            <p className="text-lg font-bold text-foreground">{s.value}</p>
                            <p className="text-[10px] text-muted-foreground">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {perf.total > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-primary" /> Topic Completion
                            </p>
                            <p className="text-xs text-muted-foreground">{perf.studied}/{perf.total}</p>
                          </div>
                          <div className="bg-secondary rounded-full h-3 overflow-hidden">
                            <div
                              className="h-3 rounded-full bg-accent transition-all"
                              style={{ width: `${Math.round((perf.studied / perf.total) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {perf.recentScores.length > 1 && (
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-primary" /> Recent Quiz Scores
                          </p>
                          <ResponsiveContainer width="100%" height={100}>
                            <BarChart data={perf.recentScores} barSize={18}>
                              <XAxis dataKey="name" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                              <YAxis domain={[0, 100]} hide />
                              <Tooltip formatter={(v) => [`${v}%`, "Score"]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                {perf.recentScores.map((entry, idx) => (
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

                      {perf.subjectChartData.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-primary" /> Average by Subject
                          </p>
                          <div className="space-y-2">
                            {perf.subjectChartData.map((s, i) => (
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
              )}

              {/* Homework tab */}
              {tab === "homework" && (
                <div className="space-y-3">
                  <button
                    onClick={() => onAssignHomework?.(child)}
                    className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-primary border border-dashed border-primary/30 px-3 py-2 rounded-xl hover:bg-primary/5"
                  >
                    <Plus className="w-4 h-4" /> Assign new homework
                  </button>
                  {childHomework.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-semibold">No homework yet</p>
                    </div>
                  ) : (
                    childHomework.slice(0, 8).map(hw => {
                      const sub = subjects.find(s => s.id === hw.subject_id);
                      return (
                        <HomeworkCard
                          key={hw.id}
                          hw={hw}
                          subjectName={sub ? `${sub.icon || "📚"} ${sub.name}` : ""}
                        />
                      );
                    })
                  )}
                  {childHomework.length > 8 && (
                    <p className="text-xs text-center text-muted-foreground">+{childHomework.length - 8} more</p>
                  )}
                </div>
              )}

              {/* Study Plan tab */}
              {tab === "plan" && (
                <div className="space-y-3">
                  <button
                    onClick={() => onCreateStudyPlan?.(child)}
                    className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-primary border border-dashed border-primary/30 px-3 py-2 rounded-xl hover:bg-primary/5"
                  >
                    <Plus className="w-4 h-4" /> Create study plan
                  </button>
                  {childPlans.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-semibold">No study plan yet</p>
                      <p className="text-[11px] mt-0.5">Set a weekly schedule with goals</p>
                    </div>
                  ) : (
                    childPlans.map(plan => (
                      <StudyPlanCard
                        key={plan.id}
                        plan={plan}
                        childName={child.child_name}
                        onEdit={onEditStudyPlan}
                        onDelete={onDeleteStudyPlan}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}