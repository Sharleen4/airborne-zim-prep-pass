import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TeacherLayout from "@/components/teacher/TeacherLayout";
import StatTile from "@/components/school/StatTile";
import { BookOpen, Users, ClipboardList, AlertCircle, Loader2, ChevronRight, DollarSign, Compass, BookmarkCheck, Calendar, History } from "lucide-react";

export default function TeacherHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentLessons, setRecentLessons] = useState([]);
  const [lessonTotal, setLessonTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    base44.functions.invoke("getTeacherDashboard", {})
      .then(res => setData(res.data))
      .catch(e => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false));

    // Load the teacher's lesson history (most recent first)
    base44.entities.SavedLesson
      .filter({ teacher_email: user.email, is_active: true }, "-created_date", 200)
      .then(list => {
        setRecentLessons(list.slice(0, 3));
        setLessonTotal(list.length);
      })
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  if (user.role !== "teacher" && user.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-foreground">Teacher Access Only</h1>
        <p className="text-muted-foreground mt-2 text-sm">This page is for teachers. Contact your school admin to be enrolled.</p>
        <Link to="/home" className="mt-4 text-primary font-semibold text-sm underline">Go Home</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <TeacherLayout title="Loading..." subtitle="">
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </TeacherLayout>
    );
  }

  if (!data?.profile) {
    return (
      <TeacherLayout title={user.full_name || "Teacher"} subtitle="Not yet linked to a school">
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
          <p className="font-semibold text-foreground">Awaiting school assignment</p>
          <p className="text-sm text-muted-foreground mt-1">
            Ask your school administrator to add you to their school. Once added you'll see classes and homework here.
          </p>
          <Link to="/teacher-dashboard" className="mt-4 inline-flex items-center gap-2 text-primary font-semibold text-sm">
            <DollarSign className="w-4 h-4" /> View referral earnings
          </Link>
        </div>
      </TeacherLayout>
    );
  }

  const { school, classes, recent_homework, totals } = data;

  return (
    <TeacherLayout title={user.full_name || "Teacher"} subtitle={school?.name}>
      {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl mb-3">{error}</div>}

      {/* Curriculum Explorer shortcut */}
      <Link to="/curriculum-explorer" className="block bg-gradient-to-r from-violet-600 to-primary text-white rounded-2xl p-4 mb-3 flex items-center gap-3 shadow-md hover:shadow-lg transition-all">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Compass className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Curriculum Explorer</p>
          <p className="text-white/80 text-xs">Browse syllabus & generate AI lesson plans</p>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0" />
      </Link>

      {/* Stats grid — moved to top for quick at-a-glance overview */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <StatTile label="My Classes" value={totals.classes} icon={<BookOpen className="w-5 h-5" />} accent="bg-emerald-500/10 text-emerald-600" />
        <StatTile label="Students" value={totals.students} icon={<Users className="w-5 h-5" />} accent="bg-violet-500/10 text-violet-600" />
        <StatTile label="Active Homework" value={totals.homework} icon={<ClipboardList className="w-5 h-5" />} accent="bg-amber-500/10 text-amber-600" />
        <StatTile label="Pending Reviews" value={totals.pending_submissions} icon={<AlertCircle className="w-5 h-5" />} accent="bg-rose-500/10 text-rose-600" />
      </div>

      {/* My Saved Lessons shortcut */}
      <Link to="/teacher/lessons" className="block bg-card border border-border rounded-2xl p-4 mb-2 flex items-center gap-3 hover:border-primary/30 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
          <BookmarkCheck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">My Saved Lessons</p>
          <p className="text-xs text-muted-foreground">Lessons you've saved — ready to deliver</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </Link>

      {/* My Lesson History — quick preview of recently generated/saved lesson plans */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <History className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">My Lesson History</p>
            <p className="text-[11px] text-muted-foreground">
              {lessonTotal > 0 ? `${lessonTotal} lesson plan${lessonTotal !== 1 ? "s" : ""} generated` : "No lessons generated yet"}
            </p>
          </div>
          {lessonTotal > 0 && (
            <Link to="/teacher/lessons" className="text-xs font-semibold text-primary flex items-center flex-shrink-0">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {recentLessons.length === 0 ? (
          <Link to="/curriculum-explorer" className="block text-center bg-secondary/40 rounded-xl py-3 text-xs text-muted-foreground hover:bg-secondary transition-colors">
            Generate your first lesson plan from the Curriculum Explorer →
          </Link>
        ) : (
          <div className="space-y-1.5">
            {recentLessons.map(l => (
              <Link
                key={l.id}
                to="/teacher/lessons"
                className="block bg-secondary/30 rounded-xl px-3 py-2 hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{l.lesson_title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {l.subject} · {l.grade}
                    {l.created_date ? ` · ${new Date(l.created_date).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Lesson Schedule shortcut */}
      <Link to="/teacher/schedule" className="block bg-card border border-border rounded-2xl p-4 mb-3 flex items-center gap-3 hover:border-primary/30 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">Lesson Schedule</p>
          <p className="text-xs text-muted-foreground">Calendar view of lessons assigned to classes</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </Link>

      {/* My Classes */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-foreground">My Classes</h2>
          <Link to="/teacher/classes" className="text-xs text-primary font-semibold flex items-center">View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {classes.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
            You have not been assigned to any classes yet.
          </div>
        ) : (
          <div className="space-y-2">
            {classes.slice(0, 4).map(c => (
              <Link to={`/teacher/classes/${c.id}`} key={c.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 hover:border-primary/30 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-lg">📚</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.grade} · {c.student_emails?.length || 0} students</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent homework */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold text-foreground">Recent Homework</h2>
          <Link to="/teacher/homework" className="text-xs text-primary font-semibold flex items-center">Manage <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {recent_homework.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
            No homework yet.
            <Link to="/teacher/homework" className="block mt-2 text-primary font-semibold">Create your first one →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recent_homework.slice(0, 3).map(h => (
              <div key={h.id} className="bg-card rounded-2xl border border-border p-4">
                <p className="font-bold text-sm text-foreground truncate">{h.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Due {h.due_date}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}