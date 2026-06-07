import { useEffect, useState } from "react";
import { useSubscription } from "@/lib/useSubscription";
import { useAuth } from "@/lib/AuthContext";

const PREVIEW_KEY = "zama_preview_as_free";

export function isPreviewingAsFree() {
  try { return localStorage.getItem(PREVIEW_KEY) === "1"; } catch { return false; }
}

export function setPreviewAsFree(enabled) {
  try {
    if (enabled) localStorage.setItem(PREVIEW_KEY, "1");
    else localStorage.removeItem(PREVIEW_KEY);
  } catch {}
  window.dispatchEvent(new Event("zama_preview_mode_changed"));
}

// Full access = active, trial, admin/staff, or a valid offline activation cache.
// Free/expired users stay in the app, but premium gates limit paid content.
export function usePlan() {
  const { user } = useAuth();
  const subStatus = useSubscription(user || null);
  const [previewFree, setPreviewFree] = useState(isPreviewingAsFree());

  useEffect(() => {
    const sync = () => setPreviewFree(isPreviewingAsFree());
    window.addEventListener("zama_preview_mode_changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("zama_preview_mode_changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (subStatus === null) {
    return {
      loading: true,
      isPremium: false,
      isFree: false,
      isTrial: false,
      isAdmin: false,
      isStaff: false,
      isExpired: false,
      isOfflineCached: false,
      offlineGraceDaysLeft: 0,
      activationStatus: "loading",
      isPreviewingAsFree: false,
    };
  }

  const isAdmin = !!subStatus.isAdmin || user?.role === "admin";
  const isStaff = !!subStatus.isStaff || user?.role === "teacher" || user?.role === "school_admin";
  const activationStatus = subStatus.activation_status || subStatus.status || (subStatus.active ? "active" : "free");
  const isTrial = activationStatus === "trial" || !!subStatus.isTrial;
  const isOfflineCached = activationStatus === "offline_cached" || !!subStatus.isOfflineCached;
  const isExpired = activationStatus === "expired" || !!subStatus.isExpired;

  // Admin preview-mode: force "free user" view for testing locked UI.
  if (isAdmin && previewFree) {
    return {
      loading: false,
      isPremium: false,
      isFree: true,
      isTrial: false,
      isAdmin: true,
      isStaff,
      isExpired: false,
      isOfflineCached: false,
      offlineGraceDaysLeft: 0,
      activationStatus: "free",
      isPreviewingAsFree: true,
    };
  }

  const isPremium =
    isAdmin ||
    isStaff ||
    activationStatus === "active" ||
    activationStatus === "trial" ||
    activationStatus === "offline_cached";
  const isFree = !isPremium;

  return {
    loading: false,
    isPremium,
    isFree,
    isTrial,
    isAdmin,
    isStaff,
    isExpired,
    isOfflineCached,
    offlineGraceDaysLeft: subStatus.offline_grace_days_left || 0,
    activationStatus,
    isPreviewingAsFree: false,
  };
}
