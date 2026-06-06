import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Star, Zap, CheckCircle, Users, Loader2, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function FoundingOfferModal({ onClose, user }) {
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alreadyFounding, setAlreadyFounding] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.FoundingOffer.list(),
      user?.email
        ? base44.entities.Subscription.filter({ user_email: user.email, plan: "founding_2026", status: "active" }, "-created_date", 1)
        : Promise.resolve([]),
    ]).then(([offers, subs]) => {
      setOffer(offers[0] || null);
      setAlreadyFounding((subs || []).length > 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.email]);

  if (loading) return null;
  // Hide if the user has already claimed/paid the founding offer
  if (alreadyFounding) return null;
  // Founding offer is available across ALL grades
  if (!offer || !offer.is_active || offer.slots_used >= offer.total_slots) return null;

  const slotsLeft = offer.total_slots - offer.slots_used;
  const percentFilled = Math.round((offer.slots_used / offer.total_slots) * 100);

  const handleClaim = () => {
    onClose();
    navigate("/payment?tab=founding");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.22 }}
          className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 px-6 pt-8 pb-6 text-white relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="text-4xl mb-2">🎓</div>
            <h2 className="text-2xl font-extrabold leading-tight">2026 Founding Student Offer</h2>
            <p className="text-white/80 text-sm mt-1">Limited to the first {offer.total_slots} students only!</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Price */}
            <div className="flex items-end gap-2">
              <span className="text-5xl font-extrabold text-foreground">$7</span>
              <span className="text-muted-foreground text-sm pb-2">for the full 2026 year</span>
            </div>

            {/* Features */}
            <ul className="space-y-2">
              {[
                "All subjects & topics — any grade",
                "Unlimited practice questions",
                "Full mock exam simulations",
                "Progress tracking & insights",
                "Locked-in founding price forever",
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>



            {/* CTA */}
            <button
              onClick={handleClaim}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold py-4 rounded-2xl text-base shadow-md hover:opacity-90 transition-opacity"
            >
              🎓 Claim My Founding Spot — $7
            </button>

            <button onClick={onClose} className="w-full text-xs text-muted-foreground py-1 hover:text-foreground transition-colors">
              Maybe later
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}