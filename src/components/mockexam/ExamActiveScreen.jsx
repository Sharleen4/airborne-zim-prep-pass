import { Clock, Flag } from "lucide-react";
import ReportQuestionModal from "@/components/ReportQuestionModal";
import { useState } from "react";

export default function ExamActiveScreen({ examQuestions, answers, setAnswers, timeLeft, onSubmit, userEmail, examTitle }) {
  const [reportingQuestion, setReportingQuestion] = useState(null);

  const answered = Object.keys(answers).length;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      <div className="bg-foreground text-white px-6 pt-10 pb-4 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60">Mock Exam</p>
            <p className="font-semibold text-sm">{examTitle || "Mock Exam"}</p>
          </div>
          <div className={`flex items-center gap-2 font-mono font-bold text-lg ${timeLeft < 300 ? "text-red-400" : "text-white"}`}>
            <Clock className="w-4 h-4" />
            {formatTime(timeLeft)}
          </div>
        </div>
        <p className="text-xs text-white/50 mt-1">{answered}/{examQuestions.length} answered</p>
      </div>

      <div className="px-6 py-4 space-y-6">
        {examQuestions.map((q, i) => (
          <div key={i} className="bg-card rounded-2xl p-4 shadow-sm border border-border">
            {q.comprehension_passage && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-3">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">📖 Read the passage</p>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{q.comprehension_passage}</p>
              </div>
            )}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>{q.question_text}
                </p>
                {q.image_url && (
                  <img src={q.image_url} alt="Question" className="mt-2 w-full max-h-40 object-cover rounded-xl border border-border" />
                )}
              </div>
              <button
                onClick={() => setReportingQuestion(q)}
                className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors mt-0.5"
              >
                <Flag className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {(q.options || []).map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setAnswers(a => ({ ...a, [i]: opt.label }))}
                  className={`w-full text-left text-sm rounded-xl p-3 border-2 transition-all flex items-center gap-2 ${
                    answers[i] === opt.label ? "border-primary bg-primary/5 font-medium" : "border-border"
                  }`}
                >
                  <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs flex-shrink-0 font-bold">{opt.label}</span>
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button onClick={onSubmit} className="w-full bg-primary text-white font-bold py-4 rounded-2xl text-lg">
          Submit Exam
        </button>
      </div>

      {reportingQuestion && (
        <ReportQuestionModal
          question={reportingQuestion}
          topicId={reportingQuestion.topic_id}
          userEmail={userEmail}
          onClose={() => setReportingQuestion(null)}
        />
      )}
    </div>
  );
}