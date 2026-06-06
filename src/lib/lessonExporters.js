// Lesson plan exporters: PDF, DOCX, PPTX
import jsPDF from "jspdf";
import { saveAs } from "file-saver";

const SECTION_LABELS = {
  prior_knowledge_activity: "Prior Knowledge Activity",
  warm_up_activity: "Warm-Up Activity",
  introduction: "Introduction",
  concept_explanation: "Concept Explanation",
  worked_example_1: "Worked Example 1",
  worked_example_2: "Worked Example 2",
  guided_practice: "Guided Practice",
  group_activity: "Group Activity",
  class_exercise: "Class Exercise",
  assessment_questions: "Assessment Questions",
  summary: "Summary",
  homework: "Homework",
  reading_activity: "Reading Activity",
  vocabulary_development: "Vocabulary Development",
  guided_discussion: "Guided Discussion",
  language_practice: "Language Practice",
  writing_activity: "Writing Activity",
  group_work: "Group Work",
  assessment_activity: "Assessment Activity",
  demonstration_activity: "Demonstration Activity",
  observation_activity: "Observation Activity",
  investigation_activity: "Investigation Activity",
  group_discussion: "Group Discussion",
  assessment: "Assessment",
  conclusion: "Conclusion",
  demonstration: "Demonstration",
  practical_activity: "Practical Activity",
  reflection_activity: "Reflection Activity",
  content_exploration: "Content Exploration",
  group_research_activity: "Group Research Activity",
  presentation_activity: "Presentation Activity",
  storytelling_activity: "Storytelling Activity",
  discussion_activity: "Discussion Activity",
  cultural_exploration: "Cultural Exploration",
  reflection: "Reflection",
};

export function sectionLabel(key) {
  return SECTION_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function safeFilename(name) {
  return (name || "lesson_plan").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 80);
}

// ───────────────────────── PDF ─────────────────────────
export function exportPdf(topic, plan, sectionOrder = []) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const ensureSpace = (h) => {
    if (y + h > pageHeight - margin) { doc.addPage(); y = margin; }
  };

  const title = (text) => {
    ensureSpace(28);
    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.text(text, margin, y); y += 22;
  };
  const heading = (text) => {
    ensureSpace(22);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.setTextColor(60, 60, 140);
    doc.text(text, margin, y); y += 16;
    doc.setTextColor(0, 0, 0);
  };
  const paragraph = (text) => {
    if (!text) return;
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    const lines = doc.splitTextToSize(String(text), pageWidth - margin * 2);
    lines.forEach((ln) => { ensureSpace(14); doc.text(ln, margin, y); y += 14; });
    y += 4;
  };
  const list = (items) => {
    if (!items?.length) return;
    doc.setFont("helvetica", "normal"); doc.setFontSize(11);
    items.forEach((it) => {
      const lines = doc.splitTextToSize(`• ${it}`, pageWidth - margin * 2 - 12);
      lines.forEach((ln, i) => { ensureSpace(14); doc.text(ln, margin + (i === 0 ? 0 : 12), y); y += 14; });
    });
    y += 4;
  };

  // Header
  title(plan.lesson_title || `${topic.topic}${topic.subtopic ? " — " + topic.subtopic : ""}`);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90, 90, 90);
  doc.text(`${topic.subject} · ${topic.grade}${topic.curriculum_code ? " · " + topic.curriculum_code : ""} · ${plan.duration || ""}`, margin, y);
  y += 18; doc.setTextColor(0, 0, 0);

  heading("Learning Objectives"); list(plan.learning_objectives);
  heading("Competencies"); list(plan.competencies);
  heading("Knowledge"); list(plan.knowledge);
  heading("Skills"); list(plan.skills);
  heading("Values"); list(plan.values);
  // Definitions of key terms
  if (plan.key_definitions?.length) {
    heading("Definitions of Key Terms");
    plan.key_definitions.forEach((d) => {
      const line = `• ${d.term}: ${d.definition}${d.example ? ` (e.g. ${d.example})` : ""}`;
      paragraph(line);
    });
  }

  // Teacher guidance — practical how-to-teach support
  if (plan.teacher_guidance) {
    const g = plan.teacher_guidance;
    heading("Teacher Guidance (for new teachers)");
    if (g.how_to_introduce) { heading("How to Introduce the Lesson"); paragraph(g.how_to_introduce); }
    if (g.step_by_step_delivery?.length) { heading("Step-by-Step Delivery"); list(g.step_by_step_delivery); }
    if (g.board_layout) { heading("Suggested Board Layout"); paragraph(g.board_layout); }
    if (g.common_mistakes?.length) { heading("Common Mistakes & How to Correct Them"); list(g.common_mistakes); }
    if (g.checking_understanding?.length) { heading("Check Understanding"); list(g.checking_understanding); }
    if (g.differentiation_tips?.length) { heading("Differentiation Tips"); list(g.differentiation_tips); }
    if (g.classroom_language?.length) { heading("Classroom Phrases"); list(g.classroom_language); }
  }

  heading("Resources Needed"); list(plan.resources_needed);
  heading("Teacher Activities"); list(plan.teacher_activities);
  heading("Learner Activities"); list(plan.learner_activities);
  heading("Assessment Strategy"); paragraph(plan.assessment_strategy);

  // Subject-specific sections
  for (const key of sectionOrder) {
    if (["lesson_information", "learning_objectives", "homework"].includes(key)) continue;
    const value = plan[key];
    if (!value) continue;
    heading(sectionLabel(key)); paragraph(value);
  }

  heading("Homework — Easy"); paragraph(plan.homework_easy);
  heading("Homework — Medium"); paragraph(plan.homework_medium);
  heading("Homework — Challenge"); paragraph(plan.homework_challenge);

  heading("Suggested Teaching Images"); list(plan.suggested_teaching_images);
  heading("Suggested Teaching Resources"); list(plan.suggested_teaching_resources);

  doc.save(`${safeFilename(plan.lesson_title || topic.topic)}.pdf`);
}

// ───────────────────────── DOCX ─────────────────────────
export async function exportDocx(topic, plan, sectionOrder = []) {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import("docx");

  const para = (text, opts = {}) => new Paragraph({
    children: [new TextRun({ text: String(text || ""), ...opts })],
    spacing: { after: 120 },
  });
  const heading = (text, level = HeadingLevel.HEADING_2) => new Paragraph({
    text, heading: level, spacing: { before: 200, after: 100 },
  });
  const bullets = (items) => (items || []).map(it => new Paragraph({
    text: String(it), bullet: { level: 0 }, spacing: { after: 80 },
  }));

  const children = [];
  children.push(new Paragraph({ text: plan.lesson_title || topic.topic, heading: HeadingLevel.TITLE }));
  children.push(para(`${topic.subject} · ${topic.grade}${topic.curriculum_code ? " · " + topic.curriculum_code : ""} · ${plan.duration || ""}`, { italics: true, color: "555555" }));

  const block = (label, value, isList = false) => {
    if (isList && !value?.length) return;
    if (!isList && !value) return;
    children.push(heading(label));
    if (isList) children.push(...bullets(value));
    else children.push(para(value));
  };

  block("Learning Objectives", plan.learning_objectives, true);
  block("Competencies", plan.competencies, true);
  block("Knowledge", plan.knowledge, true);
  block("Skills", plan.skills, true);
  block("Values", plan.values, true);
  block("Resources Needed", plan.resources_needed, true);
  block("Teacher Activities", plan.teacher_activities, true);
  block("Learner Activities", plan.learner_activities, true);
  block("Assessment Strategy", plan.assessment_strategy);

  for (const key of sectionOrder) {
    if (["lesson_information", "learning_objectives", "homework"].includes(key)) continue;
    if (plan[key]) block(sectionLabel(key), plan[key]);
  }

  block("Homework — Easy", plan.homework_easy);
  block("Homework — Medium", plan.homework_medium);
  block("Homework — Challenge", plan.homework_challenge);
  block("Suggested Teaching Images", plan.suggested_teaching_images, true);
  block("Suggested Teaching Resources", plan.suggested_teaching_resources, true);

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${safeFilename(plan.lesson_title || topic.topic)}.docx`);
}

// ───────────────────────── PPTX ─────────────────────────
export async function exportPptx(topic, plan) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const addSlide = (title, bodyLines = [], opts = {}) => {
    const s = pptx.addSlide();
    s.background = { color: opts.bg || "FFFFFF" };
    s.addText(title, {
      x: 0.5, y: 0.4, w: 12, h: 0.8,
      fontSize: 28, bold: true, color: "1E40AF", fontFace: "Calibri",
    });
    if (bodyLines.length) {
      s.addText(bodyLines.map(t => ({ text: String(t), options: { bullet: true } })), {
        x: 0.6, y: 1.4, w: 12, h: 5.5,
        fontSize: 18, color: "1F2937", fontFace: "Calibri", valign: "top",
      });
    }
    return s;
  };

  // Slide 1 — Title
  const s1 = pptx.addSlide();
  s1.background = { color: "1E40AF" };
  s1.addText(plan.lesson_title || topic.topic, {
    x: 0.5, y: 2.2, w: 12, h: 1.5,
    fontSize: 40, bold: true, color: "FFFFFF", align: "center", fontFace: "Calibri",
  });
  s1.addText(`${topic.subject} · ${topic.grade}${topic.curriculum_code ? " · " + topic.curriculum_code : ""}`, {
    x: 0.5, y: 3.8, w: 12, h: 0.6,
    fontSize: 20, color: "DBEAFE", align: "center", fontFace: "Calibri",
  });
  s1.addText(`Duration: ${plan.duration || ""}`, {
    x: 0.5, y: 4.5, w: 12, h: 0.5, fontSize: 16, color: "BFDBFE", align: "center",
  });

  addSlide("Learning Objectives", plan.learning_objectives || []);
  if (plan.key_definitions?.length) {
    addSlide("Key Terms", plan.key_definitions.map(d => `${d.term} — ${d.definition}`));
  }
  if (plan.teacher_guidance?.step_by_step_delivery?.length) {
    addSlide("Teacher Guide: Step-by-Step", plan.teacher_guidance.step_by_step_delivery);
  }
  addSlide("Introduction", [plan.introduction || ""]);
  addSlide("Main Concept", [plan.concept_explanation || plan.content_exploration || plan.cultural_exploration || ""]);
  addSlide("Example / Demonstration", [
    plan.worked_example_1, plan.worked_example_2,
    plan.demonstration, plan.demonstration_activity,
    plan.reading_activity, plan.storytelling_activity,
  ].filter(Boolean));
  addSlide("Teaching Images", plan.suggested_teaching_images || []);
  addSlide("Group Activity", [plan.group_activity || plan.group_work || plan.group_discussion || plan.group_research_activity || ""]);
  addSlide("Class Exercise", [plan.class_exercise || plan.language_practice || plan.guided_practice || plan.practical_activity || ""]);
  addSlide("Assessment", [plan.assessment_strategy, plan.assessment_questions, plan.assessment, plan.assessment_activity].filter(Boolean));
  addSlide("Homework", [
    `Easy: ${plan.homework_easy || ""}`,
    `Medium: ${plan.homework_medium || ""}`,
    `Challenge: ${plan.homework_challenge || ""}`,
  ]);
  addSlide("Summary", [plan.summary || plan.conclusion || plan.reflection || ""]);

  await pptx.writeFile({ fileName: `${safeFilename(plan.lesson_title || topic.topic)}.pptx` });
}

// Plain-text formatter (used for clipboard copy)
export function formatPlanAsText(topic, plan, sectionOrder = []) {
  const lines = [];
  lines.push(plan.lesson_title || `${topic.topic}${topic.subtopic ? " — " + topic.subtopic : ""}`);
  lines.push(`${topic.subject} · ${topic.grade}${topic.curriculum_code ? " · " + topic.curriculum_code : ""} · ${plan.duration || ""}`);
  lines.push("");
  const block = (label, value, isList) => {
    if (isList && !value?.length) return;
    if (!isList && !value) return;
    lines.push(label.toUpperCase());
    if (isList) value.forEach(v => lines.push(`- ${v}`));
    else lines.push(String(value));
    lines.push("");
  };
  block("Learning Objectives", plan.learning_objectives, true);
  block("Competencies", plan.competencies, true);
  block("Knowledge", plan.knowledge, true);
  block("Skills", plan.skills, true);
  block("Values", plan.values, true);
  if (plan.key_definitions?.length) {
    block("Definitions of Key Terms",
      plan.key_definitions.map(d => `${d.term}: ${d.definition}${d.example ? ` (e.g. ${d.example})` : ""}`),
      true);
  }
  if (plan.teacher_guidance) {
    const g = plan.teacher_guidance;
    block("How to Introduce the Lesson", g.how_to_introduce);
    block("Step-by-Step Delivery", g.step_by_step_delivery, true);
    block("Suggested Board Layout", g.board_layout);
    block("Common Mistakes & How to Correct Them", g.common_mistakes, true);
    block("Check Understanding", g.checking_understanding, true);
    block("Differentiation Tips", g.differentiation_tips, true);
    block("Classroom Phrases", g.classroom_language, true);
  }
  block("Resources Needed", plan.resources_needed, true);
  block("Teacher Activities", plan.teacher_activities, true);
  block("Learner Activities", plan.learner_activities, true);
  block("Assessment Strategy", plan.assessment_strategy);
  for (const key of sectionOrder) {
    if (["lesson_information", "learning_objectives", "homework"].includes(key)) continue;
    if (plan[key]) block(sectionLabel(key), plan[key]);
  }
  block("Homework — Easy", plan.homework_easy);
  block("Homework — Medium", plan.homework_medium);
  block("Homework — Challenge", plan.homework_challenge);
  block("Suggested Teaching Images", plan.suggested_teaching_images, true);
  block("Suggested Teaching Resources", plan.suggested_teaching_resources, true);
  return lines.join("\n");
}