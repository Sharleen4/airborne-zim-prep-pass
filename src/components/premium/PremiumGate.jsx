import { useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { usePlan } from "@/lib/usePlan";
import UpgradeOfferModal from "@/components/premium/UpgradeOfferModal";

// Reusable Premium gate that wraps restricted features.
//
// Usage:
//   <PremiumGate featureName="Mock Exams" featureMessage="Complete full ZIMSEC-style exams...">
//     <MockExamPage />
//   </PremiumGate>
//
// Variants:
//   variant="full"   (default) — renders a full-page locked screen for free users
//   variant="inline" — renders a compact locked card (good for sections inside a page)
//   variant="modal"  — invisible by default; expose an `onLockedTap` callback via render prop
//                      (use the `gate()` helper below for click-based gating)
//
// Tip: if you only want to gate a click handler (not the whole UI), use the
// `useFeatureGate` hook below.
export default function PremiumGate({
  children,
  featureName = "Premium feature",
  featureMessage = "",
  variant = "full",
  fallback, // optional custom locked UI to render instead of default
}) {
  const { isPremium, loading } = usePlan();
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (isPremium) return children;

  // Free user — show locked UI
  if (fallback) {
    return (
      <>
        {fallback({ openUpgrade: () => setShowModal(true) })}
        {showModal && (
          <UpgradeOfferModal
            featureName={featureName}
            featureMessage={featureMessage}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  if (variant === "inline") {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-card border-2 border-dashed border-amber-400/50 rounded-2xl p-5 text-left flex items-center gap-3 hover:border-amber-400 hover:bg-amber-500/5 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground flex items-center gap-1">
              {featureName}
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </p>
            {featureMessage && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{featureMessage}</p>
            )}
          </div>
          <span className="text-xs font-bold text-primary flex-shrink-0">Upgrade</span>
        </button>
        {showModal && (
          <UpgradeOfferModal
            featureName={featureName}
            featureMessage={featureMessage}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  // Default: full-page locked screen
  return (
    <>
      <div className="min-h-screen bg-background font-jakarta flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center mb-5 shadow-lg">
          <Lock className="w-9 h-9" />
        </div>
        <p className="text-[11px] uppercase tracking-wider font-bold text-amber-600 mb-1">Premium feature</p>
        <h1 className="text-2xl font-extrabold text-foreground">{featureName}</h1>
        {featureMessage && (
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">{featureMessage}</p>
        )}
        <button
          onClick={() => setShowModal(true)}
          className="mt-6 bg-primary text-white font-bold px-6 py-3 rounded-xl text-sm"
        >
          See upgrade options
        </button>
        <p className="text-xs text-muted-foreground mt-4">Free trial ended? You can keep using free content anytime.</p>
      </div>
      {showModal && (
        <UpgradeOfferModal
          featureName={featureName}
          featureMessage={featureMessage}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// Hook for gating a click handler (e.g. "Assign Homework" button).
// Returns:
//   { isPremium, gate, modal }
// - Call gate(actionFn) to wrap a handler — premium users run the action,
//   free users see the upgrade modal.
// - Render {modal} once in your component tree.
export function useFeatureGate({ featureName, featureMessage } = {}) {
  const { isPremium, loading } = usePlan();
  const [open, setOpen] = useState(false);

  const gate = (action) => (...args) => {
    if (isPremium) return action?.(...args);
    setOpen(true);
  };

  const modal = open ? (
    <UpgradeOfferModal
      featureName={featureName || "Premium feature"}
      featureMessage={featureMessage}
      onClose={() => setOpen(false)}
    />
  ) : null;

  return { isPremium, loading, gate, modal, openUpgrade: () => setOpen(true) };
}