// Cache-first data fetching helpers — fetch from network then store locally,
// or fall back to local cache when offline.

import { offlineDB } from "./offlineDB";
import { base44 } from "@/api/base44Client";

// Simple in-flight deduplication: if the same key is already being fetched, return the same promise
const _inFlight = new Map();
function dedupe(key, fn) {
  if (_inFlight.has(key)) return _inFlight.get(key);
  const p = fn().finally(() => _inFlight.delete(key));
  _inFlight.set(key, p);
  return p;
}

// Wrap API calls with a timeout to prevent hanging when offline/slow
async function withTimeout(promise, ms = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const result = await promise;
    clearTimeout(timeout);
    return result;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// ─── Subjects ───────────────────────────────────────────────────────────────

export function getCachedSubjects() {
  return dedupe('subjects', _getCachedSubjects);
}
async function _getCachedSubjects() {
  if (!navigator.onLine) return _fallbackSubjects();
  try {
    const data = await withTimeout(base44.entities.Subject.filter({ is_active: true }), 3000);
    // Only overwrite cache when we get a valid non-empty response
    if (data && data.length > 0) {
      await offlineDB.clearStore(offlineDB.STORES.subjects);
      await offlineDB.putMany(offlineDB.STORES.subjects, data);
    }
    return data && data.length > 0 ? data : await _fallbackSubjects();
  } catch {
    return _fallbackSubjects();
  }
}

async function _fallbackSubjects() {
  const all = await offlineDB.getAll(offlineDB.STORES.subjects);
  const seen = new Set();
  return all.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return s.is_active !== false;
  });
}

// ─── Topics ─────────────────────────────────────────────────────────────────

export async function getCachedTopics(subjectId) {
  if (!navigator.onLine) return _fallbackTopics(subjectId);
  try {
    const data = await withTimeout(base44.entities.Topic.filter(
      { subject_id: subjectId, is_active: true },
      "order",
      100
    ), 5000);
    if (data && data.length > 0) {
      // Remove any stale cached topics for this subject that are no longer in the fresh result
      // (handles topics that were renamed/deactivated/re-IDed since the cache was last written).
      const freshIds = new Set(data.map(t => t.id));
      const cached = await offlineDB.getAll(offlineDB.STORES.topics).catch(() => []);
      const staleForSubject = cached.filter(t => t.subject_id === subjectId && !freshIds.has(t.id));
      if (staleForSubject.length > 0) {
        await Promise.all(staleForSubject.map(t =>
          offlineDB.deleteOne(offlineDB.STORES.topics, t.id).catch(() => {})
        ));
      }
      await offlineDB.putMany(offlineDB.STORES.topics, data);
      return data;
    }
    // Network returned empty — fall back to cache
    return await _fallbackTopics(subjectId);
  } catch {
    return _fallbackTopics(subjectId);
  }
}

async function _fallbackTopics(subjectId) {
  const all = await offlineDB.getAll(offlineDB.STORES.topics);
  return all.filter((t) => t.subject_id === subjectId && t.is_active !== false);
}

export function getCachedAllTopics() {
  return dedupe('all_topics', _getCachedAllTopics);
}
async function _getCachedAllTopics() {
  if (!navigator.onLine) return offlineDB.getAll(offlineDB.STORES.topics);
  try {
    const data = await withTimeout(base44.entities.Topic.list("order", 200), 3000);
    if (data && data.length > 0) {
      await offlineDB.putMany(offlineDB.STORES.topics, data);
    }
    return data && data.length > 0 ? data : offlineDB.getAll(offlineDB.STORES.topics);
  } catch {
    return offlineDB.getAll(offlineDB.STORES.topics);
  }
}

// ─── Questions ──────────────────────────────────────────────────────────────

export async function getCachedQuestions(topicId) {
  // Always read cache first so we have something to fall back on
  const cachedFallback = await _fallbackQuestions(topicId);

  if (!navigator.onLine) {
    return _dedupeQuestions(cachedFallback).sort(() => Math.random() - 0.5);
  }

  try {
    const data = await withTimeout(base44.entities.Question.filter(
      { topic_id: topicId, is_active: true },
      "created_date",
      150
    ), 8000);
    const usable = (data || []).filter(q =>
      ["mcq", "comprehension", "true_false"].includes(q.question_type)
    );
    if (usable.length > 0) {
      await offlineDB.putMany(offlineDB.STORES.questions, usable);
      return _dedupeQuestions(usable).sort(() => Math.random() - 0.5);
    }
    // Network returned empty — use cached
    return _dedupeQuestions(cachedFallback).sort(() => Math.random() - 0.5);
  } catch {
    // Network failed — use cached
    return _dedupeQuestions(cachedFallback).sort(() => Math.random() - 0.5);
  }
}

async function _fallbackQuestions(topicId) {
  const all = await offlineDB.getAll(offlineDB.STORES.questions);
  return all.filter((q) =>
    q.topic_id === topicId &&
    q.is_active !== false &&
    ["mcq", "comprehension", "true_false"].includes(q.question_type)
  );
}

function _dedupeQuestions(questions) {
  const seenIds = new Set();
  const seenTexts = new Set();
  return questions.filter((q) => {
    if (seenIds.has(q.id)) return false;
    const textKey = q.question_text?.toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();
    if (textKey && seenTexts.has(textKey)) return false;
    seenIds.add(q.id);
    if (textKey) seenTexts.add(textKey);
    return true;
  });
}

// ─── Notes ──────────────────────────────────────────────────────────────────

export function getCachedNote(topicId) {
  return dedupe(`note_${topicId}`, () => _getCachedNote(topicId));
}
async function _getCachedNote(topicId) {
  // Return cached note IMMEDIATELY
  const all = await offlineDB.getAll(offlineDB.STORES.notes);
  const cached = all.find((n) => n.topic_id === topicId) || null;

  // If we have no cache and we're online, fetch fresh and return it
  if (!cached && navigator.onLine) {
    const data = await withTimeout(base44.entities.Note.filter({ topic_id: topicId }), 8000).catch(() => null);
    if (data?.length > 0) {
      await offlineDB.putMany(offlineDB.STORES.notes, data);
      return data[0];
    }
    return null;
  }

  // Refresh from network in background (only if online) — don't block
  if (navigator.onLine) {
    withTimeout(base44.entities.Note.filter({ topic_id: topicId }), 8000)
      .then(data => { if (data?.length > 0) offlineDB.putMany(offlineDB.STORES.notes, data); })
      .catch(() => {});
  }

  return cached;
}

export async function getCachedNotesBySubject(subjectId) {
  try {
    const topics = await base44.entities.Topic.filter(
      { subject_id: subjectId, is_active: true },
      "order",
      100
    );
    const notes = [];
    for (const topic of topics) {
      const topicNotes = await base44.entities.Note.filter({ topic_id: topic.id });
      if (topicNotes && topicNotes.length > 0) {
        await offlineDB.putMany(offlineDB.STORES.notes, topicNotes);
        notes.push(topicNotes[0]);
      }
      await new Promise(r => setTimeout(r, 200));
    }
    return notes;
  } catch {
    return offlineDB.getAll(offlineDB.STORES.notes);
  }
}

// ─── Results & Progress ──────────────────────────────────────────────────────

export function getCachedResults(email) {
  return dedupe(`results_${email}`, () => _getCachedResults(email));
}
async function _getCachedResults(email) {
  if (!navigator.onLine) return _fallbackResults(email);
  try {
    const data = await withTimeout(base44.entities.StudentResult.filter(
      { student_email: email },
      "-created_date",
      50
    ), 3000);
    if (data && data.length > 0) {
      await offlineDB.putMany(offlineDB.STORES.studentResults, data);
    }
    return data && data.length > 0 ? data : await _fallbackResults(email);
  } catch {
    return _fallbackResults(email);
  }
}

async function _fallbackResults(email) {
  const all = await offlineDB.getAll(offlineDB.STORES.studentResults);
  return all
    .filter((r) => r.student_email === email)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 50);
}

export function getCachedTopicProgress(email) {
  return dedupe(`progress_${email}`, () => _getCachedTopicProgress(email));
}
async function _getCachedTopicProgress(email) {
  if (!navigator.onLine) return _fallbackTopicProgress(email);
  try {
    const data = await withTimeout(base44.entities.TopicProgress.filter(
      { student_email: email },
      "-created_date",
      200
    ), 3000);
    if (data && data.length > 0) {
      await offlineDB.putMany(offlineDB.STORES.topicProgress, data);
    }
    return data && data.length > 0 ? data : await _fallbackTopicProgress(email);
  } catch {
    return _fallbackTopicProgress(email);
  }
}

async function _fallbackTopicProgress(email) {
  const all = await offlineDB.getAll(offlineDB.STORES.topicProgress);
  return all.filter((tp) => tp.student_email === email);
}

// ─── Mock Exams ──────────────────────────────────────────────────────────────

export async function getCachedMockExams() {
  try {
    const data = await withTimeout(base44.entities.MockExam.filter({ is_active: true }), 5000);
    if (data && data.length > 0) {
      await offlineDB.putMany(offlineDB.STORES.mockExams, data);
      return data.sort((a, b) => (a.exam_number || 999) - (b.exam_number || 999));
    }
  } catch {}
  // Fallback to cache
  const all = await offlineDB.getAll(offlineDB.STORES.mockExams);
  return all.sort((a, b) => (a.exam_number || 999) - (b.exam_number || 999));
}

export async function getCachedExamQuestions(exam) {
  if (!exam?.question_ids?.length) return [];
  const idSet = new Set(exam.question_ids);

  // Always check cache first — return immediately if all questions are cached
  const cached = await offlineDB.getAll(offlineDB.STORES.questions);
  const cachedMatch = cached.filter(q => idSet.has(q.id));
  if (cachedMatch.length === idSet.size) return cachedMatch; // full cache hit

  if (!navigator.onLine) return cachedMatch; // partial cache, but offline — return what we have

  // Online: fetch only the missing question IDs via per-topic queries
  const cachedIds = new Set(cachedMatch.map(q => q.id));
  const missingIds = exam.question_ids.filter(id => !cachedIds.has(id));

  try {
    // Fetch missing questions topic-by-topic (avoids giant list call)
    const fetched = [];
    // Try fetching by topic_id groups derived from the exam's subject
    if (exam.subject_id) {
      const allQs = await withTimeout(
        base44.entities.Question.filter({ subject_id: exam.subject_id, is_active: true }, "-created_date", 500),
        10000
      );
      const relevant = (allQs || []).filter(q => idSet.has(q.id));
      if (relevant.length > 0) {
        await offlineDB.putMany(offlineDB.STORES.questions, relevant);
        fetched.push(...relevant);
      }
    }
    const allFetched = new Set(fetched.map(q => q.id));
    const stillMissing = missingIds.filter(id => !allFetched.has(id));
    // Last resort: fetch truly missing ones via broad list
    if (stillMissing.length > 0) {
      const broad = await withTimeout(base44.entities.Question.list("-created_date", 1000), 10000);
      const found = (broad || []).filter(q => idSet.has(q.id));
      if (found.length > 0) await offlineDB.putMany(offlineDB.STORES.questions, found);
      fetched.push(...found);
    }
    // Merge with what was already cached
    const merged = [...cachedMatch.filter(q => !allFetched.has(q.id)), ...fetched];
    return merged;
  } catch {
    return cachedMatch;
  }
}

async function _fallbackExamQuestions(idSet) {
  const cached = await offlineDB.getAll(offlineDB.STORES.questions);
  return cached.filter(q => idSet.has(q.id));
}

// ─── Pre-caching ─────────────────────────────────────────────────────────────

export async function cacheAllSubjectData(subjectId) {
  try {
    const topics = await base44.entities.Topic.filter(
      { subject_id: subjectId, is_active: true },
      "order"
    );
    if (topics && topics.length > 0) {
      await offlineDB.putMany(offlineDB.STORES.topics, topics);
    }

    for (const topic of (topics || [])) {
      try {
        const [questions, notes] = await Promise.all([
          base44.entities.Question.filter(
            { topic_id: topic.id, is_active: true },
            "created_date",
            100
          ),
          base44.entities.Note.filter({ topic_id: topic.id }),
        ]);
        if (questions && questions.length > 0) await offlineDB.putMany(offlineDB.STORES.questions, questions);
        if (notes && notes.length > 0) await offlineDB.putMany(offlineDB.STORES.notes, notes);
      } catch {
        // Skip this topic if it fails, continue with others
      }
      await new Promise(r => setTimeout(r, 300));
    }
    return true;
  } catch {
    return false;
  }
}

export async function cacheAllMockExams() {
  try {
    const exams = await withTimeout(base44.entities.MockExam.filter({ is_active: true }), 10000);
    if (!exams?.length) return 0;
    await offlineDB.putMany(offlineDB.STORES.mockExams, exams);

    // Group exam question IDs by subject to fetch in subject-scoped batches (avoids one massive list call)
    const subjectIds = [...new Set(exams.map(e => e.subject_id).filter(Boolean))];
    const allExamIds = new Set(exams.flatMap(e => e.question_ids || []));

    for (const subjectId of subjectIds) {
      try {
        const qs = await withTimeout(
          base44.entities.Question.filter({ subject_id: subjectId, is_active: true }, "-created_date", 500),
          10000
        );
        const relevant = (qs || []).filter(q => allExamIds.has(q.id));
        if (relevant.length > 0) await offlineDB.putMany(offlineDB.STORES.questions, relevant);
      } catch {}
      await new Promise(r => setTimeout(r, 1000)); // throttle between subjects
    }

    // Verify coverage — fetch any remaining missing IDs via broad list
    const cachedQs = await offlineDB.getAll(offlineDB.STORES.questions);
    const cachedIds = new Set(cachedQs.map(q => q.id));
    const missing = [...allExamIds].filter(id => !cachedIds.has(id));
    if (missing.length > 0) {
      try {
        const broad = await withTimeout(base44.entities.Question.list("-created_date", 1000), 15000);
        const found = (broad || []).filter(q => allExamIds.has(q.id));
        if (found.length > 0) await offlineDB.putMany(offlineDB.STORES.questions, found);
      } catch {}
    }

    return exams.length;
  } catch {
    return 0;
  }
}

// ─── Offline Summary ─────────────────────────────────────────────────────────

export async function getOfflineSummary() {
  const [subjects, topics, questions, notes, results, topicProgress, mockExams] = await Promise.all([
    offlineDB.getAll(offlineDB.STORES.subjects),
    offlineDB.getAll(offlineDB.STORES.topics),
    offlineDB.getAll(offlineDB.STORES.questions),
    offlineDB.getAll(offlineDB.STORES.notes),
    offlineDB.getAll(offlineDB.STORES.studentResults),
    offlineDB.getAll(offlineDB.STORES.topicProgress),
    offlineDB.getAll(offlineDB.STORES.mockExams),
  ]);
  return {
    subjects: subjects.length,
    topics: topics.length,
    questions: questions.length,
    notes: notes.length,
    results: results.length,
    topicProgress: topicProgress.length,
    mockExams: mockExams.length,
  };
}