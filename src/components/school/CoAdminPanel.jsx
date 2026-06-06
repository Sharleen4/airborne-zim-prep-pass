import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { UserPlus, Trash2, Shield, Loader2, X } from "lucide-react";

export default function CoAdminPanel({ school, currentUserEmail, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", job_title: "", phone: "" });
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const coAdmins = Array.isArray(school.co_admin_emails) ? school.co_admin_emails : [];
  const coAdminDetails = Array.isArray(school.co_admin_details) ? school.co_admin_details : [];
  const isPrimary = (school.school_admin_email || "").toLowerCase() === (currentUserEmail || "").toLowerCase();

  const getDetails = (em) => coAdminDetails.find(d => (d.email || "").toLowerCase() === em.toLowerCase());

  const resetForm = () => setForm({ email: "", full_name: "", job_title: "", phone: "" });

  const invite = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.email.trim() || !form.full_name.trim() || !form.job_title.trim() || !form.phone.trim()) {
      setError("All fields are required");
      return;
    }
    setSending(true);
    try {
      const res = await base44.functions.invoke("inviteCoAdmin", form);
      if (res.data?.error) throw new Error(res.data.error);
      setSuccess(`Invitation sent to ${form.email.trim()}`);
      resetForm();
      setShowForm(false);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not send invitation");
    } finally {
      setSending(false);
    }
  };

  const remove = async (target) => {
    if (!confirm(`Remove ${target} as a co-admin?`)) return;
    setRemoving(target);
    try {
      const res = await base44.functions.invoke("removeCoAdmin", { email: target });
      if (res.data?.error) throw new Error(res.data.error);
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not remove");
    } finally {
      setRemoving("");
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary" />
        <p className="font-bold text-sm text-foreground">School Admins</p>
        <span className="ml-auto text-xs text-muted-foreground">{coAdmins.length + 1} total</span>
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{school.school_admin_email}</p>
              <p className="text-[10px] text-muted-foreground">
                {school.contact_person_name ? `${school.contact_person_name} · ${school.contact_person_job_title || "Primary admin"}` : "Primary admin"}
              </p>
            </div>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">OWNER</span>
          </div>
          {coAdmins.map(em => {
            const d = getDetails(em);
            return (
              <div key={em} className="flex items-center justify-between bg-secondary/30 rounded-xl px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{d?.full_name || em}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {d?.job_title ? `${d.job_title} · ` : ""}{em}
                  </p>
                  {d?.phone && <p className="text-[10px] text-muted-foreground">{d.phone}</p>}
                </div>
                {isPrimary && (
                  <button
                    onClick={() => remove(em)}
                    disabled={removing === em}
                    className="text-destructive hover:bg-destructive/10 p-1.5 rounded-lg"
                    title="Remove co-admin"
                  >
                    {removing === em ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            );
          })}
          {coAdmins.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No co-admins yet.</p>
          )}
        </div>

        {!showForm ? (
          <button
            onClick={() => { setShowForm(true); setError(""); setSuccess(""); }}
            className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-xl inline-flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Invite Co-Admin
          </button>
        ) : (
          <form onSubmit={invite} className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">New co-admin details</p>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); setError(""); }} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <Input
              placeholder="Full name *"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
            <Input
              placeholder="Job title *  (e.g. Deputy Head)"
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              required
            />
            <Input
              placeholder="Phone *"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
            <Input
              type="email"
              placeholder="Email *"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full bg-primary text-white text-sm font-semibold py-2.5 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {sending ? "Sending invite..." : "Send Invitation"}
            </button>
          </form>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-emerald-600">{success}</p>}
        <p className="text-[10px] text-muted-foreground">
          Co-admins have the same management permissions as you. At least 3 admins are required to ever delete the school.
        </p>
      </div>
    </div>
  );
}