import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from "lucide-react";

const TYPE_CONFIG = {
  welcome: { emoji: "👋", label: "Welcome", color: "bg-violet-100 text-violet-700 border-violet-200" },
  inactivity_alert: { emoji: "⏰", label: "Inactivity Alert", color: "bg-amber-100 text-amber-700 border-amber-200" },
  low_score_alert: { emoji: "📉", label: "Low Score", color: "bg-red-100 text-red-700 border-red-200" },
  improvement_praise: { emoji: "🌟", label: "Improvement", color: "bg-green-100 text-green-700 border-green-200" },
  homework_completed: { emoji: "✅", label: "Homework Done", color: "bg-blue-100 text-blue-700 border-blue-200" },
  trial_expiry_reminder: { emoji: "⏳", label: "Trial Expiry", color: "bg-orange-100 text-orange-700 border-orange-200" },
  payment_confirmation: { emoji: "💳", label: "Payment", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-amber-500", label: "Pending" },
  sent: { icon: CheckCircle, color: "text-blue-500", label: "Sent" },
  delivered: { icon: CheckCircle, color: "text-green-600", label: "Delivered" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 2) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function NotificationItem({ log }) {
  const [expanded, setExpanded] = useState(false);
  const typeConf = TYPE_CONFIG[log.notification_type] || { emoji: "🔔", label: log.notification_type, color: "bg-secondary text-muted-foreground border-border" };
  const statusConf = STATUS_CONFIG[log.sent_status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-secondary/30 transition-colors"
      >
        {/* Emoji badge */}
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl flex-shrink-0 mt-0.5">
          {typeConf.emoji}
        </div>

        <div className="flex-1 min-w-0">
          {/* Type label + status */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${typeConf.color}`}>
              {typeConf.label}
            </span>
            <span className={`text-xs font-medium flex items-center gap-1 ${statusConf.color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusConf.label}
            </span>
          </div>
          {/* Message preview */}
          <p className={`text-sm text-foreground leading-snug ${expanded ? "" : "line-clamp-2"}`}>
            {log.notification_message}
          </p>
          {/* Date */}
          <p className="text-xs text-muted-foreground mt-1.5">{formatDate(log.sent_date || log.created_date)}</p>
        </div>

        <div className="flex-shrink-0 mt-1">
          {expanded
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-3 bg-secondary/10 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground font-medium">Type</p>
                  <p className="font-semibold text-foreground capitalize">{log.notification_type?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Status</p>
                  <p className={`font-semibold capitalize ${statusConf.color}`}>{log.sent_status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Sent to</p>
                  <p className="font-semibold text-foreground">{log.parent_whatsapp_number || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium">Date</p>
                  <p className="font-semibold text-foreground">
                    {log.sent_date ? new Date(log.sent_date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Full Message</p>
                <p className="text-sm text-foreground bg-card rounded-xl px-3 py-2.5 border border-border leading-relaxed">
                  {log.notification_message}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function NotificationCenter({ parentId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!parentId) { setLoading(false); return; }
    base44.entities.NotificationLog.filter({ parent_id: parentId }, "-sent_date", 100)
      .then(data => { setLogs(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [parentId]);

  const filtered = filter === "all" ? logs : logs.filter(l => l.notification_type === filter);

  // Build filter tabs from actual types present
  const presentTypes = [...new Set(logs.map(l => l.notification_type))];

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" />
        <h2 className="font-bold text-foreground">Activity Notifications</h2>
        {logs.length > 0 && (
          <span className="ml-auto text-xs font-semibold bg-secondary text-muted-foreground px-2.5 py-1 rounded-full">
            {logs.length} total
          </span>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-2xl border border-border text-muted-foreground">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="font-semibold text-sm">No notifications yet</p>
          <p className="text-xs mt-1">Alerts will appear here as your child studies</p>
        </div>
      ) : (
        <>
          {/* Filter chips */}
          {presentTypes.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-colors flex-shrink-0 ${filter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
              >
                All ({logs.length})
              </button>
              {presentTypes.map(type => {
                const conf = TYPE_CONFIG[type] || { emoji: "🔔", label: type };
                const count = logs.filter(l => l.notification_type === type).length;
                return (
                  <button
                    key={type}
                    onClick={() => setFilter(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-colors flex-shrink-0 ${filter === type ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    {conf.emoji} {conf.label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Notification list */}
          <div className="space-y-2.5">
            {filtered.map((log, i) => (
              <NotificationItem key={log.id} log={log} />
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-center text-muted-foreground py-6">No notifications of this type.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}