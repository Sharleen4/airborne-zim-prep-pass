import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, Sparkles, Copy, Check, FileText, FileType, Presentation, Save, Pencil, BookmarkCheck, Play } from "lucide-react";
import LessonPlanSection from "./LessonPlanSection";
import TeachingImageGenerator from "./TeachingImageGenerator";
import KeyDefinitionsSection from "./KeyDefinitionsSection";
import TeacherGuidanceSection from "./TeacherGuidanceSection";
import TeachingNotesSection from "./TeachingNotesSection";
import PresentationMode from "./PresentationMode";
import { WorkedExamplesSection, ClassExerciseSection } from "./MathsWorkedExamples";
import { exportPdf, exportDocx, exportPptx, formatPlanAsText, sectionLabel } from "@/lib/lessonExporters";
import { useAuth } from "@/lib/AuthContext";

const UNIVERSAL_LIST_FIELDS = [
  "learning_objectives", "competencies", "knowledge", "skills", "values",
  "resources_needed", "teacher_activities", "learner_activities",
  "suggested_teaching_images", "suggested_teaching_resources",
];

export default function LessonPlanModal({ topic, targetObjective = "", partNumber = 1, totalParts = 1, numeracySkills = [], onClose }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState(null);
  const [sectionOrder, setSectionOrder] = useState([]);
  const [templateKey, setTemplateKey] = useState("");
  const [notesUsed, setNotesUsed] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToDashboard, setSavedToDashboard] = useState(false);
  const [savingDashboard, setSavingDashboard] = useState(false);
  const [savedLessonId, setSavedLessonId] = useState(null);
  const [exporting, setExporting] = useState("");
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    if (!topic) return;
    setLoading(true);
    setError("");
    base44.functions.invoke("generateLessonPlan", {
      curriculum_topic_id: topic.id,
      target_objective: targetObjective || "",
      part_number: partNumber,
      total_parts: totalParts,
      numeracy_skills: numeracySkills || [],
    })
      .then(res => {
        setPlan(res.data.lesson_plan);
        setSectionOrder(res.data.section_order || []);
        setTemplateKey(res.data.template_key || "");
        setNotesUsed(res.data.notes_used || 0);
      })
      .catch(e => setError(e?.response?.data?.error || e.message || "Failed to generate lesson plan"))
      .finally(() => setLoading(false));
  }, [topic, targetObjective, partNumber, totalParts, numeracySkills]);

  const updateField = (key, value) => setPlan(p => ({ ...p, [key]: value }));

  const copy = async () => {
    if (!plan) return;
    await navigator.clipboard.writeText(formatPlanAsText(topic, plan, sectionOrder));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = async (kind) => {
    if (!plan) return;
    setExporting(kind);
    try {
      if (kind === "pdf") exportPdf(topic, plan, sectionOrder);
      else if (kind === "docx") await exportDocx(topic, plan, sectionOrder);
      else if (kind === "pptx") await exportPptx(topic, plan);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    // Local save — persisted to localStorage so the teacher can return to it later.
    try {
      const key = `lesson_plan_${topic.id}`;
      localStorage.setItem(key, JSON.stringify({ plan, sectionOrder, saved_at: Date.now() }));
      setEditing(false);
      // If this lesson was already saved to the dashboard, keep that copy in sync with edits.
      if (savedLessonId) {
        await base44.entities.SavedLesson.update(savedLessonId, {
          lesson_title: plan.lesson_title,
          duration: plan.duration,
          plan,
          section_order: sectionOrder,
        }).catch(() => {});
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveToDashboard = async () => {
    if (!user || !plan) return;
    setSavingDashboard(true);
    try {
      const payload = {
        teacher_email: user.email,
        curriculum_topic_id: topic.id,
        subject: topic.subject,
        grade: topic.grade,
        topic: topic.topic,
        subtopic: topic.subtopic || "",
        curriculum_code: topic.curriculum_code || "",
        lesson_title: plan.lesson_title || `${topic.topic}${topic.subtopic ? " — " + topic.subtopic : ""}`,
        duration: plan.duration || "",
        plan,
        section_order: sectionOrder,
        template_key: templateKey,
        is_active: true,
        description: `${topic.subject} · ${topic.grade}${topic.curriculum_code ? " · " + topic.curriculum_code : ""}`,
      };
      const created = await base44.entities.SavedLesson.create(payload);
      setSavedLessonId(created.id);
      setSavedToDashboard(true);
      setTimeout(() => setSavedToDashboard(false), 2500);
    } catch (e) {
      setError(e.message || "Could not save to dashboard");
    } finally {
      setSavingDashboard(false);
    }
  };

  if (!topic) return null;

  // Sections that come from the subject template (exclude universal handling
  // and the structured Maths-only fields, which are rendered by dedicated components).
  const subjectSections = sectionOrder.filter(s => ![
    "lesson_information", "learning_objectives", "homework",
    "worked_example_1", "worked_example_2", "class_exercise",
  ].includes(s));

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-3xl bg-card rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between gap-2 z-10">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Heritage-Based Lesson Plan</p>
            <h2 className="font-bold text-foreground truncate">{plan?.lesson_title || `${topic.topic}${topic.subtopic ? " — " + topic.subtopic : ""}`}</h2>
            <p className="text-[11px] text-muted-foreground">
              {topic.subject} · {topic.grade}{topic.curriculum_code ? " · " + topic.curriculum_code : ""}
              {notesUsed > 0 && <span className="ml-1 text-emerald-600 font-semibold">· {notesUsed} approved note{notesUsed !== 1 ? "s" : ""} used</span>}
            </p>
            {targetObjective && (
              <p className="text-[11px] text-primary font-semibold mt-1 truncate" title={targetObjective}>
                🎯 Focused on: {targetObjective}
              </p>
            )}
            {totalParts > 1 && (
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                📚 Lesson series · Part {partNumber} of {totalParts}
              </p>
            )}
            {numeracySkills?.length > 0 && (
              <p className="text-[11px] text-amber-600 font-semibold mt-0.5 truncate">
                🔢 Skills: {numeracySkills.join(", ")}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 flex-shrink-0"><X className="w-5 h-5" /></button>
        </div>

        {/* Toolbar */}
        {plan && !loading && (
          <div className="sticky top-[68px] bg-card/95 backdrop-blur border-b border-border px-5 py-2 flex flex-wrap gap-1.5 z-10">
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={saving}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 ${editing ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
            >
              {editing ? <><Save className="w-3 h-3" /> {saving ? "Saving..." : "Save"}</> : <><Pencil className="w-3 h-3" /> Edit</>}
            </button>
            <button
              onClick={handleSaveToDashboard}
              disabled={savingDashboard || savedToDashboard}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border flex items-center gap-1 ${savedToDashboard ? "bg-emerald-500 text-white border-emerald-500" : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"}`}
            >
              {savedToDashboard ? <><Check className="w-3 h-3" /> Saved</> : <><BookmarkCheck className="w-3 h-3" /> {savingDashboard ? "Saving..." : "Save to dashboard"}</>}
            </button>
            <button onClick={copy} className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary flex items-center gap-1">
              {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
            <button onClick={() => handleExport("pdf")} disabled={!!exporting} className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary flex items-center gap-1 disabled:opacity-50">
              <FileText className="w-3 h-3" /> {exporting === "pdf" ? "..." : "PDF"}
            </button>
            <button onClick={() => handleExport("docx")} disabled={!!exporting} className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary flex items-center gap-1 disabled:opacity-50">
              <FileType className="w-3 h-3" /> {exporting === "docx" ? "..." : "DOCX"}
            </button>
            <button onClick={() => handleExport("pptx")} disabled={!!exporting} className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary flex items-center gap-1 disabled:opacity-50">
              <Presentation className="w-3 h-3" /> {exporting === "pptx" ? "..." : "PPTX"}
            </button>
            <button
              onClick={() => setPresenting(true)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-primary text-white hover:opacity-90 flex items-center gap-1"
              title="Open clean classroom slides for interactive board"
            >
              <Play className="w-3 h-3" /> Present
            </button>
          </div>
        )}

        {presenting && plan && (
          <PresentationMode topic={topic} plan={plan} onClose={() => setPresenting(false)} />
        )}

        <div className="p-5 space-y-4">
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground mt-3 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4" /> Generating heritage-based lesson plan...
              </p>
            </div>
          )}
          {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl">{error}</div>}

          {plan && !loading && (editing ? (
            <EditView plan={plan} updateField={updateField} subjectSections={subjectSections} />
          ) : (
            <ReadView plan={plan} topic={topic} subjectSections={subjectSections} updateField={updateField} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReadView({ plan, topic, subjectSections, updateField }) {
  return (
    <>
      <SectionList title="Learning Objectives" items={plan.learning_objectives} />
      <SectionList title="Competencies" items={plan.competencies} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SectionList title="Knowledge" items={plan.knowledge} compact />
        <SectionList title="Skills" items={plan.skills} compact />
        <SectionList title="Values" items={plan.values} compact />
      </div>
      {plan.numeracy_skills?.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
          <h3 className="font-bold text-sm text-foreground mb-1">🔢 Underlying Numeracy Skills</h3>
          <p className="text-[11px] text-muted-foreground mb-2">Core skills this lesson actually exercises — used by Zama AI to track progress per skill (e.g. Addition 85%, Division 42%).</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.numeracy_skills.map((s, i) => (
              <span key={i} className="text-xs font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full">{s}</span>
            ))}
          </div>
        </div>
      )}
      <KeyDefinitionsSection items={plan.key_definitions} />
      <TeachingNotesSection notes={plan.teaching_notes} />
      <TeacherGuidanceSection guidance={plan.teacher_guidance} />
      <SectionList title="Resources Needed" items={plan.resources_needed} />
      <SectionList title="Teacher Activities" items={plan.teacher_activities} />
      <SectionList title="Learner Activities" items={plan.learner_activities} />
      <SectionText title="Assessment Strategy" text={plan.assessment_strategy} />

      <WorkedExamplesSection items={plan.worked_examples} />
      <ClassExerciseSection data={plan.class_exercise} />

      {subjectSections.map(key => {
        const val = plan[key];
        if (!val || typeof val !== "string") return null;
        return <SectionText key={key} title={sectionLabel(key)} text={val} />;
      })}

      <div className="bg-secondary/40 rounded-xl p-3 space-y-2 border border-border">
        <h3 className="font-bold text-sm text-foreground">Homework</h3>
        <HomeworkRow label="Easy" text={plan.homework_easy} color="text-emerald-600" />
        <HomeworkRow label="Medium" text={plan.homework_medium} color="text-amber-600" />
        <HomeworkRow label="Challenge" text={plan.homework_challenge} color="text-rose-600" />
      </div>

      <TeachingImageGenerator
        topic={topic}
        plan={plan}
        items={plan.suggested_teaching_images}
        onImagesChange={(urls) => updateField("generated_image_urls", urls)}
      />
      <SectionList title="Suggested Teaching Resources" items={plan.suggested_teaching_resources} />
    </>
  );
}

function EditView({ plan, updateField, subjectSections }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="font-bold text-sm text-foreground mb-1 block">Lesson Title</label>
        <input
          value={plan.lesson_title || ""}
          onChange={e => updateField("lesson_title", e.target.value)}
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
        />
      </div>
      <div>
        <label className="font-bold text-sm text-foreground mb-1 block">Duration</label>
        <input
          value={plan.duration || ""}
          onChange={e => updateField("duration", e.target.value)}
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
        />
      </div>

      {UNIVERSAL_LIST_FIELDS.map(key => (
        <LessonPlanSection
          key={key}
          sectionKey={key}
          value={plan[key]}
          onChange={(v) => updateField(key, v)}
          mode="list"
        />
      ))}

      <LessonPlanSection
        sectionKey="assessment_strategy"
        value={plan.assessment_strategy}
        onChange={(v) => updateField("assessment_strategy", v)}
      />

      {subjectSections.map(key => (
        <LessonPlanSection
          key={key}
          sectionKey={key}
          value={plan[key]}
          onChange={(v) => updateField(key, v)}
        />
      ))}

      <LessonPlanSection sectionKey="homework_easy" label="Homework — Easy" value={plan.homework_easy} onChange={(v) => updateField("homework_easy", v)} />
      <LessonPlanSection sectionKey="homework_medium" label="Homework — Medium" value={plan.homework_medium} onChange={(v) => updateField("homework_medium", v)} />
      <LessonPlanSection sectionKey="homework_challenge" label="Homework — Challenge" value={plan.homework_challenge} onChange={(v) => updateField("homework_challenge", v)} />
    </div>
  );
}

function SectionList({ title, items, compact }) {
  if (!items?.length) return null;
  return (
    <div className={compact ? "bg-secondary/30 rounded-xl p-3" : ""}>
      <h3 className="font-bold text-sm text-foreground mb-1">{title}</h3>
      <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

function SectionText({ title, text }) {
  if (!text) return null;
  return (
    <div>
      <h3 className="font-bold text-sm text-foreground mb-1">{title}</h3>
      <p className="text-sm text-foreground whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function HomeworkRow({ label, text, color }) {
  if (!text) return null;
  return (
    <div className="text-sm">
      <span className={`font-bold ${color}`}>{label}:</span> <span className="text-foreground">{text}</span>
    </div>
  );
}