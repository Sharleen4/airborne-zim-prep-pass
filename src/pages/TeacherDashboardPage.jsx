import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Copy, CheckCircle, DollarSign, Users, Clock, ArrowLeft, Share2, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const EARNING_PER_SUBSCRIPTION = 2;

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "teacher" && user.role !== "admin") {
      setLoading(false);
      return;
    }
    loadEarnings();
  }, [user]);

  const loadEarnings = async () => {
    const data = await base44.entities.TeacherEarning.filter({ teacher_email: user.email });
    setEarnings(data.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setLoading(false);
  };

  const generateReferralCode = async () => {
    setGeneratingCode(true);
    // Generate a unique code: TEACH- + first 3 letters of name + random 5 digits
    const namePrefix = (user.full_name || "TCH").replace(/\s+/g, "").substring(0, 4).toUpperCase();
    const randomPart = Math.floor(10000 + Math.random() * 90000);
    const code = `${namePrefix}${randomPart}`;
    await base44.auth.updateMe({ referral_code: code });
    window.location.reload();
    setGeneratingCode(false);
  };

  const referralLink = user?.referral_code
    ? `https://www.zamaaiprimary.online/?tref=${user.referral_code}`
    : null;

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    if (!referralLink) return;
    const text = `📚 Help your students prepare for ZIMSEC exams! Use my referral link to subscribe to Zama Ai Primary:\n${referralLink}`;
    if (navigator.share) {
      navigator.share({ title: "Zama Ai Primary", text, url: referralLink });
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const totalEarned = earnings.reduce((sum, e) => sum + (e.amount_earned || 0), 0);
  const pendingPayout = earnings.filter(e => e.payout_status === "pending").reduce((sum, e) => sum + (e.amount_earned || 0), 0);
  const paidOut = earnings.filter(e => e.payout_status === "paid").reduce((sum, e) => sum + (e.amount_earned || 0), 0);
  const totalReferrals = earnings.length;

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (user?.role !== "teacher" && user?.role !== "admin") return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-xl font-bold text-foreground">Teacher Access Only</h1>
      <p className="text-muted-foreground mt-2 text-sm">This page is for registered teacher partners. Contact admin to be enrolled.</p>
      <Link to="/home" className="mt-4 text-primary font-semibold text-sm underline">Go Home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-jakarta pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white px-6 pt-14 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <Link to="/home" className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-4 relative z-10">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="relative z-10">
          <p className="text-emerald-200 text-sm font-medium">Teacher Partner</p>
          <h1 className="text-2xl font-extrabold mt-0.5">{user?.full_name || "Teacher"}</h1>
          <p className="text-white/70 text-xs mt-1">{user?.email}</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
            className="bg-card rounded-2xl p-3.5 border border-border shadow-sm text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-extrabold text-foreground">{totalReferrals}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Referrals</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="bg-card rounded-2xl p-3.5 border border-border shadow-sm text-center">
            <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-xl font-extrabold text-emerald-600">${totalEarned.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Total Earned</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-3.5 border border-border shadow-sm text-center">
            <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-xl font-extrabold text-amber-600">${pendingPayout.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Pending</p>
          </motion.div>
        </div>

        {/* Referral Link Section */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <p className="font-bold text-foreground">Your Referral Link</p>
          </div>

          {user?.referral_code && (
            <button
              onClick={async () => {
                if (!confirm("Reset your referral code? Your old link will stop working.")) return;
                setGeneratingCode(true);
                await base44.auth.updateMe({ referral_code: null });
                window.location.reload();
              }}
              className="text-xs text-destructive underline self-end"
            >
              Reset & generate new code
            </button>
          )}

          {!user?.referral_code ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">You don't have a referral code yet. Generate one to start earning!</p>
              <button
                onClick={generateReferralCode}
                disabled={generatingCode}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generatingCode
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
                  : "✨ Generate My Referral Code"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-secondary rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Your Code</p>
                <p className="text-lg font-extrabold text-primary tracking-widest">{user.referral_code}</p>
              </div>

              <div className="bg-secondary/50 rounded-xl p-3 break-all">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide mb-1">Referral Link</p>
                <p className="text-xs font-mono text-foreground">{referralLink}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button onClick={handleCopy}
                  className="flex items-center justify-center gap-2 border border-border py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-secondary transition-colors">
                  {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <button onClick={handleShare}
                  className="flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>
          )}

          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
            <p className="text-xs font-bold text-emerald-700">💰 How earnings work</p>
            <p className="text-xs text-emerald-600 mt-1">You earn <strong>${EARNING_PER_SUBSCRIPTION} USD</strong> for every new user who subscribes using your referral link. Payouts are processed by admin monthly.</p>
          </div>
        </div>

        {/* Earnings History */}
        <div>
          <h2 className="font-bold text-foreground mb-3">Referral History</h2>
          {earnings.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-25" />
              <p className="font-semibold text-sm">No referrals yet</p>
              <p className="text-xs mt-1">Share your link to start earning!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {earnings.map(e => (
                <div key={e.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${e.payout_status === "paid" ? "bg-green-100" : "bg-amber-100"}`}>
                    {e.payout_status === "paid" ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{e.referred_user_email}</p>
                    <p className="text-xs text-muted-foreground">{e.created_date ? new Date(e.created_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-extrabold text-emerald-600">+${e.amount_earned}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${e.payout_status === "paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {e.payout_status === "paid" ? "Paid" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {paidOut > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl px-4 py-3 text-sm text-green-700 font-medium text-center">
            ✅ Total paid out to you: <strong>${paidOut.toFixed(2)}</strong>
          </div>
        )}
      </div>
    </div>
  );
}