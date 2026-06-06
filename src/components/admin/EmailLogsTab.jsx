import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, CheckCircle, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const TYPE_LABELS = {
  welcome: "Welcome",
  weekly_summary: "Weekly Summary",
  inactivity_alert: "Inactivity",
  trial_expiry_reminder: "Trial Expiry",
  improvement_praise: "Praise",
  payment_confirmation: "Payment",
  feature_announcement: "Announcement",
};

export default function EmailLogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    base44.entities.EmailLog.list("-sent_date", 500).then(d => { setLogs(d); setLoading(false); });
  }, []);

  const totalSent = logs.filter(l => l.status === "sent").length;
  const totalFailed = logs.filter(l => l.status === "failed").length;

  const dailyCounts = (() => {
    const map = {};
    logs.forEach(log => {
      if (!log.sent_date) return;
      const day = log.sent_date.split("T")[0];
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      count,
    }));
  })();

  const filtered = logs.filter(log => {
    if (filterType !== "all" && log.email_type !== filterType) return false;
    if (filterStatus !== "all" && log.status !== filterStatus) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h2 className="text-lg font-bold text-foreground">Email Logs</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{logs.length} total emails sent</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
          <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <p className="text-xl font-extrabold text-green-700">{totalSent}</p>
          <p className="text-xs text-green-600 font-medium">Sent</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
          <XCircle className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-xl font-extrabold text-red-600">{totalFailed}</p>
          <p className="text-xs text-red-500 font-medium">Failed</p>
        </div>
      </div>

      {dailyCounts.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-sm font-bold text-foreground mb-3">Emails Per Day (last 14 days)</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={dailyCounts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={v => [v, "Emails"]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {dailyCounts.map((_, i) => <Cell key={i} fill="hsl(var(--primary))" fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border border-border rounded-xl px-3 py-1.5 text-sm bg-background text-foreground">
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-border rounded-xl px-3 py-1.5 text-sm bg-background text-foreground">
          <option value="all">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
        <span className="text-xs text-muted-foreground self-center ml-auto">{filtered.length} records</span>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Mail className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No email logs found</p>
          </div>
        )}
        {filtered.map(log => (
          <div key={log.id} className="bg-card border border-border rounded-2xl p-3 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">{TYPE_LABELS[log.email_type] || log.email_type}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{log.status}</span>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {log.sent_date ? new Date(log.sent_date).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{log.recipient_email}</p>
            {log.subject && <p className="text-xs text-foreground/70 truncate">📧 {log.subject}</p>}
            {log.error_message && <p className="text-xs text-red-500">{log.error_message}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}