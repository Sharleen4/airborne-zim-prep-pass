import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Pencil, ChevronDown, ChevronUp, Filter, Search, X, Save } from "lucide-react";
import { BottomNav } from "./Home";
import { useAuth } from "@/lib/AuthContext";

const DIFF_COLORS = {
  Easy: "bg-green-100 text-green-700",
  Standard: "bg-blue-100 text-blue-700",
  Advanced: "bg-red-100 text-red-700",
};

// ─── Inline Question Editor ───────────────────────────────────────────────
function QuestionEditForm({ question, onSave, onCancel }) {
  const [form, setForm] = useState({
    question_text: question.question_text || "",
    options: question.options || [
      { label: "A", text: "" }, { label: "B", text: "" },
      { label: "C", text: "" }, { label: "D", text: "" },
    ],
    correct_answer: question.correct_answer || "A",
    explanation: question.explanation || "",
    difficulty: question.difficulty || "Standard",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const updated = await base44.entities.Question.update(question.id, form);
    onSave(updated);
    setSaving(false);
  };

  return (
    <div className="border-t border-border bg-secondary/10 px-4 py-4 space-y-3">
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Question</label>
        <textarea
          value={form.question_text}
          onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))}
          className="w-full border border-border rounded-xl px-3 py-2 text-sm h-20 resize-none bg-background text-foreground"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground block">Options</label>
        {form.options.map((opt, i) => (
          <div key={opt.label} className="flex items-center gap-2">
            <span className="w-6 text-xs font-bold text-muted-foreground">{opt.label}.</span>
            <input
              value={opt.text}
              onChange={e => {
                const opts = [...form.options];
                opts[i] = { ...opts[i], text: e.target.value };
                setForm(f => ({ ...f, options: opts }));
              }}
              className="flex-1 border border-border rounded-xl px-3 py-1.5 text-sm bg-background text-foreground"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Correct Answer</label>
          <select
            value={form.correct_answer}
            onChange={e => setForm(f => ({ ...f, correct_answer: e.target.value }))}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
          >
            {["A", "B", "C", "D"].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Difficulty</label>
          <select
            value={form.difficulty}
            onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
          >
            {["Easy", "Standard", "Advanced"].map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1 block">Explanation</label>
        <input
          value={form.explanation}
          onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-primary text-white text-sm font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          {saving ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save
        </button>
        <button onClick={onCancel} className="flex-1 border border-border text-sm font-semibold py-2 rounded-xl text-muted-foreground">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Single Question Card ─────────────────────────────────────────────────
function QuestionCard({ question, topicName, onApprove, onReject, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const status = question.is_active === true ? "approved"
    : question.is_active === false && question.rejected ? "rejected"
    : "pending";

  const handleSave = (updated) => {
    onUpdate(updated);
    setEditing(false);
  };

  return (
    <div className={`bg-card rounded-2xl border overflow-hidden ${
      status === "approved" ? "border-green-400/40" :
      status === "rejected" ? "border-red-400/40 opacity-60" :
      "border-border"
    }`}>
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[question.difficulty] || DIFF_COLORS.Standard}`}>
              {question.difficulty}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {topicName}
            </span>
            {status === "approved" && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">✓ Approved</span>}
            {status === "rejected" && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">✗ Rejected</span>}
            {status === "pending" && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">⏳ Pending</span>}
          </div>
          <p className="text-sm font-medium text-foreground line-clamp-2">{question.question_text}</p>
        </div>
        <button onClick={() => { setExpanded(e => !e); setEditing(false); }} className="text-muted-foreground flex-shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && !editing && (
        <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-2">
          {(question.options || []).map(opt => (
            <div
              key={opt.label}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                opt.label === question.correct_answer
                  ? "bg-green-50 border border-green-300 font-semibold text-green-800"
                  : "bg-white border border-border text-foreground"
              }`}
            >
              <span className="font-bold w-5 flex-shrink-0">{opt.label}.</span>
              <span>{opt.text}</span>
              {opt.label === question.correct_answer && <CheckCircle className="w-3.5 h-3.5 ml-auto text-green-600 flex-shrink-0" />}
            </div>
          ))}
          {question.explanation && (
            <p className="text-xs text-muted-foreground italic px-1">💡 {question.explanation}</p>
          )}
        </div>
      )}

      {expanded && editing && (
        <QuestionEditForm question={question} onSave={handleSave} onCancel={() => setEditing(false)} />
      )}

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4 pt-1">
        {status !== "approved" && (
          <button
            onClick={() => onApprove(question)}
            className="flex-1 bg-green-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Approve
          </button>
        )}
        <button
          onClick={() => { setExpanded(true); setEditing(e => !e); }}
          className="flex-1 border border-primary text-primary text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
        {status !== "rejected" && (
          <button
            onClick={() => onReject(question)}
            className="flex-1 border border-destructive text-destructive text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1"
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function ReviewQuestionsPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("pending");
  const [topicFilter, setTopicFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Question.list("-created_date", 500),
      base44.entities.Topic.list("order", 500),
    ]).then(([q, t]) => {
      setQuestions(q);
      setTopics(t);
      setLoading(false);
    });
  }, []);

  const topicName = (id) => topics.find(t => t.id === id)?.name || "—";

  const approve = async (q) => {
    await base44.entities.Question.update(q.id, { is_active: true, rejected: false });
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, is_active: true, rejected: false } : x));
  };

  const reject = async (q) => {
    await base44.entities.Question.update(q.id, { is_active: false, rejected: true });
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, is_active: false, rejected: true } : x));
  };

  const update = (updated) => {
    setQuestions(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x));
  };

  const bulkApprove = async () => {
    const pending = filtered.filter(q => q.is_active !== true && !q.rejected);
    if (!pending.length || !confirm(`Approve all ${pending.length} pending questions?`)) return;
    for (const q of pending) await base44.entities.Question.update(q.id, { is_active: true, rejected: false });
    setQuestions(prev => prev.map(x => pending.find(p => p.id === x.id) ? { ...x, is_active: true, rejected: false } : x));
  };

  const getStatus = (q) => {
    if (q.is_active === true) return "approved";
    if (q.rejected) return "rejected";
    return "pending";
  };

  const filtered = questions.filter(q => {
    if (statusFilter !== "all" && getStatus(q) !== statusFilter) return false;
    if (topicFilter && q.topic_id !== topicFilter) return false;
    if (search && !q.question_text?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    pending: questions.filter(q => getStatus(q) === "pending").length,
    approved: questions.filter(q => getStatus(q) === "approved").length,
    rejected: questions.filter(q => getStatus(q) === "rejected").length,
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-jakarta">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-violet-600 to-violet-800 text-white px-6 pt-14 pb-6">
        <h1 className="text-2xl font-extrabold">Review Questions</h1>
        <p className="text-white/60 text-sm mt-1">Approve, edit or reject generated questions</p>

        {/* Status summary pills */}
        <div className="flex gap-2 mt-4">
          {[
            { key: "pending", label: "Pending", count: counts.pending, color: "bg-amber-400/20 text-amber-200 border-amber-300/30" },
            { key: "approved", label: "Approved", count: counts.approved, color: "bg-green-400/20 text-green-200 border-green-300/30" },
            { key: "rejected", label: "Rejected", count: counts.rejected, color: "bg-red-400/20 text-red-200 border-red-300/30" },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`flex-1 border rounded-xl py-2 text-center text-xs font-semibold transition-all ${s.color} ${statusFilter === s.key ? "ring-2 ring-white/30 scale-105" : "opacity-70"}`}
            >
              <div className="text-lg font-extrabold">{s.count}</div>
              {s.label}
            </button>
          ))}
          <button
            onClick={() => setStatusFilter("all")}
            className={`flex-1 border border-white/20 rounded-xl py-2 text-center text-xs font-semibold transition-all bg-white/10 text-white/80 ${statusFilter === "all" ? "ring-2 ring-white/30 scale-105" : "opacity-70"}`}
          >
            <div className="text-lg font-extrabold">{questions.length}</div>
            All
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 pb-28 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full border border-border rounded-xl pl-9 pr-3 py-2 text-sm bg-card text-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Topic filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <select
            value={topicFilter}
            onChange={e => setTopicFilter(e.target.value)}
            className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-card text-foreground"
          >
            <option value="">All topics</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Bulk approve */}
        {statusFilter === "pending" && counts.pending > 1 && (
          <button
            onClick={bulkApprove}
            className="w-full bg-green-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Approve All {counts.pending} Pending
          </button>
        )}

        {/* Results count */}
        <p className="text-xs text-muted-foreground px-1">
          Showing <strong>{filtered.length}</strong> question{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Question list */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p className="font-semibold">No questions here</p>
            <p className="text-xs mt-1">Try changing your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                topicName={topicName(q.topic_id)}
                onApprove={approve}
                onReject={reject}
                onUpdate={update}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav active="review" />
    </div>
  );
}