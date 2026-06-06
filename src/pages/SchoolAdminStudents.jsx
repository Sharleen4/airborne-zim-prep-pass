import { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isSchoolAdmin } from "@/lib/schoolRoles";
import { useActiveSchool } from "@/lib/useActiveSchool";
import SchoolAdminLayout from "@/components/school/SchoolAdminLayout";
import SchoolSwitcher from "@/components/school/SchoolSwitcher";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, GraduationCap, Loader2, X, Trash2, Search } from "lucide-react";

const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

export default function SchoolAdminStudents() {
  const { user } = useAuth();
  const { schools, school, activeSchoolId, setActiveSchoolId, loading: loadingSchool } = useActiveSchool(user);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ full_name: "", user_email: "", grade: "Grade 4", class_id: "", parent_email: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");

  const load = useCallback(async () => {
    if (!school) { setStudents([]); setClasses([]); setLoading(false); return; }
    setLoading(true);
    const [stu, cls] = await Promise.all([
      base44.entities.StudentProfile.filter({ school_id: school.id, is_active: true }, "-created_date", 500),
      base44.entities.SchoolClass.filter({ school_id: school.id, is_active: true }, "-created_date", 200),
    ]);
    setStudents(stu);
    setClasses(cls);
    setLoading(false);
  }, [school]);

  useEffect(() => { if (user && !loadingSchool) load(); }, [user, loadingSchool, load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!school) return;
    setSaving(true);
    setErr("");
    try {
      const payload = {
        full_name: form.full_name.trim(),
        user_email: form.user_email.trim(),
        parent_email: form.parent_email.trim(),
        grade: form.grade,
        class_id: form.class_id || undefined,
        school_id: school.id,
        is_active: true,
      };
      const created = await base44.entities.StudentProfile.create(payload);

      // Add to class roster if assigned
      if (form.class_id && form.user_email) {
        const cls = classes.find(c => c.id === form.class_id);
        if (cls) {
          const updated = Array.from(new Set([...(cls.student_emails || []), form.user_email.trim()]));
          await base44.entities.SchoolClass.update(cls.id, { student_emails: updated });
        }
      }

      setForm({ full_name: "", user_email: "", grade: "Grade 4", class_id: "", parent_email: "" });
      setShowAdd(false);
      await load();
    } catch (e2) {
      setErr(e2.message || "Could not add student");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (s) => {
    if (!confirm("Remove this student?")) return;
    await base44.entities.StudentProfile.update(s.id, { is_active: false });
    await load();
  };

  const classNameFor = (id) => classes.find(c => c.id === id)?.name || "—";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter(s => {
      if (filterClass !== "all" && s.class_id !== filterClass) return false;
      if (!q) return true;
      return (
        s.full_name?.toLowerCase().includes(q) ||
        s.user_email?.toLowerCase().includes(q) ||
        s.parent_email?.toLowerCase().includes(q)
      );
    });
  }, [students, search, filterClass]);

  if (!user || !isSchoolAdmin(user)) return null;

  return (
    <SchoolAdminLayout title="Students" subtitle={school ? `${school.name} · ${students.length} enrolled` : ""} showBack>
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
            <Plus className="w-4 h-4" /> Add Student
          </button>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search students" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <GraduationCap className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-semibold text-foreground">No students found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(s => (
                <div key={s.id} className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold flex-shrink-0">
                    {(s.full_name || "S").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.grade} · {classNameFor(s.class_id)}</p>
                    {s.parent_email && <p className="text-[11px] text-muted-foreground truncate mt-0.5">Parent: {s.parent_email}</p>}
                  </div>
                  <button onClick={() => handleRemove(s)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAdd && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4" onClick={() => setShowAdd(false)}>
              <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-foreground">Add Student</h3>
                  <button onClick={() => setShowAdd(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleAdd} className="space-y-3">
                  <Input placeholder="Full name *" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
                  <Input type="email" placeholder="Student email (optional)" value={form.user_email} onChange={e => setForm({ ...form, user_email: e.target.value })} />
                  <Input type="email" placeholder="Parent email" value={form.parent_email} onChange={e => setForm({ ...form, parent_email: e.target.value })} />
                  <Select value={form.grade} onValueChange={v => setForm({ ...form, grade: v })}>
                    <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                    <SelectContent>
                      {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={form.class_id || "_none"} onValueChange={v => setForm({ ...form, class_id: v === "_none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Assign to class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">No class</SelectItem>
                      {classes.filter(c => c.grade === form.grade).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {err && <p className="text-xs text-destructive">{err}</p>}
                  <button type="submit" disabled={saving || !form.full_name.trim()} className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? "Saving..." : "Save Student"}
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