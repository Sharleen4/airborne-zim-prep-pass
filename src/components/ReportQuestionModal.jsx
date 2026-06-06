import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Flag, X, CheckCircle } from "lucide-react";

const REASONS = [
  "Wrong answer",
  "Unclear question",
  "Incorrect options",
  "Spelling/grammar error",
  "Other",
];

export default function ReportQuestionModal({ question, topicId, userEmail, onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setSubmitting(true);
    await base44.entities.QuestionReport.create({
      question_id: question.id,
      question_text: question.question_text,
      topic_id: topicId,
      reported_by: userEmail,
      reason,
      details: details.trim(),
      status: "pending",
    });
    setSubmitting(false);
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-4">
        {done ? (
          <div className="text-center py-4 space-y-3">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
            <p className="font-bold text-foreground">Report submitted!</p>
            <p className="text-sm text-muted-foreground">Thanks for helping improve the questions.</p>
            <button onClick={onClose} className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-500" />
                <p className="font-bold text-foreground">Report an error</p>
              </div>
              <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 bg-muted rounded-xl px-3 py-2">
              {question.question_text}
            </p>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">What is the problem?</p>
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left text-sm px-4 py-2.5 rounded-xl border-2 transition-colors ${
                    reason === r ? "border-red-400 bg-red-50 text-red-700 font-semibold" : "border-border text-foreground"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              placeholder="Optional: add more details..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm h-20 resize-none"
            />

            <button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="w-full bg-red-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
              ) : (
                <><Flag className="w-4 h-4" /> Submit Report</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}