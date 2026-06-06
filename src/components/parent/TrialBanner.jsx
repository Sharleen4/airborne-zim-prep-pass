import { Link } from "react-router-dom";
import { Clock, AlertTriangle, XCircle, CreditCard, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

/**
 * TrialBanner — shown inside ParentDashboard based on subscription status.
 * Props:
 *   subStatus: result of checkSubscription — { active, isTrial, days_left, trial_end_date }
 *   isExpired: boolean — trial ended and no paid sub
 */
export default function TrialBanner({ subStatus, isExpired }) {
  // Fully paid active sub — show nothing
  if (!subStatus || (subStatus.active && !subStatus.isTrial)) return null;

  // Trial expired / no subscription
  if (isExpired || (!subStatus.active && !subStatus.isTrial)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-700 dark:text-red-300 text-sm">Free trial expired</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              Your child's access to study materials, practice questions, and mock exams has been paused.
              Subscribe to restore full access.
            </p>
          </div>
        </div>
        <PayCTA label="Restore Access — Subscribe Now" highlight />
      </motion.div>
    );
  }

  const days = subStatus.days_left ?? 0;
  const isUrgent = days <= 2;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 border space-y-3 ${
        isUrgent
          ? "bg-orange-50 dark:bg-orange-500/10 border-orange-300 dark:border-orange-500/30"
          : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isUrgent ? "bg-orange-100 dark:bg-orange-500/20" : "bg-amber-100 dark:bg-amber-500/20"}`}>
          {isUrgent
            ? <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            : <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          }
        </div>
        <div className="flex-1">
          <p className={`font-bold text-sm ${isUrgent ? "text-orange-700 dark:text-orange-300" : "text-amber-700 dark:text-amber-300"}`}>
            {days === 1
              ? "⚠️ Last day of free trial!"
              : days === 0
              ? "⚠️ Trial expires today!"
              : `Free trial — ${days} day${days !== 1 ? "s" : ""} remaining`}
          </p>
          <p className={`text-xs mt-0.5 ${isUrgent ? "text-orange-600 dark:text-orange-400" : "text-amber-600 dark:text-amber-400"}`}>
            {subStatus.trial_end_date
              ? `Trial ends ${new Date(subStatus.trial_end_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`
              : ""}{" "}
            Subscribe to keep uninterrupted access.
          </p>
        </div>
      </div>

      {/* Plan options — quick CTA */}
      <div className="grid grid-cols-2 gap-2">
        <PlanButton plan="quarterly" label="Termly" price="$8" />
        <PlanButton plan="yearly_premium" label="Annual" price="$25" highlight />
      </div>
      <PayCTA label="View all plans →" />
    </motion.div>
  );
}

function PlanButton({ plan, label, price, highlight }) {
  return (
    <Link
      to={`/payment?plan=${plan}`}
      className={`flex flex-col items-center justify-center py-3 rounded-xl border text-sm font-bold transition-colors ${
        highlight
          ? "bg-primary text-white border-primary"
          : "bg-card text-foreground border-border hover:bg-secondary"
      }`}
    >
      <span className="text-base">{price}</span>
      <span className={`text-xs font-medium ${highlight ? "text-white/80" : "text-muted-foreground"}`}>{label}</span>
    </Link>
  );
}

function PayCTA({ label, highlight }) {
  return (
    <Link
      to="/payment"
      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors ${
        highlight
          ? "bg-red-600 text-white hover:bg-red-700"
          : "bg-card border border-border text-foreground hover:bg-secondary"
      }`}
    >
      <CreditCard className="w-4 h-4" />
      {label}
      <ChevronRight className="w-3.5 h-3.5 ml-auto" />
    </Link>
  );
}