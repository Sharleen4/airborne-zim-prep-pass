import { createClient } from "@base44/sdk";
import { base44 } from "@/api/base44Client";
import { offlineDB } from "@/lib/offlineDB";

const QUESTION_PAGE_SIZE = 500;
const NOTE_PAGE_SIZE = 500;
const RATE_LIMIT_RETRY_DELAY_MS = 1800;
const TOPIC_NOTE_BACKFILL_DELAY_MS = 250;

const contentClient = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  ...(import.meta.env.VITE_BASE44_API_KEY ? { headers: { api_key: import.meta.env.VITE_BASE44_API_KEY } } : {}),
});

const contentBase44 = import.meta.env.VITE_BASE44_API_KEY ? contentClient : base44;

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isRateLimitError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  return message.includes("rate limit") || message.includes("too many requests") || message.includes("429");
}

async function withRateLimitRetry(request, fallback = []) {
  try {
    return await request();
  } catch (error) {
    if (!isRateLimitError(error)) return fallback;
    await wait(RATE_LIMIT_RETRY_DELAY_MS);
    try {
      return await request();
    } catch {
      return fallback;
    }
  }
}

function packageIdFor(subject) {
  const grade = subject.grade || "Ungraded";
  return `${grade}:${subject.id}`;
}

function normalizeSubjectName(name) {
  const normalized = String(name || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const aliases = {
    math: "mathematics",
    maths: "mathematics",
    "social science": "social studies",
    "social sciences": "social studies",
  };

  return aliases[normalized] || normalized;
}

function subjectGroupKey(subject) {
  return `${String(subject?.grade || "Ungraded").toLowerCase()}::${normalizeSubjectName(subject?.name)}`;
}

function isSeedRecord(item) {
  return String(item?.id || "").startsWith("seed_");
}

function preferSubjectSummary(current, next) {
  if (!current) return next;
  if (!!next.package !== !!current.package) return next.package ? next : current;
  if (isSeedRecord(current.subject) !== isSeedRecord(next.subject)) {
    return isSeedRecord(current.subject) ? next : current;
  }

  const currentTotal = current.counts.topics + current.counts.notes + current.counts.questions;
  const nextTotal = next.counts.topics + next.counts.notes + next.counts.questions;
  return nextTotal > currentTotal ? next : current;
}

function latestDate(items) {
  return items.reduce((latest, item) => {
    const value = item?.updated_date || item?.created_date || item?.cached_at;
    if (!value) return latest;
    const time = new Date(value).getTime();
    if (!Number.isFinite(time)) return latest;
    return Math.max(latest, time);
  }, 0);
}

async function fetchAllQuestionsForSubject(subjectId) {
  const all = [];
  for (let page = 0; page < 50; page += 1) {
    const batch = await withRateLimitRetry(() =>
      contentBase44.entities.Question.filter(
        { subject_id: subjectId, is_active: true },
        "-updated_date",
        QUESTION_PAGE_SIZE,
        page * QUESTION_PAGE_SIZE
      )
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < QUESTION_PAGE_SIZE) break;
  }
  return all;
}

async function fetchAllNotes() {
  const all = [];
  for (let page = 0; page < 50; page += 1) {
    const batch = await withRateLimitRetry(() =>
      contentBase44.entities.Note.list("-updated_date", NOTE_PAGE_SIZE, page * NOTE_PAGE_SIZE)
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < NOTE_PAGE_SIZE) break;
  }
  return all;
}

async function fetchNotesForSubjectTopics(subjectId, topics) {
  const topicIds = new Set(topics.map((topic) => topic.id).filter(Boolean));
  const byId = new Map();
  const allNotes = await fetchAllNotes();
  const matchingNotes = (Array.isArray(allNotes) ? allNotes : []).filter((note) => {
    if (note?.is_active === false) return false;
    return note.subject_id === subjectId || topicIds.has(note.topic_id);
  });

  matchingNotes.forEach((note) => {
    if (note?.id) byId.set(note.id, note);
  });

  const coveredTopicIds = new Set(matchingNotes.map((note) => note.topic_id).filter(Boolean));
  const missingTopicIds = [...topicIds].filter((topicId) => !coveredTopicIds.has(topicId));

  for (const topicId of missingTopicIds) {
    if (byId.size > 0) await wait(TOPIC_NOTE_BACKFILL_DELAY_MS);
    const topicNotes = await withRateLimitRetry(() =>
      contentBase44.entities.Note.filter({ topic_id: topicId }, "-updated_date", 20)
    );
    (Array.isArray(topicNotes) ? topicNotes : [])
      .filter((note) => note?.is_active !== false)
      .forEach((note) => {
        if (note?.id) byId.set(note.id, note);
      });
  }

  return [...byId.values()];
}

export async function loadContentPackageSummary() {
  const [subjects, packages, topics, notes, questions] = await Promise.all([
    offlineDB.getAll(offlineDB.STORES.subjects).catch(() => []),
    offlineDB.getAll(offlineDB.STORES.contentPackages).catch(() => []),
    offlineDB.getAll(offlineDB.STORES.topics).catch(() => []),
    offlineDB.getAll(offlineDB.STORES.notes).catch(() => []),
    offlineDB.getAll(offlineDB.STORES.questions).catch(() => []),
  ]);

  const packageById = new Map(packages.map((pkg) => [pkg.id, pkg]));
  const deduped = new Map();

  subjects.forEach((subject) => {
    const id = packageIdFor(subject);
    const subjectTopics = topics.filter((topic) => topic.subject_id === subject.id);
    const topicIds = new Set(subjectTopics.map((topic) => topic.id));
    const summary = {
      id,
      subject,
      package: packageById.get(id) || null,
      counts: {
        topics: subjectTopics.length,
        notes: notes.filter((note) => note.subject_id === subject.id || topicIds.has(note.topic_id)).length,
        questions: questions.filter((question) => question.subject_id === subject.id || topicIds.has(question.topic_id)).length,
      },
    };

    const key = subjectGroupKey(subject);
    deduped.set(key, preferSubjectSummary(deduped.get(key), summary));
  });

  return [...deduped.values()];
}

export async function fetchRemoteSubjects() {
  const remote = await withRateLimitRetry(() => contentBase44.entities.Subject.filter({ is_active: true }, "grade", 500));
  const subjects = Array.isArray(remote) ? remote : [];
  if (subjects.length) {
    await offlineDB.putMany(offlineDB.STORES.subjects, subjects);
    await offlineDB.putEntityRecords("Subject", subjects);
  }
  return subjects;
}

export async function syncSubjectContentPackage(subject) {
  if (!subject?.id) throw new Error("Subject is required");
  if (!navigator.onLine) throw new Error("Connect to the internet to sync content");

  const [topicsRaw, questionsRaw, testsRaw, examsRaw] = await Promise.all([
    withRateLimitRetry(() => contentBase44.entities.Topic.filter({ subject_id: subject.id, is_active: true }, "order", 2000)),
    fetchAllQuestionsForSubject(subject.id),
    withRateLimitRetry(() => contentBase44.entities.PracticeTest.filter({ subject_id: subject.id }, "test_number", 2000)),
    withRateLimitRetry(() => contentBase44.entities.MockExam.filter({ subject_id: subject.id, is_active: true }, "exam_number", 200)),
  ]);

  const topics = Array.isArray(topicsRaw) ? topicsRaw : [];
  const topicIds = new Set(topics.map((topic) => topic.id));
  const notes = await fetchNotesForSubjectTopics(subject.id, topics);
  const questions = Array.isArray(questionsRaw)
    ? questionsRaw.filter((question) => question.subject_id === subject.id || topicIds.has(question.topic_id))
    : [];
  const practiceTests = Array.isArray(testsRaw)
    ? testsRaw.filter((test) => test.subject_id === subject.id || topicIds.has(test.topic_id))
    : [];
  const mockExams = Array.isArray(examsRaw) ? examsRaw : [];

  await Promise.all([
    offlineDB.putOne(offlineDB.STORES.subjects, subject),
    offlineDB.putMany(offlineDB.STORES.topics, topics),
    offlineDB.putMany(offlineDB.STORES.notes, notes),
    offlineDB.putMany(offlineDB.STORES.questions, questions),
    offlineDB.putMany(offlineDB.STORES.practiceTests, practiceTests),
    offlineDB.putMany(offlineDB.STORES.mockExams, mockExams),
    offlineDB.putEntityRecord("Subject", subject),
    offlineDB.putEntityRecords("Topic", topics),
    offlineDB.putEntityRecords("Note", notes),
    offlineDB.putEntityRecords("Question", questions),
    offlineDB.putEntityRecords("PracticeTest", practiceTests),
    offlineDB.putEntityRecords("MockExam", mockExams),
  ]);

  const syncedAt = new Date().toISOString();
  const metadata = {
    id: packageIdFor(subject),
    subject_id: subject.id,
    subject_name: subject.name,
    grade: subject.grade || "",
    status: "downloaded",
    synced_at: syncedAt,
    latest_content_at: latestDate([subject, ...topics, ...notes, ...questions, ...practiceTests, ...mockExams])
      ? new Date(latestDate([subject, ...topics, ...notes, ...questions, ...practiceTests, ...mockExams])).toISOString()
      : syncedAt,
    counts: {
      topics: topics.length,
      notes: notes.length,
      questions: questions.length,
      practiceTests: practiceTests.length,
      mockExams: mockExams.length,
    },
  };
  await offlineDB.putOne(offlineDB.STORES.contentPackages, metadata);
  return metadata;
}
