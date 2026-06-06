import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Users, Loader2, Phone, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function FoundingOfferCard({ onPay, loading: payLoading, phone, setPhone, error, user }) {
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.FoundingOffer.list().then(offers => {
      setOffer(offers[0] || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  if (!offer || !offer.is_active) return (
    <div className="text-center py-8 text-muted-foreground text-sm">
      The founding student offer is no longer available.
    </div>
  );

  const slotsLeft = offer.total_slots - offer.slots_used;
  const isFull = slotsLeft <= 0;
  const percentFilled = Math.min(Math.round((offer.slots_used / offer.total_slots) * 100), 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-400/10 to-orange-500/10 border-2 border-amber-400 rounded-2xl overflow-hidden"
    >
      {/* Badge */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold text-center py-2 tracking-wide">
        🎓 LIMITED TIME — 2026 FOUNDING STUDENT OFFER
      </div>

      <div className="p-5 space-y-4">
        <div className="flex items-end gap-2">
          <span className="text-4xl font-extrabold text-foreground">$7</span>
          <span className="text-muted-foreground text-sm pb-1">/ full 2026 year</span>
        </div>

        <ul className="space-y-1.5">
          {[
            "All subjects — any grade (4–7)",
            "Practice questions & mock exams",
            "Progress tracking",
            "Founding student price — locked for life",
          ].map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>



        {isFull ? (
          <div className="w-full bg-muted text-muted-foreground text-center font-bold py-3 rounded-xl text-sm">
            All founding slots are filled
          </div>
        ) : (
          <button
            onClick={() => onPay("founding_2026")}
            disabled={!!payLoading}
            className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 bg-gradient-to-r from-amber-400 to-orange-500"
          >
            {payLoading === "founding_2026" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
            ) : (
              <>🎓 Pay $7 via EcoCash — Claim My Spot</>
            )}
          </button>
        )}

        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
      </div>
    </motion.div>
  );
}