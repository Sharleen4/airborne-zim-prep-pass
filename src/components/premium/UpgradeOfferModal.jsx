import { Link } from "react-router-dom";
import { X, Lock, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

// Reusable "Free vs Premium" upgrade modal shown when a free-plan user
// taps into a locked feature. Mirrors the conversion copy from product spec.
//
// Props:
//   featureName     — short name of the locked feature (e.g. "Mock Exams")
//   featureMessage  — one-line contextual hook (e.g. "Complete full ZIMSEC-style exams...")
//   onClose         — close the modal (returns user to free plan)
export default function UpgradeOfferModal({ featureName = "This feature", featureMessage, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: "max(0px, env(safe-area-inset-bottom))" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white px-5 pt-5 pb-6 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-white/80 text-[11px] uppercase tracking-wider font-bold">Premium feature</p>
              <h2 className="text-xl font-extrabold leading-tight">{featureName}</h2>
            </div>
          </div>
          {featureMessage && (
            <p className="text-sm text-white/90 mt-3 leading-snug">{featureMessage}</p>
          )}
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <div>
            <p className="font-bold text-foreground text-sm">Your free trial has ended.</p>
            <p className="text-sm text-muted-foreground mt-1">
              You can continue revising with free content or upgrade to unlock:
            </p>
          </div>

          <ul className="space-y-2 bg-secondary/40 rounded-2xl p-3.5">
            {[
              "All Subjects",
              "Unlimited Practice Questions",
              "Full Mock Exams",
              "Parent Dashboard & Homework Tools",
              "Detailed Progress Tracking",
              "AI Explanations",
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* Founding offer */}
          <div className="bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/30 rounded-2xl p-3.5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
              <Sparkles className="w-4 h-4" />
              <p className="text-[11px] uppercase tracking-wider font-bold">Founding Student Offer</p>
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="font-extrabold text-foreground text-base">$7 for the entire 2026 school year</p>
            <p className="text-xs text-muted-foreground line-through">Normally $30/year</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={onClose}
              className="border border-border text-foreground font-semibold py-3 rounded-xl text-sm hover:bg-secondary"
            >
              Continue Free
            </button>
            <Link
              to="/activation"
              onClick={onClose}
              className="border border-primary/40 text-primary font-bold py-3 rounded-xl text-sm text-center hover:bg-primary/5"
            >
              Enter Code
            </Link>
            <Link
              to="/payment"
              onClick={onClose}
              className="bg-primary text-white font-bold py-3 rounded-xl text-sm text-center hover:bg-primary/90"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
