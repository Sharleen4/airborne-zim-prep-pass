import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link2, Copy, Check, RefreshCw, Power, Loader2, UserPlus, X, CheckCircle2 } from "lucide-react";
import { ensureInviteCode, generateInviteCode, buildInviteUrl } from "@/lib/classInvite";

// Compact panel for a class detail view: shows invite link, lets teacher
// regenerate/disable it, and lists pending join requests with approve/reject.
export default function ClassInvitePanel({ classObj, onClassUpdated, onStudentApproved }) {
  const [cls, setCls] = useState(classObj);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setCls(classObj); }, [classObj]);

  const loadRequests = useCallback(async () => {
    if (!cls?.id) return;
    setLoading(true);
    const list = await base44.entities.ClassJoinRequest
      .filter({ class_id: cls.id, status: "pending" }, "-created_date", 100)
      .catch(() => []);
    setRequests(list);
    setLoading(false);
  }, [cls?.id]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const ensureCode = async () => {
    setBusy(true); setError("");
    try {
      const updated = await ensureInviteCode(cls);
      setCls(updated);
      onClassUpdated?.(updated);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const regenerate = async () => {
    if (!confirm("Generate a new link? The old link will stop working.")) return;
    setBusy(true); setError("");
    try {
      const code = generateInviteCode();
      await base44.entities.SchoolClass.update(cls.id, { invite_code: code, invite_active: true });
      const updated = { ...cls, invite_code: code, invite_active: true };
      setCls(updated);
      onClassUpdated?.(updated);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const toggleActive = async () => {
    setBusy(true); setError("");
    try {
      const next = !(cls.invite_active !== false);
      await base44.entities.SchoolClass.update(cls.id, { invite_active: next });
      const updated = { ...cls, invite_active: next };
      setCls(updated);
      onClassUpdated?.(updated);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const copyLink = async () => {
    if (!cls?.invite_code) return;
    await navigator.clipboard.writeText(buildInviteUrl(cls.invite_code));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const approve = async (req) => {
    setBusy(true); setError("");
    try {
      // Add the student email to the class roster (use submitted student_email,
      // which defaults to the parent email if the child has no own login).
      const email = (req.student_email || req.parent_email || "").toLowerCase();
      const roster = Array.from(new Set([...(cls.student_emails || []), email].filter(Boolean)));
      await base44.entities.SchoolClass.update(cls.id, { student_emails: roster });

      // Upsert StudentProfile — if this child already had a profile (created earlier
      // before this school existed, or for another class), update it to point at
      // THIS school + class. Otherwise create a fresh one.
      const profileData = {
        user_email: email || undefined,
        child_profile_id: req.child_id || undefined,
        school_id: cls.school_id,
        class_id: cls.id,
        full_name: req.student_name,
        grade: req.grade,
        parent_email: req.parent_email || undefined,
        is_active: true,
        description: `${req.student_name} · ${cls.name}`,
      };
      let existing = [];
      if (req.child_id) {
        existing = await base44.entities.StudentProfile
          .filter({ child_profile_id: req.child_id }, "-created_date", 1)
          .catch(() => []);
      }
      if (!existing.length && email) {
        existing = await base44.entities.StudentProfile
          .filter({ user_email: email }, "-created_date", 1)
          .catch(() => []);
      }
      if (existing[0]) {
        await base44.entities.StudentProfile.update(existing[0].id, profileData).catch(() => {});
      } else {
        await base44.entities.StudentProfile.create(profileData).catch(() => {});
      }
      await base44.entities.ClassJoinRequest.update(req.id, {
        status: "approved",
        approved_at: new Date().toISOString(),
      });
      const updatedCls = { ...cls, student_emails: roster };
      setCls(updatedCls);
      onClassUpdated?.(updatedCls);
      onStudentApproved?.();
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const reject = async (req) => {
    const reason = prompt("Add a short reason (optional):") || "";
    setBusy(true); setError("");
    try {
      await base44.entities.ClassJoinRequest.update(req.id, { status: "rejected", rejection_reason: reason });
      setRequests(prev => prev.filter(r => r.id !== req.id));
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const hasCode = !!cls?.invite_code;
  const active = cls?.invite_active !== false;

  return (
    <div className="bg-card rounded-2xl border border-border p-4 mb-3 space-y-3">
      <div className="flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-primary" />
        <p className="font-bold text-sm text-foreground">Class invitation</p>
        {requests.length > 0 && (
          <span className="ml-auto text-[10px] font-bold uppercase bg-amber-500/15 text-amber-700 px-2 py-0.5 rounded-full">
            {requests.length} pending
          </span>
        )}
      </div>

      {error && <div className="bg-destructive/10 text-destructive text-xs p-2 rounded-lg">{error}</div>}

      {!hasCode ? (
        <button
          onClick={ensureCode}
          disabled={busy}
          className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          Generate invitation link
        </button>
      ) : (
        <>
          <div className="bg-secondary/50 rounded-xl p-2.5 flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-foreground truncate flex-1">{buildInviteUrl(cls.invite_code)}</p>
            <button
              onClick={copyLink}
              className="text-xs font-semibold text-primary inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/10"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Share this link with parents. They'll submit their child's details for your approval.
            Status: <span className={active ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>{active ? "active" : "disabled"}</span>
          </p>
          <div className="flex items-center gap-2">
            <button onClick={regenerate} disabled={busy} className="flex-1 bg-secondary text-foreground text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
              <RefreshCw className="w-3 h-3" /> New link
            </button>
            <button onClick={toggleActive} disabled={busy} className="flex-1 bg-secondary text-foreground text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1 disabled:opacity-50">
              <Power className="w-3 h-3" /> {active ? "Disable" : "Enable"}
            </button>
          </div>
        </>
      )}

      {/* Pending requests */}
      <div>
        <p className="text-xs font-bold text-foreground mb-1.5">Pending requests</p>
        {loading ? (
          <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
        ) : requests.length === 0 ? (
          <p className="text-xs text-muted-foreground">No pending requests right now.</p>
        ) : (
          <div className="space-y-2">
            {requests.map(req => {
              const mismatch = req.grade && cls.grade && req.grade !== cls.grade;
              return (
                <div key={req.id} className="bg-secondary/40 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{req.student_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {req.grade} · Submitted by {req.parent_name || req.parent_email}
                      </p>
                      {mismatch && (
                        <p className="text-[11px] text-amber-700 mt-1">
                          ⚠ Grade mismatch — class is {cls.grade}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => approve(req)}
                      disabled={busy}
                      className="flex-1 bg-emerald-500/10 text-emerald-700 text-xs font-semibold py-1.5 rounded-lg inline-flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3 h-3" /> Approve
                    </button>
                    <button
                      onClick={() => reject(req)}
                      disabled={busy}
                      className="flex-1 bg-destructive/10 text-destructive text-xs font-semibold py-1.5 rounded-lg inline-flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <X className="w-3 h-3" /> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}