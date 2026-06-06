// Helpers for parsing curriculum CSV/XLSX rows into CurriculumTopic records.

const VALID_GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

// Split a "; "-separated or comma-separated string into a clean array
export function splitList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  return String(value)
    .split(/;|\n|\|/)
    .map(s => s.trim())
    .filter(Boolean);
}

// Normalise a header label so "Learning Objectives", "LearningObjectives", "learning_objectives" all match
function normaliseHeader(h) {
  return String(h || "").toLowerCase().replace(/[\s_-]/g, "");
}

const HEADER_MAP = {
  subject: "subject",
  grade: "grade",
  topic: "topic",
  subtopic: "subtopic",
  content: "content",
  topiccontent: "content",
  keyconceptcontent: "content",
  suggestedresources: "suggested_resources",
  resources: "suggested_resources",
  suggestedmaterials: "suggested_resources",
  materials: "suggested_resources",
  learningobjectives: "learning_objectives",
  objectives: "learning_objectives",
  suggestedactivities: "suggested_activities",
  activities: "suggested_activities",
  competencies: "heritage_based_competencies",
  heritagebasedcompetencies: "heritage_based_competencies",
  assessmentsuggestions: "assessment_suggestions",
  assessment: "assessment_suggestions",
  term: "term",
  week: "week",
  curriculumcode: "curriculum_code",
  code: "curriculum_code",
};

export function mapRow(rawRow) {
  const out = {};
  for (const [key, value] of Object.entries(rawRow)) {
    const mapped = HEADER_MAP[normaliseHeader(key)];
    if (mapped) out[mapped] = value;
  }
  // Coerce types
  if (out.learning_objectives) out.learning_objectives = splitList(out.learning_objectives);
  if (out.suggested_activities) out.suggested_activities = splitList(out.suggested_activities);
  if (out.suggested_resources) out.suggested_resources = splitList(out.suggested_resources);
  if (out.heritage_based_competencies) out.heritage_based_competencies = splitList(out.heritage_based_competencies);
  if (out.assessment_suggestions) out.assessment_suggestions = splitList(out.assessment_suggestions);
  if (out.term !== undefined && out.term !== "") out.term = Number(out.term);
  if (out.week !== undefined && out.week !== "") out.week = Number(out.week);
  // Trim strings
  ["subject", "grade", "topic", "subtopic", "curriculum_code", "content"].forEach(k => {
    if (typeof out[k] === "string") out[k] = out[k].trim();
  });
  return out;
}

export function validateRow(row, index) {
  const errors = [];
  if (!row.subject) errors.push("Subject is required");
  if (!row.grade) errors.push("Grade is required");
  else if (!VALID_GRADES.includes(row.grade)) errors.push(`Grade must be one of ${VALID_GRADES.join(", ")}`);
  if (!row.topic) errors.push("Topic is required");
  if (row.term && (row.term < 1 || row.term > 3)) errors.push("Term must be 1, 2 or 3");
  return errors.length ? { rowIndex: index, errors, row } : null;
}

// A "duplicate key" — same curriculum code OR same subject+grade+topic+subtopic
export function dedupeKey(row) {
  if (row.curriculum_code) return `code:${row.curriculum_code.toLowerCase()}`;
  return `t:${(row.subject || "").toLowerCase()}|${row.grade}|${(row.topic || "").toLowerCase()}|${(row.subtopic || "").toLowerCase()}`;
}