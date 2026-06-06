import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useSubscription(user) {
  const [subStatus, setSubStatus] = useState(null); // null = loading, { active, ... }

  useEffect(() => {
    if (!user) return;
    // Admins bypass subscription check
    if (user.role === "admin") {
      setSubStatus({ active: true, isAdmin: true });
      return;
    }
    // Teachers & school admins bypass subscription check (for testing)
    if (user.role === "teacher" || user.role === "school_admin") {
      setSubStatus({ active: true, isStaff: true });
      return;
    }



    // Safety timeout: if the function doesn't respond in 6s, grant access from cache
    const timeout = setTimeout(() => {
      try {
        const cached = localStorage.getItem("zama_sub_status");
        if (cached) setSubStatus(JSON.parse(cached));
        else setSubStatus({ active: true, isTrial: true, days_left: 14 }); // fail open
      } catch {
        setSubStatus({ active: true, isTrial: true, days_left: 14 });
      }
    }, 6000);

    base44.functions.invoke("checkSubscription", {})
      .then(res => {
        clearTimeout(timeout);
        setSubStatus(res.data);
        try { localStorage.setItem("zama_sub_status", JSON.stringify(res.data)); } catch {}
      })
      .catch(() => {
        clearTimeout(timeout);
        // On error, try cache first, then fail open
        try {
          const cached = localStorage.getItem("zama_sub_status");
          if (cached) setSubStatus(JSON.parse(cached));
          else setSubStatus({ active: true });
        } catch {
          setSubStatus({ active: true });
        }
      });

    return () => clearTimeout(timeout);
  }, [user?.email]);

  return subStatus;
}