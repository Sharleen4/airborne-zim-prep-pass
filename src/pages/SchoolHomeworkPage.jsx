import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useActiveChild } from "@/lib/ActiveChildContext";
import { ArrowLeft, ClipboardList, CheckCircle2, Clock, AlertCircle, Loader2, FileText, Award } from "lucide-react";
import SubmissionModal from "@/components/school/SubmissionModal";
import ExerciseRunner from "@/components/school/ExerciseRunner";
import { exerciseTypeMeta } from "@/lib/exerciseHelpers";

export default function SchoolHomeworkPage() {
  const { user } = useAuth();
  const { activeChild } = useActiveChild();
  const [profile, setProfile] = useState(null);
  const [school, setSchool] = useState(null);
  const [klass, setKlass] = useState(null);
  const [homework, setHomework] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);

  const load = useCallback(async () => {
    if (!user || !activeChild) { setLoading(false); return; }
    setLoading(true);
    try {
      let p = (await base44.entities.StudentProfile.filter(
        { child_profile_id: activeChild.id, is_active: true }, "-created_date", 1
      ))[0];
      if (!p) {
        p = (await base44.entities.StudentProfile.filter(
          { parent_email: user.email, full_name: activeChild.child_name, is_active: true }, "-created_date", 1
        ))[0];
      }
      if (!p?.class_id) { setLoading(false); return; }
      setProfile(p);

      const [sch, cls, hw, subs] = await Promise.all([
        base44.entities.School.filter({ id: p.school_id }, "-created_date", 1).then(r => r[0] || null),
        base44.entities.SchoolClass.filter({ id: p.class_id }, "-created_date", 1).then(r => r[0] || null),
        base44.entities.SchoolHomework.filter({ class_id: p.class_id, is_active: true }, "-due_date", 100),
        base44.entities.HomeworkSubmission.filter({ student_email: p.user_email || user.email }, "-created_date", 200).catch(() => []),
      ]);
      setSchool(sch); setKlass(cls); setHomework(hw); setSubmissions(subs);
    } finally {
      setLoading(false);
    }
  }, [user, activeChild?.id]);

  useEffect(() => { load(); }, [load]);

  const submissionFor = (hwId) => submissions.find(s => s.homework_id === hwId);

  const handleSubmitted = () => { setSubmitting(null); load(); };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-3">👨‍👩‍👧‍👦</div>
        <p className="font-semibold text-foreground">Select a child first</p>
        <Link to="/home" className="mt-3 text-primary text-sm font-semibold">Go Home</Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background font-jakarta pb-20">
        <Header />
        <div className="px-5 pt-5">
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
            <p className="font-semibold text-foreground">{activeChild.child_name} isn't linked to a school yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ask your school administrator to add your child to a class so homework appears here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pending = homework.filter(h => {
    const s = submissionFor(h.id);
    return !s || s.status === "pending";
  });
  const done = homework.filter(h => {
    const s = submissionFor(h.id);
    return s && s.status !== "pending";
  });

  return (
    <div className="min-h-screen bg-background font-jakarta pb-20">
      <Header school={school} klass={klass} childName={activeChild.child_name} />

      <div className="px-5 pt-5 space-y-5">
        {/* Pending */}
        <section>
          <h2 className="font-bold text-foreground mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> To do ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
              🎉 All caught up — no pending homework!
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map(h => (
                <HomeworkItem key={h.id} homework={h} submission={submissionFor(h.id)} onAction={() => setSubmitting(h)} />
              ))}
            </div>
          )}
        </section>

        {/* Completed */}
        {done.length > 0 && (
          <section>
            <h2 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Submitted ({done.length})
            </h2>
            <div className="space-y-2">
              {done.map(h => (
                <HomeworkItem key={h.id} homework={h} submission={submissionFor(h.id)} onAction={() => setSubmitting(h)} />
              ))}
            </div>
          </section>
        )}
      </div>

      {submitting && (
        submitting.auto_marked && submitting.questions?.length ? (
          <ExerciseRunner
            exercise={submitting}
            studentProfile={profile}
            existing={submissionFor(submitting.id)}
            onClose={() => setSubmitting(null)}
            onSubmitted={handleSubmitted}
          />
        ) : (
          <SubmissionModal
            homework={submitting}
            studentProfile={profile}
            existing={submissionFor(submitting.id)}
            onClose={() => setSubmitting(null)}
            onSubmitted={handleSubmitted}
          />
        )
      )}
    </div>
  );
}

function Header({ school, klass, childName }) {
  return (
    <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white px-5 pt-10 pb-6">
      <Link to="/home" className="inline-flex items-center gap-1 text-white/80 text-sm mb-3">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-white/70 text-xs">School Exercises</p>
          <h1 className="text-2xl font-extrabold leading-tight truncate">{childName || "Student"}</h1>
          {school && <p className="text-white/80 text-xs mt-1 truncate">{school.name}{klass ? ` · ${klass.name}` : ""}</p>}
        </div>
        <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-lg flex-shrink-0">🏫</div>
      </div>
    </div>
  );
}

function HomeworkItem({ homework, submission, onAction }) {
  const status = submission?.status || "pending";
  const isGraded = status === "graded";
  const isSubmitted = status === "submitted" || status === "late";
  const meta = exerciseTypeMeta(homework.exercise_type);

  // For auto-marked exercises with hidden answers: show "Submitted" but no grade until released.
  const hideAutoScore = homework.auto_marked && !homework.release_answers && isSubmitted;

  const statusBadge = isGraded
    ? { cls: "bg-emerald-500/10 text-emerald-600", label: `Graded · ${submission?.grade ?? "—"}%`, Icon: Award }
    : isSubmitted
    ? { cls: "bg-amber-500/10 text-amber-600", label: hideAutoScore ? "Submitted · Awaiting release" : status === "late" ? "Late · Awaiting grade" : "Awaiting grade", Icon: Clock }
    : { cls: "bg-rose-500/10 text-rose-600", label: "To do", Icon: AlertCircle };
  const Icon = statusBadge.Icon;

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wide bg-secondary text-foreground px-2 py-0.5 rounded-full">
              {meta.emoji} {meta.label}
            </span>
            {homework.duration_minutes && (
              <span className="text-[10px] font-bold bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full">⏱ {homework.duration_minutes}m</span>
            )}
          </div>
          <p className="font-bold text-foreground text-sm">{homework.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Due {homework.due_date}</p>
          {homework.instructions && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{homework.instructions}</p>
          )}
        </div>
        <span className={`text-[11px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1 flex-shrink-0 ${statusBadge.cls}`}>
          <Icon className="w-3 h-3" /> {statusBadge.label}
        </span>
      </div>

      {isGraded && submission?.feedback && (
        <div className="mt-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-2">
          <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Teacher feedback</p>
          <p className="text-sm text-foreground mt-0.5">{submission.feedback}</p>
        </div>
      )}

      <button
        onClick={onAction}
        className={`mt-3 w-full text-xs font-semibold py-2 rounded-lg ${
          isGraded ? "bg-secondary text-foreground" : "bg-primary text-white"
        }`}
      >
        {isGraded ? <><FileText className="w-3 h-3 inline mr-1" /> View Submission</> :
         isSubmitted ? "Update Submission" : "Submit Work"}
      </button>
    </div>
  );
}