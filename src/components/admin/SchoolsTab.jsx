import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, XCircle, Loader2, Building2, Mail, Phone, User as UserIcon, Clock } from "lucide-react";

const STATUS_STYLES = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
};

export default function SchoolsTab() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [acting, setActing] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.School.list("-created_date", 500);
    setSchools(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (school) => {
    setActing(school.id);
    setError("");
    try {
      const res = await base44.functions.invoke("approveSchool", { school_id: school.id, action: "approve" });
      if (res.data?.error) throw new Error(res.data.error);
      await load();
    } catch (e) {
      setError(e.message || "Could not approve");
    } finally {
      setActing(null);
    }
  };

  const submitReject = async () => {
    if (!rejectFor) return;
    setActing(rejectFor.id);
    setError("");
    try {
      const res = await base44.functions.invoke("approveSchool", {
        school_id: rejectFor.id,
        action: "reject",
        reason: rejectReason.trim(),
      });
      if (res.data?.error) throw new Error(res.data.error);
      setRejectFor(null);
      setRejectReason("");
      await load();
    } catch (e) {
      setError(e.message || "Could not reject");
    } finally {
      setActing(null);
    }
  };

  const filtered = schools.filter(s => {
    if (filter === "all") return true;
    return (s.approval_status || "pending") === filter;
  });

  const counts = {
    pending: schools.filter(s => (s.approval_status || "pending") === "pending").length,
    approved: schools.filter(s => s.approval_status === "approved").length,
    rejected: schools.filter(s => s.approval_status === "rejected").length,
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-foreground">Schools ({schools.length})</h2>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: "pending", label: `Pending (${counts.pending})` },
            { key: "approved", label: `Approved (${counts.approved})` },
            { key: "rejected", label: `Rejected (${counts.rejected})` },
            { key: "all", label: `All (${schools.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                filter === t.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl p-3 text-sm">{error}</div>}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
          No schools in this category.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(school => {
            const status = school.approval_status || "pending";
            const coAdmins = Array.isArray(school.co_admin_details) ? school.co_admin_details : [];
            return (
              <div key={school.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {school.logo_url ? (
                    <img src={school.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground">{school.name}</p>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[status]}`}>
                        {status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {school.city || "—"} · {school.total_students || 0} students
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Registered {new Date(school.created_date).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-secondary/40 rounded-xl px-3 py-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Primary Admin</p>
                    <p className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5"><UserIcon className="w-3 h-3" />{school.contact_person_name || "—"}</p>
                    <p className="text-muted-foreground">{school.contact_person_job_title || "—"}</p>
                    <p className="text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" />{school.school_admin_email}</p>
                    {school.contact_phone && <p className="text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" />{school.contact_phone}</p>}
                  </div>
                  {coAdmins.length > 0 && (
                    <div className="bg-secondary/40 rounded-xl px-3 py-2">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Co-Admins ({coAdmins.length})</p>
                      <div className="space-y-1 mt-0.5">
                        {coAdmins.map(c => (
                          <div key={c.email} className="text-xs">
                            <p className="font-semibold text-foreground">{c.full_name || c.email} <span className="text-muted-foreground font-normal">· {c.job_title || "—"}</span></p>
                            <p className="text-muted-foreground">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {status === "rejected" && school.rejection_reason && (
                  <p className="text-xs bg-red-500/10 text-red-700 dark:text-red-300 rounded-lg px-3 py-2">
                    <span className="font-semibold">Rejection reason:</span> {school.rejection_reason}
                  </p>
                )}

                {status === "approved" && school.approved_at && (
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Approved {new Date(school.approved_at).toLocaleString()} by {school.approved_by || "—"}
                  </p>
                )}

                {(status === "pending" || status === "rejected") && (
                  <div className="flex gap-2">
                    {status !== "approved" && (
                      <button
                        onClick={() => approve(school)}
                        disabled={acting === school.id}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 rounded-xl inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
                      >
                        {acting === school.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Approve
                      </button>
                    )}
                    {status === "pending" && (
                      <button
                        onClick={() => { setRejectFor(school); setRejectReason(""); }}
                        disabled={acting === school.id}
                        className="flex-1 bg-card border border-destructive/40 text-destructive hover:bg-destructive/10 text-sm font-semibold py-2 rounded-xl inline-flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {rejectFor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setRejectFor(null)}>
          <div className="bg-card w-full max-w-md rounded-2xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-foreground">Reject {rejectFor.name}?</h3>
            <p className="text-xs text-muted-foreground">The school's primary admin will receive an email with the reason below.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason (required)"
              rows={3}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setRejectFor(null)}
                className="flex-1 border border-border rounded-xl py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                disabled={!rejectReason.trim() || acting === rejectFor.id}
                className="flex-1 bg-destructive text-destructive-foreground rounded-xl py-2 text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
              >
                {acting === rejectFor.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}