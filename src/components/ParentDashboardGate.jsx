import { useEffect, useMemo, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

async function sha256(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ParentDashboardGate({ children }) {
  const { user } = useAuth();
  const [hasPin, setHasPin] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const storageKey = useMemo(
    () => `zama_parent_pin_hash_${user?.email || "local"}`,
    [user?.email]
  );
  const unlockKey = useMemo(
    () => `zama_parent_dashboard_unlocked_${user?.email || "local"}`,
    [user?.email]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const sessionUnlocked = sessionStorage.getItem(unlockKey) === "1";
      setHasPin(!!saved);
      setUnlocked(!saved || sessionUnlocked);
    } catch {
      setUnlocked(true);
    }
  }, [storageKey, unlockKey]);

  const cleanPin = pin.trim();
  const cleanConfirm = confirmPin.trim();

  const handleCreate = async () => {
    setError("");
    if (!/^\d{4,8}$/.test(cleanPin)) {
      setError("Use a 4 to 8 digit PIN.");
      return;
    }
    if (cleanPin !== cleanConfirm) {
      setError("The PINs do not match.");
      return;
    }
    const hash = await sha256(cleanPin);
    localStorage.setItem(storageKey, hash);
    sessionStorage.setItem(unlockKey, "1");
    setHasPin(true);
    setUnlocked(true);
  };

  const handleUnlock = async () => {
    setError("");
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      setHasPin(false);
      return;
    }
    const hash = await sha256(cleanPin);
    if (hash !== saved) {
      setError("Incorrect PIN.");
      return;
    }
    sessionStorage.setItem(unlockKey, "1");
    setUnlocked(true);
  };

  if (unlocked) return children;

  return (
    <div className="min-h-screen bg-background px-6 py-12 font-jakarta">
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {hasPin ? <Lock className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground">
                {hasPin ? "Parent PIN" : "Set Parent PIN"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Keeps children out of parent controls on this device.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              type="password"
              placeholder={hasPin ? "Enter PIN" : "Create PIN"}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-lg font-bold tracking-[0.35em] text-foreground outline-none focus:border-primary"
            />
            {!hasPin && (
              <input
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                inputMode="numeric"
                type="password"
                placeholder="Confirm PIN"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center text-lg font-bold tracking-[0.35em] text-foreground outline-none focus:border-primary"
              />
            )}
            {error && <p className="text-center text-sm font-semibold text-red-500">{error}</p>}
            <button
              onClick={hasPin ? handleUnlock : handleCreate}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white"
            >
              {hasPin ? "Unlock Dashboard" : "Save PIN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
