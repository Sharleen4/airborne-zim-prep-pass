// XP and leveling constants
export const XP_PER_QUESTION_CORRECT = 10;
export const XP_PER_QUESTION_WRONG = 2;
export const XP_PER_LESSON_COMPLETE = 50;
export const XP_PER_MOCK_EXAM = 100;

export const LEVELS = [
  { level: 1, title: "Beginner",     minXp: 0,    maxXp: 100,  emoji: "🌱" },
  { level: 2, title: "Explorer",     minXp: 100,  maxXp: 250,  emoji: "🔍" },
  { level: 3, title: "Learner",      minXp: 250,  maxXp: 500,  emoji: "📖" },
  { level: 4, title: "Scholar",      minXp: 500,  maxXp: 800,  emoji: "🎒" },
  { level: 5, title: "Achiever",     minXp: 800,  maxXp: 1200, emoji: "⭐" },
  { level: 6, title: "Champion",     minXp: 1200, maxXp: 1800, emoji: "🏆" },
  { level: 7, title: "Expert",       minXp: 1800, maxXp: 2600, emoji: "🔥" },
  { level: 8, title: "Master",       minXp: 2600, maxXp: 3600, emoji: "💎" },
  { level: 9, title: "Legend",       minXp: 3600, maxXp: 5000, emoji: "👑" },
  { level: 10, title: "ZIMSEC Star", minXp: 5000, maxXp: 9999, emoji: "🌟" },
];

export const BADGES = [
  { id: "first_lesson",   title: "First Steps",     desc: "Complete your first lesson",      emoji: "🚀", condition: (s) => s.lessonsCompleted >= 1 },
  { id: "five_lessons",   title: "Study Habit",      desc: "Complete 5 lessons",              emoji: "📚", condition: (s) => s.lessonsCompleted >= 5 },
  { id: "ten_lessons",    title: "Bookworm",         desc: "Complete 10 lessons",             emoji: "🐛", condition: (s) => s.lessonsCompleted >= 10 },
  { id: "first_practice", title: "Quiz Starter",     desc: "Answer your first question",      emoji: "❓", condition: (s) => s.questionsAnswered >= 1 },
  { id: "fifty_correct",  title: "Half Century",     desc: "Get 50 questions correct",        emoji: "🎯", condition: (s) => s.questionsCorrect >= 50 },
  { id: "perfect_score",  title: "Perfect!",         desc: "Score 100% in a practice session",emoji: "💯", condition: (s) => s.hasPerfectScore },
  { id: "first_mock",     title: "Exam Ready",       desc: "Complete your first mock exam",   emoji: "📝", condition: (s) => s.mockExamsCompleted >= 1 },
  { id: "three_mocks",    title: "Exam Veteran",     desc: "Complete 3 mock exams",           emoji: "🎖️", condition: (s) => s.mockExamsCompleted >= 3 },
  { id: "xp_500",         title: "Rising Star",      desc: "Earn 500 XP",                    emoji: "⭐", condition: (s) => s.totalXp >= 500 },
  { id: "xp_1000",        title: "Power Learner",    desc: "Earn 1000 XP",                   emoji: "⚡", condition: (s) => s.totalXp >= 1000 },
  { id: "streak_3",       title: "On a Roll",        desc: "Log in 3 days in a row",         emoji: "🔥", condition: (s) => s.loginStreak >= 3 },
];

export function getLevelInfo(xp) {
  let info = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) info = l;
  }
  return info;
}

export function getProgressPercent(xp) {
  const level = getLevelInfo(xp);
  const range = level.maxXp - level.minXp;
  const progress = xp - level.minXp;
  return Math.min(100, Math.round((progress / range) * 100));
}

export function getUnlockedBadges(stats) {
  return BADGES.filter(b => b.condition(stats));
}

// LocalStorage key per user
export const storageKey = (email) => `zama_gamification_${email}`;

export function loadStats(email) {
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    totalXp: 0,
    lessonsCompleted: 0,
    questionsAnswered: 0,
    questionsCorrect: 0,
    mockExamsCompleted: 0,
    hasPerfectScore: false,
    loginStreak: 1,
    lastLoginDate: new Date().toDateString(),
  };
}

export function saveStats(email, stats) {
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(stats));
  } catch {}
}

export function addXp(email, amount) {
  const stats = loadStats(email);
  stats.totalXp = (stats.totalXp || 0) + amount;
  saveStats(email, stats);
  return stats;
}