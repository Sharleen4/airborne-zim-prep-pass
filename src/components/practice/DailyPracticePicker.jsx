import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, ChevronRight, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { getCachedSubjects, getCachedTopics } from "@/lib/offlineCache";
import { useActiveChild } from "@/lib/ActiveChildContext";
import { useAuth } from "@/lib/AuthContext";
import { usePlan } from "@/lib/usePlan";

// Shown at /practice when no specific topic was selected.
// Lets the user pick a subject, then a topic, then jump into that topic's tests.
export default function DailyPracticePicker() {
  const { user } = useAuth();
  const { activeChild } = useActiveChild();
  const { isFree } = usePlan();
  const [subjects, setSubjects] = useState([]);
  const [topicsBySubject, setTopicsBySubject] = useState({});
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const subs = await getCachedSubjects();
      // Admin sees everything; everyone else is scoped to their active child's grade.
      const isAdmin = user?.role === "admin";
      const grade = activeChild?.grade;
      const visible = grade ? subs.filter(s => s.grade === grade) : (isAdmin ? subs : []);
      if (cancelled) return;
      setSubjects(visible);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, activeChild]);

  const loadTopics = async (subjectId) => {
    setSelectedSubjectId(subjectId);
    if (topicsBySubject[subjectId]) return;
    const topics = await getCachedTopics(subjectId);
    const sorted = [...topics].sort((a, b) => {
      const aFree = a.is_free ? 0 : 1;
      const bFree = b.is_free ? 0 : 1;
      if (aFree !== bFree) return aFree - bFree;
      return (a.order || 0) - (b.order || 0);
    });
    setTopicsBySubject(prev => ({ ...prev, [subjectId]: sorted }));
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const topics = selectedSubjectId ? (topicsBySubject[selectedSubjectId] || []) : [];

  return (
    <div className="min-h-screen bg-background font-jakarta">
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white px-6 pt-12 pb-8">
        <Link to="/home" className="inline-flex items-center gap-2 text-white/80 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <h1 className="text-2xl font-bold">Daily Practice</h1>
        <p className="text-white/80 text-sm mt-1">
          {selectedSubject ? `Pick a topic in ${selectedSubject.name}` : "Pick a subject to practice"}
        </p>
      </div>

      <div className="px-5 py-5 space-y-3 pb-24">
        {!selectedSubjectId ? (
          subjects.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center border border-border shadow-sm">
              <BookOpen className="w-10 h-10 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="font-semibold text-foreground">No subjects available</p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeChild ? `Nothing for ${activeChild.grade} yet.` : "Add a child to see subjects."}
              </p>
            </div>
          ) : (
            subjects.map((s, i) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => loadTopics(s.id)}
                className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-sm border border-border flex items-center gap-3 hover:border-orange-400 hover:shadow-md transition-all text-left"
              >
                <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center text-2xl flex-shrink-0">
                  {s.icon || "📚"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.grade}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.button>
            ))
          )
        ) : (
          <>
            <button
              onClick={() => setSelectedSubjectId(null)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> All subjects
            </button>

            {topics.length === 0 ? (
              <div className="bg-card rounded-2xl p-8 text-center border border-border shadow-sm">
                <p className="text-sm text-muted-foreground">No topics yet for this subject.</p>
              </div>
            ) : (
              topics.map((t, i) => {
                const locked = isFree && !t.is_free;
                return (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    {locked ? (
                      <Link
                        to="/payment"
                        className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-sm border border-amber-300/60 flex items-center gap-3"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                          <Lock className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground text-sm">{t.name}</p>
                          <p className="text-xs text-amber-600 mt-0.5">Premium — tap to unlock</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      </Link>
                    ) : (
                      <Link
                        to={`/practice/${t.id}`}
                        className="w-full bg-card rounded-2xl px-4 py-3.5 shadow-sm border border-border flex items-center gap-3 hover:border-orange-400 hover:shadow-md transition-all"
                      >
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-orange-500">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground text-sm">{t.name}</p>
                          {t.is_free && isFree && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Free</span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </Link>
                    )}
                  </motion.div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}