import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useActiveChild } from "@/lib/ActiveChildContext";
import { base44 } from "@/api/base44Client";
import RolePicker from "./RolePicker";
import RoleSetupStep from "./RoleSetupStep";
import TourStep from "./TourStep";

const STORAGE_KEY = "zama_onboarding_completed";

// Onboarding rollout date — any user whose account was created BEFORE this date
// is treated as an existing member and will NEVER see the wizard.
// Only brand-new sign-ups from this date forward get onboarded.
const ONBOARDING_ROLLOUT_DATE = new Date("2026-05-01T00:00:00Z");

// Roles that need explicit onboarding. "admin" is the platform admin and is skipped.
const ONBOARDING_ROLES = ["parent", "teacher", "school_admin", "student", "user"];

// Roles that are treated as parent-style (default + parent).
const isParentLike = (role) => role === "parent" || role === "user" || !role;

// True if this user existed before we shipped the onboarding wizard.
function isExistingMember(user) {
  if (!user?.created_date) return false;
  const created = new Date(user.created_date);
  if (isNaN(created.getTime())) return false;
  return created < ONBOARDING_ROLLOUT_DATE;
}

// Where to route the user once they finish onboarding.
function homePathForRole(role) {
  if (role === "school_admin") return "/school-admin";
  if (role === "teacher") return "/teacher";
  return "/home";
}

/**
 * Full onboarding wizard:
 *   Step 1 — Role picker (only if user has no role / default "user")
 *   Step 2 — Role-specific setup (add child, set up school, etc.)
 *   Step 3 — Quick tour of key features
 *
 * Shown once per user. Completion is persisted both to localStorage (fast)
 * and to the user record via `onboarding_completed: true` (durable across devices).
 */
export default function OnboardingWizard() {
  const { user, isAuthenticated } = useAuth();
  const { childProfiles, loading: loadingChildren } = useActiveChild();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState(user?.role || "");
  const [closed, setClosed] = useState(false);
  // Latch the decision once on mount so the wizard doesn't auto-close mid-flow
  // (e.g. when the parent finishes adding their first child and childProfiles.length flips to 1).
  const [latchedOpen, setLatchedOpen] = useState(null);

  // Decide whether the wizard should appear at all.
  const localDone = (() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  })();

  const userDone = !!user?.onboarding_completed;

  // A parent-like user who already has a child is treated as "set up" — don't bother them.
  const parentAlreadySetUp = isParentLike(user?.role) && !loadingChildren && childProfiles.length > 0;

  // Existing members (account created before the onboarding rollout) never see the wizard.
  // We also silently flag them as completed so the check is cheap on future loads.
  const existingMember = isExistingMember(user);
  useEffect(() => {
    if (existingMember && !user?.onboarding_completed) {
      base44.auth.updateMe({ onboarding_completed: true }).catch(() => {});
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    }
  }, [existingMember, user?.onboarding_completed]);

  const wantsToShow =
    isAuthenticated &&
    user &&
    user.role !== "admin" &&
    !closed &&
    !localDone &&
    !userDone &&
    !existingMember &&
    !parentAlreadySetUp;

  // Latch once the user/child data has resolved.
  useEffect(() => {
    if (latchedOpen !== null) return;
    if (!user) return;
    if (isParentLike(user.role) && loadingChildren) return; // wait for child data
    setLatchedOpen(wantsToShow);
  }, [user, loadingChildren, latchedOpen, wantsToShow]);

  const shouldShow = latchedOpen === true && !closed;

  // Start at step 1 if role isn't set yet, otherwise jump straight to setup (step 2).
  useEffect(() => {
    if (latchedOpen !== true) return;
    if (user?.role && user.role !== "user") {
      setRole(user.role);
      setStep(2);
    } else {
      setStep(1);
    }
    // We only want this to run once when the wizard latches open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latchedOpen]);

  // Mark onboarding complete & close the wizard. Used by both:
  // - The final Tour step's "Start using Zama" button (navigates home for the role).
  // - Step 2 Link CTAs (teacher/school_admin) that navigate the user away themselves
  //   — in that case we don't want the wizard to redirect on top of their navigation.
  const finish = async ({ skipNavigate = false } = {}) => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    try { await base44.auth.updateMe({ onboarding_completed: true }); } catch {}
    setClosed(true);
    if (!skipNavigate) navigate(homePathForRole(role));
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen flex items-start sm:items-center justify-center p-4 py-8">
        <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-xl p-5 sm:p-6 space-y-5">
          <ProgressBar step={step} total={3} />

          {step === 1 && (
            <RolePicker
              onPicked={(r) => { setRole(r); setStep(2); }}
            />
          )}

          {step === 2 && (
            <RoleSetupStep
              role={role}
              onCompleted={() => setStep(3)}
              onSkip={() => setStep(3)}
              onFinishAndLeave={() => finish({ skipNavigate: true })}
            />
          )}

          {step === 3 && (
            <TourStep role={role} onDone={() => finish()} />
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ step, total }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              done ? "bg-primary" : active ? "bg-primary/60" : "bg-secondary"
            }`}
          />
        );
      })}
    </div>
  );
}

// Convenience export for App.jsx
export { ONBOARDING_ROLES };