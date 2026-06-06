import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Pencil, Save, X, ToggleLeft, ToggleRight, RefreshCw, CheckCircle, Mail, Send, Eye } from "lucide-react";

const TEMPLATE_TYPES = [
  { key: "welcome",               label: "Welcome Email",          emoji: "👋", description: "Sent when a parent signs up" },
  { key: "weekly_summary",        label: "Weekly Summary",         emoji: "📊", description: "Sent every Monday with progress highlights" },
  { key: "inactivity_alert",      label: "Inactivity Alert",       emoji: "⏰", description: "Sent after 3+ days of inactivity" },
  { key: "trial_expiry_reminder", label: "Trial Expiry Reminder",  emoji: "⏳", description: "Sent 3, 2, and 1 day before trial ends" },
  { key: "improvement_praise",    label: "Improvement Praise",     emoji: "🌟", description: "Sent when score improves significantly" },
  { key: "payment_confirmation",  label: "Payment Confirmation",   emoji: "✅", description: "Sent after successful payment" },
];

const VARIABLES = ["{{child_name}}", "{{parent_name}}", "{{subject}}", "{{topic}}", "{{score}}", "{{trial_days_remaining}}", "{{payment_link}}"];

function TemplateCard({ def, record, onSave }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(record?.subject || "");
  const [bodyHtml, setBodyHtml] = useState(record?.body_html || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [preview, setPreview] = useState(false);

  const isActive = record ? record.is_active !== false : true;

  const handleSave = async () => {
    setSaving(true);
    const data = { template_type: def.key, template_name: def.label, subject, body_html: bodyHtml, is_active: isActive };
    let updated;
    if (record) {
      updated = await base44.entities.EmailTemplate.update(record.id, data);
    } else {
      updated = await base44.entities.EmailTemplate.create(data);
    }
    onSave(updated);
    setEditing(false);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleToggleActive = async () => {
    if (!record) return;
    const updated = await base44.entities.EmailTemplate.update(record.id, { is_active: !isActive });
    onSave(updated);
  };

  const insertVariable = (v) => setBodyHtml(prev => prev + v);

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden transition-all ${isActive ? "border-border" : "border-amber-400/40 opacity-70"}`}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="text-2xl flex-shrink-0">{def.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{def.label}</p>
          <p className="text-xs text-muted-foreground">{def.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saved && <CheckCircle className="w-4 h-4 text-green-500" />}
          {record && (
            <button onClick={handleToggleActive} title={isActive ? "Deactivate" : "Activate"}>
              {isActive
                ? <ToggleRight className="w-5 h-5 text-green-600" />
                : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
            </button>
          )}
          {!editing && <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary"><Pencil className="w-4 h-4" /></button>}
          {editing && <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>}
        </div>
      </div>

      {editing ? (
        <div className="border-t border-border px-4 py-4 space-y-3 bg-secondary/20">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Subject Line</p>
            <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" placeholder="Email subject..." />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Insert variable:</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {VARIABLES.map(v => (
                <button key={v} onClick={() => insertVariable(v)} className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg hover:bg-primary/20">
                  {v}
                </button>
              ))}
            </div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">HTML Body</p>
            <textarea value={bodyHtml} onChange={e => setBodyHtml(e.target.value)} rows={8}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-xs bg-background text-foreground resize-none font-mono" placeholder="Paste or write HTML email body..." />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPreview(p => !p)} className="flex items-center gap-1 text-xs font-semibold border border-border px-3 py-2 rounded-xl text-muted-foreground hover:bg-secondary">
              <Eye className="w-3.5 h-3.5" /> {preview ? "Hide" : "Preview"}
            </button>
            <button onClick={handleSave} disabled={saving || !subject.trim() || !bodyHtml.trim()}
              className="flex-1 bg-primary text-white text-sm font-semibold py-2 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save Template
            </button>
          </div>
          {preview && bodyHtml && (
            <div className="border border-border rounded-xl overflow-hidden">
              <p className="text-xs font-semibold text-muted-foreground px-3 py-2 border-b border-border bg-secondary/40">Preview</p>
              <div className="p-3 bg-white" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            </div>
          )}
          {!record && <p className="text-xs text-amber-600 font-semibold">⚠️ Not yet saved — using built-in default until you save.</p>}
        </div>
      ) : (
        <div className="border-t border-border px-4 py-2.5 bg-secondary/10">
          {record?.subject
            ? <p className="text-xs text-foreground/80 font-medium">📧 {record.subject}</p>
            : <p className="text-xs text-amber-600 font-semibold italic">Using built-in default — click edit to customise</p>}
        </div>
      )}
    </div>
  );
}

export default function EmailTemplateManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [testType, setTestType] = useState("welcome");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    base44.entities.EmailTemplate.list().then(r => { setRecords(r); setLoading(false); });
  }, []);

  const handleSave = (updated) => {
    setRecords(prev => {
      const exists = prev.find(r => r.id === updated.id);
      return exists ? prev.map(r => r.id === updated.id ? updated : r) : [...prev, updated];
    });
  };

  const sendTest = async () => {
    if (!testEmail.trim()) return;
    setTesting(true);
    setTestResult(null);
    const res = await base44.functions.invoke('sendEngagementEmail', {
      email_type: testType,
      recipient_email: testEmail,
      parent_name: "Test Parent",
      child_name: "Test Child",
      score: "85",
      subject: "Mathematics",
      topic: "Fractions",
      trial_days_remaining: "3",
      payment_link: "https://zamaaiprimary.online/payment",
    });
    setTestResult(res.data);
    setTesting(false);
  };

  const getRecord = (key) => records.find(r => r.template_type === key) || null;

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-10">
      <div>
        <h2 className="text-lg font-bold text-foreground">Email Notification Templates</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Manage engagement emails sent to parents. Max 8 emails/user/month.</p>
      </div>

      {/* Variables reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-blue-700 mb-2">📌 Available Placeholders</p>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.map(v => <span key={v} className="text-xs font-mono bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-lg">{v}</span>)}
        </div>
      </div>

      {/* Test sender */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="font-semibold text-sm text-foreground flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Send Test Email</p>
        <div className="flex gap-2">
          <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com"
            className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" />
          <select value={testType} onChange={e => setTestType(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
            {TEMPLATE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <button onClick={sendTest} disabled={testing || !testEmail.trim()}
          className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">
          {testing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mail className="w-4 h-4" />}
          Send Test
        </button>
        {testResult && (
          <p className={`text-xs font-semibold ${testResult.success ? "text-green-600" : testResult.skipped ? "text-amber-600" : "text-red-600"}`}>
            {testResult.success ? "✅ Test email sent successfully!" : testResult.skipped ? `⚠️ Skipped: ${testResult.reason}` : `❌ Failed: ${testResult.error}`}
          </p>
        )}
      </div>

      {/* Template cards */}
      <div className="space-y-3">
        {TEMPLATE_TYPES.map(def => (
          <TemplateCard key={def.key} def={def} record={getRecord(def.key)} onSave={handleSave} />
        ))}
      </div>
    </div>
  );
}