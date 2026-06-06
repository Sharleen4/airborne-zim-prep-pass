import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TeacherLayout from "@/components/teacher/TeacherLayout";
import TeacherFeatureLock from "@/components/teacher/TeacherFeatureLock";
import { useTeacherAllocation } from "@/lib/useTeacherAllocation";
import ExerciseFormModal from "@/components/teacher/ExerciseFormModal";
import { exerciseTypeMeta } from "@/lib/exerciseHelpers";
import { Loader2, Plus, ClipboardList, Edit2, Trash2, Eye, Sparkles, Clock } from "lucide-react";
import SubjectGroupHeader, { groupBySubject } from "@/components/teacher/SubjectGroupHeader";
import useCollapsibleGroups from "@/hooks/useCollapsibleGroups";

export default function TeacherHomework() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const allocation = useTeacherAllocation(user);

  const load = useCallback(async () => {
    if (!user) return;
    if (!allocation.allocated && !allocation.loading) { setLoading(false); return; }
    setLoading(true);
    const profiles = await base44.entities.TeacherProfile.filter({ user_email: user.email, is_active: true }, "-created_date", 1);
    const p = profiles[0];
    setProfile(p);
    if (p) {
      const [cls, hw, subj] = await Promise.all([
        base44.entities.SchoolClass.filter({ teacher_email: user.email, is_active: true }, "-created_date", 100),
        base44.entities.SchoolHomework.filter({ teacher_email: user.email, is_active: true }, "-due_date", 100),
        base44.entities.Subject.filter({ is_active: true }, "name", 200),
      ]);
      setClasses(cls);
      setExercises(hw);
      setSubjects(subj);
    }
    setLoading(false);
  }, [user, allocation.allocated, allocation.loading]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this exercise? Students will no longer see it.")) return;
    await base44.entities.SchoolHomework.update(id, { is_active: false });
    await load();
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditing(null);
    load();
  };

  const classNameFor = (id) => classes.find(c => c.id === id)?.name || "—";
  const subjectNameFor = (id) => subjects.find(s => s.id === id)?.name || "Other";

  const groups = groupBySubject(exercises, h => subjectNameFor(h.subject_id));
  const { isExpanded, toggle, expandAll, collapseAll, allExpanded } = useCollapsibleGroups(groups);

  if (!user) return null;

  if (!allocation.loading && !allocation.allocated) {
    return (
      <TeacherLayout title="Exercises" subtitle="Locked" showBack>
        <TeacherFeatureLock feature="Exercises" hasProfile={allocation.hasProfile} />
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="Exercises" subtitle={`${exercises.length} active`} showBack>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !profile ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
          You're not linked to a school yet.
        </div>
      ) : (
        <>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            disabled={classes.length === 0}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 mb-4 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Create Exercise
          </button>

          {classes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center -mt-2 mb-3">You need at least one class to create exercises.</p>
          )}

          {exercises.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <ClipboardList className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground">No exercises yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create homework, quizzes, tests, mock exams and more.</p>
            </div>
          ) : (
            <div>
              {groups.length > 1 && (
                <div className="flex justify-end mb-1">
                  <button
                    onClick={allExpanded ? collapseAll : expandAll}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    {allExpanded ? "Collapse all" : "Expand all"}
                  </button>
                </div>
              )}
              {groups.map(group => (
                <div key={group.subject}>
                  <SubjectGroupHeader
                    subject={group.subject}
                    count={group.items.length}
                    expanded={isExpanded(group.subject)}
                    onToggle={() => toggle(group.subject)}
                  />
                  {isExpanded(group.subject) && (
                  <div className="space-y-2">
                    {group.items.map(h => {
                      const meta = exerciseTypeMeta(h.exercise_type);
                      return (
                        <div key={h.id} className="bg-card rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-secondary text-foreground px-2 py-0.5 rounded-full">
                            {meta.emoji} {meta.label}
                          </span>
                          {h.difficulty && h.difficulty !== "mixed" && (
                            <span className="text-[10px] font-bold uppercase bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full">{h.difficulty}</span>
                          )}
                          {h.auto_marked && (
                            <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> Auto-mark
                            </span>
                          )}
                          {h.duration_minutes && (
                            <span className="text-[10px] font-bold bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {h.duration_minutes}m
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-foreground text-sm">{h.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {classNameFor(h.class_id)} · Due {h.due_date}
                          {h.questions?.length ? ` · ${h.questions.length} Q` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Link to={`/teacher/homework/${h.id}/submissions`} className="flex-1 bg-secondary text-foreground text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" /> Submissions
                      </Link>
                      <button onClick={() => { setEditing(h); setShowForm(true); }} className="bg-secondary text-foreground text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1">
                        <Edit2 className="w-3 h-3" /> Edit{h.questions?.length ? ` · ${h.questions.length}Q` : ""}
                      </button>
                      <button onClick={() => handleDelete(h.id)} className="bg-destructive/10 text-destructive text-xs font-semibold py-2 px-3 rounded-lg">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
                    })}
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {showForm && (
            <ExerciseFormModal
              teacher={user}
              classes={classes}
              schoolId={profile.school_id}
              exercise={editing}
              onClose={() => { setShowForm(false); setEditing(null); }}
              onSaved={handleSaved}
            />
          )}
        </>
      )}
    </TeacherLayout>
  );
}