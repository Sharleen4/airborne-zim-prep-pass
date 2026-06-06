import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useTeacherAllocation } from "@/lib/useTeacherAllocation";
import { Search, ArrowLeft, Sparkles, BookOpen, Loader2, Upload, ClipboardList, ChevronDown, ChevronUp, Layers, Trash2, Lock, Clock, AlertTriangle } from "lucide-react";
import LessonPlanModal from "@/components/curriculum/LessonPlanModal";
import ExerciseFormModal from "@/components/teacher/ExerciseFormModal";
import SplitLessonModal from "@/components/curriculum/SplitLessonModal";
import NumeracySkillPicker from "@/components/curriculum/NumeracySkillPicker";
import GapAnalysisModal from "@/components/curriculum/GapAnalysisModal";

const isMathSubject = (s) => String(s || "").toLowerCase().includes("math");

const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

export default function CurriculumExplorer() {
  const { user } = useAuth();
  const allocation = useTeacherAllocation(user);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // expanded card
  const [lessonRequest, setLessonRequest] = useState(null); // { topic, target_objective, part_number, total_parts, numeracy_skills }
  const [exerciseTopic, setExerciseTopic] = useState(null); // for exercise-create modal
  const [splitPrompt, setSplitPrompt] = useState(null); // { topic, target_objective, total_parts }
  const [skillPrompt, setSkillPrompt] = useState(null); // { topic, target_objective } — Maths only
  const [teacherCtx, setTeacherCtx] = useState(null); // { profile, classes } — teachers only
  const [showGapAnalysis, setShowGapAnalysis] = useState(false);

  useEffect(() => {
    base44.entities.CurriculumTopic.list("-created_date", 5000)
      .then(setTopics)
      .finally(() => setLoading(false));
  }, []);

  // Load teacher profile + classes so we can create exercises from curriculum topics.
  useEffect(() => {
    if (!user || (user.role !== "teacher" && user.role !== "admin")) return;
    (async () => {
      const profiles = await base44.entities.TeacherProfile.filter({ user_email: user.email, is_active: true }, "-created_date", 1);
      const profile = profiles[0];
      if (!profile) return;
      const classes = await base44.entities.SchoolClass.filter({ teacher_email: user.email, is_active: true }, "-created_date", 100);
      setTeacherCtx({ profile, classes });
    })().catch(() => {});
  }, [user]);

  const canCreateExercise = !!teacherCtx && teacherCtx.classes.length > 0;
  const isAdmin = user?.role === "admin";

  const deleteTopic = async (topic) => {
    const label = `${topic.subject} · ${topic.grade} · ${topic.topic}${topic.subtopic ? " — " + topic.subtopic : ""}`;
    if (!window.confirm(`Delete this curriculum topic?\n\n${label}\n\nThis cannot be undone.`)) return;
    try {
      await base44.entities.CurriculumTopic.delete(topic.id);
      setTopics(prev => prev.filter(t => t.id !== topic.id));
      if (selected === topic.id) setSelected(null);
    } catch (e) {
      alert(`Failed to delete: ${e?.message || e}`);
    }
  };

  const [deletingSubject, setDeletingSubject] = useState(false);
  const deleteSubject = async () => {
    if (!subject) return;
    const scope = grade ? `${subject} (${grade})` : `${subject} (ALL grades)`;
    if (!window.confirm(`Delete ALL curriculum topics under ${scope}?\n\nThis will remove every topic for this subject from the database and cannot be undone.`)) return;
    setDeletingSubject(true);
    try {
      const res = await base44.functions.invoke("deleteCurriculumSubject", { subject, grade: grade || null });
      const data = res?.data || {};
      if (!data.success) throw new Error(data.error || "Delete failed");
      // Reload from server so the UI matches the database exactly.
      const fresh = await base44.entities.CurriculumTopic.list("-created_date", 5000);
      setTopics(fresh);
      setSelected(null);
      alert(`Deleted ${data.deleted} topic(s) under ${scope}.${data.failed ? `\n${data.failed} failed.` : ""}`);
    } catch (e) {
      alert(`Failed to delete subject: ${e?.message || e}`);
    } finally {
      setDeletingSubject(false);
    }
  };

  // Count of legacy topics (uploaded before the new CSV structure — missing content/suggested_resources)
  const legacyCount = useMemo(
    () => topics.filter(t => !t.content && (!t.suggested_resources || t.suggested_resources.length === 0)).length,
    [topics]
  );
  const [showLegacyOnly, setShowLegacyOnly] = useState(false);

  const subjects = useMemo(() => [...new Set(topics.map(t => t.subject).filter(Boolean))].sort(), [topics]);
  // Topic options narrow down to the selected subject (and grade) so the dropdown only
  // shows topics that are actually relevant.
  const topicNames = useMemo(() => {
    const pool = topics.filter(t =>
      (!subject || t.subject === subject) &&
      (!grade || t.grade === grade)
    );
    return [...new Set(pool.map(t => t.topic).filter(Boolean))].sort();
  }, [topics, subject, grade]);

  // Clear the topic filter whenever the subject or grade changes so we never end up
  // with a stale topic that doesn't exist under the new subject.
  useEffect(() => { setTopicFilter(""); }, [subject, grade]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topics.filter(t => {
      if (grade && t.grade !== grade) return false;
      if (subject && t.subject !== subject) return false;
      if (topicFilter && t.topic !== topicFilter) return false;
      if (term && String(t.term) !== String(term)) return false;
      if (showLegacyOnly && (t.content || (t.suggested_resources && t.suggested_resources.length > 0))) return false;
      if (q) {
        const hay = [t.subject, t.topic, t.subtopic, t.curriculum_code, ...(t.learning_objectives || [])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [topics, grade, subject, topicFilter, term, search, showLegacyOnly]);

  if (!user) return null;

  // Teachers must be allocated to a school before they can use the Curriculum Explorer.
  // Admins and other roles are unaffected.
  if (user.role === "teacher" && !allocation.loading && !allocation.hasProfile) {
    return (
      <div className="min-h-screen bg-background font-jakarta">
        <div className="bg-gradient-to-br from-primary via-violet-600 to-violet-800 text-white px-5 pt-10 pb-6">
          <Link to="/teacher" className="inline-flex items-center gap-1 text-white/80 text-sm mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <h1 className="text-2xl font-extrabold">Curriculum Explorer</h1>
          <p className="text-white/80 text-xs mt-1">Browse the Heritage-Based Curriculum and generate lesson plans.</p>
        </div>
        <div className="max-w-md mx-auto px-5 py-8">
          <div className="bg-card rounded-2xl border border-border p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="font-bold text-foreground text-lg">Curriculum Explorer is locked</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your school admin needs to add you to their school before you can browse the curriculum and generate lesson plans. Once added, this unlocks automatically.
            </p>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mt-4 flex items-start gap-2 text-left">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Share your registered email with your school admin so they can add you.
              </p>
            </div>
            <Link
              to="/teacher"
              className="mt-4 w-full bg-primary text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-jakarta">
      <div className="bg-gradient-to-br from-primary via-violet-600 to-violet-800 text-white px-5 pt-10 pb-6">
        <Link to={user.role === "admin" ? "/admin" : "/teacher"} className="inline-flex items-center gap-1 text-white/80 text-sm mb-3"><ArrowLeft className="w-4 h-4" /> Back</Link>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-extrabold">Curriculum Explorer</h1>
            <p className="text-white/80 text-xs mt-1">Browse the Heritage-Based Curriculum and generate lesson plans.</p>
          </div>
          {user.role === "admin" && (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setShowGapAnalysis(true)}
                className="bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
                title="Find curriculum topics that are missing student-facing content"
              >
                <AlertTriangle className="w-3 h-3" /> Gaps
              </button>
              <Link to="/curriculum-upload" className="bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1">
                <Upload className="w-3 h-3" /> Upload
              </Link>
            </div>
          )}
        </div>
      </div>

      {showGapAnalysis && <GapAnalysisModal onClose={() => setShowGapAnalysis(false)} />}

      <div className="max-w-4xl mx-auto px-5 py-5 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topic, objective, or code..."
            className="w-full border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm bg-background text-foreground"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Select value={grade} onChange={setGrade} placeholder="All grades" options={GRADES} />
          <Select value={subject} onChange={setSubject} placeholder="All subjects" options={subjects} />
          <Select value={topicFilter} onChange={setTopicFilter} placeholder="All topics" options={topicNames} />
          <Select value={term} onChange={setTerm} placeholder="All terms" options={["1", "2", "3"]} />
        </div>

        {/* Admin-only: legacy topics banner */}
        {isAdmin && legacyCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <strong>{legacyCount}</strong> topic{legacyCount !== 1 ? "s" : ""} are missing the new <strong>Content</strong> / <strong>Suggested Resources</strong> fields (uploaded before the new CSV structure).
            </p>
            <button
              onClick={() => setShowLegacyOnly(v => !v)}
              className="text-[11px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg flex-shrink-0"
            >
              {showLegacyOnly ? "Show all" : "Show only legacy"}
            </button>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No curriculum topics found</p>
            {user.role === "admin" && (
              <Link to="/curriculum-upload" className="text-primary text-sm font-semibold underline mt-2 inline-block">Upload a CSV →</Link>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{filtered.length} topic{filtered.length !== 1 ? "s" : ""}</p>
              {isAdmin && subject && (
                <button
                  onClick={deleteSubject}
                  disabled={deletingSubject}
                  className="text-[11px] font-bold text-destructive hover:bg-destructive/10 border border-destructive/30 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
                  title={`Delete ALL topics under ${subject}${grade ? " · " + grade : ""}`}
                >
                  {deletingSubject ? <><Loader2 className="w-3 h-3 animate-spin" /> Deleting...</> : <><Trash2 className="w-3 h-3" /> Delete {subject}{grade ? ` · ${grade}` : ""}</>}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {filtered.map(t => (
                <CurriculumCard
                  key={t.id}
                  topic={t}
                  expanded={selected === t.id}
                  onToggle={() => setSelected(selected === t.id ? null : t.id)}
                  onGenerate={(target_objective = "") => {
                    if (isMathSubject(t.subject)) {
                      setSkillPrompt({ topic: t, target_objective });
                    } else {
                      setLessonRequest({ topic: t, target_objective, part_number: 1, total_parts: 1 });
                    }
                  }}
                  onSplit={(target_objective = "") => setSplitPrompt({ topic: t, target_objective, total_parts: 2 })}
                  onCreateExercise={canCreateExercise ? () => setExerciseTopic(t) : null}
                  onDelete={isAdmin ? () => deleteTopic(t) : null}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {lessonRequest && (
        <LessonPlanModal
          topic={lessonRequest.topic}
          targetObjective={lessonRequest.target_objective}
          partNumber={lessonRequest.part_number || 1}
          totalParts={lessonRequest.total_parts || 1}
          numeracySkills={lessonRequest.numeracy_skills || []}
          onClose={() => setLessonRequest(null)}
        />
      )}

      {skillPrompt && (
        <NumeracySkillPicker
          topic={skillPrompt.topic}
          onClose={() => setSkillPrompt(null)}
          onConfirm={(skills) => {
            const after = skillPrompt._afterPick || {};
            setLessonRequest({
              topic: skillPrompt.topic,
              target_objective: skillPrompt.target_objective || "",
              part_number: after.part_number || 1,
              total_parts: after.total_parts || 1,
              numeracy_skills: skills,
            });
            setSkillPrompt(null);
          }}
        />
      )}

      {splitPrompt && (
        <SplitLessonModal
          initial={splitPrompt}
          onClose={() => setSplitPrompt(null)}
          onConfirm={({ part_number, total_parts, numeracy_skills }) => {
            // Maths: skills are now picked per-part inside the split modal itself,
            // so we go straight to lesson generation. If the teacher didn't pick
            // any skill for this part, fall back to the skill picker as a safety net.
            if (isMathSubject(splitPrompt.topic.subject)) {
              if (!numeracy_skills || numeracy_skills.length === 0) {
                const carry = { topic: splitPrompt.topic, target_objective: splitPrompt.target_objective || "" };
                setSplitPrompt(null);
                setSkillPrompt({
                  ...carry,
                  _afterPick: { part_number, total_parts },
                });
                return;
              }
              setLessonRequest({
                topic: splitPrompt.topic,
                target_objective: splitPrompt.target_objective,
                part_number,
                total_parts,
                numeracy_skills,
              });
              setSplitPrompt(null);
              return;
            }
            setLessonRequest({
              topic: splitPrompt.topic,
              target_objective: splitPrompt.target_objective,
              part_number,
              total_parts,
            });
            setSplitPrompt(null);
          }}
        />
      )}
      {exerciseTopic && teacherCtx && (
        <ExerciseFormModal
          teacher={user}
          classes={teacherCtx.classes}
          schoolId={teacherCtx.profile.school_id}
          prefill={exerciseTopic}
          onClose={() => setExerciseTopic(null)}
          onSaved={() => setExerciseTopic(null)}
        />
      )}
    </div>
  );
}

function Select({ value, onChange, placeholder, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function CurriculumCard({ topic, expanded, onToggle, onGenerate, onSplit, onCreateExercise, onDelete }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm text-foreground flex-1">
              {topic.topic}{topic.subtopic ? ` — ${topic.subtopic}` : ""}
              {!topic.content && (!topic.suggested_resources || topic.suggested_resources.length === 0) && (
                <span className="ml-2 text-[9px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">Legacy</span>
              )}
            </p>
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-destructive hover:bg-destructive/10 p-1 rounded-lg flex-shrink-0"
                title="Delete this topic (admin only)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            <Tag>{topic.subject}</Tag>
            <Tag>{topic.grade}</Tag>
            {topic.term && <Tag>Term {topic.term}</Tag>}
            {topic.week && <Tag>Wk {topic.week}</Tag>}
            {topic.curriculum_code && <Tag mono>{topic.curriculum_code}</Tag>}
          </div>

          {/* Always-visible action buttons so first-time users discover them instantly */}
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <button
              onClick={() => onGenerate("")}
              className="flex-1 bg-primary text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 text-xs"
            >
              <Sparkles className="w-4 h-4" /> Generate Lesson Plan
            </button>
            <button
              onClick={() => onSplit("")}
              className="sm:flex-initial bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs"
              title="Split this topic into multiple sequential lessons"
            >
              <Layers className="w-4 h-4" /> Split
            </button>
            {onCreateExercise && (
              <button
                onClick={onCreateExercise}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                <ClipboardList className="w-4 h-4" /> Create Exercise
              </button>
            )}
          </div>

          <button
            onClick={onToggle}
            className="mt-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {expanded ? <><ChevronUp className="w-3 h-3" /> Hide details</> : <><ChevronDown className="w-3 h-3" /> Show details</>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-3 bg-secondary/20">
          {topic.content && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Content</p>
              <p className="text-sm text-foreground bg-card border border-border rounded-xl p-2.5 whitespace-pre-wrap">{topic.content}</p>
            </div>
          )}
          {topic.learning_objectives?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Learning Objectives</p>
              <ul className="space-y-2">
                {topic.learning_objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 bg-card border border-border rounded-xl p-2.5">
                    <span className="text-primary font-bold text-xs flex-shrink-0 mt-0.5">{i + 1}.</span>
                    <span className="flex-1 text-sm text-foreground">{obj}</span>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => onGenerate(obj)}
                        className="bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1"
                        title="Generate a lesson focused on this objective only"
                      >
                        <Sparkles className="w-3 h-3" /> Lesson
                      </button>
                      <button
                        onClick={() => onSplit(obj)}
                        className="bg-secondary hover:bg-secondary/80 text-foreground text-[10px] font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1"
                        title="Split this objective into multiple sequential lessons"
                      >
                        <Layers className="w-3 h-3" /> Split
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ListBlock title="Suggested Activities" items={topic.suggested_activities} />
          <ListBlock title="Suggested Resources / Materials" items={topic.suggested_resources} />
          <ListBlock title="Heritage-Based Competencies" items={topic.heritage_based_competencies} />
          <ListBlock title="Assessment Suggestions" items={topic.assessment_suggestions} />
        </div>
      )}
    </div>
  );
}

function Tag({ children, mono }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground ${mono ? "font-mono" : ""}`}>
      {children}
    </span>
  );
}

function ListBlock({ title, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
      <ul className="list-disc pl-5 text-sm text-foreground space-y-0.5">
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}