import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Upload, Image, Plus, Trash2 } from "lucide-react";

const QUESTION_TYPES = [
  { value: "mcq", label: "Multiple Choice (MCQ)" },
  { value: "true_false", label: "True / False" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "matching", label: "Matching" },
  { value: "structured", label: "Structured" },
  { value: "comprehension", label: "Comprehension" },
];

const DIFFICULTIES = ["Easy", "Standard", "Advanced"];

function emptyForm(topicId = "", subjectId = "") {
  return {
    topic_id: topicId,
    subject_id: subjectId,
    question_type: "mcq",
    question_text: "",
    comprehension_passage: "",
    options: [
      { label: "A", text: "" },
      { label: "B", text: "" },
      { label: "C", text: "" },
      { label: "D", text: "" },
    ],
    matching_pairs: [{ left: "", right: "" }],
    correct_answer: "A",
    explanation: "",
    difficulty: "Standard",
    marks: 1,
    image_url: "",
    is_active: true,
  };
}

export default function QuestionEditor({ question, topics, onSave, onCancel }) {
  const isEdit = !!question;
  const [form, setForm] = useState(() => {
    if (isEdit) {
      return {
        ...emptyForm(),
        ...question,
        options: question.options?.length
          ? question.options
          : [{ label: "A", text: "" }, { label: "B", text: "" }, { label: "C", text: "" }, { label: "D", text: "" }],
        matching_pairs: question.matching_pairs?.length
          ? question.matching_pairs
          : [{ left: "", right: "" }],
        image_url: question.image_url || "",
      };
    }
    return emptyForm();
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("image_url", file_url);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.topic_id || !form.question_text) return;
    setSaving(true);
    const topic = topics.find(t => t.id === form.topic_id);
    const data = {
      ...form,
      subject_id: topic?.subject_id || form.subject_id || "",
      marks: Number(form.marks) || 1,
    };
    let saved;
    if (isEdit) {
      saved = await base44.entities.Question.update(question.id, data);
    } else {
      saved = await base44.entities.Question.create(data);
    }
    setSaving(false);
    onSave(saved);
  };

  const qType = form.question_type;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">{isEdit ? "Edit Question" : "Add Question"}</h2>
          <button onClick={onCancel}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Topic */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Topic *</label>
          <select value={form.topic_id} onChange={e => set("topic_id", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm">
            <option value="">Select topic...</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>

        {/* Question Type */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Question Type</label>
          <select value={form.question_type} onChange={e => set("question_type", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm">
            {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Comprehension passage */}
        {(qType === "comprehension") && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Reading Passage</label>
            <textarea value={form.comprehension_passage} onChange={e => set("comprehension_passage", e.target.value)} placeholder="Enter the reading passage here..." className="w-full border border-border rounded-xl px-3 py-2 text-sm h-24 resize-none" />
          </div>
        )}

        {/* Question text */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Question *</label>
          <textarea value={form.question_text} onChange={e => set("question_text", e.target.value)} placeholder="Enter question text..." className="w-full border border-border rounded-xl px-3 py-2 text-sm h-20 resize-none" />
        </div>

        {/* Image upload */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Question Image (optional)</label>
          {form.image_url ? (
            <div className="relative inline-block">
              <img src={form.image_url} alt="Question" className="h-32 rounded-xl border border-border object-cover" />
              <button onClick={() => set("image_url", "")} className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
            </div>
          ) : (
            <label className={`flex items-center gap-2 border-2 border-dashed border-border rounded-xl px-4 py-3 cursor-pointer hover:border-primary/40 transition-colors ${uploading ? "opacity-60" : ""}`}>
              {uploading ? (
                <><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /><span className="text-sm text-muted-foreground">Uploading...</span></>
              ) : (
                <><Upload className="w-4 h-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Upload image</span></>
              )}
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
            </label>
          )}
        </div>

        {/* MCQ / Comprehension options */}
        {(qType === "mcq" || qType === "comprehension" || qType === "structured") && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground block">Options</label>
            {form.options.map((opt, i) => (
              <div key={opt.label} className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">{opt.label}</span>
                <input
                  value={opt.text}
                  onChange={e => {
                    const opts = [...form.options];
                    opts[i] = { ...opts[i], text: e.target.value };
                    set("options", opts);
                  }}
                  placeholder={`Option ${opt.label}`}
                  className="flex-1 border border-border rounded-xl px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Correct Answer</label>
              <select value={form.correct_answer} onChange={e => set("correct_answer", e.target.value)} className="border border-border rounded-xl px-3 py-2 text-sm">
                {form.options.map(o => <option key={o.label} value={o.label}>{o.label}: {o.text || "(empty)"}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* True / False */}
        {qType === "true_false" && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Correct Answer</label>
            <div className="flex gap-3">
              {["True", "False"].map(v => (
                <button
                  key={v}
                  onClick={() => set("correct_answer", v)}
                  className={`flex-1 py-2 rounded-xl border-2 font-semibold text-sm transition-colors ${form.correct_answer === v ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fill in the blank */}
        {qType === "fill_blank" && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Correct Answer (the missing word/phrase)</label>
            <input value={form.correct_answer} onChange={e => set("correct_answer", e.target.value)} placeholder="e.g. photosynthesis" className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
            <p className="text-xs text-muted-foreground mt-1">Use ___ in the question text to indicate the blank.</p>
          </div>
        )}

        {/* Matching */}
        {qType === "matching" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">Matching Pairs</label>
              <button onClick={() => set("matching_pairs", [...form.matching_pairs, { left: "", right: "" }])} className="text-xs text-primary font-semibold flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add pair
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs font-semibold text-muted-foreground mb-1">
              <span>Column A</span><span>Column B</span>
            </div>
            {form.matching_pairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={pair.left} onChange={e => { const p = [...form.matching_pairs]; p[i] = { ...p[i], left: e.target.value }; set("matching_pairs", p); }} placeholder="Left" className="flex-1 border border-border rounded-xl px-3 py-2 text-sm" />
                <span className="text-muted-foreground">↔</span>
                <input value={pair.right} onChange={e => { const p = [...form.matching_pairs]; p[i] = { ...p[i], right: e.target.value }; set("matching_pairs", p); }} placeholder="Right" className="flex-1 border border-border rounded-xl px-3 py-2 text-sm" />
                {form.matching_pairs.length > 1 && (
                  <button onClick={() => set("matching_pairs", form.matching_pairs.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" /></button>
                )}
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Correct Answer (describe matching, e.g. "1-B, 2-A, 3-C")</label>
              <input value={form.correct_answer} onChange={e => set("correct_answer", e.target.value)} placeholder="1-B, 2-A, 3-C" className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
        )}

        {/* Explanation */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Explanation (optional)</label>
          <textarea value={form.explanation} onChange={e => set("explanation", e.target.value)} placeholder="Why is this the correct answer?" className="w-full border border-border rounded-xl px-3 py-2 text-sm h-16 resize-none" />
        </div>

        {/* Difficulty + Marks */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Difficulty</label>
            <select value={form.difficulty} onChange={e => set("difficulty", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm">
              {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">Marks</label>
            <input type="number" min="1" value={form.marks} onChange={e => set("marks", e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !form.topic_id || !form.question_text}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : (isEdit ? "Save Changes" : "Add Question")}
        </button>
      </div>
    </div>
  );
}