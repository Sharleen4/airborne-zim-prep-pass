import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TeacherLayout from "@/components/teacher/TeacherLayout";
import { Loader2, CheckCircle2, Clock, AlertCircle, Eye, EyeOff, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function TeacherHomeworkSubmissions() {
  const { homeworkId } = useParams();
  const { user } = useAuth();
  const [exercise, setExercise] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(null);
  const [togglingRelease, setTogglingRelease] = useState(false);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    const hw = await base44.entities.SchoolHomework.filter({ id: homeworkId }, "-created_date", 1).then(r => r[0]);
    setExercise(hw);
    if (hw) {
      const subs = await base44.entities.HomeworkSubmission.filter({ homework_id: homeworkId }, "-submission_date", 200);
      setSubmissions(subs);
    }
    setLoading(false);
  }, [homeworkId]);

  useEffect(() => { if (user && homeworkId) load(); }, [user, homeworkId, load]);

  const saveGrade = async (sub, grade, feedback) => {
    await base44.entities.HomeworkSubmission.update(sub.id, {
      grade: Number(grade),
      feedback,
      status: "graded",
    });
    setGrading(null);
    await load();
  };

  const toggleRelease = async () => {
    if (!exercise) return;
    setTogglingRelease(true);
    const next = !exercise.release_answers;
    await base44.entities.SchoolHomework.update(exercise.id, { release_answers: next });
    // When releasing for an auto-marked exercise, promote auto_score → grade & mark graded for all submitted entries.
    if (next && exercise.auto_marked) {
      const toPromote = submissions.filter(s => s.auto_score != null && s.grade == null);
      await Promise.all(toPromote.map(s =>
        base44.entities.HomeworkSubmission.update(s.id, { grade: s.auto_score, status: "graded" })
      ));
    }
    setTogglingRelease(false);
    await load();
  };

  if (!user) return null;

  const questionMap = new Map((exercise?.questions || []).map(q => [q.id, q]));

  return (
    <TeacherLayout title={exercise?.title || "Submissions"} subtitle={`${submissions.length} submissions`} showBack>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !exercise ? (
        <div className="text-sm text-muted-foreground text-center py-8">Exercise not found</div>
      ) : (
        <>
          {exercise.auto_marked && (
            <div className="bg-card border border-border rounded-2xl p-3 mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-primary" /> Auto-marked exercise
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {exercise.release_answers
                    ? "Answers released — students see their score & correct answers."
                    : "Answers hidden — students only see 'Submitted'."}
                </p>
              </div>
              <button
                onClick={toggleRelease}
                disabled={togglingRelease}
                className={`text-xs font-bold px-3 py-2 rounded-xl inline-flex items-center gap-1 flex-shrink-0 ${exercise.release_answers ? "bg-secondary text-foreground" : "bg-primary text-white"}`}
              >
                {togglingRelease ? <Loader2 className="w-3 h-3 animate-spin" /> : exercise.release_answers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {exercise.release_answers ? "Unrelease" : "Release answers"}
              </button>
            </div>
          )}

          {submissions.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <Clock className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground">No submissions yet</p>
              <p className="text-xs text-muted-foreground mt-1">Students will appear here when they submit work.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {submissions.map(s => {
                const isGrading = grading?.id === s.id;
                const isExpanded = expanded[s.id];
                const showScore = s.grade ?? (exercise.auto_marked ? s.auto_score : null);

                return (
                  <div key={s.id} className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground">{s.student_name || s.student_email}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.submission_date ? new Date(s.submission_date).toLocaleString() : "—"}
                        </p>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                        s.status === "graded" ? "bg-emerald-500/10 text-emerald-600" :
                        s.status === "submitted" ? "bg-amber-500/10 text-amber-600" :
                        s.status === "late" ? "bg-rose-500/10 text-rose-600" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {s.status === "graded" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {s.status}
                      </span>
                    </div>

                    {s.submission_text && (
                      <p className="text-sm text-foreground mt-2 bg-secondary rounded-xl p-2 whitespace-pre-wrap">{s.submission_text}</p>
                    )}

                    {showScore != null && !isGrading && (
                      <div className="mt-2 flex items-center gap-2 text-sm flex-wrap">
                        <span className="font-bold text-emerald-600">
                          {s.grade != null ? "Grade" : "Auto-score"}: {showScore}%
                        </span>
                        {s.feedback && <span className="text-muted-foreground italic">— {s.feedback}</span>}
                      </div>
                    )}

                    {/* Per-question breakdown for auto-marked */}
                    {exercise.auto_marked && s.answers?.length > 0 && (
                      <>
                        <button
                          onClick={() => setExpanded(e => ({ ...e, [s.id]: !e[s.id] }))}
                          className="mt-2 text-xs font-semibold text-primary"
                        >
                          {isExpanded ? "Hide" : "Show"} answers ({s.answers.filter(a => a.is_correct).length}/{s.answers.length} correct)
                        </button>
                        {isExpanded && (
                          <div className="mt-2 space-y-1.5">
                            {s.answers.map((a, i) => {
                              const q = questionMap.get(a.question_id);
                              return (
                                <div key={i} className={`text-xs p-2 rounded-lg border ${a.is_correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                                  <p className="font-semibold text-foreground">{q?.prompt || `Question ${i + 1}`}</p>
                                  <p className="text-muted-foreground mt-0.5">
                                    <span className="font-semibold">Answer:</span> {a.answer || <em className="text-muted-foreground/60">blank</em>}
                                    {!a.is_correct && q?.correct_answer && (
                                      <> · <span className="font-semibold text-emerald-700">Correct:</span> {q.correct_answer}</>
                                    )}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}

                    {!isGrading ? (
                      <button onClick={() => setGrading({ ...s, _grade: s.grade ?? s.auto_score ?? "", _feedback: s.feedback ?? "" })}
                        className="mt-2 bg-primary text-white text-xs font-semibold py-2 px-3 rounded-lg">
                        {s.grade != null ? "Edit Grade" : "Grade"}
                      </button>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <Input type="number" min="0" max="100" placeholder="Grade %" value={grading._grade}
                          onChange={e => setGrading({ ...grading, _grade: e.target.value })} />
                        <Textarea placeholder="Feedback" rows={2} value={grading._feedback}
                          onChange={e => setGrading({ ...grading, _feedback: e.target.value })} />
                        <div className="flex gap-2">
                          <button onClick={() => setGrading(null)} className="flex-1 bg-secondary text-foreground text-xs font-semibold py-2 rounded-lg">Cancel</button>
                          <button onClick={() => saveGrade(s, grading._grade, grading._feedback)} className="flex-1 bg-primary text-white text-xs font-semibold py-2 rounded-lg">Save Grade</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </TeacherLayout>
  );
}