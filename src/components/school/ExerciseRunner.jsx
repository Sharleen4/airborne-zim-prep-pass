import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Clock, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { autoMarkExercise } from "@/lib/exerciseHelpers";

// Auto-marked exercise runner for students.
// Renders structured questions, captures answers, auto-marks, and saves submission.
// Per the teacher's "release_answers" toggle, correct answers stay hidden after submit unless released.
export default function ExerciseRunner({ exercise, studentProfile, existing, onClose, onSubmitted }) {
  const initialAnswers = {};
  (existing?.answers || []).forEach(a => { initialAnswers[a.question_id] = a.answer; });
  const [answers, setAnswers] = useState(initialAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(
    exercise.duration_minutes ? exercise.duration_minutes * 60 : null
  );
  const timerRef = useRef(null);

  const alreadySubmitted = existing && existing.status !== "pending";

  // Countdown for timed exercises (only when not already submitted)
  useEffect(() => {
    if (alreadySubmitted || secondsLeft == null) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => (s == null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [alreadySubmitted, secondsLeft != null]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (secondsLeft === 0 && !alreadySubmitted && !submitting) {
      handleSubmit(true);
    }
  }, [secondsLeft]);

  const setAnswer = (qid, value) => setAnswers(a => ({ ...a, [qid]: value }));

  const handleSubmit = async (auto = false) => {
    setSubmitting(true);
    setErr("");
    try {
      const studentAnswers = (exercise.questions || []).map(q => ({
        question_id: q.id,
        answer: answers[q.id] ?? "",
      }));
      const { answers: marked, score } = autoMarkExercise(exercise.questions || [], studentAnswers);
      const today = new Date().toISOString().split("T")[0];
      const isLate = exercise.due_date && today > exercise.due_date;

      const payload = {
        homework_id: exercise.id,
        student_email: studentProfile.user_email || studentProfile.parent_email,
        student_name: studentProfile.full_name,
        class_id: exercise.class_id,
        school_id: exercise.school_id,
        submission_date: new Date().toISOString(),
        status: isLate ? "late" : "submitted",
        answers: marked,
        auto_score: score,
        // Final grade is only revealed once teacher releases. Until then, keep grade undefined.
        ...(exercise.release_answers ? { grade: score, status: "graded" } : {}),
      };

      if (existing) {
        await base44.entities.HomeworkSubmission.update(existing.id, payload);
      } else {
        await base44.entities.HomeworkSubmission.create(payload);
      }
      onSubmitted?.({ autoSubmitted: auto, score });
    } catch (e2) {
      setErr(e2.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const fmtTime = (s) => {
    if (s == null) return "";
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const showResults = alreadySubmitted && exercise.release_answers;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between z-10">
          <div className="min-w-0">
            <h3 className="font-bold text-base text-foreground truncate">{exercise.title}</h3>
            <p className="text-[11px] text-muted-foreground">{(exercise.questions || []).length} questions</p>
          </div>
          <div className="flex items-center gap-2">
            {secondsLeft != null && !alreadySubmitted && (
              <span className={`text-xs font-bold inline-flex items-center gap-1 px-2 py-1 rounded-full ${secondsLeft < 60 ? "bg-destructive/10 text-destructive" : "bg-secondary text-foreground"}`}>
                <Clock className="w-3 h-3" /> {fmtTime(secondsLeft)}
              </span>
            )}
            <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {exercise.instructions && (
            <div className="bg-secondary rounded-xl p-3 text-sm text-foreground whitespace-pre-wrap">
              {exercise.instructions}
            </div>
          )}

          {alreadySubmitted && !exercise.release_answers && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Submitted. Your score and answers will appear once the teacher releases them.
            </div>
          )}

          {(exercise.questions || []).map((q, i) => {
            const submittedAnswer = existing?.answers?.find(a => a.question_id === q.id);
            const studentAns = alreadySubmitted ? (submittedAnswer?.answer ?? "") : (answers[q.id] ?? "");
            const isCorrect = submittedAnswer?.is_correct;

            return (
              <div key={q.id} className="bg-card border border-border rounded-2xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">Q{i + 1}. {q.prompt}</p>
                  {showResults && submittedAnswer && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isCorrect ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                      {isCorrect ? "✓ Correct" : "✗ Wrong"}
                    </span>
                  )}
                </div>

                {q.type === "mcq" && (
                  <div className="space-y-1.5">
                    {(q.options || []).map((opt, idx) => {
                      const selected = studentAns === opt;
                      const showAsCorrect = showResults && opt === q.correct_answer;
                      const showAsWrong = showResults && selected && opt !== q.correct_answer;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={alreadySubmitted}
                          onClick={() => setAnswer(q.id, opt)}
                          className={`w-full text-left text-sm px-3 py-2 rounded-xl border transition-colors ${
                            showAsCorrect ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" :
                            showAsWrong ? "border-destructive bg-destructive/10 text-destructive" :
                            selected ? "border-primary bg-primary/10 text-foreground" : "border-border text-foreground"
                          } disabled:opacity-90`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {q.type === "true_false" && (
                  <div className="flex gap-2">
                    {["true", "false"].map(v => {
                      const selected = studentAns === v;
                      const showAsCorrect = showResults && v === q.correct_answer;
                      const showAsWrong = showResults && selected && v !== q.correct_answer;
                      return (
                        <button
                          key={v}
                          type="button"
                          disabled={alreadySubmitted}
                          onClick={() => setAnswer(q.id, v)}
                          className={`flex-1 text-sm px-3 py-2 rounded-xl border font-semibold capitalize ${
                            showAsCorrect ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" :
                            showAsWrong ? "border-destructive bg-destructive/10 text-destructive" :
                            selected ? "border-primary bg-primary/10 text-foreground" : "border-border text-foreground"
                          }`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                )}

                {(q.type === "fill_blank" || q.type === "short_answer") && (
                  <>
                    <Input
                      placeholder="Type your answer..."
                      value={studentAns}
                      disabled={alreadySubmitted}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                    />
                    {showResults && !isCorrect && (
                      <p className="text-xs text-emerald-700"><span className="font-bold">Correct:</span> {q.correct_answer}</p>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {err && <p className="text-xs text-destructive">{err}</p>}

          {!alreadySubmitted && (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Submitting..." : "Submit Answers"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}