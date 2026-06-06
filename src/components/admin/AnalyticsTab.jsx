import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import {
  Users, TrendingUp, TrendingDown, BookOpen, HelpCircle, Target,
  Award, AlertTriangle, Activity, Zap, FileText, Bookmark
} from "lucide-react";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

function StatCard({ icon: Icon, label, value, sub, color = "primary", trend }) {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-500/15 text-green-600",
    orange: "bg-orange-500/15 text-orange-500",
    red: "bg-red-500/15 text-red-500",
    purple: "bg-purple-500/15 text-purple-500",
    blue: "bg-blue-500/15 text-blue-500",
  };
  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-extrabold text-foreground">{value}</p>
      <p className="text-xs font-semibold text-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}% vs last week
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="font-bold text-foreground text-sm mt-6 mb-3">{children}</h3>;
}

export default function AnalyticsTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    // Pull large pages so stats reflect the real totals — not just the most recent 200–500 rows.
    const [results, users, subjects, topics, questions, bookmarks, reports, sessions] = await Promise.all([
      base44.entities.StudentResult.list("-created_date", 5000),
      base44.entities.User.list("-created_date", 5000),
      base44.entities.Subject.list(),
      base44.entities.Topic.list(),
      base44.entities.Question.filter({ is_active: true }, "-created_date", 5000),
      base44.entities.Bookmark.list("-created_date", 2000),
      base44.entities.QuestionReport.list("-created_date", 1000),
      base44.entities.UserSession.list("-created_date", 5000).catch(() => []),
    ]);

    // --- Overview stats ---
    const uniqueStudents = new Set(results.map(r => r.student_email)).size;
    const totalSessions = results.length;
    const avgScore = results.length
      ? Math.round(results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length)
      : 0;

    // Active users — driven by the UserSession entity which logs every login (once per day).
    // This matches the Base44 dashboard's own active-user count.
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const recentResults = results.filter(r => new Date(r.created_date) >= sevenDaysAgo);
    const recentSessionEmails = new Set(recentResults.map(r => r.student_email));

    // Login-based active sets (primary signal)
    const loginEmails7d = new Set(
      sessions
        .filter(s => new Date(s.created_date) >= sevenDaysAgo)
        .map(s => s.user_email)
    );
    const loginEmails24h = new Set(
      sessions
        .filter(s => new Date(s.created_date) >= oneDayAgo)
        .map(s => s.user_email)
    );

    // Fallback: also include users whose User.last_login_date is recent (covers users
    // who logged in before UserSession tracking was deployed).
    users.forEach(u => {
      if (!u.last_login_date) return;
      const t = new Date(u.last_login_date);
      if (t >= sevenDaysAgo) loginEmails7d.add(u.email);
      if (t >= oneDayAgo) loginEmails24h.add(u.email);
    });

    const activeUsers7d = new Set([...loginEmails7d, ...recentSessionEmails]).size;
    const activeUsers24h = new Set([
      ...loginEmails24h,
      ...results.filter(r => new Date(r.created_date) >= oneDayAgo).map(r => r.student_email),
    ]).size;
    const activeSessionUsers7d = recentSessionEmails.size;
    const totalLogins7d = sessions.filter(s => new Date(s.created_date) >= sevenDaysAgo).length;

    // --- Session type breakdown ---
    const sessionTypeCounts = { practice: 0, topic_test: 0, mock_exam: 0 };
    results.forEach(r => { if (sessionTypeCounts[r.session_type] !== undefined) sessionTypeCounts[r.session_type]++; });
    const sessionTypeData = [
      { name: "Practice", value: sessionTypeCounts.practice },
      { name: "Topic Test", value: sessionTypeCounts.topic_test },
      { name: "Mock Exam", value: sessionTypeCounts.mock_exam },
    ];

    // --- Daily activity (last 14 days) ---
    const dailyMap = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      dailyMap[key] = { day: key, sessions: 0, users: new Set() };
    }
    results.forEach(r => {
      const d = new Date(r.created_date);
      const key = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      if (dailyMap[key]) {
        dailyMap[key].sessions++;
        dailyMap[key].users.add(r.student_email);
      }
    });
    const dailyActivity = Object.values(dailyMap).map(d => ({
      day: d.day,
      sessions: d.sessions,
      users: d.users.size,
    }));

    // --- Subject performance ---
    const subjectMap = {};
    subjects.forEach(s => {
      subjectMap[s.id] = { name: s.name, icon: s.icon || "📚", totalScore: 0, count: 0, sessions: 0 };
    });
    results.forEach(r => {
      if (r.subject_id && subjectMap[r.subject_id]) {
        subjectMap[r.subject_id].totalScore += r.percentage || 0;
        subjectMap[r.subject_id].count++;
        subjectMap[r.subject_id].sessions++;
      }
    });
    const subjectPerformance = Object.values(subjectMap)
      .filter(s => s.count > 0)
      .map(s => ({ ...s, avg: Math.round(s.totalScore / s.count) }))
      .sort((a, b) => b.avg - a.avg);

    // --- Topic weakness analysis (avg score < 60%) ---
    const topicMap = {};
    topics.forEach(t => {
      topicMap[t.id] = { name: t.name, totalScore: 0, count: 0 };
    });
    results.forEach(r => {
      if (r.topic_id && topicMap[r.topic_id]) {
        topicMap[r.topic_id].totalScore += r.percentage || 0;
        topicMap[r.topic_id].count++;
      }
    });
    const weakTopics = Object.values(topicMap)
      .filter(t => t.count >= 2)
      .map(t => ({ ...t, avg: Math.round(t.totalScore / t.count) }))
      .filter(t => t.avg < 60)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 10);

    const strongTopics = Object.values(topicMap)
      .filter(t => t.count >= 2)
      .map(t => ({ ...t, avg: Math.round(t.totalScore / t.count) }))
      .filter(t => t.avg >= 70)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    // --- Score distribution ---
    const scoreBands = { "0–39%": 0, "40–59%": 0, "60–74%": 0, "75–89%": 0, "90–100%": 0 };
    results.forEach(r => {
      const p = r.percentage || 0;
      if (p < 40) scoreBands["0–39%"]++;
      else if (p < 60) scoreBands["40–59%"]++;
      else if (p < 75) scoreBands["60–74%"]++;
      else if (p < 90) scoreBands["75–89%"]++;
      else scoreBands["90–100%"]++;
    });
    const scoreDistribution = Object.entries(scoreBands).map(([band, count]) => ({ band, count }));

    // --- Student leaderboard (top 5) ---
    const studentScores = {};
    results.forEach(r => {
      if (!studentScores[r.student_email]) studentScores[r.student_email] = { email: r.student_email, total: 0, count: 0 };
      studentScores[r.student_email].total += r.percentage || 0;
      studentScores[r.student_email].count++;
    });
    const leaderboard = Object.values(studentScores)
      .map(s => ({ ...s, avg: Math.round(s.total / s.count) }))
      .filter(s => s.count >= 2)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    // --- Bookmark reasons ---
    const reasonMap = { struggling: 0, review_later: 0, important: 0 };
    bookmarks.forEach(b => { if (reasonMap[b.reason] !== undefined) reasonMap[b.reason]++; });
    const bookmarkReasons = [
      { name: "Struggling", value: reasonMap.struggling },
      { name: "Review Later", value: reasonMap.review_later },
      { name: "Important", value: reasonMap.important },
    ].filter(r => r.value > 0);

    // --- Question report status ---
    const reportStatus = { pending: 0, reviewed: 0, resolved: 0 };
    reports.forEach(r => { if (reportStatus[r.status] !== undefined) reportStatus[r.status]++; });

    // --- Mock exam stats ---
    const mockResults = results.filter(r => r.session_type === "mock_exam");
    const avgMockScore = mockResults.length
      ? Math.round(mockResults.reduce((s, r) => s + (r.percentage || 0), 0) / mockResults.length)
      : 0;

    setStats({
      uniqueStudents,
      totalSessions,
      avgScore,
      activeUsers7d,
      activeSessionUsers7d,
      activeUsers24h,
      totalLogins7d,
      totalUsers: users.length,
      totalQuestions: questions.length,
      totalSubjects: subjects.length,
      totalTopics: topics.length,
      totalBookmarks: bookmarks.length,
      pendingReports: reportStatus.pending,
      avgMockScore,
      mockExamCount: mockResults.length,
      sessionTypeData,
      dailyActivity,
      subjectPerformance,
      weakTopics,
      strongTopics,
      scoreDistribution,
      leaderboard,
      bookmarkReasons,
      reportStatus,
    });
    setLoading(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">Loading analytics...</p>
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-2 pb-10">
      {/* Refresh */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-foreground">Analytics Dashboard</h2>
        <button
          onClick={loadAnalytics}
          className="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary/5"
        >
          Refresh
        </button>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} label="Active This Week" value={stats.activeUsers7d} sub={`${stats.activeUsers24h} today · ${stats.totalLogins7d} logins · ${stats.activeSessionUsers7d} practised`} color="primary" />
        <StatCard icon={Activity} label="Total Sessions" value={stats.totalSessions} sub="All time" color="blue" />
        <StatCard icon={Target} label="Avg Score" value={`${stats.avgScore}%`} sub="Across all sessions" color={stats.avgScore >= 70 ? "green" : stats.avgScore >= 50 ? "orange" : "red"} />
        <StatCard icon={Award} label="Mock Exam Avg" value={`${stats.avgMockScore}%`} sub={`${stats.mockExamCount} exams taken`} color="purple" />
        <StatCard icon={BookOpen} label="Active Questions" value={stats.totalQuestions} sub={`${stats.totalTopics} topics`} color="blue" />
        <StatCard icon={Bookmark} label="Bookmarks" value={stats.totalBookmarks} sub="Saved by students" color="orange" />
        <StatCard icon={HelpCircle} label="Registered Users" value={stats.totalUsers} color="green" />
        <StatCard icon={AlertTriangle} label="Pending Reports" value={stats.pendingReports} sub="Questions flagged" color={stats.pendingReports > 0 ? "red" : "green"} />
      </div>

      {/* Daily Activity */}
      <SectionTitle>📈 Daily Activity (Last 14 Days)</SectionTitle>
      <div className="bg-card rounded-2xl border border-border p-4">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={stats.dailyActivity} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={2} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="sessions" stroke="#6366f1" strokeWidth={2} dot={false} name="Sessions" />
            <Line type="monotone" dataKey="users" stroke="#22c55e" strokeWidth={2} dot={false} name="Active Users" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Score Distribution */}
      <SectionTitle>🎯 Score Distribution</SectionTitle>
      <div className="bg-card rounded-2xl border border-border p-4">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={stats.scoreDistribution} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="band" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
              {stats.scoreDistribution.map((_, i) => (
                <Cell key={i} fill={["#ef4444", "#f59e0b", "#6366f1", "#22c55e", "#10b981"][i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Session Types */}
      <SectionTitle>📊 Session Types</SectionTitle>
      <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
        <PieChart width={110} height={110}>
          <Pie data={stats.sessionTypeData} cx={50} cy={50} innerRadius={28} outerRadius={50} dataKey="value">
            {stats.sessionTypeData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
        </PieChart>
        <div className="flex-1 space-y-2">
          {stats.sessionTypeData.map((s, i) => (
            <div key={s.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-foreground font-medium">{s.name}</span>
              </div>
              <span className="font-bold text-foreground">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Subject Performance */}
      <SectionTitle>📚 Subject Performance (Avg Score)</SectionTitle>
      <div className="bg-card rounded-2xl border border-border p-4">
        {stats.subjectPerformance.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No subject data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(140, stats.subjectPerformance.length * 40)}>
            <BarChart data={stats.subjectPerformance} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="avg" name="Avg Score" radius={[0, 4, 4, 0]}>
                {stats.subjectPerformance.map((s, i) => (
                  <Cell key={i} fill={s.avg >= 70 ? "#22c55e" : s.avg >= 50 ? "#f59e0b" : "#ef4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weak Topics */}
      <SectionTitle>⚠️ Topics Where Students Struggle (avg &lt;60%)</SectionTitle>
      <div className="space-y-2">
        {stats.weakTopics.length === 0 ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center text-sm text-green-600 font-semibold">
            ✅ No weak topics found — great performance!
          </div>
        ) : (
          stats.weakTopics.map((t, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-3 flex items-center gap-3">
              <span className="text-lg font-bold text-red-500 w-8 text-center flex-shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.count} sessions</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className={`text-sm font-bold ${t.avg < 40 ? "text-red-600" : "text-orange-500"}`}>{t.avg}%</span>
                <div className="w-16 h-1.5 bg-muted rounded-full mt-1">
                  <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${t.avg}%` }} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Strong Topics */}
      <SectionTitle>🌟 Top Performing Topics</SectionTitle>
      <div className="space-y-2">
        {stats.strongTopics.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">Not enough data yet</p>
        ) : (
          stats.strongTopics.map((t, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-3 flex items-center gap-3">
              <span className="text-lg">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.count} sessions</p>
              </div>
              <span className="text-sm font-bold text-green-600 flex-shrink-0">{t.avg}%</span>
            </div>
          ))
        )}
      </div>

      {/* Leaderboard */}
      <SectionTitle>🏆 Top Students (by Avg Score)</SectionTitle>
      <div className="space-y-2">
        {stats.leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">Not enough data yet</p>
        ) : (
          stats.leaderboard.map((s, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-3 flex items-center gap-3">
              <span className="text-lg">{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][i]}</span>
              <p className="flex-1 text-sm font-medium text-foreground truncate">{s.email}</p>
              <div className="flex-shrink-0 text-right">
                <span className="text-sm font-bold text-primary">{s.avg}%</span>
                <p className="text-xs text-muted-foreground">{s.count} sessions</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bookmark Reasons */}
      {stats.bookmarkReasons.length > 0 && (
        <>
          <SectionTitle>🔖 Why Students Bookmark Content</SectionTitle>
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
            <PieChart width={110} height={110}>
              <Pie data={stats.bookmarkReasons} cx={50} cy={50} innerRadius={28} outerRadius={50} dataKey="value">
                {stats.bookmarkReasons.map((_, i) => <Cell key={i} fill={COLORS[i + 3]} />)}
              </Pie>
            </PieChart>
            <div className="flex-1 space-y-2">
              {stats.bookmarkReasons.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i + 3] }} />
                    <span className="text-foreground font-medium">{r.name}</span>
                  </div>
                  <span className="font-bold text-foreground">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Question Report Status */}
      <SectionTitle>🚩 Question Reports</SectionTitle>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: stats.reportStatus.pending, color: "bg-orange-100 text-orange-700" },
          { label: "Reviewed", value: stats.reportStatus.reviewed, color: "bg-blue-100 text-blue-700" },
          { label: "Resolved", value: stats.reportStatus.resolved, color: "bg-green-100 text-green-700" },
        ].map(r => (
          <div key={r.label} className={`rounded-2xl p-3 text-center border border-border ${r.color}`}>
            <p className="text-xl font-extrabold">{r.value}</p>
            <p className="text-xs font-semibold mt-0.5">{r.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}