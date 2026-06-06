import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isSchoolAdmin } from "@/lib/schoolRoles";
import { useActiveSchool } from "@/lib/useActiveSchool";
import SchoolAdminLayout from "@/components/school/SchoolAdminLayout";
import SchoolSwitcher from "@/components/school/SchoolSwitcher";
import SchoolSetupForm from "@/components/school/SchoolSetupForm";
import EditSchoolModal from "@/components/school/EditSchoolModal";
import CoAdminPanel from "@/components/school/CoAdminPanel";
import SchoolDeletionPanel from "@/components/school/SchoolDeletionPanel";
import StatTile from "@/components/school/StatTile";
import { Users, BookOpen, GraduationCap, ClipboardCheck, TrendingUp, Megaphone, Loader2, Pencil } from "lucide-react";

export default function SchoolAdminDashboard() {
  const { user } = useAuth();
  const { schools, school: activeSchool, activeSchoolId, setActiveSchoolId, loading: loadingSchool, reload: reloadSchools } = useActiveSchool(user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async () => {
    if (!activeSchoolId) { setData(null); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getSchoolAnalytics", { school_id: activeSchoolId });
      setData(res.data);
    } catch (e) {
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [activeSchoolId]);

  useEffect(() => {
    if (!user || loadingSchool) return;
    load();
  }, [user, loadingSchool, load]);

  if (!user) return null;

  if (!isSchoolAdmin(user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-bold text-foreground">School admin only</p>
          <p className="text-sm text-muted-foreground mt-2">
            Your account does not have access to the school admin module.
          </p>
        </div>
      </div>
    );
  }

  if (loading || loadingSchool) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // No school yet — show setup form
  if (!data?.school) {
    return (
      <SchoolAdminLayout title="Welcome" subtitle="Let's get your school set up">
        <SchoolSetupForm user={user} onCreated={() => { reloadSchools(); load(); }} />
      </SchoolAdminLayout>
    );
  }

  const { school, totals, homework_completion_rate, student_activity_rate, recent_announcements } = data;

  return (
    <SchoolAdminLayout title={school.name} subtitle={school.city || "Overview"} logoUrl={school.logo_url}>
      <SchoolSwitcher schools={schools} activeId={activeSchoolId} onChange={setActiveSchoolId} />
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {(school.approval_status || "pending") !== "approved" && (
        <div className={`rounded-2xl p-4 mb-4 border ${
          school.approval_status === "rejected"
            ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
            : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
        }`}>
          <p className="font-bold text-sm">
            {school.approval_status === "rejected" ? "School registration not approved" : "⏳ Awaiting super admin approval"}
          </p>
          <p className="text-xs mt-1">
            {school.approval_status === "rejected"
              ? (school.rejection_reason || "Please contact support for more information.")
              : "Your school has been submitted for review. You'll be able to add teachers, classes, and students once a super admin approves it. You'll be notified by email."}
          </p>
        </div>
      )}

      {/* Edit school info */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowEdit(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/5 px-3 py-1.5 rounded-lg"
        >
          <Pencil className="w-3.5 h-3.5" /> Edit school details
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Total Students" value={totals.students} icon={<GraduationCap className="w-5 h-5" />} accent="bg-violet-500/10 text-violet-600" />
        <StatTile label="Total Teachers" value={totals.teachers} icon={<Users className="w-5 h-5" />} accent="bg-blue-500/10 text-blue-600" />
        <StatTile label="Total Classes" value={totals.classes} icon={<BookOpen className="w-5 h-5" />} accent="bg-emerald-500/10 text-emerald-600" />
        <StatTile label="Active Homework" value={totals.homework || 0} icon={<ClipboardCheck className="w-5 h-5" />} accent="bg-amber-500/10 text-amber-600" />
      </div>

      {/* Rates */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Homework Completion</p>
          <p className="text-3xl font-extrabold text-foreground mt-1">{homework_completion_rate}%</p>
          <div className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${homework_completion_rate}%` }} />
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Student Activity</p>
          <p className="text-3xl font-extrabold text-foreground mt-1">{student_activity_rate}%</p>
          <div className="h-2 bg-secondary rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-violet-500" style={{ width: `${student_activity_rate}%` }} />
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link to="/school-admin/teachers" className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-4 hover:shadow-lg transition-all">
          <Users className="w-6 h-6 mb-2" />
          <p className="font-bold text-sm">Manage Teachers</p>
          <p className="text-white/70 text-xs">Add &amp; assign teachers</p>
        </Link>
        <Link to="/school-admin/classes" className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-4 hover:shadow-lg transition-all">
          <BookOpen className="w-6 h-6 mb-2" />
          <p className="font-bold text-sm">Manage Classes</p>
          <p className="text-white/70 text-xs">Create &amp; organise classes</p>
        </Link>
        <Link to="/school-admin/students" className="bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl p-4 hover:shadow-lg transition-all">
          <GraduationCap className="w-6 h-6 mb-2" />
          <p className="font-bold text-sm">Manage Students</p>
          <p className="text-white/70 text-xs">Enrol &amp; assign to classes</p>
        </Link>
        <Link to="/school-admin/reports" className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-4 hover:shadow-lg transition-all">
          <TrendingUp className="w-6 h-6 mb-2" />
          <p className="font-bold text-sm">Reports</p>
          <p className="text-white/70 text-xs">School performance</p>
        </Link>
      </div>

      {/* Announcements */}
      <div className="mt-5 bg-card rounded-2xl border border-border">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            <p className="font-bold text-sm text-foreground">Recent Announcements</p>
          </div>
          {recent_announcements?.length > 0 && (
            <span className="text-xs text-muted-foreground font-semibold">{recent_announcements.length} total</span>
          )}
        </div>
        {!recent_announcements?.length ? (
          <div className="p-5 text-center text-sm text-muted-foreground">No announcements yet</div>
        ) : (
          <div className="divide-y divide-border">
            {recent_announcements.slice(0, 3).map(a => (
              <div key={a.id} className="px-4 py-3">
                <p className="font-bold text-sm text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin team management */}
      <div className="mt-5">
        <CoAdminPanel school={school} currentUserEmail={user.email} onChanged={load} />
      </div>

      {/* Deletion / recycle-bin controls */}
      <div className="mt-4">
        <SchoolDeletionPanel school={school} currentUserEmail={user.email} onChanged={load} />
      </div>

      {showEdit && (
        <EditSchoolModal
          school={school}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
        />
      )}
    </SchoolAdminLayout>
  );
}