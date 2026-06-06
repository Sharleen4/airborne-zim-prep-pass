import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Bug, Lightbulb, MessageSquare, HelpCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const TYPES = [
  { value: "bug_report", label: "Bug Report", icon: Bug, color: "bg-red-50 border-red-300 text-red-700" },
  { value: "feature_request", label: "Feature Request", icon: Lightbulb, color: "bg-amber-50 border-amber-300 text-amber-700" },
  { value: "suggestion", label: "Suggestion", icon: MessageSquare, color: "bg-blue-50 border-blue-300 text-blue-700" },
  { value: "other", label: "Other", icon: HelpCircle, color: "bg-secondary border-border text-muted-foreground" },
];

export default function HelpPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    type: "bug_report",
    subject: "",
    description: "",
    page_or_feature: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.subject.trim() || !form.description.trim()) return;
    setSubmitting(true);
    await base44.entities.UserFeedback.create({
      ...form,
      reported_by: user?.email || "anonymous",
    });
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-6 pt-12 pb-10">
        <Link to="/profile" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-extrabold">Help & Support</h1>
        <p className="text-white/70 text-sm mt-1">Report a bug, request a feature, or share a suggestion.</p>
      </div>

      <div className="px-6 -mt-4 space-y-4 pt-2">
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-border p-8 text-center mt-2 shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="font-bold text-lg text-foreground mb-2">Feedback Submitted!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Thank you! Our team will review your feedback and get back to you if needed.
            </p>
            <button
              onClick={() => { setSubmitted(false); setForm({ type: "bug_report", subject: "", description: "", page_or_feature: "" }); }}
              className="w-full border border-border text-sm font-semibold py-2.5 rounded-xl text-foreground hover:bg-secondary transition-colors"
            >
              Submit Another
            </button>
            <Link to="/profile" className="block mt-2 w-full text-center text-sm font-semibold py-2.5 rounded-xl bg-primary text-white">
              Back to Profile
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-border p-5 space-y-5 mt-2 shadow-sm"
          >
            {/* Type selector */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Type</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => {
                  const Icon = t.icon;
                  const selected = form.type === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => set("type", t.value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors text-left ${
                        selected ? t.color + " border-2" : "border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Subject *</label>
              <input
                value={form.subject}
                onChange={e => set("subject", e.target.value)}
                placeholder="Short title e.g. 'App crashes on practice page'"
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Description *</label>
              <textarea
                value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="Describe the issue, feature, or suggestion in detail..."
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm h-28 resize-none"
              />
            </div>

            {/* Page / Feature */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Page or Feature <span className="font-normal normal-case">(optional)</span></label>
              <input
                value={form.page_or_feature}
                onChange={e => set("page_or_feature", e.target.value)}
                placeholder="e.g. Practice Page, Mock Exam, Notes..."
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !form.subject.trim() || !form.description.trim()}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
              ) : (
                "Submit Feedback"
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}