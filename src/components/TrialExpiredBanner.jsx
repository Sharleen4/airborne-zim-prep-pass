import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

/**
 * Soft banner shown on the home page when a user's free trial has expired.
 * Expired-trial users keep full access to the home page and all free content —
 * this banner just nudges them toward a paid plan to unlock premium features.
 */
export default function TrialExpiredBanner() {
  if (typeof window === "undefined" || !window.__trialExpired) return null;

  return (
    <div className="mx-auto max-w-screen-md px-4 mt-3">
      <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Your free trial has ended</p>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
            You can keep using all free content. Upgrade to unlock premium topics & mock exams.
          </p>
        </div>
        <Link
          to="/payment"
          className="text-xs font-bold bg-amber-500 text-white px-3 py-2 rounded-xl flex-shrink-0 hover:opacity-90 transition-opacity"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}