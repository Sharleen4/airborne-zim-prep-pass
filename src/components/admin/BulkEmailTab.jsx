import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Send, Users, User, CheckCircle, XCircle, Loader2, Search } from "lucide-react";

const EMAIL_TYPES = [
  { value: "welcome", label: "Welcome", description: "Welcome email for new users" },
  { value: "inactivity_alert", label: "Inactivity Alert", description: "Encourage inactive students to return" },
  { value: "trial_expiry_reminder", label: "Trial Expiry Reminder", description: "Remind users their trial is ending" },
  { value: "improvement_praise", label: "Improvement Praise", description: "Celebrate student progress" },
  { value: "weekly_summary", label: "Weekly Summary", description: "Send weekly progress report" },
];

export default function BulkEmailTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [emailType, setEmailType] = useState("welcome");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [mode, setMode] = useState("all"); // "all" | "select"

  useEffect(() => {
    base44.entities.User.list().then(u => {
      setUsers(u);
      setLoading(false);
    });
  }, []);

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (email) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  };

  const selectAll = () => setSelectedEmails(new Set(filtered.map(u => u.email)));
  const clearAll = () => setSelectedEmails(new Set());

  const targets = mode === "all" ? users : users.filter(u => selectedEmails.has(u.email));

  const handleSend = async () => {
    if (targets.length === 0) return;
    if (!confirm(`Send "${emailType}" email to ${targets.length} user(s)?`)) return;

    setSending(true);
    setResults(null);

    let sent = 0, failed = 0, skipped = 0;

    for (const u of targets) {
      try {
        const res = await base44.functions.invoke("sendEngagementEmail", {
          email_type: emailType,
          recipient_email: u.email,
          parent_name: u.full_name || u.email,
          child_name: u.full_name || u.email,
        });
        if (res.data?.skipped) skipped++;
        else if (res.data?.success) sent++;
        else failed++;
      } catch {
        failed++;
      }
    }

    setResults({ sent, failed, skipped, total: targets.length });
    setSending(false);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h2 className="text-lg font-bold text-foreground">Email Centre</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Send emails to all users or selected individuals.</p>
      </div>

      {/* Email type picker */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">1. Choose Email Type</p>
        <div className="space-y-2">
          {EMAIL_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setEmailType(t.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${emailType === t.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
            >
              <p className="font-semibold text-sm text-foreground">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recipient mode */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">2. Choose Recipients</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode("all")}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${mode === "all" ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <Users className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="font-semibold text-sm text-foreground">All Users</p>
              <p className="text-xs text-muted-foreground">{users.length} total</p>
            </div>
          </button>
          <button
            onClick={() => setMode("select")}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${mode === "select" ? "border-primary bg-primary/5" : "border-border"}`}
          >
            <User className="w-4 h-4 text-primary" />
            <div className="text-left">
              <p className="font-semibold text-sm text-foreground">Select Users</p>
              <p className="text-xs text-muted-foreground">{selectedEmails.size} selected</p>
            </div>
          </button>
        </div>

        {mode === "select" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full border border-border rounded-xl pl-8 pr-3 py-2 text-sm bg-background text-foreground"
                />
              </div>
              <button onClick={selectAll} className="text-xs font-semibold text-primary border border-primary/30 px-3 py-2 rounded-xl">All</button>
              <button onClick={clearAll} className="text-xs font-semibold text-muted-foreground border border-border px-3 py-2 rounded-xl">None</button>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-1 border border-border rounded-xl p-2">
              {filtered.map(u => (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u.email)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${selectedEmails.has(u.email) ? "bg-primary/10" : "hover:bg-secondary"}`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedEmails.has(u.email) ? "border-primary bg-primary" : "border-border"}`}>
                    {selectedEmails.has(u.email) && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Send */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm font-bold text-foreground">3. Send</p>
        <div className="bg-secondary/50 rounded-xl px-4 py-3 text-sm text-foreground">
          <p>📧 Type: <strong>{EMAIL_TYPES.find(t => t.value === emailType)?.label}</strong></p>
          <p className="mt-1">👥 Recipients: <strong>{mode === "all" ? users.length : selectedEmails.size} user(s)</strong></p>
        </div>

        {results && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 space-y-1 text-sm">
            <p className="font-bold text-green-700">Send complete — {results.total} processed</p>
            <p className="text-green-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {results.sent} sent successfully</p>
            {results.skipped > 0 && <p className="text-amber-600">⚠️ {results.skipped} skipped (monthly limit reached)</p>}
            {results.failed > 0 && <p className="text-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {results.failed} failed</p>}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || (mode === "select" && selectedEmails.size === 0)}
          className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {sending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending emails...</>
          ) : (
            <><Send className="w-4 h-4" /> Send {mode === "all" ? users.length : selectedEmails.size} Email(s)</>
          )}
        </button>
      </div>
    </div>
  );
}