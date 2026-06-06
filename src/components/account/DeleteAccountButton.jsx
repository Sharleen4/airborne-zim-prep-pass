import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Trash2, Loader2, CheckCircle2, X, AlertTriangle } from "lucide-react";

// In-app deletion request flow for logged-in users.
// Calls the requestAccountDeletion backend function which:
//  - marks the user record
//  - emails support@ and the user
export default function DeleteAccountButton() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!isAuthenticated || !user) return null;

  const alreadyRequested = !!user.account_deletion_requested;

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("requestAccountDeletion", { reason });
      if (res?.data?.success) {
        setDone(true);
      } else {
        setError(res?.data?.error || "Could not submit your request. Please try again.");
      }
    } catch (e) {
      setError(e?.message || "Could not submit your request. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <>
      <div className="mt-6 bg-card rounded-2xl border-2 border-destructive/30 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-destructive bg-destructive/10 px-2 py-1 rounded-md">Quick option</span>
        </div>
        <h2 className="font-bold text-foreground text-lg mt-2 mb-1">Delete from inside the app</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Logged in as <span className="font-semibold text-foreground">{user.email}</span>. You can request deletion with one tap — no email required.
        </p>

        {alreadyRequested ? (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-300/40 rounded-xl p-3 text-sm text-amber-900 dark:text-amber-200">
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              You've already requested deletion. We'll action it within 7 business days. Reply to the confirmation email if you need to cancel.
            </p>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 bg-destructive text-white font-bold px-5 py-3 rounded-xl text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Request account deletion
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-card w-full md:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h2 className="font-bold text-lg text-foreground">Delete account?</h2>
                  <p className="text-xs text-muted-foreground">This cannot be undone.</p>
                </div>
              </div>
              <button onClick={() => !submitting && setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {done ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300/40 rounded-xl p-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-emerald-900 dark:text-emerald-200">
                    <p className="font-semibold">Request received</p>
                    <p className="mt-0.5">We've emailed you a confirmation. Your account will be permanently deleted within 7 business days.</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-300/40 rounded-xl p-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 dark:text-amber-200">
                    All child profiles, progress, results, bookmarks and subscription details linked to <span className="font-semibold">{user.email}</span> will be permanently removed.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Why are you leaving? (optional)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Helps us improve — but you can skip this."
                    rows={3}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Type <span className="font-mono text-destructive">DELETE</span> to confirm
                  </label>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                    className="flex-1 border border-border bg-background text-foreground font-semibold py-3 rounded-xl text-sm disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting || confirmText.trim().toUpperCase() !== "DELETE"}
                    className="flex-1 bg-destructive text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <>Delete my account</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}