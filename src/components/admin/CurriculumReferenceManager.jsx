import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  Upload, Trash2, FileText, BookOpen, HelpCircle, FileCheck,
  X, CheckCircle, AlertCircle, Zap, Eye, ChevronDown, ChevronUp
} from "lucide-react";

const REFERENCE_TYPES = [
  { value: "syllabus", label: "Syllabus", icon: BookOpen, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "question_bank", label: "Question Bank", icon: HelpCircle, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { value: "notes_template", label: "Notes Template", icon: FileText, color: "text-green-600 bg-green-50 border-green-200" },
  { value: "marking_scheme", label: "Marking Scheme", icon: FileCheck, color: "text-orange-600 bg-orange-50 border-orange-200" },
];

const TYPE_META = Object.fromEntries(REFERENCE_TYPES.map(t => [t.value, t]));

export default function CurriculumReferenceManager() {
  const [refs, setRefs] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [generating, setGenerating] = useState(null); // topic_id being generated
  const [genResult, setGenResult] = useState(null);
  const fileRef = useRef();

  const [form, setForm] = useState({
    title: "",
    reference_type: "syllabus",
    subject_id: "",
    topic_id: "",
    grade: "Grade 7",
  });
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.CurriculumReference.list("-created_date", 100),
      base44.entities.Subject.filter({ is_active: true }),
      base44.entities.Topic.list("order", 500),
    ]).then(([r, s, t]) => {
      setRefs(r);
      setSubjects(s);
      setTopics(t);
      setLoading(false);
    });
  }, []);

  const filteredTopics = topics.filter(t => t.subject_id === form.subject_id);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setSelectedFile(f);
    if (!form.title) setForm(prev => ({ ...prev, title: f.name.replace(/\.[^.]+$/, "") }));
  };

  const handleUpload = async () => {
    if (!selectedFile || !form.title || !form.reference_type) return;
    
    // Validate file size (max 50MB for large files)
    const maxSize = 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setUploadResult({ success: false, message: `File too large (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB). Max 50MB allowed.` });
      return;
    }
    
    setUploading(true);
    setUploadResult(null);

    try {
      // 1. Upload file
      setUploadResult({ success: true, message: `Uploading ${selectedFile.name}... (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB)` });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });

      // 2. Extract text content via LLM (with chunking for very large files)
      setUploadResult({ success: true, message: `Extracting text from ${form.reference_type}... (this may take 30–60 seconds for large files)` });
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract and return all the educational text content from this document. Preserve headings, topic names, learning objectives, questions and answers, key facts, and curriculum structure. Return plain text only — no markdown, no commentary.`,
        file_urls: [file_url],
        model: "gemini_3_flash",
      });

      // 3. Save the reference record
      setUploadResult({ success: true, message: `Saving "${form.title}" to database...` });
      const saved = await base44.entities.CurriculumReference.create({
        ...form,
        file_url,
        file_name: selectedFile.name,
        file_type: selectedFile.name.split(".").pop().toLowerCase(),
        extracted_text: typeof extracted === "string" ? extracted : JSON.stringify(extracted),
        is_active: true,
      });

      setRefs(prev => [saved, ...prev]);
      setUploadResult({ success: true, message: `✅ "${saved.title}" uploaded, indexed, and ready to use for content generation.` });
      setSelectedFile(null);
      setForm({ title: "", reference_type: "syllabus", subject_id: "", topic_id: "", grade: "Grade 7" });
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setUploadResult({ success: false, message: e.message || "Upload failed. Please try a smaller file or check your connection." });
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this reference document?")) return;
    await base44.entities.CurriculumReference.delete(id);
    setRefs(prev => prev.filter(r => r.id !== id));
  };

  const handleGenerateWithRef = async (ref) => {
    if (!ref.subject_id) return alert("This reference has no subject linked. Please re-upload with a subject.");
    setGenerating(ref.id);
    setGenResult(null);
    try {
      const res = await base44.functions.invoke("generateWithCurriculum", {
        referenceId: ref.id,
        subjectId: ref.subject_id,
        topicId: ref.topic_id || null,
        contentType: ref.reference_type === "question_bank" ? "questions" : "questions",
        numItems: 10,
      });
      setGenResult({ success: true, message: `Generated ${res.data?.generated || 0} new questions using "${ref.title}".` });
    } catch (e) {
      setGenResult({ success: false, message: e.message || "Generation failed." });
    }
    setGenerating(null);
  };

  const subjectName = (id) => subjects.find(s => s.id === id)?.name || "—";
  const topicName = (id) => topics.find(t => t.id === id)?.name || null;

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Upload Panel */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Upload className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Upload Reference Document</h3>
            <p className="text-xs text-muted-foreground">PDF, TXT, or CSV — AI will read and index the content</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <input
            placeholder="Document title *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full border border-border rounded-xl px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.reference_type}
              onChange={e => setForm(f => ({ ...f, reference_type: e.target.value }))}
              className="border border-border rounded-xl px-3 py-2 text-sm"
            >
              {REFERENCE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <select
              value={form.grade}
              onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}
              className="border border-border rounded-xl px-3 py-2 text-sm"
            >
              {["Grade 4", "Grade 5", "Grade 6", "Grade 7"].map(g => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.subject_id}
              onChange={e => setForm(f => ({ ...f, subject_id: e.target.value, topic_id: "" }))}
              className="border border-border rounded-xl px-3 py-2 text-sm"
            >
              <option value="">Subject (optional)</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              value={form.topic_id}
              onChange={e => setForm(f => ({ ...f, topic_id: e.target.value }))}
              disabled={!form.subject_id || filteredTopics.length === 0}
              className="border border-border rounded-xl px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">Topic (optional)</option>
              {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* File picker */}
          <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors ${selectedFile ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/40"}`}>
            <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {selectedFile ? (
                <p className="text-sm font-medium text-primary truncate">{selectedFile.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click to select PDF, TXT, or CSV file</p>
              )}
            </div>
            {selectedFile && (
              <button
                type="button"
                onClick={e => { e.preventDefault(); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                className="text-muted-foreground hover:text-destructive flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.txt,.csv" onChange={handleFileChange} className="hidden" />
          </label>

          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !form.title}
            className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 text-sm"
          >
            {uploading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Uploading & indexing...</>
            ) : (
              <><Upload className="w-4 h-4" />Upload & Index</>
            )}
          </button>

          {uploadResult && (
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${uploadResult.success ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {uploadResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {uploadResult.message}
            </div>
          )}
        </div>
      </div>

      {uploading && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          <p className="font-semibold mb-1">⏳ Processing your document...</p>
          <p className="text-xs">The AI is reading and extracting content from your file. This may take 15–30 seconds depending on file size.</p>
        </div>
      )}

      {/* Gen Result */}
      {genResult && (
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${genResult.success ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-700"}`}>
          {genResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {genResult.message}
        </div>
      )}

      {/* Existing References */}
      <div>
        <h3 className="font-bold text-foreground mb-3">Indexed References ({refs.length})</h3>
        {refs.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-card rounded-2xl border border-border">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-semibold">No reference documents yet</p>
            <p className="text-xs mt-1">Upload a syllabus or question bank above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {refs.map(ref => {
              const meta = TYPE_META[ref.reference_type] || TYPE_META.syllabus;
              const Icon = meta.icon;
              const isExpanded = expandedId === ref.id;
              return (
                <div key={ref.id} className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{ref.title}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${meta.color}`}>{meta.label}</span>
                        {ref.subject_id && <span className="text-xs text-muted-foreground">{subjectName(ref.subject_id)}</span>}
                        {ref.topic_id && <span className="text-xs text-muted-foreground">· {topicName(ref.topic_id)}</span>}
                        {ref.grade && <span className="text-xs text-muted-foreground">· {ref.grade}</span>}
                        {ref.extracted_text && (
                          <span className="text-xs text-green-600 font-medium">✓ Indexed</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {ref.extracted_text && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : ref.id)}
                          className="text-xs text-muted-foreground border border-border px-2 py-1 rounded-lg hover:bg-secondary transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                      {ref.subject_id && (
                        <button
                          onClick={() => handleGenerateWithRef(ref)}
                          disabled={generating === ref.id}
                          className="flex items-center gap-1 text-xs font-semibold text-primary border border-primary/30 px-2 py-1 rounded-lg hover:bg-primary/5 disabled:opacity-40"
                        >
                          {generating === ref.id ? (
                            <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          Generate
                        </button>
                      )}
                      <button onClick={() => handleDelete(ref.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {isExpanded && ref.extracted_text && (
                    <div className="border-t border-border bg-secondary/20 px-4 py-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Extracted Content Preview</p>
                      <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap line-clamp-10">
                        {ref.extracted_text.slice(0, 1500)}{ref.extracted_text.length > 1500 ? "..." : ""}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}