import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isSchoolAdmin } from "@/lib/schoolRoles";
import { useActiveSchool } from "@/lib/useActiveSchool";
import SchoolAdminLayout from "@/components/school/SchoolAdminLayout";
import SchoolSwitcher from "@/components/school/SchoolSwitcher";
import StatTile from "@/components/school/StatTile";
import { Loader2, TrendingUp, ClipboardCheck, Activity, Users } from "lucide-react";

export default function SchoolAdminReports() {
  const { user } = useAuth();
  const { schools, activeSchoolId, setActiveSchoolId, loading: loadingSchool } = useActiveSchool(user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || loadingSchool) return;
    setLoading(true);
    base44.functions.invoke("getSchoolAnalytics", activeSchoolId ? { school_id: activeSchoolId } : {})
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, [user, loadingSchool, activeSchoolId]);

  if (!user || !isSchoolAdmin(user)) return null;

  return (
    <SchoolAdminLayout title="Reports" subtitle={data?.school ? `${data.school.name}` : "School performance overview"} showBack>
      <SchoolSwitcher schools={schools} activeId={activeSchoolId} onChange={setActiveSchoolId} />
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !data?.school ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
          Create your school profile to view reports.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Homework Completion" value={`${data.homework_completion_rate}%`} icon={<ClipboardCheck className="w-5 h-5" />} accent="bg-emerald-500/10 text-emerald-600" />
            <StatTile label="Student Activity" value={`${data.student_activity_rate}%`} icon={<Activity className="w-5 h-5" />} accent="bg-violet-500/10 text-violet-600" />
            <StatTile label="Total Students" value={data.totals.students} icon={<Users className="w-5 h-5" />} accent="bg-blue-500/10 text-blue-600" />
            <StatTile label="Active Homework" value={data.totals.homework || 0} icon={<TrendingUp className="w-5 h-5" />} accent="bg-amber-500/10 text-amber-600" />
          </div>

          <div className="mt-4 bg-card rounded-2xl border border-border p-5">
            <p className="font-bold text-foreground mb-2">How to read these metrics</p>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-4">
              <li><b>Homework completion</b> = submissions received / (homework × students per class).</li>
              <li><b>Student activity</b> = students who logged in within the last 7 days.</li>
              <li>Detailed per-class &amp; per-teacher reports will appear here as teachers create homework and students submit work.</li>
            </ul>
          </div>
        </>
      )}
    </SchoolAdminLayout>
  );
}