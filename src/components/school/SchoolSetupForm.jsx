import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Building2, CheckCircle2 } from "lucide-react";

export default function SchoolSetupForm({ user, onCreated }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState(user?.full_name || "");
  const [jobTitle, setJobTitle] = useState("");
  const [totalStudents, setTotalStudents] = useState("");
  const [motto, setMotto] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !contactPerson.trim() || !jobTitle.trim() || !totalStudents) return;
    setSaving(true);
    setError("");
    try {
      const school = await base44.entities.School.create({
        name: name.trim(),
        city: city.trim(),
        contact_phone: phone.trim(),
        contact_email: user.email,
        contact_person_name: contactPerson.trim(),
        contact_person_job_title: jobTitle.trim(),
        total_students: Number(totalStudents) || 0,
        school_admin_email: user.email,
        motto: motto.trim(),
        is_active: true,
        approval_status: "pending",
      });
      // Fire-and-forget super admin notification
      base44.functions.invoke("notifySuperAdminOfNewSchool", { school_id: school.id }).catch(() => {});
      setSuccess(true);
      // Brief success screen, then move to dashboard
      setTimeout(() => onCreated?.(school), 1500);
    } catch (err) {
      setError(err.message || "Could not create school");
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 max-w-lg mx-auto text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">School submitted!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Your school is now pending super admin approval. You'll receive an email once it's approved, after which you can add teachers and classes.
        </p>
        <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto mt-4" />
      </div>
    );
  }

  const isValid = name.trim() && phone.trim() && contactPerson.trim() && jobTitle.trim() && totalStudents;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 max-w-lg mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Building2 className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Set up your school</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-5">
        Tell us a little about your school. You'll be able to add teachers, classes and students next.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">School name *</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marlborough Primary School" required />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Contact phone number *</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+263 ..." required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Contact person *</label>
            <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Full name" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Job title *</label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Headmaster" required />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Total students at school *</label>
          <Input
            type="number"
            min="0"
            value={totalStudents}
            onChange={(e) => setTotalStudents(e.target.value)}
            placeholder="e.g. 450"
            required
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">City</label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Harare" />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Motto (optional)</label>
          <Textarea value={motto} onChange={(e) => setMotto(e.target.value)} rows={2} />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <button
          type="submit"
          disabled={saving || !isValid}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {saving ? "Creating..." : "Create School"}
        </button>
      </form>
    </div>
  );
}