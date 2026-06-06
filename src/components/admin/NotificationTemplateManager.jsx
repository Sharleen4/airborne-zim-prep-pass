import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Pencil, Save, X, ToggleLeft, ToggleRight, RefreshCw, CheckCircle } from "lucide-react";

const TEMPLATE_TYPES = [
  {
    key: "welcome",
    label: "Welcome Signup",
    emoji: "👋",
    description: "Sent when a parent creates an account",
    defaultMessage: "Hello {{child_name}}'s parent! 🎉 Welcome to Zama Ai Primary. Your 14-day free trial has started. Help {{child_name}} study smarter every day. Let's go! 📚",
  },
  {
    key: "inactivity_alert",
    label: "Inactivity Alert",
    emoji: "⏰",
    description: "Sent when child hasn't logged in for 2+ days",
    defaultMessage: "Hi! {{child_name}} hasn't practised in a while 😟. Log in today to keep the momentum going. Every session counts towards exam success! 💪",
  },
  {
    key: "low_score_alert",
    label: "Low Score Alert",
    emoji: "📉",
    description: "Sent when quiz score is below 50%",
    defaultMessage: "Hi! {{child_name}} scored {{score}} on {{subject}} – {{topic}}. Don't worry, this is a chance to revise and improve! 📖 Practice makes perfect.",
  },
  {
    key: "improvement_praise",
    label: "Improvement Praise",
    emoji: "🌟",
    description: "Sent when score improves by 15+ points",
    defaultMessage: "Amazing news! 🌟 {{child_name}} just improved their score to {{score}} on {{subject}}! That's a big jump — keep up the great work! 🎯",
  },
  {
    key: "homework_completed",
    label: "Homework Completed",
    emoji: "✅",
    description: "Sent when all assigned homework is done",
    defaultMessage: "Well done {{child_name}}! 🏅 All homework has been completed. You're on the right track to exam success! Keep it up.",
  },
  {
    key: "trial_expiry_reminder",
    label: "Trial Expiry Reminder",
    emoji: "⏳",
    description: "Sent 3, 2, and 1 day before trial ends",
    defaultMessage: "Hi! {{child_name}}'s free trial ends in {{days_remaining}} day(s). 🔔 Subscribe now to keep full access: {{payment_link}}. Don't let {{child_name}}'s progress stop!",
  },
];

const VARIABLES = ["{{child_name}}", "{{subject}}", "{{topic}}", "{{score}}", "{{days_remaining}}", "{{payment_link}}"];

function TemplateCard({ templateDef, record, onSave }) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState(record?.message_content || templateDef.defaultMessage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isActive = record ? record.is_active !== false : true;

  const handleSave = async () => {
    setSaving(true);
    const data = {
      template_type: templateDef.key,
      template_name: templateDef.label,
      message_content: message,
      is_active: isActive,
    };
    let updated;
    if (record) {
      updated = await base44.entities.NotificationTemplate.update(record.id, data);
    } else {
      updated = await base44.entities.NotificationTemplate.create(data);
    }
    onSave(updated);
    setEditing(false);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleToggleActive = async () => {
    if (!record) return;
    const updated = await base44.entities.NotificationTemplate.update(record.id, { is_active: !isActive });
    onSave(updated);
  };

  const insertVariable = (v) => {
    setMessage(prev => prev + v);
  };

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden transition-all ${isActive ? "border-border" : "border-amber-400/40 opacity-70"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="text-2xl flex-shrink-0">{templateDef.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{templateDef.label}</p>
          <p className="text-xs text-muted-foreground">{templateDef.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saved && <CheckCircle className="w-4 h-4 text-green-500" />}
          {record && (
            <button onClick={handleToggleActive} title={isActive ? "Deactivate" : "Activate"}>
              {isActive
                ? <ToggleRight className="w-5 h-5 text-green-600 hover:text-muted-foreground transition-colors" />
                : <ToggleLeft className="w-5 h-5 text-muted-foreground hover:text-green-600 transition-colors" />
              }
            </button>
          )}
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {editing && (
            <button onClick={() => { setEditing(false); setMessage(record?.message_content || templateDef.defaultMessage); }} className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Message preview or editor */}
      {editing ? (
        <div className="border-t border-border px-4 py-4 space-y-3 bg-secondary/20">
          {/* Variable chips */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Insert variable:</p>
            <div className="flex flex-wrap gap-1.5">
              {VARIABLES.map(v => (
                <button
                  key={v}
                  onClick={() => insertVariable(v)}
                  className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg hover:bg-primary/20 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground resize-none font-sans leading-relaxed"
            placeholder="Enter WhatsApp message..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !message.trim()}
              className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Save Template
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Character count: <span className={message.length > 1024 ? "text-destructive font-semibold" : "font-medium"}>{message.length}</span>
            <span className="ml-2 text-muted-foreground/70">(WhatsApp limit: 1024)</span>
          </p>
        </div>
      ) : (
        <div className="border-t border-border px-4 py-3 bg-secondary/10">
          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap font-sans">
            {record?.message_content || templateDef.defaultMessage}
          </p>
          {!record && (
            <p className="text-xs text-amber-600 font-semibold mt-2 flex items-center gap-1">
              ⚠️ Default — click edit to save this template
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function NotificationTemplateManager() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    base44.entities.NotificationTemplate.list().then(r => {
      setRecords(r);
      setLoading(false);
    });
  }, []);

  const handleSave = (updated) => {
    setRecords(prev => {
      const exists = prev.find(r => r.id === updated.id);
      return exists ? prev.map(r => r.id === updated.id ? updated : r) : [...prev, updated];
    });
  };

  const seedDefaults = async () => {
    setSeeding(true);
    const existing = new Set(records.map(r => r.template_type));
    for (const def of TEMPLATE_TYPES) {
      if (!existing.has(def.key)) {
        const created = await base44.entities.NotificationTemplate.create({
          template_type: def.key,
          template_name: def.label,
          message_content: def.defaultMessage,
          is_active: true,
        });
        setRecords(prev => [...prev, created]);
      }
    }
    setSeeding(false);
  };

  const getRecord = (key) => records.find(r => r.template_type === key) || null;
  const missingCount = TEMPLATE_TYPES.filter(d => !getRecord(d.key)).length;

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">WhatsApp Notification Templates</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{records.length} saved · {TEMPLATE_TYPES.length} total</p>
        </div>
        {missingCount > 0 && (
          <button
            onClick={seedDefaults}
            disabled={seeding}
            className="flex items-center gap-1.5 text-sm font-semibold bg-primary text-white px-4 py-2 rounded-xl disabled:opacity-40"
          >
            {seeding ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Seed {missingCount} Default{missingCount !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Variable reference */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-blue-700 mb-2">📌 Available Variables</p>
        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.map(v => (
            <span key={v} className="text-xs font-mono bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-lg">{v}</span>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-2">These are replaced automatically with real values when notifications are sent.</p>
      </div>

      {/* Template cards */}
      <div className="space-y-3">
        {TEMPLATE_TYPES.map(def => (
          <TemplateCard
            key={def.key}
            templateDef={def}
            record={getRecord(def.key)}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
}