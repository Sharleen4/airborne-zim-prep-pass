import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { CheckCircle, Zap, Star, Crown, Users, Copy, CheckCircle2, Loader2, Gift, Phone, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import FoundingOfferCard from "@/components/founding/FoundingOfferCard";

// Individual paid plans (one child) — prices aligned with /pricing page
const INDIVIDUAL_PLANS = [
  {
    key: "monthly_premium",
    label: "Monthly",
    price: "$3",
    duration: "per month",
    badge: "Flexible",
    features: [
      "1 child profile",
      "Full ZIMSEC Grade 4–7 content",
      "Unlimited practice & mock exams",
      "AI-powered revision notes",
      "Email support",
    ],
    color: "from-orange-400 to-amber-500",
    icon: <Zap className="w-6 h-6 text-white" />,
    popular: false,
  },
  {
    key: "quarterly",
    label: "Termly",
    price: "$8",
    duration: "per term",
    badge: "🔥 Most Popular",
    features: [
      "1 child profile",
      "Everything in Monthly",
      "Save ~11% vs monthly",
      "Termly progress reports",
      "Priority email support",
    ],
    color: "from-blue-500 to-indigo-600",
    icon: <Star className="w-6 h-6 text-white" />,
    popular: false,
  },
  {
    key: "yearly_premium",
    label: "Annual",
    price: "$25",
    duration: "per year",
    badge: "💎 Best Value",
    features: [
      "1 child profile",
      "Everything in Termly",
      "Save ~30% vs monthly",
      "All future feature updates",
      "Priority email support",
    ],
    color: "from-primary to-violet-700",
    icon: <Crown className="w-6 h-6 text-white" />,
    popular: true,
  },
];

// Family plans (up to 4 children) — prices aligned with /pricing page
const FAMILY_PLANS = [
  {
    key: "family_quarterly",
    label: "Family Quarterly",
    price: "$15",
    duration: "per quarter",
    badge: "👨‍👩‍👧 Up to 4 kids",
    features: [
      "Up to 4 children",
      "All Premium features",
      "Individual progress per child",
      "One subscription, whole family",
    ],
    color: "from-emerald-500 to-teal-600",
    icon: <Users className="w-6 h-6 text-white" />,
    popular: false,
  },
  {
    key: "family_yearly",
    label: "Family Yearly",
    price: "$45",
    duration: "per year",
    badge: "💎 Best for families",
    features: [
      "Up to 4 children",
      "All Premium features",
      "Save ~25% vs quarterly",
      "Priority support",
    ],
    color: "from-emerald-600 to-green-700",
    icon: <Users className="w-6 h-6 text-white" />,
    popular: true,
  },
];

function PlanCard({ plan, onPay, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-card rounded-2xl border-2 shadow-md overflow-hidden ${
        plan.popular ? "border-primary" : "border-border"
      }`}
    >
      {plan.badge && (
        <div className={`text-white text-xs font-bold text-center py-1.5 tracking-wide bg-gradient-to-r ${plan.color}`}>
          {plan.badge}
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0`}>
            {plan.icon}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-base text-foreground">{plan.label}</h2>
            <p className="text-muted-foreground text-xs">{plan.duration} of access</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-foreground">{plan.price}</p>
          </div>
        </div>

        <ul className="space-y-1.5 mb-5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <button
          onClick={() => onPay(plan.key)}
          disabled={!!loading}
          className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-60 bg-gradient-to-r ${plan.color}`}
        >
          {loading === plan.key ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
          ) : (
            `Pay ${plan.price} via EcoCash`
          )}
        </button>
      </div>
    </motion.div>
  );
}

function ReferralSection() {
  const [referralData, setReferralData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    base44.functions.invoke("getReferralStatus", {})
      .then(res => setReferralData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!referralData?.referral_link) return;
    navigator.clipboard.writeText(referralData.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async () => {
    setClaiming(true);
    setClaimResult(null);
    try {
      const res = await base44.functions.invoke("claimReferralPremium", {});
      setClaimResult({ success: true, end_date: res.data.end_date });
      // Refresh referral data
      const fresh = await base44.functions.invoke("getReferralStatus", {});
      setReferralData(fresh.data);
    } catch (e) {
      setClaimResult({ success: false, error: e?.response?.data?.error || "Could not claim premium." });
    } finally {
      setClaiming(false);
    }
  };

  const completed = referralData?.completed || 0;
  const needed = 3;
  const progress = Math.min((completed / needed) * 100, 100);

  return (
    <div className="bg-card rounded-2xl border-2 border-yellow-400/50 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 px-5 py-3 flex items-center gap-2">
        <Gift className="w-5 h-5 text-white" />
        <p className="font-bold text-white text-sm">Invite 3 Friends → Unlock Premium FREE</p>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          Share your referral link. When 3 friends sign up, you get <strong className="text-foreground">1 month of Premium</strong> for free!
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Progress */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                <span className="flex items-center gap-1 text-foreground">
                  <Users className="w-3.5 h-3.5" />
                  {completed} / {needed} friends joined
                </span>
                {completed >= needed && (
                  <span className="text-yellow-600 font-bold">🎉 Ready to claim!</span>
                )}
              </div>
              <div className="bg-muted rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Referral link */}
            {referralData?.referral_link && (
              <div className="flex gap-2">
                <input
                  readOnly
                  value={referralData.referral_link}
                  className="flex-1 bg-muted rounded-xl px-3 py-2 text-xs text-muted-foreground border border-border"
                />
                <button
                  onClick={handleCopy}
                  className="bg-primary text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}

            {/* Share buttons */}
            {referralData?.referral_link && (
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`📚 I'm using Zama AI Primary to prepare for my ZIMSEC exams! Join me: ${referralData.referral_link}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500/10 text-green-700 border border-green-400/30 py-2 rounded-xl text-xs font-semibold text-center"
                >
                  📱 Share on WhatsApp
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralData.referral_link)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-500/10 text-blue-700 border border-blue-400/30 py-2 rounded-xl text-xs font-semibold text-center"
                >
                  📘 Share on Facebook
                </a>
              </div>
            )}

            {/* Claim button */}
            {completed >= needed && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {claiming ? <><Loader2 className="w-4 h-4 animate-spin" /> Claiming...</> : <><Crown className="w-4 h-4" /> Claim 3 Months Premium Free</>}
              </button>
            )}

            {claimResult && (
              <div className={`text-sm rounded-xl px-4 py-3 text-center ${claimResult.success ? "bg-green-500/10 text-green-700 border border-green-400/30" : "bg-red-500/10 text-red-700 border border-red-400/30"}`}>
                {claimResult.success
                  ? `🎉 1 month of Premium unlocked! Valid until ${claimResult.end_date}`
                  : claimResult.error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);
  // Support ?tab=founding deep link from modal
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "founding";
  });
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState(user?.full_name || "");
  const [teacherCode, setTeacherCode] = useState(() => localStorage.getItem("zama_teacher_referral") || "");
  const [instructions, setInstructions] = useState(null);
  const [pollStatus, setPollStatus] = useState("waiting"); // waiting | paid | failed

  // Cleanup polling interval on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handlePay = async (plan) => {
    if (!customerName.trim()) {
      setError("Please enter your full name before paying.");
      return;
    }
    if (!phone.trim()) {
      setError("Please enter your EcoCash number before paying.");
      return;
    }
    setError(null);
    setInstructions(null);
    setLoading(plan);
    // Pick up teacher referral code — prefer the input field, fallback to localStorage
    const teacherReferralCode = (teacherCode || "").trim().toUpperCase() || localStorage.getItem("zama_teacher_referral") || null;
    try {
      const functionName = plan === "founding_2026" ? "initiateFoundingPayment" : "initiatePaynowPayment";
      const payload = plan === "founding_2026"
        ? { phone: phone.trim(), customer_name: customerName.trim(), teacher_referral_code: teacherReferralCode }
        : { plan, phone: phone.trim(), customer_name: customerName.trim(), currency: "USD", teacher_referral_code: teacherReferralCode };
      const res = await base44.functions.invoke(functionName, payload);
      const data = res.data || {};
      const { instructions: msg, reference, pollUrl } = data;

      // Guard: if Paynow didn't return a pollUrl, treat as failed initiation — do not show "waiting"
      if (!pollUrl || !reference) {
        setError("Payment could not be started. Please check your EcoCash number and try again.");
        setLoading(null);
        return;
      }

      setInstructions({ msg, reference, pollUrl, plan });
      setPollStatus("waiting");

      // Auto-poll every 5 seconds — only marks as paid when Paynow confirms "paid"
      let attempts = 0;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        attempts++;
        try {
          const poll = await base44.functions.invoke("pollPaynow", {
            pollUrl,
            reference,
            plan:                  data.plan,
            amount:                data.amount,
            is_premium:            data.is_premium,
            is_family:             data.is_family,
            max_children:          data.max_children,
            teacher_referral_code: data.teacher_referral_code,
          });
          if (poll.data?.paid) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setPollStatus("paid");
            localStorage.removeItem("zama_teacher_referral");
            // Send email receipt only after confirmed payment
            base44.functions.invoke("sendPaymentReceipt", {}).catch(() => {});
            setTimeout(() => navigate("/payment-return"), 2000);
          } else if (attempts >= 24) { // 2 minutes max
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            setPollStatus("failed");
          }
        } catch { /* ignore transient poll errors */ }
      }, 5000);
    } catch (e) {
      setError(e?.response?.data?.error || "Payment initiation failed. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  // If payment was initiated show a "waiting" screen
  if (instructions) {
    return (
      <div className="min-h-screen bg-background font-jakarta flex flex-col items-center justify-center px-6 text-center space-y-6">
        {pollStatus === "paid" ? (
          <>
            <CheckCircle className="w-16 h-16 text-accent mx-auto" />
            <h2 className="text-2xl font-extrabold text-foreground">Payment Confirmed! 🎉</h2>
            <p className="text-muted-foreground text-sm">Redirecting you to the app...</p>
          </>
        ) : (
          <>
            <div className="text-5xl">📱</div>
            <h2 className="text-2xl font-extrabold text-foreground">Check Your Phone!</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              {instructions.msg || "An EcoCash prompt has been sent to your phone. Enter your PIN to complete the payment."}
            </p>
            <div className="bg-green-500/10 border border-green-400/30 rounded-2xl px-5 py-4 w-full max-w-xs space-y-2">
              <p className="text-xs text-green-700 font-semibold">Reference: {instructions.reference}</p>
              <div className="flex items-center justify-center gap-2 text-xs text-green-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {pollStatus === "failed" ? "Timed out — tap below to check manually" : "Checking payment status automatically..."}
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  const poll = await base44.functions.invoke("pollPaynow", {
                    pollUrl:               instructions.pollUrl,
                    reference:             instructions.reference,
                    plan:                  instructions.plan,
                  });
                  if (poll.data?.paid) {
                    setPollStatus("paid");
                    base44.functions.invoke("sendPaymentReceipt", {}).catch(() => {});
                    setTimeout(() => navigate("/payment-return"), 1500);
                  } else {
                    setError("Payment not confirmed yet. Please complete the EcoCash prompt on your phone, then try again.");
                  }
                } catch {
                  setError("Could not verify payment. Please try again in a moment.");
                }
              }}
              className="w-full max-w-xs bg-primary text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-4 h-4" /> I've paid — verify now
            </button>
            <button
              onClick={() => setInstructions(null)}
              className="text-sm text-muted-foreground underline"
            >
              Go back
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-jakarta flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-violet-600 to-violet-800 text-white px-6 pt-14 pb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 z-20 flex items-center gap-1.5 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="relative z-10">
          <div className="text-4xl mb-3">🎓</div>
          <h1 className="text-2xl font-extrabold">Choose Your Plan</h1>
          <p className="text-white/70 mt-2 text-sm">
            Hi {user?.full_name?.split(" ")[0] || "there"}! Unlock your full exam prep experience.
          </p>
        </div>
      </div>

      <div className="px-5 pt-5 pb-12 space-y-4 flex-1">

        {/* Customer name + EcoCash phone — always visible */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-bold text-foreground">Full Name</p>
            <p className="text-xs text-muted-foreground">Name of the person paying via EcoCash.</p>
            <input
              type="text"
              value={customerName}
              onChange={e => { setCustomerName(e.target.value); setError(null); }}
              placeholder="e.g. John Moyo"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground ${error ? "border-red-400" : "border-border"}`}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" /> EcoCash Number
            </p>
            <p className="text-xs text-muted-foreground">Enter the phone number to receive the EcoCash payment prompt.</p>
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError(null); }}
              placeholder="e.g. 0771234567"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground ${error ? "border-red-400" : "border-border"}`}
            />
          </div>
          <div className="space-y-2 pt-1 border-t border-border/60">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <span className="text-emerald-600">🎓</span> Teacher Referral Code <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </p>
            <p className="text-xs text-muted-foreground">If a teacher gave you a code, enter it here so they get credit for your subscription.</p>
            <input
              type="text"
              value={teacherCode}
              onChange={e => setTeacherCode(e.target.value.toUpperCase())}
              placeholder="e.g. JOHN12345"
              maxLength={20}
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground tracking-wider font-mono"
            />
          </div>
          {error && (
            <p className="text-xs text-red-600 font-medium mt-1">{error}</p>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex bg-muted rounded-2xl p-1 gap-1 flex-wrap">
          {[
            { key: "founding", label: "Founding", icon: "🎓" },
            { key: "individual", label: "Individual", icon: "👤" },
            { key: "family", label: "Family", icon: "👨‍👩‍👧" },
            { key: "referral", label: "Free via Referral", icon: "🎁" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                tab === t.key
                  ? "bg-card text-foreground shadow"
                  : "text-muted-foreground"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === "founding" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground text-center">🎓 Be one of the first 100 students — full year for just $7. Available for <strong>all grades</strong>!</p>
            <FoundingOfferCard
              onPay={handlePay}
              loading={loading}
              phone={phone}
              setPhone={setPhone}
              error={error}
              user={user}
            />
          </div>
        )}

        {tab === "individual" && (
          <div className="space-y-4">
            <div className="bg-primary/8 border border-primary/20 rounded-2xl px-4 py-3 text-xs text-foreground text-center">
              👤 <strong>One child profile</strong> · Full access to all subjects, mock exams, AI tutor & weekly reports.
            </div>
            {INDIVIDUAL_PLANS.map(plan => (
              <PlanCard key={plan.key} plan={plan} onPay={handlePay} loading={loading} />
            ))}
          </div>
        )}

        {tab === "family" && (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-4 py-3 text-xs text-emerald-700 font-semibold text-center">
              👨‍👩‍👧 Up to <strong>4 children</strong> across any grades — perfect for siblings!
            </div>
            {FAMILY_PLANS.map(plan => (
              <PlanCard key={plan.key} plan={plan} onPay={handlePay} loading={loading} />
            ))}
          </div>
        )}

        {tab === "referral" && (
          <ReferralSection />
        )}

        {/* Free tier reminder */}
        <div className="bg-muted/50 border border-border rounded-2xl px-4 py-3 text-center">
          <p className="text-xs font-bold text-foreground">Or stay on the Free plan</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">1 child profile · 2 topics per subject · 5-question quick quiz · 1 mock exam every 2 weeks · Limited analytics</p>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2">
          Payments processed securely via Paynow Zimbabwe (EcoCash USD).
          <br />Access activated immediately after payment confirmation.
        </p>
      </div>
    </div>
  );
}