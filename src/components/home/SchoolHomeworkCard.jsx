import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ClipboardList, ChevronRight, Loader2 } from "lucide-react";

// Shows the active child's pending school homework on Home.
// Hidden if the child is not linked to a school class.
export default function SchoolHomeworkCard({ activeChild, userEmail }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    if (!activeChild || !userEmail) { setLoading(false); return; }
    (async () => {
      try {
        // Find this child's student profile (linked via child_profile_id OR parent_email + name)
        const byChildId = await base44.entities.StudentProfile.filter(
          { child_profile_id: activeChild.id, is_active: true }, "-created_date", 1
        );
        let p = byChildId[0];
        if (!p) {
          const byParent = await base44.entities.StudentProfile.filter(
            { parent_email: userEmail, full_name: activeChild.child_name, is_active: true }, "-created_date", 1
          );
          p = byParent[0];
        }
        if (!p?.class_id) { setLoading(false); return; }
        setProfile(p);

        const [homework, submissions] = await Promise.all([
          base44.entities.SchoolHomework.filter({ class_id: p.class_id, is_active: true }, "-due_date", 20),
          base44.entities.HomeworkSubmission.filter({ student_email: p.user_email || userEmail }, "-created_date", 100).catch(() => []),
        ]);

        const submittedIds = new Set(submissions.filter(s => s.status !== "pending").map(s => s.homework_id));
        const open = homework.filter(h => !submittedIds.has(h.id));
        setPending(open);
      } catch (e) {
        console.warn("[SchoolHomeworkCard]", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeChild?.id, userEmail]);

  if (loading) return null;
  if (!profile) return null; // child not linked to a school

  return (
    <Link
      to="/homework?tab=school"
      className="block bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl px-4 py-3 flex items-center gap-3 text-white shadow-md hover:shadow-lg transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
        <ClipboardList className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">School Exercises</p>
        <p className="text-white/80 text-xs">
          {pending.length > 0 ? `${pending.length} pending — tap to view` : "All caught up ✨"}
        </p>
      </div>
      {pending.length > 0 && (
        <span className="bg-white text-emerald-700 text-xs font-extrabold px-2 py-0.5 rounded-full flex-shrink-0">
          {pending.length}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-white/70 flex-shrink-0" />
    </Link>
  );
}