import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Loader2, Trash2, RotateCcw, ShieldAlert } from "lucide-react";
import { getAllAdminEmails } from "@/lib/schoolAdmins";

function daysUntil(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default function SchoolDeletionPanel({ school, currentUserEmail, onChanged }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const adminEmails = getAllAdminEmails(school);
  const totalAdmins = adminEmails.length;
  const callerLower = (currentUserEmail || "").toLowerCase();
  const approvals = Array.isArray(school.deletion_approvals) ? school.deletion_approvals.map(e => e.toLowerCase()) : [];
  const hasApproved = approvals.includes(callerLower);
  const status = school.deletion_status || "none";

  const run = async (action) => {
    if (action === "request" && !confirm("Start a deletion request? This requires 3 admin approvals to take effect.")) return;
    if (action === "approve" && !confirm("Approve school deletion? After 3 approvals the school enters a 30-day recycle bin.")) return;
    if (action === "cancel" && !confirm("Cancel the pending deletion request?")) return;
    if (action === "restore" && !confirm("Restore this school and cancel scheduled deletion?")) return;

    setBusy(action);
    setError("");
    try {
      const res = await base44.functions.invoke("requestSchoolDeletion", { action, school_id: school.id });
      if (res.data?.error) throw new Error(res.data.error);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Action failed");
    } finally {
      setBusy("");
    }
  };

  // Scheduled state — show recycle bin notice with restore option
  if (status === "scheduled") {
    const days = daysUntil(school.deletion_scheduled_at);
    return (
      <div className="bg-destructive/5 border border-destructive/30 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-5 h-5 text-destructive" />
          <p className="font-bold text-sm text-destructive">School scheduled for permanent deletion</p>
        </div>
        <p className="text-xs text-foreground/80 mb-3">
          This school has been approved for deletion and is in the 30-day recycle bin. It will be permanently purged in{" "}
          <span className="font-bold">{days} day{days !== 1 ? "s" : ""}</span>. You can restore it anytime before then.
        </p>
        <button
          onClick={() => run("restore")}
          disabled={busy === "restore"}
          className="bg-primary text-white font-semibold px-4 py-2 rounded-xl text-sm inline-flex items-center gap-2 disabled:opacity-60"
        >
          {busy === "restore" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Restore school
        </button>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>
    );
  }

  // Pending state — show approval progress
  if (status === "pending") {
    const count = approvals.length;
    return (
      <div className="bg-amber-500/5 border border-amber-500/40 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <p className="font-bold text-sm text-amber-700">Deletion pending — {count} of 3 approvals</p>
        </div>
        <p className="text-xs text-foreground/80 mb-3">
          Requested by <span className="font-semibold">{school.deletion_requested_by}</span>. Three unique admin approvals are required before the school enters the 30-day recycle bin.
        </p>
        <div className="flex gap-1.5 mb-3">
          {[0, 1, 2].map(i => (
            <div key={i} className={`flex-1 h-2 rounded-full ${i < count ? "bg-amber-500" : "bg-amber-500/20"}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {!hasApproved && (
            <button
              onClick={() => run("approve")}
              disabled={busy === "approve"}
              className="bg-destructive text-white font-semibold px-4 py-2 rounded-xl text-sm inline-flex items-center gap-2 disabled:opacity-60"
            >
              {busy === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Approve deletion
            </button>
          )}
          {hasApproved && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-500/20 px-3 py-2 rounded-xl">✓ You've approved</span>
          )}
          <button
            onClick={() => run("cancel")}
            disabled={busy === "cancel"}
            className="bg-secondary text-foreground font-semibold px-4 py-2 rounded-xl text-sm disabled:opacity-60"
          >
            Cancel request
          </button>
        </div>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      </div>
    );
  }

  // None — show the danger zone with request button
  const canRequest = totalAdmins >= 3;
  return (
    <div className="bg-card border border-destructive/30 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <p className="font-bold text-sm text-destructive">Danger zone</p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Deleting a school is permanent. Three unique school admins must approve. After approval the school moves to a 30-day recycle bin, then is permanently purged.
      </p>
      {!canRequest && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2 mb-3">
          <p className="text-xs text-amber-700">
            You currently have <span className="font-bold">{totalAdmins}</span> admin{totalAdmins !== 1 ? "s" : ""}. At least 3 are required before deletion can be requested. Invite co-admins above first.
          </p>
        </div>
      )}
      <button
        onClick={() => run("request")}
        disabled={busy === "request" || !canRequest}
        className="bg-destructive text-white font-semibold px-4 py-2 rounded-xl text-sm inline-flex items-center gap-2 disabled:opacity-60"
      >
        {busy === "request" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        Request school deletion
      </button>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}