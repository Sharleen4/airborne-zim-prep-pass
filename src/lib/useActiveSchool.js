import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const ACTIVE_SCHOOL_KEY = "zama_active_school_id";

/**
 * Loads every school the current user can administer (primary admin + co-admin)
 * and tracks which one is "active" across the school admin module.
 *
 * Persists the chosen school id in localStorage so navigating between
 * Dashboard / Teachers / Classes / Students / Reports / Profile always
 * operates on the SAME school — preventing cross-school data leakage.
 *
 * For platform super admins (role === "admin"), we load every school.
 */
export function useActiveSchool(user) {
  const [schools, setSchools] = useState([]);
  const [activeId, setActiveId] = useState(() => {
    try { return localStorage.getItem(ACTIVE_SCHOOL_KEY) || ""; } catch { return ""; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      let combined = [];
      if (user.role === "admin") {
        const all = await base44.entities.School.list("-created_date", 500);
        combined = all.filter(s => s.is_active !== false);
      } else {
        const [owned, coAdmin] = await Promise.all([
          base44.entities.School.filter({ school_admin_email: user.email, is_active: true }, "-created_date", 50),
          base44.entities.School.filter({ co_admin_emails: user.email, is_active: true }, "-created_date", 50),
        ]);
        // Deduplicate by id (in case a user is both primary and listed as co-admin).
        const seen = new Set();
        combined = [...owned, ...coAdmin].filter(s => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
      }
      setSchools(combined);

      // Decide the active school: prefer the stored id (if still accessible),
      // otherwise fall back to the first approved school, then the first one.
      const stored = (() => { try { return localStorage.getItem(ACTIVE_SCHOOL_KEY) || ""; } catch { return ""; } })();
      const storedSchool = stored ? combined.find(s => s.id === stored) : null;
      const fallback = combined.find(s => s.approval_status === "approved") || combined[0] || null;
      const next = storedSchool || fallback;
      setActiveId(next?.id || "");
      try {
        if (next?.id) localStorage.setItem(ACTIVE_SCHOOL_KEY, next.id);
        else localStorage.removeItem(ACTIVE_SCHOOL_KEY);
      } catch {}
    } catch (e) {
      setError(e?.message || "Could not load schools");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const setActiveSchoolId = useCallback((id) => {
    setActiveId(id);
    try {
      if (id) localStorage.setItem(ACTIVE_SCHOOL_KEY, id);
      else localStorage.removeItem(ACTIVE_SCHOOL_KEY);
    } catch {}
  }, []);

  const school = schools.find(s => s.id === activeId) || null;

  return { schools, school, activeSchoolId: activeId, setActiveSchoolId, loading, error, reload: load };
}

export { ACTIVE_SCHOOL_KEY };