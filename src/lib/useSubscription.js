import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  activationFromCache,
  cacheActivationIfAllowed,
  normalizeActivationStatus,
} from "@/lib/activationStatus";

export function useSubscription(user) {
  const [subStatus, setSubStatus] = useState(null); // null = loading, { active, ... }
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const refresh = () => setRefreshNonce((value) => value + 1);
    window.addEventListener("zama_activation_changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("zama_activation_changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setSubStatus(null);
      return;
    }
    const setAndCache = (rawStatus, source = "online") => {
      const normalized = normalizeActivationStatus(user, rawStatus, { source });
      cacheActivationIfAllowed(user, normalized);
      setSubStatus(normalized);
      return normalized;
    };

    if (user.__localOfflinePreview) {
      setAndCache({ active: true, isLocalOfflinePreview: true });
      return;
    }
    // Admins bypass subscription check
    if (user.role === "admin") {
      setAndCache({ active: true, isAdmin: true });
      return;
    }
    // Teachers & school admins bypass subscription check (for testing)
    if (user.role === "teacher" || user.role === "school_admin") {
      setAndCache({ active: true, isStaff: true });
      return;
    }



    // Safety timeout: if the function doesn't respond in 6s, use cached activation
    // within the offline grace period, otherwise fall back to limited free mode.
    const timeout = setTimeout(() => {
      setSubStatus(activationFromCache(user));
    }, 6000);

    base44.functions.invoke("checkSubscription", {})
      .then(res => {
        clearTimeout(timeout);
        setAndCache(res.data || {}, "online");
      })
      .catch(() => {
        clearTimeout(timeout);
        setSubStatus(activationFromCache(user));
      });

    return () => clearTimeout(timeout);
  }, [user?.email, user?.role, user?.__localOfflinePreview, refreshNonce]);

  return subStatus;
}
