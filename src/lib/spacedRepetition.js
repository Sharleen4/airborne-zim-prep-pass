// SM-2 Spaced Repetition Algorithm
// https://www.supermemo.com/en/archives1990-2015/english/ol/sm2

import { base44 } from "@/api/base44Client";

/**
 * Calculate next review date using SM-2 algorithm.
 * @param {object} perf - existing QuestionPerformance record (or null)
 * @param {boolean} isCorrect
 * @returns {object} updated fields to save
 */
export function calcNextReview(perf, isCorrect) {
  const today = new Date().toISOString().split("T")[0];

  let intervalDays = perf?.interval_days ?? 1;
  let easeFactor = perf?.ease_factor ?? 2.5;
  let streak = perf?.streak ?? 0;
  const timesSeen = (perf?.times_seen ?? 0) + 1;
  const timesCorrect = (perf?.times_correct ?? 0) + (isCorrect ? 1 : 0);
  const timesIncorrect = (perf?.times_incorrect ?? 0) + (isCorrect ? 0 : 1);

  if (isCorrect) {
    streak += 1;
    if (streak === 1) intervalDays = 1;
    else if (streak === 2) intervalDays = 3;
    else intervalDays = Math.round(intervalDays * easeFactor);
    // Increase ease factor slightly on correct answer
    easeFactor = Math.min(2.5, easeFactor + 0.1);
  } else {
    streak = 0;
    intervalDays = 1; // Reset: review again tomorrow
    easeFactor = Math.max(1.3, easeFactor - 0.2);
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + intervalDays);
  const next_review_date = nextDate.toISOString().split("T")[0];

  return {
    times_seen: timesSeen,
    times_correct: timesCorrect,
    times_incorrect: timesIncorrect,
    last_seen_date: today,
    next_review_date,
    interval_days: intervalDays,
    ease_factor: easeFactor,
    streak,
  };
}

/**
 * Record a question answer and update/create its QuestionPerformance record.
 */
export async function recordQuestionAnswer(studentEmail, question, isCorrect) {
  try {
    const existing = await base44.entities.QuestionPerformance.filter({
      student_email: studentEmail,
      question_id: question.id,
    });

    const updates = calcNextReview(existing[0] || null, isCorrect);

    if (existing.length > 0) {
      await base44.entities.QuestionPerformance.update(existing[0].id, updates);
    } else {
      await base44.entities.QuestionPerformance.create({
        student_email: studentEmail,
        question_id: question.id,
        topic_id: question.topic_id,
        subject_id: question.subject_id,
        ...updates,
      });
    }
  } catch (e) {
    console.warn("SR record failed:", e);
  }
}

/**
 * Get questions due for review today for a topic (spaced repetition queue).
 * Returns question IDs sorted by urgency (most overdue first).
 */
export async function getDueQuestions(studentEmail, topicId) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const perfs = await base44.entities.QuestionPerformance.filter({
      student_email: studentEmail,
      topic_id: topicId,
    });
    // Due = next_review_date <= today, prioritise most overdue + most incorrect
    return perfs
      .filter((p) => !p.next_review_date || p.next_review_date <= today)
      .sort((a, b) => {
        // Most incorrect first, then oldest review date
        const incorrectDiff = (b.times_incorrect ?? 0) - (a.times_incorrect ?? 0);
        if (incorrectDiff !== 0) return incorrectDiff;
        return (a.next_review_date ?? "") < (b.next_review_date ?? "") ? -1 : 1;
      })
      .map((p) => p.question_id);
  } catch {
    return [];
  }
}