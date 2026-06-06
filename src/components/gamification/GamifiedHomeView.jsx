import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getLevelInfo, getProgressPercent, getUnlockedBadges, loadStats } from "@/lib/gamification";
import { ChevronRight, Zap, FileText, Star, BookOpen, Trophy } from "lucide-react";

export default function GamifiedHomeView({ user, subjects, recentResult, trialDaysLeft, dailyPracticeTopicId }) {
  const stats = useMemo(() => user?.email ? loadStats(user.email) : null, [user]);
  const level = useMemo(() => stats ? getLevelInfo(stats.totalXp) : null, [stats]);
  const progress = useMemo(() => stats ? getProgressPercent(stats.totalXp) : 0, [stats]);
  const unlockedBadges = useMemo(() => stats ? getUnlockedBadges(stats) : [], [stats]);

  if (!stats || !level) return null;

  return (
    <div className="space-y-5">
      {/* Trial banner */}
      {trialDaysLeft != null && (
        <Link to="/payment" className="block bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">⏳</span>
          <div className="flex-1">
            <p className="font-bold text-amber-600 text-sm">Free trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left</p>
            <p className="text-xs text-amber-500">Subscribe to keep full access.</p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
        </Link>
      )}

      {/* Level card */}
      <Link to="/gamification">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary to-violet-700 rounded-2xl p-4 text-white shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-3xl flex-shrink-0">
              {level.emoji}
            </div>
            <div className="flex-1">
              <p className="text-white/70 text-xs font-medium">Level {level.level} · {level.title}</p>
              <p className="font-bold text-base">{stats.totalXp} XP</p>
            </div>
            <span className="text-xs text-white/70 font-semibold">View all →</span>
          </div>
          {/* Progress bar */}
          <div className="bg-white/20 rounded-full h-2.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-yellow-300 h-2.5 rounded-full"
            />
          </div>
          <p className="text-xs text-white/60 mt-1.5">{progress}% to Level {level.level + 1}</p>
        </motion.div>
      </Link>

      {/* Badges strip */}
      {unlockedBadges.length > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm text-card-foreground">🏅 Achievements</p>
            <Link to="/gamification" className="text-xs text-primary font-semibold">See all →</Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {unlockedBadges.map(badge => (
              <div key={badge.id} className="flex-shrink-0 flex flex-col items-center gap-1 bg-yellow-400/15 border border-yellow-400/30 rounded-xl px-3 py-2 min-w-[60px]">
                <span className="text-xl">{badge.emoji}</span>
                <p className="text-[10px] font-semibold text-yellow-600 text-center leading-tight">{badge.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Lessons", value: stats.lessonsCompleted, emoji: "📖" },
          { label: "Correct", value: stats.questionsCorrect, emoji: "✅" },
          { label: "Exams", value: stats.mockExamsCompleted, emoji: "📝" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card rounded-2xl p-3 border border-border shadow-sm text-center"
          >
            <div className="text-xl mb-1">{s.emoji}</div>
            <p className="text-lg font-bold text-card-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/leaderboard" className="bg-card rounded-2xl p-4 shadow-md border border-border flex flex-col gap-2 hover:shadow-lg transition-all hover:-translate-y-0.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Leaderboard</p>
            <p className="text-xs text-amber-600 font-semibold mt-0.5">Top this week</p>
          </div>
        </Link>
        <Link to={dailyPracticeTopicId ? `/practice/${dailyPracticeTopicId}` : "/practice"} className="bg-card rounded-2xl p-4 shadow-md border border-border flex flex-col gap-2 hover:shadow-lg transition-all hover:-translate-y-0.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Daily Practice</p>
            <p className="text-xs text-orange-500 font-semibold mt-0.5">{dailyPracticeTopicId ? "Resume · +10 XP" : "+10 XP / correct"}</p>
          </div>
        </Link>
        <Link to="/mock-exam" className="bg-card rounded-2xl p-4 shadow-md border border-border flex flex-col gap-2 hover:shadow-lg transition-all hover:-translate-y-0.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Mock Exam</p>
            <p className="text-xs text-blue-500 font-semibold mt-0.5">+100 XP</p>
          </div>
        </Link>
      </div>

      {/* Subjects */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">My Subjects</h2>
          {subjects.length > 0 && (
            <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
              {subjects.length} subject{subjects.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {subjects.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground bg-card rounded-2xl border border-border shadow-sm">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="font-semibold">No subjects yet</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {subjects.map((subject, i) => (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/subject/${subject.id}`}
                  className="bg-card rounded-2xl px-4 py-3.5 shadow-sm border border-border flex items-center gap-4 hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center text-2xl flex-shrink-0">
                    {subject.icon || "📚"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground leading-snug">{subject.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{subject.grade}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">+50 XP</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}