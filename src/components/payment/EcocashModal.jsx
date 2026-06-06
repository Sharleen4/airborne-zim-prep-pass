import { useState } from "react";
import { X, Smartphone, Loader2, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function EcocashModal({ plan, onClose, onSuccess }) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [instructions, setInstructions] = useState(null);

  const handlePay = async () => {
    const cleaned = phone.replace(/\s/g, "");
    if (!cleaned) { setError("Please enter your phone number."); return; }
    setError(null);
    setLoading(true);
    try {
      const res = await base44.functions.invoke("initiatePaynowPayment", {
        plan,
        phone: cleaned,
        method: "ecocash",
        currency: "USD",
      });
      setInstructions(res.data.instructions || "Check your phone and approve the EcoCash payment.");
      onSuccess?.(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to initiate EcoCash payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full bg-card rounded-t-3xl p-6 space-y-5"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-600" />
            <h2 className="font-bold text-lg text-foreground">Pay via EcoCash</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {!instructions ? (
          <>
            <p className="text-sm text-muted-foreground">
              Enter your EcoCash number below. You'll receive a push notification to approve the payment.
            </p>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                EcoCash Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 0771234567"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>
            )}

            <button
              onClick={handlePay}
              disabled={loading || !phone.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : "Pay via EcoCash"}
            </button>
          </>
        ) : (
          <div className="text-center space-y-4 py-4">
            <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
            <h3 className="font-bold text-lg text-foreground">Payment Request Sent!</h3>
            <p className="text-sm text-muted-foreground">{instructions}</p>
            <button
              onClick={() => window.location.href = "/payment-return"}
              className="w-full bg-primary text-white font-bold py-3 rounded-xl"
            >
              I've Approved — Check Status
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}