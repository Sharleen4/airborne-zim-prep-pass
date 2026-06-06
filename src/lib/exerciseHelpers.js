// Shared helpers for the Exercise (extended homework) system.

export const EXERCISE_TYPES = [
  { value: "homework", label: "Homework", emoji: "📒" },
  { value: "class_exercise", label: "Class Exercise", emoji: "✏️" },
  { value: "test", label: "Test", emoji: "📝" },
  { value: "quiz", label: "Quiz", emoji: "❓" },
  { value: "assignment", label: "Assignment", emoji: "📂" },
  { value: "revision", label: "Revision", emoji: "🔁" },
  { value: "mock_exam", label: "Mock Exam (timed)", emoji: "⏱️" },
];

export const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "mixed", label: "Mixed" },
];

export const QUESTION_TYPES = [
  { value: "mcq", label: "Multiple Choice" },
  { value: "fill_blank", label: "Fill in the Blank" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
];

export function exerciseTypeMeta(value) {
  return EXERCISE_TYPES.find(t => t.value === value) || EXERCISE_TYPES[0];
}

// Normalise an answer for case-insensitive trimmed comparison.
function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

// Auto-mark a single question against a student answer.
export function markQuestion(question, answer) {
  if (!question) return { is_correct: false, marks_awarded: 0 };
  const marks = Number(question.marks) || 1;
  let isCorrect = false;

  if (question.type === "mcq" || question.type === "true_false") {
    isCorrect = norm(answer) === norm(question.correct_answer);
  } else if (question.type === "fill_blank" || question.type === "short_answer") {
    const accepted = [question.correct_answer, ...(question.accepted_answers || [])].map(norm).filter(Boolean);
    isCorrect = accepted.includes(norm(answer));
  }

  return { is_correct: isCorrect, marks_awarded: isCorrect ? marks : 0 };
}

// Auto-mark an entire exercise. Returns { answers, score (0-100), total_marks, awarded_marks }.
export function autoMarkExercise(questions, studentAnswers) {
  const qs = Array.isArray(questions) ? questions : [];
  const answersMap = new Map(
    (Array.isArray(studentAnswers) ? studentAnswers : []).map(a => [a.question_id, a.answer])
  );

  let total = 0;
  let awarded = 0;
  const marked = qs.map(q => {
    const ans = answersMap.get(q.id) ?? "";
    const { is_correct, marks_awarded } = markQuestion(q, ans);
    const qMarks = Number(q.marks) || 1;
    total += qMarks;
    awarded += marks_awarded;
    return { question_id: q.id, answer: ans, is_correct, marks_awarded };
  });

  const score = total > 0 ? Math.round((awarded / total) * 100) : 0;
  return { answers: marked, score, total_marks: total, awarded_marks: awarded };
}

// Generate a short id for a new question.
export function newQuestionId() {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Validate a single question — returns an array of human-friendly error strings.
// Empty array means the question is OK and can be saved.
export function validateQuestion(q) {
  const errors = [];
  if (!q) return ["Question is missing"];
  if (!q.prompt || !q.prompt.trim()) errors.push("Missing question text");
  if (!q.correct_answer || !String(q.correct_answer).trim()) errors.push("Missing correct answer");

  if (q.type === "mcq") {
    const opts = (q.options || []).map(o => String(o || "").trim()).filter(Boolean);
    if (opts.length < 2) errors.push("Needs at least 2 options");
    if (q.correct_answer && !opts.includes(String(q.correct_answer).trim())) {
      errors.push("Correct answer must match one of the options");
    }
  }

  if (q.type === "true_false") {
    const ans = String(q.correct_answer || "").trim().toLowerCase();
    if (ans && ans !== "true" && ans !== "false") errors.push('Answer must be "true" or "false"');
  }

  return errors;
}