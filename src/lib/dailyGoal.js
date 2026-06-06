// Tracks a simple "daily goal" per child profile:
//   - questions answered today (resets at midnight)
//   - current streak of consecutive days where the goal was met
//
// Stored in localStorage so it works offline and is per-device.
// Key is scoped by user email + childId so siblings on the same account
// have independent goals.

const DAILY_GOAL_TARGET = 5; // 5 questions a day = the goal

const todayStr = () => new Date().toDateString();

const keyFor = (email, childId) =>
  `zama_daily_goal_${email || "anon"}_${childId || "default"}`;

function defaultState() {
  return {
    date: todayStr(),
    questionsToday: 0,
    streak: 0,
    lastCompletedDate: null,
  };
}

export function loadDailyGoal(email, childId) {
  try {
    const raw = localStorage.getItem(keyFor(email, childId));
    if (!raw) return defaultState();
    const state = JSON.parse(raw);

    // New day — roll over.
    if (state.date !== todayStr()) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toDateString();

      // If user's last completion was NOT yesterday, streak is broken.
      if (state.lastCompletedDate !== yStr && state.lastCompletedDate !== todayStr()) {
        state.streak = 0;
      }
      state.date = todayStr();
      state.questionsToday = 0;
    }
    return state;
  } catch {
    return defaultState();
  }
}

export function saveDailyGoal(email, childId, state) {
  try {
    localStorage.setItem(keyFor(email, childId), JSON.stringify(state));
  } catch {}
}

// Call when the child answers a question. Returns the updated state.
export function recordQuestionForGoal(email, childId) {
  const state = loadDailyGoal(email, childId);
  state.questionsToday = (state.questionsToday || 0) + 1;

  // Just hit the goal today for the first time → increment streak.
  if (state.questionsToday === DAILY_GOAL_TARGET) {
    if (state.lastCompletedDate !== todayStr()) {
      state.streak = (state.streak || 0) + 1;
      state.lastCompletedDate = todayStr();
    }
  }
  saveDailyGoal(email, childId, state);
  window.dispatchEvent(new Event("zama_daily_goal_updated"));
  return state;
}

export { DAILY_GOAL_TARGET };