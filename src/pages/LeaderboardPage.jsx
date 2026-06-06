import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Trophy, Zap, Crown, Medal, Sparkles, Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const rankStyles = {
  1: { bg: "bg-gradient-to-br from-amber-400 to-yellow-500", text: "text-white", icon: Crown },
  2: { bg: "bg-gradient-to-br from-slate-300 to-slate-400", text: "text-white", icon: Medal },
  3: { bg: "bg-gradient-to-br from-orange-400 to-orange-600", text: "text-white", icon: Medal },
};

// Encouraging message picked based on the user's relative position
function getEncouragement(myRank, total) {
  if (!myRank) return "Complete a quiz to join the leaderboard! 💪";
  if (myRank === 1) return "You're #1 this week! Amazing! 👑";
  if (myRank <= 3) return "You're on the podium! Keep it up! 🏆";
  if (myRank <= 10) return "Top 10 — incredible work! 🔥";
  const pct = (myRank / total) * 100;
  if (pct <= 25) return "You're in the top 25%! Brilliant! ⭐";
  if (pct <= 50) return "You're in the top half — keep climbing! 🚀";
  return "Every question makes you stronger. You've got this! 💪";
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.functions
      .invoke("getWeeklyLeaderboard", {})
      .then((res) => {
        setRows(res.data?.leaderboard || []);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message || "Could not load leaderboard");
        setLoading(false);
      });
  }, []);

  // Find current user's best ranked child (if any)
  const myRow = useMemo(() => rows.find((r) => r.is_me) || null, [rows]);
  const totalXp = useMemo(() => rows.reduce((sum, r) => sum + (r.xp || 0), 0), [rows]);

  // Class XP goal — friendly group target that grows in increments of 1000
  const classGoal = useMemo(() => {
    const next = Math.max(1000, Math.ceil((totalXp + 1) / 1000) * 1000);
    return next;
  }, [totalXp]);
  const classProgress = Math.min(100, Math.round((totalXp / classGoal) * 100));

  const top3 = rows.slice(0, 3);

  // "Near you" — 3 above + you + 3 below (only when user is outside top 3)
  const nearMe = useMemo(() => {
    if (!myRow || myRow.rank <= 3) return [];
    const idx = rows.findIndex((r) => r.child_id === myRow.child_id);
    const start = Math.max(3, idx - 3);
    const end = Math.min(rows.length, idx + 4);
    return rows.slice(start, end);
  }, [rows, myRow]);

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white px-6 pt-12 pb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3" />
        <div className="relative z-10">
          <Link to="/home" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold leading-tight">Leaderboard</h1>
              <p className="text-white/80 text-sm">Everyone's making progress 🔥</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-4 space-y-4">
        {loading ? (
          <div className="bg-card rounded-2xl p-8 border border-border flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-4 text-sm">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 border border-border text-center text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No XP yet this week</p>
            <p className="text-sm mt-1">Complete a study session or quiz to climb the board!</p>
          </div>
        ) : (
          <>
            {/* Personal stats card — always encouraging */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-primary to-violet-700 text-white rounded-2xl p-4 shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-3xl flex-shrink-0">
                  {myRow?.avatar_emoji || "✨"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/70 text-[11px] font-bold uppercase tracking-wide">Your week</p>
                  <p className="font-extrabold text-lg leading-tight truncate">
                    {myRow ? `${myRow.xp} XP earned` : "Start earning XP today!"}
                  </p>
                  <p className="text-white/80 text-xs mt-0.5">{getEncouragement(myRow?.rank, rows.length)}</p>
                </div>
                {myRow && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-white/70 font-semibold">YOUR RANK</p>
                    <p className="text-2xl font-extrabold leading-none">#{myRow.rank}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Class XP group goal — fosters teamwork over competition */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-card rounded-2xl border border-border p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <p className="font-bold text-sm text-foreground">Everyone together</p>
                <span className="ml-auto text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Goal: {classGoal.toLocaleString()} XP
                </span>
              </div>
              <div className="bg-secondary rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${classProgress}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-3 rounded-full"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong className="text-foreground">{totalXp.toLocaleString()} XP</strong> earned together this week ({classProgress}%). Every answer counts! 🎉
              </p>
            </motion.div>

            {/* Podium — top 3 */}
            {top3.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Top 3 this week
                </p>
                <div className="grid grid-cols-3 gap-2 items-end">
                  {[top3[1], top3[0], top3[2]].map((r, idx) => {
                    if (!r) return <div key={`empty-${idx}`} />;
                    const style = rankStyles[r.rank];
                    const Icon = style?.icon || Trophy;
                    const isFirst = r.rank === 1;
                    return (
                      <motion.div
                        key={r.child_id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className={`bg-card rounded-2xl border ${r.is_me ? "border-primary ring-2 ring-primary/30" : "border-border"} p-3 flex flex-col items-center text-center shadow-sm ${isFirst ? "pb-5" : ""}`}
                      >
                        <div className={`w-10 h-10 rounded-full ${style.bg} flex items-center justify-center mb-2 shadow-md`}>
                          <Icon className={`w-5 h-5 ${style.text}`} />
                        </div>
                        <div className={`${isFirst ? "w-16 h-16 text-4xl" : "w-12 h-12 text-2xl"} rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center`}>
                          {r.avatar_emoji}
                        </div>
                        <p className="font-bold text-foreground text-sm mt-2 truncate w-full">{r.first_name}</p>
                        <p className="text-[10px] text-muted-foreground">{r.grade}</p>
                        {r.school && (
                          <p className="text-[9px] text-muted-foreground/80 truncate w-full mt-0.5" title={r.school}>
                            🏫 {r.school}
                          </p>
                        )}
                        <div className="mt-1.5 inline-flex items-center gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold text-xs px-2 py-0.5 rounded-full">
                          <Zap className="w-3 h-3" /> {r.xp} XP
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* "Near you" section — only when user is outside top 3 (less discouraging than a full ranked list) */}
            {nearMe.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-primary" /> Near you
                </p>
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  {nearMe.map((r, i) => (
                    <motion.div
                      key={r.child_id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-3 px-4 py-3 ${i !== nearMe.length - 1 ? "border-b border-border" : ""} ${r.is_me ? "bg-primary/5" : ""}`}
                    >
                      <span className="w-6 text-center font-bold text-muted-foreground text-sm">{r.rank}</span>
                      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center text-xl flex-shrink-0">
                        {r.avatar_emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">
                          {r.first_name}
                          {r.is_me && <span className="ml-1.5 text-[10px] text-primary font-bold">YOU</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {r.grade}{r.school ? ` · 🏫 ${r.school}` : ""}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-xs px-2.5 py-1 rounded-full">
                        <Zap className="w-3 h-3" /> {r.xp}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-xs text-blue-700 dark:text-blue-400">
              <p className="font-semibold mb-1">ℹ️ How XP is earned this week</p>
              <p>+10 XP per completed study session · +1 XP per correct quiz answer. Everyone's progress counts toward the group goal!</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}