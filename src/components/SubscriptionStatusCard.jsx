import { Link } from "react-router-dom";
import { useSubscription } from "@/lib/useSubscription";
import { Crown, Clock, CheckCircle, AlertTriangle, Shield, Sparkles } from "lucide-react";

const PLAN_LABELS = {
  monthly: "Standard — Monthly",
  termly: "Standard — Termly (4 months)",
  annual: "Standard — Annual",
  premium_monthly: "Premium — Monthly",
  premium_termly: "Premium — Termly (4 months)",
  premium_annual: "Premium — Annual",
  founding_2026: "Founding Student 2026",
  premium: "Premium",
  referral_premium: "Referral Premium (Free)",
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  return Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
}

export default function SubscriptionStatusCard({ user }) {
  const sub = useSubscription(user);

  if (!sub) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading subscription...</p>
        </div>
      </div>
    );
  }

  // Admin
  if (sub.isAdmin) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-violet-600 px-5 py-3 flex items-center gap-2 text-white">
          <Shield className="w-4 h-4" />
          <p className="font-bold text-sm">Admin Access</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-foreground">You have unlimited access to all features.</p>
        </div>
      </div>
    );
  }

  // Free trial
  if (sub.isTrial) {
    const days = sub.days_left ?? daysUntil(sub.trial_end_date);
    const lowDays = days != null && days <= 3;
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className={`px-5 py-3 flex items-center gap-2 text-white ${lowDays ? "bg-gradient-to-r from-amber-500 to-orange-500" : "bg-gradient-to-r from-blue-500 to-indigo-600"}`}>
          <Clock className="w-4 h-4" />
          <p className="font-bold text-sm">Free Trial</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Time remaining</p>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">
              {days} day{days !== 1 ? "s" : ""} left
            </p>
            <p className="text-xs text-muted-foreground mt-1">Trial ends on {formatDate(sub.trial_end_date)}</p>
          </div>
          <Link
            to="/payment"
            className="w-full bg-primary text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" /> Subscribe Now
          </Link>
        </div>
      </div>
    );
  }

  // Expired
  if (sub.isExpired || !sub.active) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-rose-600 px-5 py-3 flex items-center gap-2 text-white">
          <AlertTriangle className="w-4 h-4" />
          <p className="font-bold text-sm">Subscription Expired</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-foreground">Your access has ended. Subscribe to continue learning.</p>
          <Link
            to="/payment"
            className="w-full bg-primary text-white text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" /> Renew Subscription
          </Link>
        </div>
      </div>
    );
  }

  // Active paid
  const days = daysUntil(sub.end_date);
  const lowDays = days != null && days <= 7;
  const planLabel = PLAN_LABELS[sub.plan] || sub.plan || "Active Plan";

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2 text-white ${sub.isPremium ? "bg-gradient-to-r from-yellow-500 to-orange-500" : "bg-gradient-to-r from-emerald-500 to-green-600"}`}>
        {sub.isPremium ? <Crown className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
        <p className="font-bold text-sm">{sub.isPremium ? "Premium Active" : "Subscription Active"}</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Current plan</p>
          <p className="text-base font-bold text-foreground mt-0.5">{planLabel}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Time left</p>
            <p className={`text-lg font-extrabold mt-0.5 ${lowDays ? "text-amber-600" : "text-foreground"}`}>
              {days} day{days !== 1 ? "s" : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Renews / ends</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{formatDate(sub.end_date)}</p>
          </div>
        </div>
        {lowDays && (
          <Link
            to="/payment"
            className="w-full bg-amber-500 text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors"
          >
            <Clock className="w-4 h-4" /> Renew Early
          </Link>
        )}
      </div>
    </div>
  );
}