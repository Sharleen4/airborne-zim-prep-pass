import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useActiveChild } from "@/lib/ActiveChildContext";
import { ArrowLeft, ClipboardList, Clock, CheckCircle2, AlertCircle, FileText, Award, School as SchoolIcon, Users } from "lucide-react";
import { motion } from "framer-motion";
import HomeworkCard from "@/components/homework/HomeworkCard";
import SubmissionModal from "@/components/school/SubmissionModal";
import ExerciseRunner from "@/components/school/ExerciseRunner";
import { exerciseTypeMeta } from "@/lib/exerciseHelpers";
import { BottomNav } from "@/pages/Home";

// Unified homework page — shows BOTH parent-assigned tasks (HomeworkAssignment)
// and school-assigned exercises (SchoolHomework) in a single view with filter tabs.
export default function HomeworkPage() {
  const { user } = useAuth();
  const { activeChild } = useActiveChild();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialTab = params.get("tab") === "school" || params.get("tab") === "parent" ? params.get("tab") : "all";

  const [parentHw, setParentHw] = useState([]);   // HomeworkAssignment
  const [schoolHw, setSchoolHw] = useState([]);   // SchoolHomework
  const [submissions, setSubmissions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [school, setSchool] = useState(null);
  const [klass, setKlass] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null); // school exercise being submitted

  const load = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const [allParentHw, childProfiles, subs] = await Promise.all([
        base44.entities.HomeworkAssignment.list("-created_date", 200),
        base44.entities.ChildProfile.filter({ parent_email: user.email }),
        base44.entities.Subject.list(),
      ]);
      const myChildIds = new Set(childProfiles.map(c => c.id));
      let myParentHw = allParentHw.filter(h =>
        h.student_email === user.email || myChildIds.has(h.child_profile_id)
      );
      // Scope to active child if one is selected
      if (activeChild) {
        myParentHw = myParentHw.filter(h =>
          h.child_profile_id === activeChild.id || h.student_email === user.email
        );
      }
      setParentHw(myParentHw);
      setSubjects(subs);

      // School homework — only if active child is linked to a class
      if (activeChild) {
        let p = (await base44.entities.StudentProfile.filter(
          { child_profile_id: activeChild.id, is_active: true }, "-created_date", 1
        ))[0];
        if (!p) {
          p = (await base44.entities.StudentProfile.filter(
            { parent_email: user.email, full_name: activeChild.child_name, is_active: true }, "-created_date", 1
          ))[0];
        }
        if (p?.class_id) {
          setStudentProfile(p);
          const [sch, cls, hw, subList] = await Promise.all([
            base44.entities.School.filter({ id: p.school_id }, "-created_date", 1).then(r => r[0] || null),
            base44.entities.SchoolClass.filter({ id: p.class_id }, "-created_date", 1).then(r => r[0] || null),
            base44.entities.SchoolHomework.filter({ class_id: p.class_id, is_active: true }, "-due_date", 100),
            base44.entities.HomeworkSubmission.filter({ student_email: p.user_email || user.email }, "-created_date", 200).catch(() => []),
          ]);
          setSchool(sch); setKlass(cls); setSchoolHw(hw); setSubmissions(subList);
        } else {
          setStudentProfile(null); setSchool(null); setKlass(null); setSchoolHw([]); setSubmissions([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [user, activeChild?.id]);

  useEffect(() => { load(); }, [load]);

  const subjectName = (id) => {
    const s = subjects.find(s => s.id === id);
    return s ? `${s.icon || "📚"} ${s.name}` : "";
  };

  const submissionFor = (hwId) => submissions.find(s => s.homework_id === hwId);

  // Parent homework actions
  const handleStartParent = async (hw) => {
    if (hw.status === "assigned") {
      await base44.entities.HomeworkAssignment.update(hw.id, { status: "in_progress" });
      setParentHw(prev => prev.map(h => h.id === hw.id ? { ...h, status: "in_progress" } : h));
    }
    if (hw.topic_ids?.length === 1) navigate(`/practice/${hw.topic_ids[0]}`);
    else if (hw.subject_id) navigate(`/subject/${hw.subject_id}`);
  };
  const handleMarkDoneParent = async (hw) => {
    await base44.entities.HomeworkAssignment.update(hw.id, {
      status: "completed",
      completed_date: new Date().toISOString().split("T")[0],
    });
    setParentHw(prev => prev.map(h => h.id === hw.id ? { ...h, status: "completed" } : h));
  };

  const handleSubmittedSchool = () => { setSubmitting(null); load(); };

  // Compute lists by tab
  const showParent = tab === "all" || tab === "parent";
  const showSchool = tab === "all" || tab === "school";

  const parentPending = showParent ? parentHw.filter(h => h.status === "assigned" || h.status === "in_progress") : [];
  const parentDone = showParent ? parentHw.filter(h => h.status === "completed" || h.status === "reviewed") : [];
  const schoolPending = showSchool ? schoolHw.filter(h => { const s = submissionFor(h.id); return !s || s.status === "pending"; }) : [];
  const schoolDone = showSchool ? schoolHw.filter(h => { const s = submissionFor(h.id); return s && s.status !== "pending"; }) : [];

  const totalPending = parentPending.length + schoolPending.length;
  const totalDone = parentDone.length + schoolDone.length;
  const hasAnyHomework = parentHw.length + schoolHw.length > 0;

  const setTabAndUrl = (t) => {
    setTab(t);
    const next = new URLSearchParams(params);
    if (t === "all") next.delete("tab"); else next.set("tab", t);
    setParams(next, { replace: true });
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-6 pt-12 pb-10">
        <Link to="/home" className="inline-flex items-center gap-2 text-white/80 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-extrabold">My Homework</h1>
        <p className="text-white/70 text-sm mt-1">
          {totalPending} task{totalPending !== 1 ? "s" : ""} to complete
          {klass ? ` · ${klass.name}` : ""}
        </p>
      </div>

      <div className="px-6 -mt-4 pt-2 space-y-5">
        {/* Tabs */}
        <div className="bg-card border border-border rounded-2xl p-1 flex gap-1">
          <TabBtn active={tab === "all"} onClick={() => setTabAndUrl("all")} label="All" count={parentHw.length + schoolHw.length} />
          <TabBtn active={tab === "school"} onClick={() => setTabAndUrl("school")} icon={<SchoolIcon className="w-3.5 h-3.5" />} label="School" count={schoolHw.length} />
          <TabBtn active={tab === "parent"} onClick={() => setTabAndUrl("parent")} icon={<Users className="w-3.5 h-3.5" />} label="Parent" count={parentHw.length} />
        </div>

        {!hasAnyHomework ? (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No homework assigned yet</p>
            <p className="text-sm mt-1">Tasks from your parent and school will appear here</p>
          </div>
        ) : (
          <>
            {/* Not linked to school yet (only relevant when looking at school tab) */}
            {showSchool && activeChild && !studentProfile && schoolHw.length === 0 && tab === "school" && (
              <div className="bg-card rounded-2xl border border-border p-6 text-center">
                <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                <p className="font-semibold text-foreground">{activeChild.child_name} isn't linked to a school yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask your teacher for a class invite link to receive school exercises here.
                </p>
              </div>
            )}

            {/* Pending */}
            {totalPending > 0 && (
              <div className="space-y-3">
                <p className="font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> To Do ({totalPending})
                </p>
                {schoolPending.map((hw, i) => (
                  <motion.div key={`s-${hw.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <SchoolHomeworkItem homework={hw} submission={submissionFor(hw.id)} onAction={() => setSubmitting(hw)} />
                  </motion.div>
                ))}
                {parentPending.map((hw, i) => (
                  <motion.div key={`p-${hw.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (schoolPending.length + i) * 0.04 }}>
                    <div className="relative">
                      <span className="absolute -top-2 left-3 z-10 text-[10px] font-bold uppercase tracking-wide bg-violet-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" /> Parent
                      </span>
                      <HomeworkCard
                        hw={hw}
                        subjectName={subjectName(hw.subject_id)}
                        onAction={hw.status === "in_progress" ? handleMarkDoneParent : handleStartParent}
                        actionLabel={hw.status === "in_progress" ? "Mark Done" : "Start"}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Completed */}
            {totalDone > 0 && (
              <div className="space-y-3">
                <p className="font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Completed ({totalDone})
                </p>
                {schoolDone.map((hw, i) => (
                  <motion.div key={`s-${hw.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <SchoolHomeworkItem homework={hw} submission={submissionFor(hw.id)} onAction={() => setSubmitting(hw)} />
                  </motion.div>
                ))}
                {parentDone.map((hw, i) => (
                  <motion.div key={`p-${hw.id}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="relative">
                      <span className="absolute -top-2 left-3 z-10 text-[10px] font-bold uppercase tracking-wide bg-violet-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" /> Parent
                      </span>
                      <HomeworkCard hw={hw} subjectName={subjectName(hw.subject_id)} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* All-caught-up message when filtered list is empty but data exists */}
            {totalPending === 0 && totalDone === 0 && (
              <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
                Nothing here in this view. Try another tab.
              </div>
            )}
          </>
        )}
      </div>

      {/* Submission flow for school exercises */}
      {submitting && studentProfile && (
        submitting.auto_marked && submitting.questions?.length ? (
          <ExerciseRunner
            exercise={submitting}
            studentProfile={studentProfile}
            existing={submissionFor(submitting.id)}
            onClose={() => setSubmitting(null)}
            onSubmitted={handleSubmittedSchool}
          />
        ) : (
          <SubmissionModal
            homework={submitting}
            studentProfile={studentProfile}
            existing={submissionFor(submitting.id)}
            onClose={() => setSubmitting(null)}
            onSubmitted={handleSubmittedSchool}
          />
        )
      )}

      <BottomNav active="homework" />
    </div>
  );
}

function TabBtn({ active, onClick, label, count, icon }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors ${
        active ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"
      }`}
    >
      {icon}
      {label}
      <span className={`text-[10px] font-bold px-1.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-secondary text-muted-foreground"}`}>
        {count}
      </span>
    </button>
  );
}

function SchoolHomeworkItem({ homework, submission, onAction }) {
  const status = submission?.status || "pending";
  const isGraded = status === "graded";
  const isSubmitted = status === "submitted" || status === "late";
  const meta = exerciseTypeMeta(homework.exercise_type);
  const hideAutoScore = homework.auto_marked && !homework.release_answers && isSubmitted;

  const statusBadge = isGraded
    ? { cls: "bg-emerald-500/10 text-emerald-600", label: `Graded · ${submission?.grade ?? "—"}%`, Icon: Award }
    : isSubmitted
    ? { cls: "bg-amber-500/10 text-amber-600", label: hideAutoScore ? "Submitted · Awaiting release" : status === "late" ? "Late · Awaiting grade" : "Awaiting grade", Icon: Clock }
    : { cls: "bg-rose-500/10 text-rose-600", label: "To do", Icon: AlertCircle };
  const Icon = statusBadge.Icon;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 relative">
      <span className="absolute -top-2 left-3 z-10 text-[10px] font-bold uppercase tracking-wide bg-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
        <SchoolIcon className="w-2.5 h-2.5" /> School
      </span>
      <div className="flex items-start justify-between gap-2 mt-1">
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