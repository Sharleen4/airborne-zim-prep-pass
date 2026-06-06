import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Returns the teacher's allocation status:
 *   - loading: true while we look up the TeacherProfile
 *   - hasProfile: true if a TeacherProfile exists for this teacher (= linked to a school)
 *   - hasClasses: true if at least one active SchoolClass is assigned to them
 *   - allocated: shorthand for hasProfile && hasClasses
 *
 * Admins are treated as fully allocated so they can preview teacher pages.
 */
export function useTeacherAllocation(user) {
  const [state, setState] = useState({
    loading: true,
    hasProfile: false,
    hasClasses: false,
    allocated: false,
  });

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") {
      setState({ loading: false, hasProfile: true, hasClasses: true, allocated: true });
      return;
    }
    if (user.role !== "teacher") {
      setState({ loading: false, hasProfile: false, hasClasses: false, allocated: false });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profiles = await base44.entities.TeacherProfile.filter(
          { user_email: user.email, is_active: true },
          "-created_date",
          1
        );
        const hasProfile = profiles.length > 0;
        let hasClasses = false;
        if (hasProfile) {
          const classes = await base44.entities.SchoolClass.filter(
            { teacher_email: user.email, is_active: true },
            "-created_date",
            1
          );
          hasClasses = classes.length > 0;
        }
        if (!cancelled) {
          setState({
            loading: false,
            hasProfile,
            hasClasses,
            allocated: hasProfile && hasClasses,
          });
        }
      } catch {
        if (!cancelled) setState({ loading: false, hasProfile: false, hasClasses: false, allocated: false });
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return state;
}