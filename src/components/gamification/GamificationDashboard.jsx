import { useMemo } from "react";
import { motion } from "framer-motion";
import { getLevelInfo, getProgressPercent, getUnlockedBadges, BADGES, LEVELS } from "@/lib/gamification";

export default function GamificationDashboard({ stats }) {
  const level = useMemo(() => getLevelInfo(stats.totalXp), [stats.totalXp]);
  const progress = useMemo(() => getProgressPercent(stats.totalXp), [stats.totalXp]);
  const unlockedIds = useMemo(() => new Set(getUnlockedBadges(stats).map(b => b.id)), [stats]);

  return (
    <div className="space-y-4">
      {/* Level Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary to-violet-700 rounded-2xl p-5 text-white shadow-md"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl flex-shrink-0">
            {level.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs font-medium uppercase tracking-wide">Level {level.level}</p>
            <p className="text-xl font-extrabold">{level.title}</p>
            <p className="text-white/70 text-xs mt-0.5">{stats.totalXp} XP total</p>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-white/70 mb-1.5">
            <span>{stats.totalXp - level.minXp} / {level.maxXp - level.minXp} XP to next level</span>
            <span>{progress}%</span>
          </div>
          <div className="bg-white/20 rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="bg-yellow-300 h-3 rounded-full"
            />
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
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
            className="bg-white rounded-2xl p-3 border border-border shadow-sm text-center"
          >
            <div className="text-xl mb-1">{s.emoji}</div>
            <p className="text-xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
        <p className="font-bold text-foreground text-sm mb-3">🏅 Achievements</p>
        <div className="grid grid-cols-2 gap-2">
          {BADGES.map((badge, i) => {
            const unlocked = unlockedIds.has(badge.id);
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${
                  unlocked
                    ? "bg-yellow-50 border-yellow-300"
                    : "bg-secondary border-border opacity-50"
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl flex-shrink-0 ${
                  unlocked ? "bg-yellow-100" : "bg-muted"
                }`}>
                  {unlocked ? badge.emoji : "🔒"}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold leading-tight ${unlocked ? "text-yellow-800" : "text-muted-foreground"}`}>
                    {badge.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                    {badge.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Level Roadmap */}
      <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
        <p className="font-bold text-foreground text-sm mb-3">🗺️ Level Roadmap</p>
        <div className="space-y-2">
          {LEVELS.map((l) => {
            const reached = stats.totalXp >= l.minXp;
            const current = l.level === getLevelInfo(stats.totalXp).level;
            return (
              <div
                key={l.level}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                  current ? "bg-primary/10 border border-primary/30" : reached ? "bg-secondary" : "opacity-40"
                }`}
              >
                <span className="text-lg">{l.emoji}</span>
                <div className="flex-1">
                  <span className="font-semibold text-foreground">Lv.{l.level} {l.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">{l.minXp} XP</span>
                </div>
                {current && <span className="text-xs font-bold text-primary">← You are here</span>}
                {reached && !current && <span className="text-xs text-accent font-semibold">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}