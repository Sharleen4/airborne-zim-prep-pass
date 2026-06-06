import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Save } from "lucide-react";
import { saveLocalRecord } from "@/lib/teacherRecordsStore";

const RECORD_TYPES = [
  { value: "test", label: "Test" },
  { value: "exercise", label: "Exercise" },
  { value: "exam", label: "Exam" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
  { value: "project", label: "Project" },
  { value: "other", label: "Other" },
];

export default function RecordResultModal({ user, classes, onClose, onSaved }) {
  const [classId, setClassId] = useState(classes[0]?.id || "");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [recordType, setRecordType] = useState("test");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [score, setScore] = useState("");
  const [outOf, setOutOf] = useState("100");
  const [dateTaken, setDateTaken] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cls = useMemo(() => classes.find(c => c.id === classId), [classes, classId]);
  const studentOptions = cls?.student_emails || [];

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!studentName.trim() || !title.trim()) {
      setError("Student name and title are required");
      return;
    }
    const scoreNum = score === "" ? null : Number(score);
    const outNum = outOf === "" ? null : Number(outOf);
    if (scoreNum != null && outNum != null && outNum <= 0) {
      setError("'Out of' must be greater than 0");
      return;
    }
    const percentage = scoreNum != null && outNum ? Math.round((scoreNum / outNum) * 100) : null;

    setSaving(true);
    try {
      await saveLocalRecord({
        teacher_email: user.email,
        school_id: cls?.school_id || null,
        class_id: classId || null,
        class_name: cls?.name || null,
        student_name: studentName.trim(),
        student_email: studentEmail.trim() || null,
        record_type: recordType,
        title: title.trim(),
        subject: subject.trim() || null,
        score: scoreNum,
        out_of: outNum,
        percentage,
        date_taken: dateTaken,
        notes: notes.trim() || null,
        synced: false,
      });
      onSaved?.();
    } catch (err) {
      setError(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-3xl border border-border max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between z-10">
          <div>
            <p className="font-bold text-foreground">Record a result</p>
            <p className="text-[10px] text-muted-foreground">Works offline — syncs when you're back online</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground p-1.5 rounded-lg hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Class</label>
            <select
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setStudentName(""); setStudentEmail(""); }}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">— No class (free entry) —</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.grade})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Student name *</label>
              {studentOptions.length > 0 ? (
                <select
                  value={studentEmail}
                  onChange={(e) => {
                    const em = e.target.value;
                    setStudentEmail(em);
                    if (em && em !== "__manual__") setStudentName(em.split("@")[0]);
                  }}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Pick student...</option>
                  {studentOptions.map(em => <option key={em} value={em}>{em}</option>)}
                  <option value="__manual__">Type name manually</option>
                </select>
              ) : null}
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Tendai M."
                className={studentOptions.length > 0 ? "mt-2" : ""}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Type</label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {RECORD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Term 2 Maths Test"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Maths" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Score</label>
              <Input type="number" min="0" step="0.5" value={score} onChange={(e) => setScore(e.target.value)} placeholder="42" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Out of</label>
              <Input type="number" min="1" step="1" value={outOf} onChange={(e) => setOutOf(e.target.value)} placeholder="50" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Date</label>
            <Input type="date" value={dateTaken} onChange={(e) => setDateTaken(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Notes (optional)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Observations, areas for follow-up..." />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save record"}
          </button>
        </form>
      </div>
    </div>
  );
}