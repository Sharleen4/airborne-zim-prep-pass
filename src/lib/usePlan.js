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

// Returns plan info for the current user:
//   { loading, isPremium, isFree, isTrial, isAdmin, isPreviewingAsFree }
// "Premium" = active paid subscription (not trial).
// "Free" = no active subscription OR currently on trial (trial users are nudged toward upgrade).
// Admins always count as premium for gating purposes — UNLESS the
// "Preview as free user" toggle is on (admin-only escape hatch for testing).
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
    return { loading: true, isPremium: false, isFree: false, isTrial: false, isAdmin: false, isPreviewingAsFree: false };
  }

  const isAdmin = !!subStatus.isAdmin || user?.role === "admin";

  // Admin preview-mode: force "free user" view for testing locked UI.
  if (isAdmin && previewFree) {
    return { loading: false, isPremium: false, isFree: true, isTrial: false, isAdmin: true, isPreviewingAsFree: true };
  }

  const isTrial = !!subStatus.isTrial;
  const isPremium = isAdmin || (!!subStatus.active && !isTrial);
  const isFree = !isPremium;

  return { loading: false, isPremium, isFree, isTrial, isAdmin, isPreviewingAsFree: false };
}