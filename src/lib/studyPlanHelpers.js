// Helpers for the Study Plan feature.

export const DURATION_OPTIONS = [
  { value: 10, label: "10 min", emoji: "⚡" },
  { value: 20, label: "20 min", emoji: "🎯" },
  { value: 30, label: "30 min", emoji: "📚" },
  { value: 45, label: "45 min", emoji: "💪" },
  { value: 60, label: "1 hour", emoji: "🏆" },
];

// Suggested target quantities per goal_type and duration.
// These are SUGGESTIONS — parents can override.
export const GOAL_TYPES = [
  {
    value: "practice_questions",
    label: "Practice Questions",
    emoji: "✏️",
    suggest: (mins) => Math.max(3, Math.round(mins / 2)), // ~30s/question
    unit: "questions",
  },
  {
    value: "review_notes",
    label: "Read Revision Notes",
    emoji: "📖",
    suggest: () => 1,
    unit: "topic",
  },
  {
    value: "flashcards",
    label: "Flashcards",
    emoji: "🃏",
    suggest: (mins) => mins,
    unit: "cards",
  },
  {
    value: "mock_exam",
    label: "Mini Mock Exam",
    emoji: "📝",
    suggest: () => 1,
    unit: "exam",
  },
];

export const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function getGoalType(value) {
  return GOAL_TYPES.find(g => g.value === value) || GOAL_TYPES[0];
}

export function getDuration(value) {
  return DURATION_OPTIONS.find(d => d.value === value) || { value, label: `${value} min`, emoji: "⏱️" };
}

// Returns sessions scheduled for today (in the user's local timezone).
export function getTodaysSessions(plan) {
  if (!plan?.sessions?.length) return [];
  const today = new Date().getDay();
  return plan.sessions.filter(s => (s.days_of_week || []).includes(today));
}

// Today's date as YYYY-MM-DD in local time.
export function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Generate a short random id for a session.
export function newSessionId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// Build a URL the child can tap to start a session.
export function sessionStartHref(session) {
  switch (session.goal_type) {
    case "practice_questions":
      return session.topic_id ? `/practice/${session.topic_id}` : "/practice";
    case "review_notes":
      return session.topic_id ? `/notes/${session.topic_id}` : "/home";
    case "mock_exam":
      return "/mock-exam";
    case "flashcards":
      return "/flashcards";
    default:
      return "/home";
  }
}