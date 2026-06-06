import { ArrowLeft, CheckCircle2, XCircle, Lightbulb } from "lucide-react";

export default function ExamReviewScreen({ examQuestions, answerDetails, onBack }) {
  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-5 pt-12 pb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/90 hover:text-white text-sm font-medium mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Results
        </button>
        <h1 className="text-xl font-bold">Review Answers</h1>
        <p className="text-white/70 text-sm mt-1">Learn from each question</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {examQuestions.map((q, i) => {
          const detail = answerDetails[i] || {};
          const selected = detail.selected_answer;
          const correct = q.correct_answer || q.answer;
          const isCorrect = detail.is_correct;
          const notAnswered = !selected;

          return (
            <div key={q.id || i} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className={`px-4 py-2.5 flex items-center justify-between ${isCorrect ? "bg-green-500/10" : "bg-red-500/10"}`}>
                <span className="text-xs font-bold text-foreground">Question {i + 1}</span>
                {isCorrect ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                    <XCircle className="w-3.5 h-3.5" /> {notAnswered ? "Not answered" : "Incorrect"}
                  </span>
                )}
              </div>

              <div className="p-4 space-y-3">
                <p className="text-sm font-semibold text-foreground leading-relaxed">{q.question_text}</p>

                <div className="space-y-1.5">
                  {(q.options || []).map(opt => {
                    const isSelected = opt.label === selected;
                    const isCorrectOpt = opt.label === correct;
                    let cls = "border-border bg-background text-foreground";
                    if (isCorrectOpt) cls = "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400";
                    else if (isSelected && !isCorrectOpt) cls = "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400";
                    return (
                      <div key={opt.label} className={`border rounded-xl px-3 py-2 text-sm flex items-start gap-2 ${cls}`}>
                        <span className="font-bold flex-shrink-0">{opt.label}.</span>
                        <span className="flex-1">{opt.text}</span>
                        {isCorrectOpt && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
                        {isSelected && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />}
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-muted-foreground pt-1 space-y-0.5">
                  <p>Your answer: <span className="font-semibold text-foreground">{selected || "—"}</span></p>
                  <p>Correct answer: <span className="font-semibold text-green-600">{correct}</span></p>
                </div>

                {q.explanation && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-0.5">Explanation</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{q.explanation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={onBack}
          className="w-full border-2 border-foreground text-foreground font-semibold py-3 rounded-xl mt-2"
        >
          Back to Results
        </button>
      </div>
    </div>
  );
}