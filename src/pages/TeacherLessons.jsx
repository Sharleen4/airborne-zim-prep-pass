import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import TeacherLayout from "@/components/teacher/TeacherLayout";
import { BookOpen, Loader2, Trash2, ChevronRight, Sparkles, FileText, FileType, Presentation, CalendarPlus, CheckSquare, Square, X } from "lucide-react";
import { exportPdf, exportDocx, exportPptx } from "@/lib/lessonExporters";
import SubjectGroupHeader, { groupBySubject } from "@/components/teacher/SubjectGroupHeader";
import useCollapsibleGroups from "@/hooks/useCollapsibleGroups";
import ScheduleLessonsModal from "@/components/teacher/ScheduleLessonsModal";

export default function TeacherLessons() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [openId, setOpenId] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showSchedule, setShowSchedule] = useState(false);

  const toggleSelected = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => { setSelectMode(false); setSelectedIds(new Set()); };
  const selectedLessons = lessons.filter(l => selectedIds.has(l.id));

  useEffect(() => {
    if (!user) return;
    base44.entities.SavedLesson.filter({ teacher_email: user.email, is_active: true }, "-created_date", 200)
      .then(setLessons)
      .finally(() => setLoading(false));
  }, [user]);

  const removeLesson = async (id) => {
    if (!confirm("Remove this saved lesson?")) return;
    await base44.entities.SavedLesson.update(id, { is_active: false });
    setLessons(prev => prev.filter(l => l.id !== id));
  };

  const buildTopicShim = (l) => ({
    subject: l.subject,
    grade: l.grade,
    topic: l.topic,
    subtopic: l.subtopic,
    curriculum_code: l.curriculum_code,
  });

  const handleExport = async (lesson, kind) => {
    setExporting(`${lesson.id}-${kind}`);
    try {
      const topic = buildTopicShim(lesson);
      if (kind === "pdf") exportPdf(topic, lesson.plan, lesson.section_order || []);
      else if (kind === "docx") await exportDocx(topic, lesson.plan, lesson.section_order || []);
      else if (kind === "pptx") await exportPptx(topic, lesson.plan);
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setExporting("");
    }
  };

  const groups = groupBySubject(lessons, l => l.subject);
  const { isExpanded, toggle, expandAll, collapseAll, allExpanded } = useCollapsibleGroups(groups);

  if (!user) return null;

  return (
    <TeacherLayout title="My Saved Lessons" subtitle="Lessons you've saved to your dashboard">
      <Link to="/curriculum-explorer" className="block bg-gradient-to-r from-violet-600 to-primary text-white rounded-2xl p-3 mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        <span className="font-bold text-sm">Generate a new lesson plan</span>
        <ChevronRight className="w-4 h-4 ml-auto" />
      </Link>

      {lessons.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          {!selectMode ? (
            <button
              onClick={() => setSelectMode(true)}
              className="text-xs font-semibold text-primary inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-primary/30 hover:bg-primary/5"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Select lessons to schedule
            </button>
          ) : (
            <>
              <span className="text-xs font-semibold text-foreground">{selectedIds.size} selected</span>
              <button
                onClick={() => setShowSchedule(true)}
                disabled={selectedIds.size === 0}
                className="ml-auto bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
              >
                <CalendarPlus className="w-3.5 h-3.5" /> Schedule
              </button>
              <button onClick={clearSelection} className="text-xs font-semibold text-muted-foreground p-1.5 rounded-lg hover:bg-secondary">
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : lessons.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
          <p className="font-semibold text-foreground">No saved lessons yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate a lesson from the Curriculum Explorer and tap <span className="font-semibold">Save to dashboard</span>.
          </p>
          <Link to="/curriculum-explorer" className="mt-3 inline-block text-primary font-semibold text-sm">Open Curriculum Explorer →</Link>
        </div>
      ) : (
        <div>
          {groups.length > 1 && (
            <div className="flex justify-end mb-1">
              <button
                onClick={allExpanded ? collapseAll : expandAll}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {allExpanded ? "Collapse all" : "Expand all"}
              </button>
            </div>
          )}
          {groups.map(group => (
            <div key={group.subject}>
              <SubjectGroupHeader
                subject={group.subject}
                count={group.items.length}
                expanded={isExpanded(group.subject)}
                onToggle={() => toggle(group.subject)}
              />
              {isExpanded(group.subject) && (
              <div className="space-y-2">
                {group.items.map(l => {
                  const checked = selectedIds.has(l.id);
                  return (
                  <div key={l.id} className={`bg-card rounded-2xl border overflow-hidden ${checked ? "border-primary" : "border-border"}`}>
              <button
                onClick={() => selectMode ? toggleSelected(l.id) : setOpenId(openId === l.id ? null : l.id)}
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-secondary/30"
              >
                {selectMode ? (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${checked ? "bg-primary text-white" : "bg-secondary text-muted-foreground"}`}>
                    {checked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground truncate">{l.lesson_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {l.subject} · {l.grade}{l.curriculum_code ? " · " + l.curriculum_code : ""}{l.duration ? " · " + l.duration : ""}
                  </p>
                </div>
                {!selectMode && (
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${openId === l.id ? "rotate-90" : ""}`} />
                )}
              </button>

                  {openId === l.id && !selectMode && (
                    <div className="border-t border-border p-4 space-y-3 bg-secondary/20">
                      <div className="flex flex-wrap gap-1.5">
                        <ExportBtn icon={<FileText className="w-3 h-3" />} label="PDF" busy={exporting === `${l.id}-pdf`} onClick={() => handleExport(l, "pdf")} />
                        <ExportBtn icon={<FileType className="w-3 h-3" />} label="DOCX" busy={exporting === `${l.id}-docx`} onClick={() => handleExport(l, "docx")} />
                        <ExportBtn icon={<Presentation className="w-3 h-3" />} label="PPTX" busy={exporting === `${l.id}-pptx`} onClick={() => handleExport(l, "pptx")} />
                        <button
                          onClick={() => removeLesson(l.id)}
                          className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center gap-1 ml-auto"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>

                      <Preview title="Learning Objectives" items={l.plan?.learning_objectives} />
                      <Preview title="Key Terms" items={(l.plan?.key_definitions || []).map(d => `${d.term} — ${d.definition}`)} />
                      {l.plan?.teacher_guidance?.step_by_step_delivery?.length > 0 && (
                        <Preview title="Step-by-Step Delivery" items={l.plan.teacher_guidance.step_by_step_delivery} ordered />
                      )}
                    </div>
                  )}
                </div>
                  );
                })}
              </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showSchedule && (
        <ScheduleLessonsModal
          lessons={selectedLessons}
          onClose={() => setShowSchedule(false)}
          onSaved={() => { setShowSchedule(false); clearSelection(); }}
        />
      )}
    </TeacherLayout>
  );
}

function ExportBtn({ icon, label, busy, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-border text-muted-foreground hover:bg-secondary flex items-center gap-1 disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {busy ? "..." : label}
    </button>
  );
}

function Preview({ title, items, ordered }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{title}</p>
      {ordered ? (
        <ol className="list-decimal pl-5 text-sm text-foreground space-y-0.5">{items.map((it, i) => <li key={i}>{it}</li>)}</ol>
      ) : (
        <ul className="list-disc pl-5 text-sm text-foreground space-y-0.5">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
      )}
    </div>
  );
}