import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TeacherLayout from "@/components/teacher/TeacherLayout";
import TeacherFeatureLock from "@/components/teacher/TeacherFeatureLock";
import { useTeacherAllocation } from "@/lib/useTeacherAllocation";
import { Loader2, Users, ChevronRight, BookOpen } from "lucide-react";

export default function TeacherClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const allocation = useTeacherAllocation(user);

  useEffect(() => {
    if (!user) return;
    if (!allocation.allocated && !allocation.loading) { setLoading(false); return; }
    base44.entities.SchoolClass.filter({ teacher_email: user.email, is_active: true }, "-created_date", 200)
      .then(setClasses)
      .finally(() => setLoading(false));
  }, [user, allocation.allocated, allocation.loading]);

  if (!user) return null;

  if (!allocation.loading && !allocation.allocated) {
    return (
      <TeacherLayout title="My Classes" subtitle="Locked" showBack>
        <TeacherFeatureLock feature="Classes" hasProfile={allocation.hasProfile} />
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout title="My Classes" subtitle={`${classes.length} active`} showBack>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : classes.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="font-semibold text-foreground">No classes assigned</p>
          <p className="text-xs text-muted-foreground mt-1">Ask your school admin to assign you to classes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {classes.map(c => (
            <Link to={`/teacher/classes/${c.id}`} key={c.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 hover:border-primary/30 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-lg">📚</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>{c.grade}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {c.student_emails?.length || 0}</span>
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </TeacherLayout>
  );
}