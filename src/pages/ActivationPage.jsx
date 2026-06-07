import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Phone, ShieldCheck, WifiOff } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  cacheActivationIfAllowed,
  getActivationDeviceId,
  normalizeActivationStatus,
  notifyActivationChanged,
} from "@/lib/activationStatus";
import { usePlan } from "@/lib/usePlan";

function cleanCode(value) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export default function ActivationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activationStatus, isPremium, isOfflineCached, offlineGraceDaysLeft } = usePlan();
  const [phone, setPhone] = useState(user?.contact_number || "");
  const [activationCode, setActivationCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess(null);

    const cleanedPhone = phone.trim();
    const cleanedCode = cleanCode(activationCode);
    if (!cleanedPhone) {
      setError("Enter the parent phone number used for payment or activation.");
      return;
    }
    if (!cleanedCode) {
      setError("Enter the activation code.");
      return;
    }
    if (!navigator.onLine) {
      setError("First activation needs internet. Connect, activate once, then the app can open offline.");
      return;
    }

    setSaving(true);
    try {
      const deviceId = getActivationDeviceId();
      const res = await base44.functions.invoke("verifyActivationCode", {
        phone: cleanedPhone,
        activation_code: cleanedCode,
        device_id: deviceId,
      });
      const normalized = normalizeActivationStatus(
        user,
        {
          ...(res.data || {}),
          phone: cleanedPhone,
          activation_code: cleanedCode,
          device_id: deviceId,
        },
        { source: "online" }
      );

      if (!normalized.active) {
        setError(res.data?.message || "This activation code is not active.");
        return;
      }

      cacheActivationIfAllowed(user, normalized);
      notifyActivationChanged();
      setSuccess(normalized);
      setActivationCode("");

      try {
        await base44.auth.updateMe({ contact_number: cleanedPhone });
      } catch {}
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Could not verify this activation code.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 font-jakarta">
      <div className="bg-gradient-to-br from-primary to-violet-700 px-6 pb-8 text-white" style={{ paddingTop: "max(3rem, env(safe-area-inset-top))" }}>
        <Link to="/profile" className="mb-4 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Activate Access</h1>
            <p className="mt-1 text-sm text-white/75">Use a parent phone number and activation code.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 pt-5">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">Current access</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isPremium
                  ? isOfflineCached
                    ? `Offline activation cached. ${offlineGraceDaysLeft || 0} day${offlineGraceDaysLeft === 1 ? "" : "s"} left in grace.`
                    : "Full access is active on this device."
                  : activationStatus === "expired"
                  ? "Expired account. Free content remains available."
                  : "Free mode. Premium topics and mock exams are locked."}
              </p>
            </div>
          </div>
        </div>

        {!navigator.onLine && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <WifiOff className="h-4 w-4" /> First activation needs internet.
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">Parent phone number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+263 77 123 4567"
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-muted-foreground">Activation code</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={activationCode}
                onChange={(event) => setActivationCode(event.target.value)}
                placeholder="ZAMA-XXXX-XXXX"
                autoCapitalize="characters"
                className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-3 text-sm font-bold uppercase tracking-wide text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Access activated until {success.end_date || success.expiry_date || "the plan expiry date"}.
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !navigator.onLine}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Verify and activate
          </button>
        </form>

        {success && (
          <button
            onClick={() => navigate("/home")}
            className="w-full rounded-xl border border-border bg-card py-3 text-sm font-bold text-foreground"
          >
            Go to learner home
          </button>
        )}
      </div>
    </div>
  );
}
