import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isSchoolAdmin } from "@/lib/schoolRoles";
import { useActiveSchool } from "@/lib/useActiveSchool";
import SchoolAdminLayout from "@/components/school/SchoolAdminLayout";
import SchoolSwitcher from "@/components/school/SchoolSwitcher";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TeacherSearchSelect from "@/components/school/TeacherSearchSelect";
import { Plus, BookOpen, Loader2, Users, X, Trash2, UserCog, Pencil } from "lucide-react";

const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

export default function SchoolAdminClasses() {
  const { user } = useAuth();
  const { schools, school, activeSchoolId, setActiveSchoolId, loading: loadingSchool } = useActiveSchool(user);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", grade: "Grade 4", teacher_email: "", academic_year: "2026" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [assignFor, setAssignFor] = useState(null); // class being reassigned
  const [assignEmail, setAssignEmail] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

  const load = useCallback(async () => {
    if (!school) { setClasses([]); setTeachers([]); setLoading(false); return; }
    setLoading(true);
    const [cls, tch] = await Promise.all([
      base44.entities.SchoolClass.filter({ school_id: school.id, is_active: true }, "-created_date", 200),
      base44.entities.TeacherProfile.filter({ school_id: school.id, is_active: true }, "-created_date", 200),
    ]);
    setClasses(cls);
    setTeachers(tch);
    setLoading(false);
  }, [school]);

  useEffect(() => { if (user && !loadingSchool) load(); }, [user, loadingSchool, load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!school) return;
    setSaving(true);
    setErr("");
    try {
      if (editingId) {
        await base44.entities.SchoolClass.update(editingId, {
          name: form.name,
          grade: form.grade,
          teacher_email: form.teacher_email || "",
          academic_year: form.academic_year,
        });
      } else {
        await base44.entities.SchoolClass.create({
          ...form,
          school_id: school.id,
          student_emails: [],
          is_active: true,
        });
      }
      setForm({ name: "", grade: "Grade 4", teacher_email: "", academic_year: "2026" });
      setEditingId(null);
      setShowAdd(false);
      await load();
    } catch (e2) {
      setErr(e2.message || (editingId ? "Could not update class" : "Could not create class"));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      name: c.name || "",
      grade: c.grade || "Grade 4",
      teacher_email: c.teacher_email || "",
      academic_year: c.academic_year || "2026",
    });
    setErr("");
    setShowAdd(true);
  };

  const closeForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setForm({ name: "", grade: "Grade 4", teacher_email: "", academic_year: "2026" });
    setErr("");
  };

  const handleRemove = async (id) => {
    if (!confirm("Archive this class?")) return;
    await base44.entities.SchoolClass.update(id, { is_active: false });
    await load();
  };

  const openAssign = (cls) => {
    setAssignFor(cls);
    setAssignEmail(cls.teacher_email || "");
  };

  const handleAssignSave = async () => {
    if (!assignFor) return;
    setAssignSaving(true);
    try {
      await base44.entities.SchoolClass.update(assignFor.id, { teacher_email: assignEmail || "" });
      setAssignFor(null);
      await load();
    } finally {
      setAssignSaving(false);
    }
  };

  const teacherNameFor = (email) => teachers.find(t => t.user_email === email)?.full_name || (email ? email : "Unassigned");

  if (!user || !isSchoolAdmin(user)) return null;

  return (
    <SchoolAdminLayout title="Classes" subtitle={school ? `${school.name} · ${classes.length} active` : ""} showBack>
      <SchoolSwitcher schools={schools} activeId={activeSchoolId} onChange={setActiveSchoolId} />
      {loading || loadingSchool ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : !school ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">
          Create your school profile first.
        </div>
      ) : (
        <>
          <button onClick={() => setShowAdd(true)} className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 mb-4">
            <Plus className="w-4 h-4" /> Create Class
          </button>

          {classes.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground">No classes yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create your first class to organise students.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {classes.map(c => (
                <div key={c.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.grade} · {c.academic_year || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(c)} className="text-muted-foreground hover:text-primary p-1" title="Edit class">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRemove(c.id)} className="text-muted-foreground hover:text-destructive p-1" title="Archive class">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">👩‍🏫 {teacherNameFor(c.teacher_email)}</span>
                    <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" /> {c.student_emails?.length || 0} students</span>
                  </div>
                  <button
                    onClick={() => openAssign(c)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 text-xs font-semibold text-primary border border-primary/30 rounded-xl py-2 hover:bg-primary/5"
                  >
                    <UserCog className="w-3.5 h-3.5" />
                    {c.teacher_email ? "Change teacher" : "Assign teacher"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {assignFor && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4" onClick={() => setAssignFor(null)}>
              <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-foreground">Assign teacher</h3>
                  <button onClick={() => setAssignFor(null)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Class: <span className="font-semibold text-foreground">{assignFor.name}</span> ({assignFor.grade})
                </p>
                <TeacherSearchSelect
                  teachers={teachers}
                  value={assignEmail}
                  onChange={setAssignEmail}
                />
                {teachers.filter(t => t.user_email).length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-2">
                    No teachers with an email yet. Add one on the Teachers page first, or type an email above.
                  </p>
                )}
                <button
                  onClick={handleAssignSave}
                  disabled={assignSaving}
                  className="mt-4 w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {assignSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          )}

          {showAdd && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4" onClick={closeForm}>
              <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-foreground">{editingId ? "Edit Class" : "Create Class"}</h3>
                  <button onClick={closeForm} className="text-muted-foreground"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAdd} className="space-y-3">
                  <Input placeholder="Class name (e.g. Grade 5A) *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  <Select value={form.grade} onValueChange={v => setForm({ ...form, grade: v })}>
                    <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                      {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <TeacherSearchSelect
                    teachers={teachers}
                    value={form.teacher_email}
                    onChange={(v) => setForm({ ...form, teacher_email: v })}
                  />
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    {teachers.filter(t => t.user_email).length === 0
                      ? "No teachers with an email yet — type one in the search box or leave blank to assign later."
                      : "Search by teacher name or email, or type a new email."}
                  </p>
                  <Input placeholder="Academic year" value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} />
                  {err && <p className="text-xs text-destructive">{err}</p>}
                  <button type="submit" disabled={saving || !form.name.trim()} className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? "Saving..." : editingId ? "Save Changes" : "Create Class"}
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