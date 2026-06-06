import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isSchoolAdmin } from "@/lib/schoolRoles";
import { useActiveSchool } from "@/lib/useActiveSchool";
import SchoolAdminLayout from "@/components/school/SchoolAdminLayout";
import SchoolSwitcher from "@/components/school/SchoolSwitcher";
import { Input } from "@/components/ui/input";
import { Plus, Users, Loader2, Mail, Phone, X, Trash2, Pencil } from "lucide-react";

export default function SchoolAdminTeachers() {
  const { user } = useAuth();
  const { schools, school, activeSchoolId, setActiveSchoolId, loading: loadingSchool, error: schoolError } = useActiveSchool(user);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null); // id of teacher being edited (null = creating)
  const [form, setForm] = useState({ full_name: "", user_email: "", phone: "", qualifications: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const loadTeachers = useCallback(async (s) => {
    if (!s) { setTeachers([]); return; }
    const list = await base44.entities.TeacherProfile.filter({ school_id: s.id, is_active: true }, "-created_date", 200);
    setTeachers(list);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(schoolError || "");
    try {
      await loadTeachers(school);
    } catch (e) {
      setErr(e?.message || "Could not load teachers for this school.");
    } finally {
      setLoading(false);
    }
  }, [school, loadTeachers, schoolError]);

  useEffect(() => { if (user && !loadingSchool) load(); }, [user, loadingSchool, load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!school) return;
    setSaving(true);
    setErr("");
    try {
      if (editingId) {
        await base44.entities.TeacherProfile.update(editingId, {
          full_name: form.full_name,
          user_email: form.user_email,
          phone: form.phone,
          qualifications: form.qualifications,
        });
      } else {
        await base44.entities.TeacherProfile.create({
          ...form,
          school_id: school.id,
          is_active: true,
        });
      }
      setForm({ full_name: "", user_email: "", phone: "", qualifications: "" });
      setEditingId(null);
      setShowAdd(false);
      await loadTeachers(school);
    } catch (e2) {
      setErr(e2.message || "Could not save teacher");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setForm({
      full_name: t.full_name || "",
      user_email: t.user_email || "",
      phone: t.phone || "",
      qualifications: t.qualifications || "",
    });
    setErr("");
    setShowAdd(true);
  };

  const closeForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setForm({ full_name: "", user_email: "", phone: "", qualifications: "" });
    setErr("");
  };

  const handleRemove = async (id) => {
    if (!confirm("Remove this teacher from the school?")) return;
    await base44.entities.TeacherProfile.update(id, { is_active: false });
    await loadTeachers(school);
  };

  if (!user || !isSchoolAdmin(user)) return null;

  return (
    <SchoolAdminLayout title="Teachers" subtitle={school ? `${school.name} · ${teachers.length} active` : ""} showBack>
      <SchoolSwitcher schools={schools} activeId={activeSchoolId} onChange={setActiveSchoolId} />
      {loading || loadingSchool ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !school ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
          {user.role === "admin" ? "No schools exist yet." : "Create your school profile first from the dashboard."}
        </div>
      ) : user.role !== "admin" && school.approval_status !== "approved" ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-3">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
          </div>
          <p className="font-bold text-foreground">
            {school.approval_status === "rejected" ? "School registration was not approved" : "Awaiting super admin approval"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {school.approval_status === "rejected"
              ? (school.rejection_reason || "Please contact support for details.")
              : "You'll be able to add teachers once a super admin approves your school. You'll receive an email when this happens."}
          </p>
        </div>
      ) : (
        <>
          {err && <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-xl mb-3">{err}</div>}

          <button
            onClick={() => setShowAdd(true)}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 mb-4"
          >
            <Plus className="w-4 h-4" /> Add Teacher
          </button>

          {teachers.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground">No teachers yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add your first teacher to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teachers.map(t => (
                <div key={t.id} className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                    {(t.full_name || "T").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{t.full_name}</p>
                    {t.user_email ? (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {t.user_email}
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 truncate flex items-center gap-1 mt-0.5 font-semibold">
                        <Mail className="w-3 h-3" /> No email — tap edit to add one
                      </p>
                    )}
                    {t.phone && (
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {t.phone}
                      </p>
                    )}
                    {t.qualifications && <p className="text-[11px] text-muted-foreground mt-1">{t.qualifications}</p>}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(t)} className="text-muted-foreground hover:text-primary p-1" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRemove(t.id)} className="text-muted-foreground hover:text-destructive p-1" title="Remove">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showAdd && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4" onClick={closeForm}>
              <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-foreground">{editingId ? "Edit Teacher" : "Add Teacher"}</h3>
                  <button onClick={closeForm} className="text-muted-foreground"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAdd} className="space-y-3">
                  <Input placeholder="Full name *" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
                  <Input type="email" placeholder="Email *" value={form.user_email} onChange={e => setForm({ ...form, user_email: e.target.value })} required />
                  <p className="text-[11px] text-muted-foreground -mt-1">Email is required so this teacher can be assigned to a class and log in.</p>
                  <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  <Input placeholder="Qualifications" value={form.qualifications} onChange={e => setForm({ ...form, qualifications: e.target.value })} />
                  {err && <p className="text-xs text-destructive">{err}</p>}
                  <button type="submit" disabled={saving || !form.full_name.trim() || !form.user_email.trim()} className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? "Saving..." : editingId ? "Save Changes" : "Save Teacher"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </SchoolAdminLayout>
  );
}