import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TeacherLayout from "@/components/teacher/TeacherLayout";
import { Loader2, TrendingDown, AlertTriangle, BookOpen } from "lucide-react";

export default function TeacherTopicTrends() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(params.get("class_id") || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user) return;
    base44.entities.SchoolClass.filter({ teacher_email: user.email, is_active: true }, "-created_date", 100)
      .then(list => {
        setClasses(list);
        if (!selectedClass && list[0]) setSelectedClass(list[0].id);
      });
  }, [user]);

  useEffect(() => {
    if (!selectedClass) return;
    setParams({ class_id: selectedClass });
    setLoading(true);
    setErr("");
    base44.functions.invoke("getClassTopicTrends", { class_id: selectedClass })
      .then(res => setData(res.data))
      .catch(e => setErr(e.message || "Failed to load trends"))
      .finally(() => setLoading(false));
  }, [selectedClass]);

  if (!user) return null;

  return (
    <TeacherLayout title="Topic Trends" subtitle="Class-wide weak topics" showBack>
      {classes.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
          You have no classes yet.
        </div>
      ) : (
        <>
          <select
            value={selectedClass}
            onChange={e => setSelectedClass(e.target.value)}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground mb-3"
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} · {c.grade}</option>)}
          </select>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : err ? (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl">{err}</div>
          ) : !data || data.subjects.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground">No quiz data yet</p>
              <p className="text-xs text-muted-foreground mt-1">Once students complete quizzes, weak topics will show here.</p>
            </div>
          ) : (
            <>
              {data.weakest.length > 0 && (
                <div className="bg-gradient-to-br from-rose-500 to-orange-500 text-white rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <p className="font-bold text-sm">Topics needing re-teaching</p>
                  </div>
                  <div className="space-y-1.5">
                    {data.weakest.map(w => (
                      <div key={w.topic_id} className="flex items-center justify-between bg-white/15 rounded-lg px-3 py-1.5">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{w.topic_name}</p>
                          <p className="text-[10px] text-white/80 uppercase">{w.subject_name} · {w.attempts} attempts</p>
                        </div>
                        <span className="font-extrabold text-lg flex-shrink-0">{w.avg_score}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.subjects.map(s => (
                <div key={s.subject_id} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-sm text-foreground">{s.subject_name}</h3>
                    <span className="ml-auto text-[10px] font-bold uppercase bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                      {s.topics.length} topics
                    </span>
                  </div>
                  <div className="bg-card rounded-2xl border border-border overflow-hidden">
                    {s.topics.map((t, i) => (
                      <div key={t.topic_id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{t.topic_name}</p>
                          <p className="text-[11px] text-muted-foreground">{t.students} students · {t.attempts} attempts</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className={`font-extrabold text-base ${t.weak ? "text-destructive" : t.avg_score >= 80 ? "text-emerald-600" : "text-foreground"}`}>
                            {t.avg_score}%
                          </p>
                          {t.weak && (
                            <span className="text-[10px] font-bold uppercase text-destructive inline-flex items-center gap-0.5">
                              <TrendingDown className="w-2.5 h-2.5" /> Weak
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </TeacherLayout>
  );
}