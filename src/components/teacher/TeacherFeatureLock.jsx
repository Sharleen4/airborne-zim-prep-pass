import { Link } from "react-router-dom";
import { Lock, Clock, ArrowLeft, Compass } from "lucide-react";

/**
 * Friendly "locked" screen shown on teacher feature pages (classes, homework,
 * reports, schedule) when the teacher hasn't been allocated to a school / class yet.
 *
 * Tells them what they're waiting for and offers safe places they CAN go:
 *   - Back to the teacher dashboard
 *   - Browse the curriculum (read-only, doesn't require a school)
 */
export default function TeacherFeatureLock({ feature = "This feature", hasProfile = false }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
        <Lock className="w-7 h-7" />
      </div>
      <h2 className="font-bold text-foreground text-lg">{feature} is locked</h2>
      <p className="text-sm text-muted-foreground mt-1">
        {hasProfile
          ? "You're linked to a school, but haven't been assigned to a class yet. Your school admin needs to assign you to a class before you can use this."
          : "Your school admin needs to add you to their school before you can use this. Once added, everything unlocks automatically."}
      </p>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mt-4 flex items-start gap-2 text-left">
        <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          Share your registered email with your school admin so they can add you.
        </p>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <Link
          to="/teacher"
          className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <Link
          to="/curriculum-explorer"
          className="w-full border border-border text-foreground font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <Compass className="w-4 h-4" /> Browse curriculum
        </Link>
      </div>
    </div>
  );
}