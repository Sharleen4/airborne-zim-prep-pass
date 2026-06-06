import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Zap, BookOpen, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { loadStats, getLevelInfo, getProgressPercent, addXp } from "@/lib/gamification";
import GamificationDashboard from "@/components/gamification/GamificationDashboard";
import { BottomNav } from "./Home";
import SyncStatusBar from "@/components/SyncStatusBar";

export default function GamificationPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  const refresh = useCallback(() => {
    if (!user?.email) return;
    setStats(loadStats(user.email));
  }, [user]);

  useEffect(() => {
    refresh();
    // Listen for cross-tab/component updates
    window.addEventListener("zama_xp_updated", refresh);
    return () => window.removeEventListener("zama_xp_updated", refresh);
  }, [refresh]);

  if (!stats) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const level = getLevelInfo(stats.totalXp);
  const progress = getProgressPercent(stats.totalXp);

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      <SyncStatusBar />

      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-violet-600 to-violet-800 text-white px-6 pt-12 pb-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <Link to="/home" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-5">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl">
              {level.emoji}
            </div>
            <div>
              <p className="text-white/70 text-xs uppercase tracking-wide font-medium">Level {level.level}</p>
              <h1 className="text-2xl font-extrabold">{level.title}</h1>
              <p className="text-white/70 text-sm">{stats.totalXp} XP earned</p>
            </div>
          </div>
          {/* XP bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/70 mb-1.5">
              <span>Progress to Level {level.level + 1}</span>
              <span>{progress}%</span>
            </div>
            <div className="bg-white/20 rounded-full h-2.5 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-yellow-300 h-2.5 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 -mt-6 space-y-4 pb-8">
        {/* XP earning shortcuts */}
        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
          <p className="font-bold text-foreground text-sm mb-3">⚡ Earn XP</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <Link to="/practice" className="bg-orange-50 rounded-xl p-3 border border-orange-200 hover:bg-orange-100 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center mx-auto mb-1.5">
                <Zap className="w-4 h-4 text-orange-500" />
              </div>
              <p className="font-semibold text-orange-700">Practice</p>
              <p className="text-orange-500 mt-0.5">+10 per ✓</p>
            </Link>
            <Link to="/home" className="bg-blue-50 rounded-xl p-3 border border-blue-200 hover:bg-blue-100 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-1.5">
                <BookOpen className="w-4 h-4 text-blue-500" />
              </div>
              <p className="font-semibold text-blue-700">Lessons</p>
              <p className="text-blue-500 mt-0.5">+50 each</p>
            </Link>
            <Link to="/mock-exam" className="bg-purple-50 rounded-xl p-3 border border-purple-200 hover:bg-purple-100 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-1.5">
                <FileText className="w-4 h-4 text-purple-500" />
              </div>
              <p className="font-semibold text-purple-700">Mock Exam</p>
              <p className="text-purple-500 mt-0.5">+100 each</p>
            </Link>
          </div>
        </div>

        <GamificationDashboard stats={stats} />
      </div>

      <BottomNav />
    </div>
  );
}