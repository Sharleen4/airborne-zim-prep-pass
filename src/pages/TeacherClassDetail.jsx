import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TeacherLayout from "@/components/teacher/TeacherLayout";
import { Loader2, TrendingDown, Award } from "lucide-react";
import ClassInvitePanel from "@/components/teacher/ClassInvitePanel";
import ClassAnnouncementsPanel from "@/components/teacher/ClassAnnouncementsPanel";

export default function TeacherClassDetail() {
  const { classId } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [classObj, setClassObj] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user || !classId) return;
    setLoading(true);
    Promise.all([
      base44.functions.invoke("getClassPerformance", { class_id: classId }).then(r => r.data).catch(e => { setErr(e.message || "Failed to load"); return null; }),
      base44.entities.SchoolClass.filter({ id: classId }, "-created_date", 1).then(l => l[0]).catch(() => null),
    ]).then(([perf, cls]) => {
      if (perf) setData(perf);
      if (cls) setClassObj(cls);
    }).finally(() => setLoading(false));
  }, [user, classId, reloadKey]);

  if (!user) return null;

  if (loading) {
    return (
      <TeacherLayout title="Loading..." showBack>
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </TeacherLayout>
    );
  }

  if (err || !data?.class) {
    return (
      <TeacherLayout title="Class" showBack>
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl">{err || "Class not found"}</div>
      </TeacherLayout>
    );
  }

  const { class: cls, students, average_score, top_performers, needs_intervention } = data;

  return (
    <TeacherLayout title={cls.name} subtitle={`${cls.grade} · ${students.length} students`} showBack>
      {classObj && (
        <ClassInvitePanel
          classObj={classObj}
          onClassUpdated={setClassObj}
          onStudentApproved={() => setReloadKey(k => k + 1)}
        />
      )}
      {classObj && <ClassAnnouncementsPanel classObj={classObj} teacher={user} />}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-4 mb-4">
        <p className="text-white/80 text-xs">Class Average</p>
        <p className="text-4xl font-extrabold">{average_score}%</p>
        <p className="text-white/70 text-xs mt-1">{students.length} students enrolled</p>
      </div>

      {top_performers.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-amber-500" />
            <p className="font-bold text-sm text-foreground">Top Performers</p>
          </div>
          <div className="space-y-1.5">
            {top_performers.map((s, i) => (
              <div key={s.email} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{i + 1}. {s.full_name}</span>
                <span className="font-bold text-emerald-600">{s.average}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {needs_intervention.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <p className="font-bold text-sm text-foreground">Needs Intervention</p>
          </div>
          <div className="space-y-1.5">
            {needs_intervention.map(s => (
              <div key={s.email} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{s.full_name}</span>
                <span className="font-bold text-rose-600">{s.average}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card rounded-2xl border border-border">
        <div className="px-4 py-3 border-b border-border">
          <p className="font-bold text-sm text-foreground">All Students</p>
        </div>
        {students.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">No students in this class.</p>
        ) : (
          <div className="divide-y divide-border">
            {students.map(s => (
              <div key={s.email} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{s.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.sessions_count} sessions</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${s.average >= 70 ? "text-emerald-600" : s.average >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                      {s.average}%
                    </p>
                  </div>
                </div>
                {s.weak_topics?.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    <TrendingDown className="w-3 h-3 inline mr-1" />
                    Weak: {s.weak_topics.slice(0, 3).join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}