// Admin Panel
import { useState, useEffect, lazy, Suspense } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Trash2, BookOpen, FileText, Users, X, Sparkles, Pencil, Search, Image } from "lucide-react";
import { motion } from "framer-motion";
import QuestionEditor from "@/components/admin/QuestionEditor";
import AdminSidebar, { ADMIN_GROUPS } from "@/components/admin/AdminSidebar";
import AdminDashboard from "@/components/admin/AdminDashboard";

// Lazy-load heavy admin tab components so the panel opens instantly.
// Only the selected tab is downloaded on demand.
const CsvImporter = lazy(() => import("@/components/admin/CsvImporter"));
const PreloadQuestions = lazy(() => import("@/components/admin/PreloadQuestions"));
const GenerateGradeQuestions = lazy(() => import("@/components/admin/GenerateGradeQuestions"));
const CurriculumReferenceManager = lazy(() => import("@/components/admin/CurriculumReferenceManager"));
const ContentCMS = lazy(() => import("@/components/admin/ContentCMS"));
const SyllabusContentGenerator = lazy(() => import("@/components/admin/SyllabusContentGenerator"));
const ContentReviewTab = lazy(() => import("@/components/admin/ContentReviewTab"));
const AnalyticsTab = lazy(() => import("@/components/admin/AnalyticsTab"));
const FeedbackTab = lazy(() => import("@/components/admin/FeedbackTab"));
const QuestionQualityAnalyzer = lazy(() => import("@/components/admin/QuestionQualityAnalyzer"));
const ContentImporter = lazy(() => import("@/components/admin/ContentImporter"));
const NotificationTemplateManager = lazy(() => import("@/components/admin/NotificationTemplateManager"));
const PdfQuestionUploader = lazy(() => import("@/components/admin/PdfQuestionUploader"));
const MockExamBuilder = lazy(() => import("@/components/admin/MockExamBuilder"));
const EnglishCsvUploader = lazy(() => import("@/components/admin/english/EnglishCsvUploader"));
const BulkCSVUploader = lazy(() => import("@/components/admin/BulkCSVUploader"));
const NotesTab = lazy(() => import("@/components/admin/NotesTab"));
const NotificationLogsTab = lazy(() => import("@/components/admin/NotificationLogsTab"));
const TeachersTab = lazy(() => import("@/components/admin/TeachersTab"));
const EmailTemplateManager = lazy(() => import("@/components/admin/EmailTemplateManager"));
const EmailLogsTab = lazy(() => import("@/components/admin/EmailLogsTab"));
const FoundingAdminTab = lazy(() => import("@/components/founding/FoundingAdminTab"));
const BulkEmailTab = lazy(() => import("@/components/admin/BulkEmailTab"));
const CurriculumDashboard = lazy(() => import("@/components/admin/CurriculumDashboard"));
const SchoolsTab = lazy(() => import("@/components/admin/SchoolsTab"));

function TabLoader() {
  return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const { user: authUser } = useAuth();

  useEffect(() => {
    if (authUser !== undefined) {
      setUser(authUser);
      setLoading(false);
      if (authUser?.role === "admin") {
        base44.analytics.track({ eventName: "page_view", properties: { page: "admin", user_email: authUser.email } });
      }
    }
  }, [authUser]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  if (user?.role !== "admin") return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-xl font-bold text-foreground">Admin Only</h1>
      <p className="text-muted-foreground mt-2">You don't have permission to access this area.</p>
    </div>
  );

  // Find current group label for breadcrumb
  const currentGroup = ADMIN_GROUPS.find(g => g.tabs.some(t => t.key === activeTab));
  const currentTabLabel = currentGroup?.tabs.find(t => t.key === activeTab)?.label || activeTab;

  return (
    <div className="min-h-screen bg-background font-jakarta flex">
      <AdminSidebar activeTab={activeTab} onSelect={setActiveTab} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0 pl-12 lg:pl-0">
            <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">{currentGroup?.label}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">/</span>
            <h1 className="text-base font-bold text-foreground truncate">{currentTabLabel}</h1>
          </div>
          <button
            onClick={() => base44.auth.logout()}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-xl transition-colors flex-shrink-0"
          >
            Logout
          </button>
        </div>

        <div className="px-6 py-5 pb-24 overflow-y-auto flex-1">
          <Suspense fallback={<TabLoader />}>
            {activeTab === "Dashboard" && <AdminDashboard onNavigate={setActiveTab} />}
            {activeTab === "CMS" && <ContentCMS />}
            {activeTab === "Subjects" && <SubjectsTab />}
            {activeTab === "Topics" && <TopicsTab />}
            {activeTab === "Notes" && <NotesTab />}
            {activeTab === "Questions" && <QuestionsTab />}
            {activeTab === "Mock Exams" && <MockExamsTab />}
            {activeTab === "Students" && <StudentsTab />}
            {activeTab === "Users" && <UsersTab />}
            {activeTab === "Schools" && <SchoolsTab />}
            {activeTab === "Teachers" && <TeachersTab />}
            {activeTab === "Founding Offer" && <FoundingAdminTab />}
            {activeTab === "Bulk CSV" && <BulkCSVUploader />}
            {activeTab === "Import CSV" && <CsvImporter />}
            {activeTab === "Preload" && <PreloadQuestions />}
            {activeTab === "Generate Grade" && <GenerateGradeQuestions />}
            {activeTab === "Curriculum" && <CurriculumReferenceManager />}
            {activeTab === "Generate" && <SyllabusContentGenerator />}
            {activeTab === "Review" && <ContentReviewTab />}
            {activeTab === "Quality" && <QuestionQualityAnalyzer />}
            {activeTab === "Analytics" && <AnalyticsTab />}
            {activeTab === "Feedback" && <FeedbackTab />}
            {activeTab === "Import Content" && <ContentImporter />}
            {activeTab === "Notifications" && <NotificationTemplateManager />}
            {activeTab === "SMS Logs" && <NotificationLogsTab />}
            {activeTab === "Emails" && <EmailTemplateManager />}
            {activeTab === "Email Logs" && <EmailLogsTab />}
            {activeTab === "Email Centre" && <BulkEmailTab />}
            {activeTab === "PDF Upload" && <PdfQuestionUploader />}
            {activeTab === "Exam Builder" && <MockExamBuilder />}
            {activeTab === "English CSV" && <EnglishCsvUploader />}
            {activeTab === "Curriculum CMS" && <CurriculumDashboard />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function SubjectsTab() {
  const [subjects, setSubjects] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", grade: "Grade 7", icon: "📚", description: "" });
  const [topicCounts, setTopicCounts] = useState({});

  useEffect(() => {
    Promise.all([
      base44.entities.Subject.list(),
      base44.entities.Topic.list(),
    ]).then(([s, t]) => {
      setSubjects(s);
      const counts = {};
      t.forEach(topic => { counts[topic.subject_id] = (counts[topic.subject_id] || 0) + 1; });
      setTopicCounts(counts);
    });
  }, []);

  const save = async () => {
    const existing = subjects.find(s => s.name.trim().toLowerCase() === form.name.trim().toLowerCase() && s.grade === form.grade);
    if (existing) {
      alert(`A subject named "${form.name}" for ${form.grade} already exists.`);
      return;
    }
    const saved = await base44.entities.Subject.create({ ...form, is_active: true });
    setSubjects(s => [...s, saved]);
    setAdding(false);
    setForm({ name: "", grade: "Grade 7", icon: "📚", description: "" });
  };

  const del = async (id) => {
    await base44.entities.Subject.delete(id);
    setSubjects(s => s.filter(x => x.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Subjects ({subjects.length})</h2>
        <button onClick={() => setAdding(true)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 flex-shrink-0">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {adding && (
        <div className="bg-card rounded-2xl p-4 border border-primary/30 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">New Subject</p>
            <button onClick={() => setAdding(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <input placeholder="Subject name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Icon (emoji)" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" />
            <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
              {["Grade 4", "Grade 5", "Grade 6", "Grade 7"].map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <button onClick={save} className="w-full bg-primary text-white py-2 rounded-xl text-sm font-semibold">Save Subject</button>
        </div>
      )}

      <div className="space-y-2">
        {subjects.map(s => (
          <div key={s.id} className="bg-card rounded-2xl p-3 border border-border flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">{s.icon || "📚"}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.grade} · {topicCounts[s.id] || 0} topic{topicCounts[s.id] !== 1 ? "s" : ""}</p>
            </div>
            <button onClick={() => del(s.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopicsTab() {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ subject_id: "", name: "", learning_objectives: "", order: 0 });
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.Subject.list(),
      base44.entities.Topic.list(),
    ]).then(([s, t]) => {
      setSubjects(s);
      setTopics(t.map(topic => ({ ...topic, questionCount: null })));
      // Load counts separately so topics show immediately even if counts are slow
      base44.functions.invoke("getTopicQuestionCounts", {}).then(res => {
        const qCounts = res.data?.counts || {};
        setTopics(t.map(topic => ({ ...topic, questionCount: qCounts[topic.id] || 0 })));
      }).catch(() => {
        setTopics(t.map(topic => ({ ...topic, questionCount: 0 })));
      });
    });
  }, []);

  const save = async () => {
    const saved = await base44.entities.Topic.create({ ...form, order: Number(form.order), is_active: true });
    setTopics(t => [...t, saved]);
    setAdding(false);
    setForm({ subject_id: "", name: "", learning_objectives: "", order: 0 });
  };

  const del = async (id) => { await base44.entities.Topic.delete(id); setTopics(t => t.filter(x => x.id !== id)); };

  const toggleActive = async (topic) => {
    const updated = await base44.entities.Topic.update(topic.id, { is_active: !topic.is_active });
    setTopics(t => t.map(x => x.id === topic.id ? { ...x, is_active: updated.is_active } : x));
  };

  const subjectName = (id) => subjects.find(s => s.id === id)?.name || "—";

  const visibleTopics = topics.filter(t => showInactive ? !t.is_active : t.is_active !== false);
  const inactiveCount = topics.filter(t => t.is_active === false).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Topics ({visibleTopics.length})</h2>
        <button onClick={() => setAdding(true)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 flex-shrink-0"><Plus className="w-4 h-4" />Add</button>
      </div>
      {inactiveCount > 0 && (
        <button
          onClick={() => setShowInactive(v => !v)}
          className={`w-full text-sm font-semibold py-2 rounded-xl border transition-colors flex-shrink-0 ${showInactive ? "bg-amber-500/10 border-amber-500/30 text-amber-600" : "bg-secondary border-border text-muted-foreground"}`}
        >
          {showInactive ? `Showing ${inactiveCount} inactive topics — click to show active` : `⚠️ ${inactiveCount} inactive topics hidden — click to view`}
        </button>
      )}
      {adding && (
        <div className="bg-card rounded-2xl p-4 border border-primary/30 space-y-3">
          <div className="flex justify-between"><p className="font-semibold">New Topic</p><button onClick={() => setAdding(false)}><X className="w-4 h-4 text-muted-foreground" /></button></div>
          <select value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
            <option value="">Select subject...</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="Topic name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" />
          <textarea placeholder="Learning objectives" value={form.learning_objectives} onChange={e => setForm(f => ({ ...f, learning_objectives: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2 text-sm h-20 resize-none bg-background text-foreground" />
          <input type="number" placeholder="Order (1, 2, 3...)" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground" />
          <button onClick={save} className="w-full bg-primary text-white py-2 rounded-xl text-sm font-semibold">Save Topic</button>
        </div>
      )}
      <div className="space-y-2">
        {visibleTopics.map(t => (
          <div key={t.id} className={`bg-card rounded-2xl p-3 border flex items-center gap-3 ${t.is_active === false ? "border-amber-500/30 opacity-70" : "border-border"}`}>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{t.name}</p>
              <p className="text-xs text-muted-foreground truncate">{subjectName(t.subject_id)} · {t.questionCount === null ? "loading..." : `${t.questionCount} question${t.questionCount !== 1 ? "s" : ""}`}</p>
            </div>
            <button
              onClick={() => toggleActive(t)}
              className={`text-xs font-semibold px-2 py-1 rounded-lg border flex-shrink-0 transition-colors ${t.is_active === false ? "border-green-500/40 text-green-600 hover:bg-green-500/10" : "border-border text-muted-foreground hover:bg-secondary"}`}
            >
              {t.is_active === false ? "Activate" : "Deactivate"}
            </button>
            <button onClick={() => del(t.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

const TYPE_LABELS = { mcq: "MCQ", true_false: "T/F", fill_blank: "Fill", matching: "Match", structured: "Struct.", comprehension: "Comp." };
const DIFF_COLORS = { Easy: "bg-green-100 text-green-700", Standard: "bg-blue-100 text-blue-700", Advanced: "bg-red-100 text-red-700" };

function QuestionsTab() {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [totalCount, setTotalCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editorQuestion, setEditorQuestion] = useState(null); // null=closed, false=new, obj=edit
  const [generating, setGenerating] = useState(false);
  const [deduplicating, setDeduplicating] = useState(false);
  const [dedupeResult, setDedupeResult] = useState(null);
  const [genTopicId, setGenTopicId] = useState("");
  const [filterTopic, setFilterTopic] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.Question.list("-created_date", 500),
      base44.entities.Topic.list(),
      base44.entities.Question.list("-created_date", 10000),
    ]).then(([q, t, allQ]) => { setQuestions(q); setTopics(t); setTotalCount(allQ.length); setLoading(false); });
  }, []);

  const del = async (id) => {
    if (!confirm("Delete this question?")) return;
    await base44.entities.Question.delete(id);
    setQuestions(q => q.filter(x => x.id !== id));
  };

  const runDeduplicate = async () => {
    setDeduplicating(true);
    setDedupeResult(null);
    const res = await base44.functions.invoke('deduplicateQuestions', {});
    setDedupeResult(res.data);
    base44.entities.Question.list("-created_date", 500).then(setQuestions);
    setDeduplicating(false);
  };

  const generateForTopic = async () => {
    const topic = topics.find(t => t.id === genTopicId);
    if (!topic) return;
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      model: "claude_opus_4_6",
      prompt: `Generate 25 MCQ questions for ZIMSEC Grade 7, Topic: ${topic.name}.
Rules:
- Simple English, Zimbabwe-based examples, spread correct answers across A-D evenly.
- explanation must be 1-2 simple sentences.
Return JSON: { questions: [{question_text, options:[{label,text}], correct_answer, explanation, difficulty}] }`,
      response_json_schema: { type: "object", properties: { questions: { type: "array", items: { type: "object" } } } }
    });
    const created = [];
    for (const q of (result.questions || [])) {
      const saved = await base44.entities.Question.create({ topic_id: topic.id, subject_id: topic.subject_id, question_text: q.question_text, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation, difficulty: q.difficulty || "Standard", question_type: "mcq", marks: 1, is_active: true });
      created.push(saved);
    }
    setQuestions(q => [...created, ...q]);
    setGenerating(false);
  };

  const handleEditorSave = (saved) => {
    setQuestions(q => {
      const exists = q.find(x => x.id === saved.id);
      return exists ? q.map(x => x.id === saved.id ? saved : x) : [saved, ...q];
    });
    setEditorQuestion(null);
  };

  const topicName = (id) => topics.find(t => t.id === id)?.name || "—";

  const filtered = questions.filter(q => {
    if (filterTopic && q.topic_id !== filterTopic) return false;
    if (search && !q.question_text?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Editor Modal */}
      {editorQuestion !== null && (
        <QuestionEditor
          question={editorQuestion === false ? null : editorQuestion}
          topics={topics}
          onSave={handleEditorSave}
          onCancel={() => setEditorQuestion(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">
          Questions ({filtered.length} shown
          {totalCount !== null && ` · ${totalCount} total`})
        </h2>
        <button onClick={() => setEditorQuestion(false)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..." className="w-full border border-border rounded-xl pl-9 pr-3 py-2 text-sm bg-background text-foreground" />
        </div>
        <select value={filterTopic} onChange={e => setFilterTopic(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
          <option value="">All topics</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* Deduplicate */}
      <div className="bg-destructive/10 rounded-2xl p-4 border border-destructive/30 space-y-2">
        <p className="font-semibold text-sm text-destructive">🧹 Remove Duplicate Questions</p>
        <button onClick={runDeduplicate} disabled={deduplicating} className="w-full bg-destructive text-destructive-foreground py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
          {deduplicating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Scanning...</> : "Remove Duplicates"}
        </button>
        {dedupeResult && <p className="text-xs text-destructive font-medium">✅ Checked {dedupeResult.total_checked} — removed {dedupeResult.duplicates_removed} duplicates</p>}
      </div>

      {/* AI Generate */}
      <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
        <p className="font-semibold text-sm">⚡ AI Generate MCQ Questions</p>
        <select value={genTopicId} onChange={e => setGenTopicId(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground">
          <option value="">Select topic...</option>
          {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button onClick={generateForTopic} disabled={!genTopicId || generating} className="w-full bg-primary text-white py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40">
          {generating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Generate 25 Questions</>}
        </button>
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        {filtered.map(q => (
          <div key={q.id} className="bg-card rounded-2xl p-4 border border-border space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1 mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">{TYPE_LABELS[q.question_type] || q.question_type}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.difficulty] || DIFF_COLORS.Standard}`}>{q.difficulty}</span>
                  <span className="text-xs text-muted-foreground">Ans: {q.correct_answer}</span>
                  {q.image_url && <span className="text-xs flex items-center gap-0.5 text-blue-600"><Image className="w-3 h-3" /> img</span>}
                </div>
                <p className="text-sm font-medium text-foreground">{q.question_text}</p>
                <p className="text-xs text-muted-foreground mt-1">{topicName(q.topic_id)}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0 mt-0.5">
                <button onClick={() => setEditorQuestion(q)} className="text-muted-foreground hover:text-primary">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => del(q.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {q.image_url && <img src={q.image_url} alt="Question" className="h-24 rounded-xl object-cover border border-border" />}
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No questions found.</p>}
      </div>
    </div>
  );
}

const EXPECTED_QUESTIONS = 20; // minimum expected per exam

function MockExamsTab() {
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editNumber, setEditNumber] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [expandedExamId, setExpandedExamId] = useState(null);
  const [examQuestions, setExamQuestions] = useState({});
  const [loadingExamQs, setLoadingExamQs] = useState(false);
  const [editorQuestion, setEditorQuestion] = useState(null);
  const [generatingFor, setGeneratingFor] = useState(null); // exam id being topped up

  useEffect(() => {
    Promise.all([
      base44.entities.MockExam.list("-created_date", 100),
      base44.entities.Subject.list(),
      base44.entities.Topic.list(),
    ]).then(([ex, subs, tps]) => {
      setExams(ex.sort((a, b) => (a.exam_number || 999) - (b.exam_number || 999)));
      setSubjects(subs);
      setTopics(tps);
      setLoading(false);
    });
  }, []);

  const del = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await base44.entities.MockExam.delete(id);
    setExams(e => e.filter(x => x.id !== id));
  };

  const saveNumber = async (id) => {
    const num = Number(editNumber);
    await base44.entities.MockExam.update(id, { exam_number: num || null });
    setExams(e => e.map(x => x.id === id ? { ...x, exam_number: num || null } : x).sort((a, b) => (a.exam_number || 999) - (b.exam_number || 999)));
    setEditingId(null);
  };

  const saveTitle = async (id) => {
    if (!renameTitle.trim()) return;
    await base44.entities.MockExam.update(id, { title: renameTitle.trim() });
    setExams(e => e.map(x => x.id === id ? { ...x, title: renameTitle.trim() } : x));
    setRenamingId(null);
  };

  const subjectName = (id) => subjects.find(s => s.id === id)?.name || "—";

  const toggleExamQuestions = async (exam) => {
    if (expandedExamId === exam.id) { setExpandedExamId(null); return; }
    setExpandedExamId(exam.id);
    if (examQuestions[exam.id]) return;
    setLoadingExamQs(true);
    const idSet = new Set(exam.question_ids || []);
    const all = await base44.entities.Question.list("-created_date", 1000);
    const qs = all.filter(q => idSet.has(q.id));
    setExamQuestions(prev => ({ ...prev, [exam.id]: qs }));
    setLoadingExamQs(false);
  };

  const handleEditorSave = (saved) => {
    setExamQuestions(prev => {
      const updated = {};
      for (const [eid, qs] of Object.entries(prev)) {
        updated[eid] = qs.map(q => q.id === saved.id ? saved : q);
      }
      return updated;
    });
    setEditorQuestion(null);
  };

  const topUpQuestions = async (exam) => {
    const current = (exam.question_ids || []).length;
    const needed = EXPECTED_QUESTIONS - current;
    if (needed <= 0) return;

    setGeneratingFor(exam.id);
    const subject = subjects.find(s => s.id === exam.subject_id);
    const examTopics = topics.filter(t => t.subject_id === exam.subject_id);
    const topicList = examTopics.map(t => t.name).join(", ") || exam.title;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate ${needed} MCQ questions for a ZIMSEC ${exam.grade} mock exam on: ${subject?.name || exam.title}.
Topics to cover: ${topicList}.
Rules: Simple English, Zimbabwe-based examples, spread correct answers A-D evenly, 1-2 sentence explanations.
Return JSON: { questions: [{question_text, options:[{label,text}], correct_answer, explanation, difficulty}] }`,
      response_json_schema: { type: "object", properties: { questions: { type: "array", items: { type: "object" } } } }
    });

    const newIds = [...(exam.question_ids || [])];
    for (const q of (result.questions || [])) {
      if (!q.question_text?.trim() || !q.correct_answer?.trim()) continue;
      const saved = await base44.entities.Question.create({
        subject_id: exam.subject_id,
        question_text: q.question_text.trim(),
        options: q.options || [],
        correct_answer: q.correct_answer.trim(),
        explanation: q.explanation || "",
        difficulty: q.difficulty || "Standard",
        question_type: "mcq",
        marks: 1,
        is_active: true,
      });
      newIds.push(saved.id);
    }
    await base44.entities.MockExam.update(exam.id, { question_ids: newIds, total_marks: newIds.length });
    setExams(prev => prev.map(e => e.id === exam.id ? { ...e, question_ids: newIds, total_marks: newIds.length } : e));
    setGeneratingFor(null);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {editorQuestion && (
        <QuestionEditor question={editorQuestion} topics={topics} onSave={handleEditorSave} onCancel={() => setEditorQuestion(null)} />
      )}
      <h2 className="text-lg font-bold">Mock Exams ({exams.length})</h2>
      <p className="text-xs text-muted-foreground">Tap the # badge to assign an exam number. Each exam should have at least {EXPECTED_QUESTIONS} questions.</p>
      {exams.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No mock exams yet</p>
        </div>
      )}
      <div className="space-y-3">
        {exams.map(exam => (
          <div key={exam.id} className="bg-card rounded-2xl border border-border overflow-hidden">
            {/* Exam header row */}
            <div className="flex items-center gap-3 p-4">
              {editingId === exam.id ? (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input type="number" value={editNumber} onChange={e => setEditNumber(e.target.value)} placeholder="#" className="w-14 border border-primary rounded-lg px-2 py-1 text-sm text-center font-bold bg-background text-foreground" autoFocus />
                  <button onClick={() => saveNumber(exam.id)} className="text-xs bg-primary text-white px-2 py-1 rounded-lg font-semibold">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-muted-foreground"><X className="w-3 h-3" /></button>
                </div>
              ) : (
                <button onClick={() => { setEditingId(exam.id); setEditNumber(exam.exam_number || ""); }} className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-xs text-primary hover:bg-primary/20 transition-colors" title="Set exam number">
                  {exam.exam_number ? `#${exam.exam_number}` : <FileText className="w-4 h-4" />}
                </button>
              )}
              <div className="flex-1 min-w-0">
                {renamingId === exam.id ? (
                  <div className="flex items-center gap-2">
                    <input type="text" value={renameTitle} onChange={e => setRenameTitle(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveTitle(exam.id); if (e.key === "Escape") setRenamingId(null); }} className="flex-1 border border-primary rounded-lg px-2 py-1 text-sm font-semibold bg-background text-foreground" autoFocus />
                    <button onClick={() => saveTitle(exam.id)} className="text-xs bg-primary text-white px-2 py-1 rounded-lg font-semibold">Save</button>
                    <button onClick={() => setRenamingId(null)} className="text-xs text-muted-foreground"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm">{exam.title}</p>
                    <button onClick={() => { setRenamingId(exam.id); setRenameTitle(exam.title); }} className="text-muted-foreground hover:text-primary transition-colors" title="Rename">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {(() => {
                  const qCount = (exam.question_ids || []).length;
                  const low = qCount < EXPECTED_QUESTIONS;
                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-muted-foreground">{subjectName(exam.subject_id)} · {exam.grade} · {exam.duration_minutes} min · {exam.total_marks} marks</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${low ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {qCount}/{EXPECTED_QUESTIONS} Qs {low ? "⚠️" : "✅"}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {(exam.question_ids || []).length < EXPECTED_QUESTIONS && (
                  <button
                    onClick={() => topUpQuestions(exam)}
                    disabled={generatingFor === exam.id}
                    className="text-xs font-semibold text-amber-700 border border-amber-400/40 bg-amber-50 px-2 py-1 rounded-lg hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1"
                    title={`Generate ${EXPECTED_QUESTIONS - (exam.question_ids || []).length} more questions`}
                  >
                    {generatingFor === exam.id
                      ? <><div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-600 rounded-full animate-spin" />Generating...</>
                      : <><Sparkles className="w-3 h-3" />Top Up</>}
                  </button>
                )}
                <button onClick={() => toggleExamQuestions(exam)} className="text-xs font-semibold text-primary border border-primary/30 px-2 py-1 rounded-lg hover:bg-primary/5">
                  {expandedExamId === exam.id ? "Hide" : "Questions"}
                </button>
                <button onClick={() => del(exam.id, exam.title)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Expanded questions */}
            {expandedExamId === exam.id && (
              <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-2">
                {loadingExamQs && !examQuestions[exam.id] ? (
                  <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
                ) : (examQuestions[exam.id] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">No questions linked to this exam.</p>
                ) : (
                  (examQuestions[exam.id] || []).map((q, idx) => (
                    <div key={q.id} className="bg-card rounded-xl p-3 border border-border flex items-start gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-5 flex-shrink-0 mt-0.5">{idx + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-1 mb-1">
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{TYPE_LABELS[q.question_type] || q.question_type}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFF_COLORS[q.difficulty] || DIFF_COLORS.Standard}`}>{q.difficulty}</span>
                        </div>
                        <p className="text-sm text-foreground">{q.question_text}</p>
                        {q.image_url && <img src={q.image_url} alt="" className="h-16 rounded-lg mt-1 object-cover border border-border" />}
                      </div>
                      <button onClick={() => setEditorQuestion(q)} className="text-muted-foreground hover:text-primary flex-shrink-0">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const ROLE_FILTERS = [
  { key: "all", label: "All" },
  { key: "admin", label: "Admin" },
  { key: "school_admin", label: "School Admin" },
  { key: "teacher", label: "Teacher" },
  { key: "parent", label: "Parent" },
  { key: "student", label: "Student" },
  { key: "user", label: "User" },
];

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterContact, setFilterContact] = useState(false);
  const [filterPending, setFilterPending] = useState(false);
  const [filterRole, setFilterRole] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingRole, setUpdatingRole] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { user: currentUser } = useAuth();

  const loadUsers = () => {
    setLoading(true);
    base44.entities.User.list("-created_date", 1000).then(u => { setUsers(u); setLoading(false); });
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleRole = async (u) => {
    if (u.email === currentUser?.email) return; // can't change own role
    const newRole = u.role === "admin" ? "user" : "admin";
    if (!confirm(`${newRole === "admin" ? "Grant admin access to" : "Remove admin access from"} ${u.full_name || u.email}?`)) return;
    setUpdatingRole(u.id);
    await base44.entities.User.update(u.id, { role: newRole });
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
    setUpdatingRole(null);
  };

  const changeRole = async (u, newRole) => {
    if (u.email === currentUser?.email) return;
    if (!newRole || newRole === (u.role || "user")) return;
    if (!confirm(`Change ${u.full_name || u.email}'s role to "${newRole}"?`)) return;
    setUpdatingRole(u.id);
    await base44.entities.User.update(u.id, { role: newRole });
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x));
    setUpdatingRole(null);
  };

  const deleteUser = async (u) => {
    if (u.email === currentUser?.email) { alert("You can't delete your own account from here."); return; }
    const warning = `Permanently delete ${u.full_name || u.email}?\n\nThis will remove:\n• Their user account\n• All child profiles\n• Practice results, bookmarks & homework\n\nBilling records are kept for tax/legal compliance.\n\nThis cannot be undone.`;
    if (!confirm(warning)) return;
    setDeletingId(u.id);
    try {
      const res = await base44.functions.invoke("adminDeleteUser", { user_id: u.id, user_email: u.email });
      if (res?.data?.success) {
        setUsers(prev => prev.filter(x => x.id !== u.id));
      } else {
        alert(res?.data?.error || "Failed to delete user.");
      }
    } catch (e) {
      alert(e?.message || "Failed to delete user.");
    }
    setDeletingId(null);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const withContact = users.filter(u => u.contact_number);
  const pendingDeletion = users.filter(u => u.account_deletion_requested);

  // Count users per role for the filter pills
  const roleCounts = users.reduce((acc, u) => {
    const r = u.role || "user";
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {});

  const q = search.trim().toLowerCase();
  let displayed = users;
  if (filterPending) displayed = pendingDeletion;
  else if (filterContact) displayed = withContact;
  if (filterRole !== "all") displayed = displayed.filter(u => (u.role || "user") === filterRole);
  if (q) displayed = displayed.filter(u =>
    (u.email || "").toLowerCase().includes(q) ||
    (u.full_name || "").toLowerCase().includes(q)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">Users ({users.length})</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadUsers}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => { setFilterPending(p => !p); setFilterContact(false); }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${filterPending ? "border-destructive bg-destructive/10 text-destructive" : "border-border text-muted-foreground"}`}
          >
            🗑️ Pending Deletion ({pendingDeletion.length})
          </button>
          <button
            onClick={() => { setFilterContact(f => !f); setFilterPending(false); }}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${filterContact ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
          >
            📞 With Contact ({withContact.length})
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by email or name..."
          className="w-full border border-border rounded-xl pl-9 pr-3 py-2 text-sm bg-background text-foreground"
        />
      </div>

      {/* Role filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {ROLE_FILTERS.map(rf => {
          const count = rf.key === "all" ? users.length : (roleCounts[rf.key] || 0);
          const active = filterRole === rf.key;
          return (
            <button
              key={rf.key}
              onClick={() => setFilterRole(rf.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
            >
              {rf.label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Pending deletion banner */}
      {pendingDeletion.length > 0 && !filterPending && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-sm text-destructive font-medium flex items-center justify-between gap-2">
          <span>🗑️ {pendingDeletion.length} user{pendingDeletion.length !== 1 ? "s" : ""} requested account deletion</span>
          <button
            onClick={() => setFilterPending(true)}
            className="text-xs font-bold underline hover:no-underline"
          >
            Review →
          </button>
        </div>
      )}

      {/* Contact summary banner */}
      {withContact.length > 0 && !filterPending && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
          ✅ {withContact.length} of {users.length} users have provided contact details
        </div>
      )}

      <div className="space-y-3">
        {displayed.map(u => (
          <div key={u.id} className={`bg-card rounded-2xl p-4 border space-y-2 ${u.account_deletion_requested ? "border-destructive/40" : "border-border"}`}>
            {u.account_deletion_requested && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-xs text-destructive flex items-center justify-between gap-2">
                <span className="font-semibold">
                  🗑️ Requested deletion{u.account_deletion_requested_at ? ` on ${new Date(u.account_deletion_requested_at).toLocaleDateString()}` : ""}
                </span>
              </div>
            )}
            {u.account_deletion_reason && (
              <p className="text-xs italic text-muted-foreground bg-secondary/50 rounded-lg px-3 py-1.5">"{u.account_deletion_reason}"</p>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm">
                {(u.full_name || u.email || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{u.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground">{u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.role === "admin" ? "bg-primary/10 text-primary" : u.role === "teacher" ? "bg-emerald-500/10 text-emerald-600" : u.role === "school_admin" ? "bg-violet-500/10 text-violet-600" : "bg-secondary text-muted-foreground"}`}>
                  {u.role || "user"}
                </span>
                {u.email !== currentUser?.email && (
                  <select
                    value={u.role || "user"}
                    onChange={(e) => changeRole(u, e.target.value)}
                    disabled={updatingRole === u.id}
                    className="text-xs font-semibold px-2 py-1.5 rounded-xl border border-border bg-background text-foreground disabled:opacity-40 cursor-pointer"
                    title="Change role"
                  >
                    <option value="user">user</option>
                    <option value="teacher">teacher</option>
                    <option value="school_admin">school_admin</option>
                    <option value="admin">admin</option>
                  </select>
                )}
                {u.email !== currentUser?.email && (
                  <button
                    onClick={() => deleteUser(u)}
                    disabled={deletingId === u.id}
                    className="text-xs font-semibold px-2 py-1.5 rounded-xl border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 flex items-center gap-1"
                    title="Permanently delete user and their personal data"
                  >
                    {deletingId === u.id ? "..." : <><Trash2 className="w-3 h-3" /> Delete</>}
                  </button>
                )}
              </div>
            </div>
            {/* Contact details */}
            {(u.parent_name || u.contact_number) && (
              <div className="bg-secondary/50 rounded-xl px-3 py-2 flex flex-wrap gap-4 text-xs">
                {u.parent_name && (
                  <span className="flex items-center gap-1 text-foreground">
                    👤 <span className="font-semibold">{u.parent_name}</span>
                  </span>
                )}
                {u.contact_number && (
                  <a href={`tel:${u.contact_number}`} className="flex items-center gap-1 text-primary font-semibold">
                    📞 {u.contact_number}
                  </a>
                )}
              </div>
            )}
            {!u.parent_name && !u.contact_number && (
              <p className="text-xs text-muted-foreground italic px-1">No contact info provided</p>
            )}
          </div>
        ))}
        {displayed.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">No users found.</p>}
      </div>
    </div>
  );
}

function StudentsTab() {
  const [results, setResults] = useState([]);

  useEffect(() => { base44.entities.StudentResult.list("-created_date", 50).then(setResults); }, []);

  const studentMap = {};
  results.forEach(r => {
    if (!studentMap[r.student_email]) studentMap[r.student_email] = [];
    studentMap[r.student_email].push(r);
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Student Performance ({Object.keys(studentMap).length} students)</h2>
      {Object.entries(studentMap).map(([email, recs]) => {
        const avg = Math.round(recs.reduce((s, r) => s + (r.percentage || 0), 0) / recs.length);
        return (
          <div key={email} className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-sm truncate">{email}</p>
              <span className={`text-sm font-bold ${avg >= 70 ? "text-green-600" : avg >= 50 ? "text-amber-600" : "text-red-600"}`}>{avg}%</span>
            </div>
            <div className="flex gap-2">
              <span className="text-xs text-muted-foreground">{recs.length} sessions</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{recs.filter(r => r.session_type === "mock_exam").length} mock exams</span>
            </div>
            <div className="mt-2 bg-muted rounded-full h-2">
              <div className="rounded-full h-2 transition-all" style={{ width: `${avg}%`, backgroundColor: avg >= 70 ? "#22c55e" : avg >= 50 ? "#f59e0b" : "#ef4444" }} />
            </div>
          </div>
        );
      })}
      {Object.keys(studentMap).length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No student data yet</p>
        </div>
      )}
    </div>
  );
}