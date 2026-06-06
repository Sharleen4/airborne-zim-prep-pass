import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";

export default function HomeworkFormModal({ teacher, classes, schoolId, homework, onClose, onSaved }) {
  const isEdit = !!homework;
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({
    class_id: homework?.class_id || "",
    subject_id: homework?.subject_id || "",
    title: homework?.title || "",
    instructions: homework?.instructions || "",
    due_date: homework?.due_date || "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    base44.entities.Subject.filter({ is_active: true }, "name", 200).then(setSubjects).catch(() => {});
  }, []);

  const selectedClass = classes.find(c => c.id === form.class_id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const payload = {
        teacher_email: teacher.email,
        school_id: schoolId,
        class_id: form.class_id,
        subject_id: form.subject_id,
        grade: selectedClass?.grade,
        title: form.title.trim(),
        instructions: form.instructions.trim(),
        due_date: form.due_date,
        assigned_date: new Date().toISOString().split("T")[0],
        is_active: true,
      };
      if (isEdit) {
        await base44.entities.SchoolHomework.update(homework.id, payload);
      } else {
        await base44.entities.SchoolHomework.create(payload);
      }
      onSaved?.();
    } catch (e2) {
      setErr(e2.message || "Could not save homework");
    } finally {
      setSaving(false);
    }
  };

  const filteredSubjects = selectedClass
    ? subjects.filter(s => !s.grade || s.grade === selectedClass.grade)
    : subjects;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-foreground">{isEdit ? "Edit Homework" : "Create Homework"}</h3>
          <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Select value={form.class_id} onValueChange={v => setForm({ ...form, class_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select class *" /></SelectTrigger>
            <SelectContent>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.grade})</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={form.subject_id} onValueChange={v => setForm({ ...form, subject_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select subject *" /></SelectTrigger>
            <SelectContent>
              {filteredSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <Textarea placeholder="Instructions" rows={4} value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} />
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Due date *</label>
            <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required />
          </div>

          {err && <p className="text-xs text-destructive">{err}</p>}
          <button
            type="submit"
            disabled={saving || !form.title.trim() || !form.class_id || !form.subject_id || !form.due_date}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Saving..." : isEdit ? "Update Homework" : "Create Homework"}
          </button>
        </form>
      </div>
    </div>
  );
}