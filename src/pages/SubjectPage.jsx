import { useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Zap, CheckCircle2, RefreshCw, WifiOff, CloudOff, Lock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import { motion } from "framer-motion";
import SyncStatusBar from "@/components/SyncStatusBar";
import TopicCardSkeleton from "@/components/skeletons/TopicCardSkeleton";
import { getCachedTopics, getCachedSubjects } from "@/lib/offlineCache";
import { useOffline } from "@/lib/useOffline";
import { useTopicProgress } from "@/hooks/useTopicProgress";
import { useAuth } from "@/lib/AuthContext";
import { useCachedTopicIds } from "@/hooks/useCachedTopics";
import { useActiveChild } from "@/lib/ActiveChildContext";
import { usePlan } from "@/lib/usePlan";

function TopicStatusBadge({ status }) {
  if (!status || status === "not_started") return null;
  if (status === "studied") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" /> Done
    </span>
  );
  if (status === "needs_revision") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
      <RefreshCw className="w-3 h-3" /> Needs Revision
    </span>
  );
  return null;
}

function SubjectPageContent() {
  const { subjectId } = useParams();
  const { isOffline } = useOffline();
  const { user } = useAuth();
  const { activeChild } = useActiveChild();
  const { isFree } = usePlan();
  const { progressMap, markStudied } = useTopicProgress(user?.email, subjectId);
  const cachedTopicIds = useCachedTopicIds();

  const queryClient = useQueryClient();

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getCachedSubjects(),
  });

  const { data: rawTopics = [], isLoading: loading } = useQuery({
    queryKey: ['topics', subjectId],
    queryFn: () => getCachedTopics(subjectId),
    enabled: !!subjectId,
  });

  // Free topics float to the top so free-plan users see accessible content first.
  // Within each group (free / premium) the original order is preserved.
  const topics = [...rawTopics].sort((a, b) => {
    const aFree = a.is_free ? 0 : 1;
    const bFree = b.is_free ? 0 : 1;
    if (aFree !== bFree) return aFree - bFree;
    return (a.order || 0) - (b.order || 0);
  });

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['topics', subjectId] });
    await queryClient.invalidateQueries({ queryKey: ['subjects'] });
  }, [queryClient, subjectId]);

  const subject = subjects.find(s => s.id === subjectId) || null;

  // Block access if the subject is for a different grade than the active child.
  // Admins can browse anything.
  const wrongGrade = activeChild && subject && subject.grade !== activeChild.grade && user?.role !== "admin";

  if (loading) return (
    <div className="min-h-screen bg-background font-jakarta">
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-6 pt-12 pb-16">
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-white/20 rounded w-16" />
          <div className="flex items-center gap-4 mt-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20" />
            <div className="space-y-2">
              <div className="h-6 bg-white/20 rounded w-36" />
              <div className="h-3 bg-white/20 rounded w-24" />
            </div>
          </div>
        </div>
      </div>
      <div className="px-6 pt-4">
        <TopicCardSkeleton count={4} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-jakarta">
      <SyncStatusBar />
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-6 pb-16 relative overflow-hidden" style={{ paddingTop: `max(3rem, env(safe-area-inset-top))` }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white" />
        </div>
        <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <Link to="/home" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          {isOffline && (
            <div className="flex items-center gap-1.5 text-xs font-semibold bg-white/15 border border-white/20 px-3 py-1.5 rounded-xl">
              <WifiOff className="w-3.5 h-3.5" /> Offline
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
              {subject?.icon || "📚"}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{subject?.name}</h1>
              <p className="text-white/70">{subject?.grade} · {topics.length} topics</p>
            </div>
          </div>
        </div>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-6 pt-4 pb-24 space-y-3">
        {wrongGrade ? (
          <div className="bg-card rounded-2xl p-6 text-center shadow-sm border border-border mt-2">
            <div className="text-4xl mb-2">🎓</div>
            <p className="font-bold text-foreground">This subject is for {subject?.grade}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {activeChild.child_name} is in {activeChild.grade}. Switch the active child or go back home.
            </p>
            <Link to="/home" className="inline-block mt-4 bg-primary text-white font-semibold text-sm px-4 py-2 rounded-xl">
              Back to home
            </Link>
          </div>
        ) : topics.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 text-center shadow-sm border border-border mt-2">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-semibold text-foreground">No topics yet</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon</p>
          </div>
        ) : (
          topics.map((topic, i) => {
            const locked = isFree && !topic.is_free;
            return (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-2xl shadow-sm border overflow-hidden ${locked ? "border-amber-300/60" : "border-border"}`}
            >
              {/* Topic Header */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${locked ? "bg-amber-500/15" : "bg-primary/10"}`}>
                    {locked ? <Lock className="w-4 h-4 text-amber-600" /> : <span className="text-sm font-bold text-primary">{i + 1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-card-foreground text-base leading-snug">{topic.name}</h3>
                      {locked && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          <Lock className="w-3 h-3" /> Premium
                        </span>
                      )}
                      {topic.is_free && isFree && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Free
                        </span>
                      )}
                      <TopicStatusBadge status={progressMap[topic.id]?.status} />
                      {isOffline && !cachedTopicIds.has(topic.id) && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <CloudOff className="w-3 h-3" /> Not cached
                        </span>
                      )}
                    </div>
                    {topic.learning_objectives && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{topic.learning_objectives}</p>
                    )}
                    {progressMap[topic.id]?.status === "needs_revision" && (
                      <p className="text-xs text-orange-600 font-semibold mt-1">⚠️ Needs revision — score was below 50%</p>
                    )}
                    {progressMap[topic.id]?.studied_date && progressMap[topic.id]?.status === "studied" && (
                      <p className="text-xs text-green-600 mt-1">✓ Studied on {progressMap[topic.id].studied_date}</p>
                    )}
                  </div>
                  {progressMap[topic.id]?.status !== "studied" && (
                    <button
                      onClick={() => markStudied(topic.id)}
                      className="flex-shrink-0 text-xs font-semibold text-green-700 border border-green-300 bg-green-50 px-2.5 py-1 rounded-xl hover:bg-green-100 transition-colors"
                    >
                      Mark studied
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons — locked topics show an upgrade CTA instead */}
              {locked ? (
                <div className="px-4 pb-4">
                  <Link
                    to="/payment"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl text-sm shadow-sm hover:shadow-md transition-shadow"
                  >
                    <Lock className="w-4 h-4" /> Unlock with Premium
                  </Link>
                </div>
              ) : (
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                  <Link
                    to={`/notes/${topic.id}`}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 bg-primary/8 rounded-xl hover:bg-primary/15 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-primary">Revision Notes</span>
                  </Link>
                  <Link
                    to={`/practice/${topic.id}`}
                    className="flex flex-col items-center gap-1.5 py-3 px-2 bg-orange-500/10 rounded-xl hover:bg-orange-500/20 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-orange-500" />
                    </div>
                    <span className="text-xs font-semibold text-orange-500">Practice</span>
                  </Link>
                </div>
              )}
            </motion.div>
            );
          })
        )}
      </div>
      </PullToRefresh>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

export default function SubjectPage() {
  try {
    return <SubjectPageContent />;
  } catch {
    return <LoadingScreen />;
  }
}