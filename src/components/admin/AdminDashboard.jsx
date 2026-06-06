import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, BookOpen, FileText, AlertTriangle, CheckCircle, TrendingUp, DollarSign, Mail, Clock, Zap } from "lucide-react";

function StatCard({ icon: Icon, label, value, sub, color = "primary", onClick }) {
  const colors = {
    primary: "from-primary/10 to-primary/5 text-primary border-primary/20",
    green: "from-green-500/10 to-green-500/5 text-green-600 border-green-500/20",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-500/20",
    red: "from-red-500/10 to-red-500/5 text-red-600 border-red-500/20",
    blue: "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-500/20",
    violet: "from-violet-500/10 to-violet-500/5 text-violet-600 border-violet-500/20",
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`text-left bg-gradient-to-br ${colors[color]} border rounded-2xl p-4 transition-all ${onClick ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-extrabold text-foreground leading-none">{value ?? "—"}</p>
      <p className="text-xs font-semibold text-foreground/80 mt-1.5">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </button>
  );
}

function SectionHeader({ title, hint }) {
  return (
    <div className="flex items-baseline justify-between mt-4 mb-2">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AdminDashboard({ onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const load = async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const dayAgo = new Date();
      dayAgo.setHours(dayAgo.getHours() - 24);

      const [users, results, subjects, topics, questions, subscriptions, feedback, emailLogs, smsLogs] = await Promise.all([
        base44.entities.User.list("-created_date", 1000).catch(() => []),
        base44.entities.StudentResult.list("-created_date", 500).catch(() => []),
        base44.entities.Subject.list().catch(() => []),
        base44.entities.Topic.list().catch(() => []),
        base44.entities.Question.list("-created_date", 5000).catch(() => []),
        base44.entities.Subscription.list("-created_date", 500).catch(() => []),
        base44.entities.UserFeedback.filter({ status: "new" }).catch(() => []),
        base44.entities.EmailLog?.list?.("-created_date", 200).catch(() => []) || [],
        base44.entities.NotificationLog?.list?.("-created_date", 200).catch(() => []) || [],
      ]);

      // Question counts per topic
      const qCounts = {};
      questions.forEach(q => {
        if (q.is_active !== false && q.topic_id) qCounts[q.topic_id] = (qCounts[q.topic_id] || 0) + 1;
      });
      const lowQTopics = topics.filter(t => t.is_active !== false && (qCounts[t.id] || 0) < 20).length;

      // Pending content reviews
      const pendingQuestions = questions.filter(q => q.review_status === "pending_review").length;
      const pendingNotes = await base44.entities.Note.filter({ review_status: "pending_review" }).catch(() => []);

      // Active sessions today
      const sessionsToday = results.filter(r => new Date(r.created_date) >= todayStart).length;
      const sessionsWeek = results.filter(r => new Date(r.created_date) >= weekStart).length;

      // New signups
      const newSignupsToday = users.filter(u => new Date(u.created_date) >= todayStart).length;
      const newSignupsWeek = users.filter(u => new Date(u.created_date) >= weekStart).length;

      // Active users today (have a result today)
      const activeToday = new Set(results.filter(r => new Date(r.created_date) >= todayStart).map(r => r.student_email)).size;

      // Payments
      const paidSubs = subscriptions.filter(s => s.status === "active");
      const paidThisWeek = paidSubs.filter(s => s.created_date && new Date(s.created_date) >= weekStart);
      const revenueWeek = paidThisWeek.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
      const trialUsers = subscriptions.filter(s => s.status === "pending").length;

      // Trials expiring this week (look at users with trial within next 7 days)
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      const trialsExpiringSoon = users.filter(u => {
        if (!u.created_date) return false;
        const trialEnd = new Date(u.created_date);
        trialEnd.setDate(trialEnd.getDate() + 7);
        return trialEnd >= new Date() && trialEnd <= in7Days;
      }).length;

      // Email/SMS failures last 24h
      const failedEmails = emailLogs.filter(l => l.status === "failed" && new Date(l.created_date) >= dayAgo).length;
      const failedSMS = smsLogs.filter(l => l.status === "failed" && new Date(l.created_date) >= dayAgo).length;

      // Mock exams count
      const mockExams = await base44.entities.MockExam.list("-created_date", 200).catch(() => []);

      setStats({
        totalUsers: users.length,
        activeToday,
        newSignupsToday,
        newSignupsWeek,
        sessionsToday,
        sessionsWeek,
        subjects: subjects.length,
        topics: topics.filter(t => t.is_active !== false).length,
        questions: questions.filter(q => q.is_active !== false).length,
        mockExams: mockExams.length,
        lowQTopics,
        pendingQuestions,
        pendingNotes: pendingNotes.length,
        feedback: feedback.length,
        paidSubs: paidSubs.length,
        paidThisWeek: paidThisWeek.length,
        revenueWeek: revenueWeek.toFixed(2),
        trialUsers,
        trialsExpiringSoon,
        failedEmails,
        failedSMS,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const needsAttention = (stats.lowQTopics > 0) || (stats.pendingQuestions + stats.pendingNotes > 0) || (stats.feedback > 0) || (stats.failedEmails > 0) || (stats.failedSMS > 0);

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-foreground">Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live overview · {new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>
      </div>

      {/* Needs attention alerts */}
      {needsAttention && (
        <div className="mt-3 bg-amber-500/5 border border-amber-500/30 rounded-2xl p-3 space-y-1.5">
          <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Needs your attention</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {stats.pendingQuestions + stats.pendingNotes > 0 && (
              <button onClick={() => onNavigate("Review")} className="bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-amber-200 transition-colors">
                {stats.pendingQuestions + stats.pendingNotes} content item(s) pending review
              </button>
            )}
            {stats.lowQTopics > 0 && (
              <button onClick={() => onNavigate("CMS")} className="bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-amber-200 transition-colors">
                {stats.lowQTopics} topics with under 20 questions
              </button>
            )}
            {stats.feedback > 0 && (
              <button onClick={() => onNavigate("Feedback")} className="bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-amber-200 transition-colors">
                {stats.feedback} new feedback message(s)
              </button>
            )}
            {stats.failedEmails > 0 && (
              <button onClick={() => onNavigate("Email Logs")} className="bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-amber-200 transition-colors">
                {stats.failedEmails} failed email(s) in 24h
              </button>
            )}
            {stats.failedSMS > 0 && (
              <button onClick={() => onNavigate("SMS Logs")} className="bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-lg hover:bg-amber-200 transition-colors">
                {stats.failedSMS} failed SMS in 24h
              </button>
            )}
          </div>
        </div>
      )}

      {/* Engagement */}
      <SectionHeader title="📊 Engagement (today)" hint="Click any tile to drill down" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <StatCard icon={Users} label="Active today" value={stats.activeToday} sub={`${stats.totalUsers} total users`} color="primary" onClick={() => onNavigate("Users")} />
        <StatCard icon={TrendingUp} label="Sessions today" value={stats.sessionsToday} sub={`${stats.sessionsWeek} this week`} color="violet" onClick={() => onNavigate("Analytics")} />
        <StatCard icon={Zap} label="New signups today" value={stats.newSignupsToday} sub={`${stats.newSignupsWeek} this week`} color="green" onClick={() => onNavigate("Users")} />
        <StatCard icon={Clock} label="Trial users" value={stats.trialUsers} sub={`${stats.trialsExpiringSoon} expiring within 7 days`} color="amber" onClick={() => onNavigate("Users")} />
      </div>

      {/* Payments */}
      <SectionHeader title="💰 Payments" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        <StatCard icon={DollarSign} label="Active subscriptions" value={stats.paidSubs} color="green" />
        <StatCard icon={TrendingUp} label="Paid this week" value={stats.paidThisWeek} sub={`$${stats.revenueWeek} revenue`} color="green" onClick={() => onNavigate("Founding Offer")} />
        <StatCard icon={Clock} label="Trials expiring soon" value={stats.trialsExpiringSoon} sub="within next 7 days" color={stats.trialsExpiringSoon > 0 ? "amber" : "primary"} />
      </div>

      {/* Content */}
      <SectionHeader title="📚 Content health" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <StatCard icon={BookOpen} label="Subjects" value={stats.subjects} color="blue" onClick={() => onNavigate("Subjects")} />
        <StatCard icon={BookOpen} label="Active topics" value={stats.topics} color="blue" onClick={() => onNavigate("Topics")} />
        <StatCard icon={CheckCircle} label="Active questions" value={stats.questions} color="green" onClick={() => onNavigate("Questions")} />
        <StatCard icon={FileText} label="Mock exams" value={stats.mockExams} color="violet" onClick={() => onNavigate("Mock Exams")} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        <StatCard icon={AlertTriangle} label="Topics under 20 Qs" value={stats.lowQTopics} color={stats.lowQTopics > 0 ? "amber" : "green"} onClick={() => onNavigate("CMS")} />
        <StatCard icon={Clock} label="Pending reviews" value={stats.pendingQuestions + stats.pendingNotes} sub={`${stats.pendingQuestions} Qs · ${stats.pendingNotes} Notes`} color={stats.pendingQuestions + stats.pendingNotes > 0 ? "amber" : "green"} onClick={() => onNavigate("Review")} />
        <StatCard icon={Mail} label="New feedback" value={stats.feedback} color={stats.feedback > 0 ? "amber" : "green"} onClick={() => onNavigate("Feedback")} />
      </div>

      {/* Quick actions */}
      <SectionHeader title="⚡ Quick actions" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button onClick={() => onNavigate("CMS")} className="bg-primary text-white font-semibold text-sm py-3 rounded-xl hover:bg-primary/90 transition-colors">
          📚 Manage Content
        </button>
        <button onClick={() => onNavigate("Review")} className="bg-amber-500 text-white font-semibold text-sm py-3 rounded-xl hover:bg-amber-600 transition-colors">
          ✅ Review Queue
        </button>
        <button onClick={() => onNavigate("Email Centre")} className="bg-violet-600 text-white font-semibold text-sm py-3 rounded-xl hover:bg-violet-700 transition-colors">
          📨 Send Broadcast
        </button>
        <button onClick={() => onNavigate("Analytics")} className="bg-blue-600 text-white font-semibold text-sm py-3 rounded-xl hover:bg-blue-700 transition-colors">
          📈 View Analytics
        </button>
      </div>
    </div>
  );
}