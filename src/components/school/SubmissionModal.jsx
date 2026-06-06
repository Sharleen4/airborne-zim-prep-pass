import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, Upload, CheckCircle2 } from "lucide-react";

export default function SubmissionModal({ homework, studentProfile, existing, onClose, onSubmitted }) {
  const [text, setText] = useState(existing?.submission_text || "");
  const [fileUrl, setFileUrl] = useState(existing?.submission_file_url || "");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    setErr("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setFileUrl(file_url);
    } catch (e2) {
      setErr(e2.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() && !fileUrl) { setErr("Add text or upload a file"); return; }
    setSubmitting(true);
    setErr("");
    try {
      const today = new Date().toISOString().split("T")[0];
      const isLate = homework.due_date && today > homework.due_date;
      const payload = {
        homework_id: homework.id,
        student_email: studentProfile.user_email || studentProfile.parent_email,
        student_name: studentProfile.full_name,
        class_id: homework.class_id,
        school_id: homework.school_id,
        submission_date: new Date().toISOString(),
        status: isLate ? "late" : "submitted",
        submission_text: text.trim(),
        submission_file_url: fileUrl,
      };
      if (existing) {
        await base44.entities.HomeworkSubmission.update(existing.id, payload);
      } else {
        await base44.entities.HomeworkSubmission.create(payload);
      }
      onSubmitted?.();
    } catch (e2) {
      setErr(e2.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center px-4" onClick={onClose}>
      <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-foreground">Submit Homework</h3>
          <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <p className="font-semibold text-sm text-foreground">{homework.title}</p>
        <p className="text-xs text-muted-foreground mb-4">Due {homework.due_date}</p>

        {homework.instructions && (
          <div className="bg-secondary rounded-xl p-3 text-sm text-foreground whitespace-pre-wrap mb-3">
            {homework.instructions}
          </div>
        )}

        <Textarea
          rows={5}
          placeholder="Type your answer here..."
          value={text}
          onChange={e => setText(e.target.value)}
          className="mb-3"
        />

        <label className="block bg-secondary border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/40">
          <input type="file" className="hidden" onChange={handleFile} accept="image/*,application/pdf" />
          {uploading ? (
            <span className="inline-flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</span>
          ) : fileUrl ? (
            <span className="inline-flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="w-4 h-4" /> File attached — tap to replace</span>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Upload className="w-4 h-4" /> Upload photo or PDF</span>
          )}
        </label>

        {err && <p className="text-xs text-destructive mt-2">{err}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm mt-4 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Submitting..." : existing ? "Update Submission" : "Submit"}
        </button>
      </div>
    </div>
  );
}