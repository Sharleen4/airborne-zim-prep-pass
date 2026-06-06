import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Trash2, Pencil, Eye, EyeOff, BookOpen, HelpCircle, ChevronDown, ChevronUp, X, Send } from "lucide-react";
import QuestionEditor from "./QuestionEditor";
import BackfillNoteImages from "./BackfillNoteImages";
import { toast } from "sonner";

// review_status: "pending_review" | "approved" | "published"
// is_active: false = hidden from students, true = live

export default function ContentReviewTab() {
  const [questions, setQuestions] = useState([]);
  const [notes, setNotes] = useState([]);
  const [topics, setTopics] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("questions");
  const [expandedId, setExpandedId] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [savingNote, setSavingNote] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [allTopics, setAllTopics] = useState([]);
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterStatus, setFilterStatus] = useState("generated"); // "generated" | "pending_review" | "approved"
  const [publishedSubjects, setPublishedSubjects] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.Question.filter({ is_active: false }, "-created_date", 500),
      base44.entities.Note.filter({ is_active: false }, "-created_date", 500),
      base44.entities.Topic.list("order", 500),
      base44.entities.Subject.list(),
    ]).then(([q, n, t, s]) => {
      setQuestions(q);
      setNotes(n);
      setTopics(t);
      setAllTopics(t);
      setSubjects(s);
      setPublishedSubjects(s.filter(sub => sub.is_active !== false));
      setLoading(false);
    });
  }, []);

  const topicName = (id) => topics.find(t => t.id === id)?.name || "—";

  // --- Questions ---
  // Approve = mark as reviewed/ready but still hidden (is_active stays false)
  const approveQuestion = async (q) => {
    // If no review_status yet (generated), move to pending_review first
    const newStatus = !q.review_status ? "pending_review" : "approved";
    await base44.entities.Question.update(q.id, { review_status: newStatus });
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, review_status: newStatus } : x));
    toast.success(newStatus === "pending_review" ? "Question moved to Pending Review." : "Question approved — ready to publish.");
  };

  // Publish = make live for students
  const publishQuestion = async (q) => {
    await base44.entities.Question.update(q.id, { is_active: true, review_status: "published" });
    setQuestions(prev => prev.filter(x => x.id !== q.id));
    toast.success("Question published and live!");
  };

  // Send back to pending review
  const pendingQuestion = async (q) => {
    await base44.entities.Question.update(q.id, { review_status: "pending_review", is_active: false });
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, review_status: "pending_review" } : x));
    toast.success("Question moved back to pending review.");
  };

  const deleteQuestion = async (q) => {
    if (!confirm("Delete this draft question?")) return;
    await base44.entities.Question.delete(q.id);
    setQuestions(prev => prev.filter(x => x.id !== q.id));
  };

  const handleQuestionSave = (saved) => {
    setQuestions(prev => prev.map(q => q.id === saved.id ? { ...saved, is_active: false } : q));
    setEditingQuestion(null);
  };

  // --- Notes ---
  const approveNote = async (n) => {
    await base44.entities.Note.update(n.id, { review_status: "approved" });
    setNotes(prev => prev.map(x => x.id === n.id ? { ...x, review_status: "approved" } : x));
    toast.success("Note approved — ready to publish.");
  };

  const publishNote = async (n) => {
    await base44.entities.Note.update(n.id, { is_active: true, review_status: "published" });
    setNotes(prev => prev.filter(x => x.id !== n.id));
    toast.success("Note published and live!");
  };

  const pendingNote = async (n) => {
    await base44.entities.Note.update(n.id, { review_status: "pending_review", is_active: false });
    setNotes(prev => prev.map(x => x.id === n.id ? { ...x, review_status: "pending_review" } : x));
    toast.success("Note moved back to pending review.");
  };

  const deleteNote = async (n) => {
    if (!confirm("Delete this draft note?")) return;
    try {
      await base44.entities.Note.delete(n.id);
    } catch (e) {
      if (!e.message?.includes("not found")) throw e;
    }
    setNotes(prev => prev.filter(x => x.id !== n.id));
  };

  const saveNoteEdit = async () => {
    if (!editingNote) return;
    setSavingNote(true);
    const { id, created_date, updated_date, created_by, ...fields } = editingNote;
    if (!fields.topic_id) { setSavingNote(false); alert("Topic is required"); return; }
    await base44.entities.Note.update(id, fields);
    setNotes(prev => prev.map(n => n.id === id ? { ...editingNote } : n));
    setSavingNote(false);
    setEditingNote(null);
    toast.success("Note saved successfully!");
  };

  const updateNoteTopic = async (noteId, newTopicId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const newTopic = allTopics.find(t => t.id === newTopicId);
    if (!newTopic) return;
    await base44.entities.Note.update(noteId, { topic_id: newTopicId, subject_id: newTopic.subject_id });
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, topic_id: newTopicId, subject_id: newTopic.subject_id } : n));
  };

  const saveTopic = async () => {
    if (!editingTopic || !editingTopic.name.trim()) return;
    await base44.entities.Topic.update(editingTopic.id, { name: editingTopic.name });
    const updatedTopic = { ...editingTopic };
    setAllTopics(prev => prev.map(t => t.id === editingTopic.id ? updatedTopic : t));
    setTopics(prev => prev.map(t => t.id === editingTopic.id ? updatedTopic : t));
    setEditingTopic(null);
    toast.success("Topic name updated!");
  };

  // "generated" = is_active:false with no review_status (generated from curriculum)
  // "pending_review" = has review_status: pending_review
  // "approved" = has review_status: approved

  const filteredQuestions = questions.filter(q => {
    if (filterStatus === "generated") return !q.review_status;
    return q.review_status === filterStatus;
  });
  const filteredNotes = notes.filter(n => {
    if (filterStatus === "generated") return !n.review_status;
    return n.review_status === filterStatus;
  });

  const generatedQCount = questions.filter(q => !q.review_status).length;
  const pendingQCount = questions.filter(q => q.review_status === "pending_review").length;
  const approvedQCount = questions.filter(q => q.review_status === "approved").length;
  const generatedNCount = notes.filter(n => !n.review_status).length;
  const pendingNCount = notes.filter(n => n.review_status === "pending_review").length;
  const approvedNCount = notes.filter(n => n.review_status === "approved").length;

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Topic editor modal */}
      {editingTopic && editingTopic.name !== undefined && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Edit Topic</h2>
              <button onClick={() => setEditingTopic(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <input
              value={editingTopic.name || ""}
              onChange={e => setEditingTopic(t => ({ ...t, name: e.target.value }))}
              placeholder="Topic name"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex gap-3">
              <button onClick={saveTopic} className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl text-sm">Save</button>
              <button onClick={() => setEditingTopic(null)} className="flex-1 border border-border text-sm font-semibold py-2.5 rounded-xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Note editor modal */}
      {editingNote && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Edit Note</h2>
              <button onClick={() => setEditingNote(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block capitalize">Topic Title</label>
              <input
                value={editingNote.suggested_topic || ""}
                onChange={e => setEditingNote(n => ({ ...n, suggested_topic: e.target.value }))}
                placeholder="Topic title..."
                className="w-full border border-border rounded-xl px-3 py-2 text-sm font-semibold"
              />
            </div>
            {["overview", "key_definitions", "key_concepts", "zimbabwe_examples", "important_facts", "common_mistakes", "summary", "exam_tips"].map(field => (
              <div key={field}>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block capitalize">{field.replace(/_/g, " ")}</label>
                <textarea
                  value={editingNote[field] || ""}
                  onChange={e => setEditingNote(n => ({ ...n, [field]: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm h-20 resize-none"
                />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={saveNoteEdit} disabled={savingNote} className="flex-1 bg-primary text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {savingNote ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</> : "Save Changes"}
              </button>
              <button onClick={() => setEditingNote(null)} className="flex-1 border border-border text-sm font-semibold py-2.5 rounded-xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Question editor modal */}
      {editingQuestion && (
        <QuestionEditor
          question={editingQuestion}
          topics={topics}
          onSave={handleQuestionSave}
          onCancel={() => setEditingQuestion(null)}
        />
      )}

      <BackfillNoteImages />

      {/* Header — explains the 3-step flow */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
        <p className="font-bold mb-1">🔍 Content Review Queue</p>
        <p className="text-xs">
          3-step flow: <strong>Pending Review</strong> → <span className="text-blue-700 font-semibold">Approved (hidden)</span> → <span className="text-green-700 font-semibold">Published (live)</span>.
          Approve content as you build topics. Publish only when ready for students.
        </p>
      </div>

      {/* Subject filter */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Filter by subject</label>
        <select
          value={filterSubjectId}
          onChange={e => setFilterSubjectId(e.target.value)}
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-card text-foreground"
        >
          <option value="">Show all subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>)}
        </select>
      </div>

      {/* Section toggle: Questions | Notes | Published Subjects */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setActiveSection("questions")}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-semibold text-sm transition-colors ${activeSection === "questions" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
        >
          <HelpCircle className="w-4 h-4" />
          Q's
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${(generatedQCount + pendingQCount) > 0 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>
            {generatedQCount + pendingQCount + approvedQCount}
          </span>
        </button>
        <button
          onClick={() => setActiveSection("notes")}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-semibold text-sm transition-colors ${activeSection === "notes" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
        >
          <BookOpen className="w-4 h-4" />
          Notes
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${pendingNCount > 0 ? "bg-orange-100 text-orange-700" : "bg-muted text-muted-foreground"}`}>
            {pendingNCount + approvedNCount}
          </span>
        </button>
        <button
          onClick={() => setActiveSection("published")}
          className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-semibold text-sm transition-colors ${activeSection === "published" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
        >
          👁️
          <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-muted text-muted-foreground">
            {publishedSubjects.length}
          </span>
        </button>
      </div>

      {/* Status sub-tabs for Questions and Notes */}
      {(activeSection === "questions" || activeSection === "notes") && (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setFilterStatus("generated")}
            className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${filterStatus === "generated" ? "border-violet-400 bg-violet-50 text-violet-700" : "border-border text-muted-foreground"}`}
          >
            ⚡ Generated
            <span className="ml-1.5 font-bold">({activeSection === "questions" ? generatedQCount : generatedNCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus("pending_review")}
            className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${filterStatus === "pending_review" ? "border-orange-400 bg-orange-50 text-orange-700" : "border-border text-muted-foreground"}`}
          >
            ⏳ Pending
            <span className="ml-1.5 font-bold">({activeSection === "questions" ? pendingQCount : pendingNCount})</span>
          </button>
          <button
            onClick={() => setFilterStatus("approved")}
            className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${filterStatus === "approved" ? "border-blue-400 bg-blue-50 text-blue-700" : "border-border text-muted-foreground"}`}
          >
            ✅ Approved
            <span className="ml-1.5 font-bold">({activeSection === "questions" ? approvedQCount : approvedNCount})</span>
          </button>
        </div>
      )}

      {/* Bulk actions */}
      {activeSection === "questions" && filterStatus === "generated" && filteredQuestions.length > 1 && (
        <button
          onClick={async () => {
            if (!confirm(`Move ${filteredQuestions.length} generated questions to Pending Review?`)) return;
            for (const q of filteredQuestions) await base44.entities.Question.update(q.id, { review_status: "pending_review" });
            setQuestions(prev => prev.map(q => filteredQuestions.find(f => f.id === q.id) ? { ...q, review_status: "pending_review" } : q));
            setFilterStatus("pending_review");
            toast.success(`${filteredQuestions.length} questions moved to Pending Review.`);
          }}
          className="w-full bg-violet-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          ⚡ Move All to Pending Review
        </button>
      )}
      {activeSection === "questions" && filterStatus === "pending_review" && filteredQuestions.length > 1 && (
        <button
          onClick={async () => {
            const toApprove = filterSubjectId
              ? filteredQuestions.filter(q => { const topic = topics.find(t => t.id === q.topic_id); return topic?.subject_id !== filterSubjectId; })
              : filteredQuestions;
            if (toApprove.length === 0) { alert("No questions to approve (filter is protecting them)"); return; }
            if (!confirm(`Approve ${toApprove.length} questions? They will remain hidden until you publish.`)) return;
            for (const q of toApprove) await base44.entities.Question.update(q.id, { review_status: "approved" });
            setQuestions(prev => prev.map(q => toApprove.find(t => t.id === q.id) ? { ...q, review_status: "approved" } : q));
            toast.success(`${toApprove.length} questions approved and awaiting publish.`);
          }}
          className="w-full bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" /> Approve All {filterSubjectId ? `(except filtered)` : ""} Questions
        </button>
      )}
      {activeSection === "questions" && filterStatus === "approved" && filteredQuestions.length > 0 && (
        <button
          onClick={async () => {
            const toPublish = filterSubjectId
              ? filteredQuestions.filter(q => { const topic = topics.find(t => t.id === q.topic_id); return topic?.subject_id !== filterSubjectId; })
              : filteredQuestions;
            if (!confirm(`Publish ${toPublish.length} questions live to students?`)) return;
            for (const q of toPublish) await base44.entities.Question.update(q.id, { is_active: true, review_status: "published" });
            setQuestions(prev => prev.filter(q => !toPublish.find(t => t.id === q.id)));
            toast.success(`${toPublish.length} questions are now live!`);
          }}
          className="w-full bg-green-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> Publish All {filterSubjectId ? `(except filtered)` : ""} Questions Live
        </button>
      )}
      {activeSection === "notes" && filterStatus === "pending_review" && filteredNotes.length > 1 && (
        <button
          onClick={async () => {
            const toApprove = filterSubjectId
              ? filteredNotes.filter(n => { const topic = topics.find(t => t.id === n.topic_id); return topic?.subject_id !== filterSubjectId; })
              : filteredNotes;
            if (toApprove.length === 0) { alert("No notes to approve (filter is protecting them)"); return; }
            if (!confirm(`Approve ${toApprove.length} notes? They will remain hidden until you publish.`)) return;
            for (const n of toApprove) await base44.entities.Note.update(n.id, { review_status: "approved" });
            setNotes(prev => prev.map(n => toApprove.find(t => t.id === n.id) ? { ...n, review_status: "approved" } : n));
            toast.success(`${toApprove.length} notes approved and awaiting publish.`);
          }}
          className="w-full bg-blue-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" /> Approve All {filterSubjectId ? `(except filtered)` : ""} Notes
        </button>
      )}
      {activeSection === "notes" && filterStatus === "approved" && filteredNotes.length > 0 && (
        <button
          onClick={async () => {
            const toPublish = filterSubjectId
              ? filteredNotes.filter(n => { const topic = topics.find(t => t.id === n.topic_id); return topic?.subject_id !== filterSubjectId; })
              : filteredNotes;
            if (!confirm(`Publish ${toPublish.length} notes live to students?`)) return;
            for (const n of toPublish) await base44.entities.Note.update(n.id, { is_active: true, review_status: "published" });
            setNotes(prev => prev.filter(n => !toPublish.find(t => t.id === n.id)));
            toast.success(`${toPublish.length} notes are now live!`);
          }}
          className="w-full bg-green-500 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" /> Publish All {filterSubjectId ? `(except filtered)` : ""} Notes Live
        </button>
      )}

      {/* Questions list */}
      {activeSection === "questions" && (
        <div className="space-y-3">
          {filteredQuestions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
              <p className="font-semibold">No questions in this stage.</p>
            </div>
          )}
          {filteredQuestions.map(q => {
            const isOpen = expandedId === q.id;
            const isApproved = q.review_status === "approved";
            return (
              <div key={q.id} className={`bg-card rounded-2xl border overflow-hidden ${isApproved ? "border-blue-300/60" : "border-border"}`}>
                <div className="flex items-start gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">{topicName(q.topic_id)} · <span className={`font-medium ${q.difficulty === "Easy" ? "text-green-600" : q.difficulty === "Advanced" ? "text-red-600" : "text-blue-600"}`}>{q.difficulty}</span></p>
                    <p className="text-sm font-medium text-foreground line-clamp-2">{q.question_text}</p>
                  </div>
                  <button onClick={() => setExpandedId(isOpen ? null : q.id)} className="text-muted-foreground flex-shrink-0 mt-1">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-2">
                    {q.comprehension_passage && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-foreground whitespace-pre-line">{q.comprehension_passage}</div>
                    )}
                    {(!q.options || q.options.length === 0) && (
                      <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700 font-semibold">
                        ⚠️ No options — click Edit to add MCQ options manually.
                      </div>
                    )}
                    {q.options && q.options.length > 0 && (
                      <div className="space-y-1.5">
                        {q.options.filter(opt => opt && opt.label).map((opt, i) => (
                          <div key={opt.label || i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${opt.label === q.correct_answer ? "bg-green-50 border border-green-300 font-semibold text-green-800" : "bg-white border border-border text-foreground"}`}>
                            <span className="font-bold w-5 flex-shrink-0">{opt.label}.</span>
                            <span>{opt.text}</span>
                            {opt.label === q.correct_answer && <CheckCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0 text-green-600" />}
                          </div>
                        ))}
                      </div>
                    )}
                    {!q.correct_answer && (
                      <p className="text-xs text-red-600 font-semibold px-1">⚠️ No correct answer set — click Edit to fix.</p>
                    )}
                    {q.explanation
                      ? <p className="text-xs text-muted-foreground italic px-1">💡 {q.explanation}</p>
                      : <p className="text-xs text-amber-600 font-semibold px-1">⚠️ No explanation — click Edit to add one.</p>
                    }
                  </div>
                )}

                <div className="flex gap-2 px-4 pb-4 pt-1">
                  {isApproved ? (
                    <>
                      <button onClick={() => publishQuestion(q)} className="flex-1 bg-green-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                        <Send className="w-3.5 h-3.5" /> Publish Live
                      </button>
                      <button onClick={() => pendingQuestion(q)} className="flex-1 bg-amber-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                        ↩ Pending
                      </button>
                    </>
                  ) : !q.review_status ? (
                    <button onClick={() => approveQuestion(q)} className="flex-1 bg-violet-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Move to Review
                    </button>
                  ) : (
                    <button onClick={() => approveQuestion(q)} className="flex-1 bg-blue-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  <button onClick={() => setEditingQuestion(q)} className="flex-1 border border-primary text-primary text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => deleteQuestion(q)} className="flex-1 border border-destructive text-destructive text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes list */}
      {activeSection === "notes" && (
        <div className="space-y-3">
          {filteredNotes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
              <p className="font-semibold">No notes in this stage.</p>
            </div>
          )}
          {filteredNotes.map(n => {
            const isOpen = expandedId === n.id;
            const isApproved = n.review_status === "approved";
            return (
              <div key={n.id} className={`bg-card rounded-2xl border overflow-hidden ${isApproved ? "border-blue-300/60" : "border-border"}`}>
                <div className="flex items-start gap-3 p-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-foreground">{n.suggested_topic || topicName(n.topic_id)}</p>
                      <button
                        onClick={() => {
                          const topic = allTopics.find(t => t.id === n.topic_id);
                          if (topic) setEditingTopic({ ...topic });
                        }}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="Edit topic"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <select
                        value={n.topic_id}
                        onChange={e => updateNoteTopic(n.id, e.target.value)}
                        className="text-xs border border-border rounded-lg px-2 py-1 bg-background text-foreground"
                        onClick={e => e.stopPropagation()}
                      >
                        {allTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.overview || "No overview"}</p>
                  </div>
                  <button onClick={() => setExpandedId(isOpen ? null : n.id)} className="text-muted-foreground flex-shrink-0">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-2">
                    {[
                      { label: "Overview", key: "overview" },
                      { label: "Key Definitions", key: "key_definitions" },
                      { label: "Key Concepts", key: "key_concepts" },
                      { label: "Zimbabwe Examples", key: "zimbabwe_examples" },
                      { label: "Important Facts", key: "important_facts" },
                      { label: "Common Mistakes", key: "common_mistakes" },
                      { label: "Summary", key: "summary" },
                      { label: "Exam Tips", key: "exam_tips" },
                    ].map(({ label, key }) => n[key] ? (
                      <div key={key}>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                        <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">{n[key]}</p>
                      </div>
                    ) : null)}
                  </div>
                )}

                <div className="flex gap-2 px-4 pb-4 pt-1">
                  {isApproved ? (
                    <>
                      <button onClick={() => publishNote(n)} className="flex-1 bg-green-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                        <Send className="w-3.5 h-3.5" /> Publish Live
                      </button>
                      <button onClick={() => pendingNote(n)} className="flex-1 bg-amber-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                        ↩ Pending
                      </button>
                    </>
                  ) : (
                    <button onClick={() => approveNote(n)} className="flex-1 bg-blue-500 text-white text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  <button onClick={() => setEditingNote({ ...n, suggested_topic: n.suggested_topic || topicName(n.topic_id) })} className="flex-1 border border-primary text-primary text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => deleteNote(n)} className="flex-1 border border-destructive text-destructive text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Published subjects list */}
      {activeSection === "published" && (
        <div className="space-y-3">
          {publishedSubjects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-card rounded-2xl border border-border">
              <Eye className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="font-semibold">No published subjects</p>
            </div>
          ) : (
            publishedSubjects.map(sub => (
              <div key={sub.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{sub.icon || "📚"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">{sub.grade}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm(`Unpublish "${sub.name}"?`)) return;
                    await base44.entities.Subject.update(sub.id, { is_active: false });
                    setPublishedSubjects(prev => prev.filter(s => s.id !== sub.id));
                  }}
                  className="border border-destructive text-destructive text-xs font-semibold py-1.5 px-3 rounded-lg hover:bg-destructive/5 transition-colors flex-shrink-0"
                >
                  Unpublish
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}