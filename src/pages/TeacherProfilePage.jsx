import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TeacherLayout from "@/components/teacher/TeacherLayout";
import {
  Loader2,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  Save,
  Building2,
  LogOut,
  Trash2,
  ChevronRight,
  User as UserIcon,
} from "lucide-react";

/**
 * Dedicated profile page for teachers — focused on the TEACHER'S OWN profile
 * (name, phone, qualifications, subjects taught). It is intentionally separate
 * from the school profile page so there is no overlap with school details
 * (which only school admins manage).
 */
export default function TeacherProfilePage() {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    qualifications: "",
    bio: "",
    subjects_taught: "", // comma-separated in the input, split on save
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const profiles = await base44.entities.TeacherProfile.filter(
          { user_email: user.email, is_active: true },
          "-created_date",
          1
        );
        const p = profiles[0] || null;
        setProfile(p);
        if (p) {
          setForm({
            full_name: p.full_name || user.full_name || "",
            phone: p.phone || "",
            qualifications: p.qualifications || "",
            bio: p.bio || "",
            subjects_taught: (p.subjects_taught || []).join(", "),
          });
          if (p.school_id) {
            try {
              const s = await base44.entities.School.get(p.school_id);
              setSchoolName(s?.name || "");
            } catch { /* ignore */ }
          }
        } else {
          setForm((f) => ({ ...f, full_name: user.full_name || "" }));
        }
      } catch (e) {
        setError(e.message || "Could not load your teacher profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile) {
      setError("Your teacher profile isn't set up yet. Please ask your school admin to add you as a teacher.");
      return;
    }
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const subjects = form.subjects_taught
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const updated = await base44.entities.TeacherProfile.update(profile.id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        qualifications: form.qualifications.trim(),
        bio: form.bio.trim(),
        subjects_taught: subjects,
      });
      setProfile(updated);
      setSuccess("Profile saved.");
    } catch (e2) {
      setError(e2.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <TeacherLayout title="My Profile" subtitle="Your teaching profile" showBack>
      <div className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-3 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 rounded-2xl p-3 text-sm">
            {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Account card (read-only basics) */}
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Account</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {(form.full_name || user.email || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">{form.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {user.email}
                  </p>
                  {schoolName && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {schoolName}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Editable teacher profile */}
            {!profile ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-sm text-amber-700">
                Your teacher profile isn't set up yet. Please ask your school admin to add you as a teacher.
              </div>
            ) : (
              <form onSubmit={handleSave} className="bg-card rounded-2xl border border-border p-4 space-y-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Teaching profile</p>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Full name</label>
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="e.g. Mrs Tendai Moyo"
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="e.g. +263 77 123 4567"
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> Qualifications
                  </label>
                  <input
                    value={form.qualifications}
                    onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                    placeholder="e.g. Diploma in Education, BEd"
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Subjects taught
                  </label>
                  <input
                    value={form.subjects_taught}
                    onChange={(e) => setForm({ ...form, subjects_taught: e.target.value })}
                    placeholder="e.g. Mathematics, English, Science"
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Separate subjects with commas.</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Short bio</label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="A short intro shown on your class page (optional)"
                    rows={3}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? "Saving…" : "Save profile"}
                </button>
              </form>
            )}

            {/* Quick links */}
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
              <Link to="/profile" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Account preferences</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link to="/help" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40">
                <div className="flex items-center gap-3">
                  <span className="text-base">❓</span>
                  <span className="text-sm font-semibold text-foreground">Help &amp; support</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>

            {/* Danger zone */}
            <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
              <button
                onClick={() => base44.auth.logout()}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40 text-left"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Log out</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <Link
                to="/delete-account"
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-destructive/5 text-destructive"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Delete my account</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="text-[11px] text-muted-foreground text-center pt-2">
              <Link to="/terms" className="hover:text-foreground">Terms</Link>
              <span className="mx-1">·</span>
              <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            </p>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}