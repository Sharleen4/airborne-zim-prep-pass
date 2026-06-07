import { createClient } from "@base44/sdk";
import { base44 } from "@/api/base44Client";
import { offlineDB } from "@/lib/offlineDB";

const QUESTION_PAGE_SIZE = 500;
const RATE_LIMIT_RETRY_DELAY_MS = 1800;
const TOPIC_CONTENT_DELAY_MS = 300;

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

async function withRateLimitRetry(request, fallback = [], options = {}) {
  const { required = false, label = "request", retries = 2 } = options;
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (!isRateLimitError(error) && attempt === 0) break;
      if (attempt < retries) await wait(RATE_LIMIT_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  if (required) {
    throw new Error(`Could not sync ${label}. ${lastError?.message || "Please try again."}`);
  }

  return fallback;
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
    science: "science and technology",
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

function subjectMatchesRemote(localSubject, remoteSubjects) {
  const key = subjectGroupKey(localSubject);
  return remoteSubjects.some((subject) => subject.id === localSubject.id || subjectGroupKey(subject) === key);
}

function preferSubjectSummary(current, next) {
  if (!current) return next;
  if (!!next.package !== !!current.package) return next.package ? next : current;
  if (isSeedRecord(current.subject) !== isSeedRecord(next.subject)) {
    return isSeedRecord(current.subject) ? next : current;
  }

  const currentTotal = current.counts.topics + current.counts.notes + current.counts.questions + (current.counts.practiceTests || 0) + (current.counts.mockExams || 0);
  const nextTotal = next.counts.topics + next.counts.notes + next.counts.questions + (next.counts.practiceTests || 0) + (next.counts.mockExams || 0);
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

function putById(map, records) {
  (Array.isArray(records) ? records : []).forEach((record) => {
    if (record?.id && record.is_active !== false) map.set(record.id, record);
  });
}

async function fetchTopicQuestions(topicId) {
  const all = [];
  for (let page = 0; page < 20; page += 1) {
    const batch = await withRateLimitRetry(
      () => contentBase44.entities.Question.filter(
        { topic_id: topicId, is_active: true },
        "created_date",
        QUESTION_PAGE_SIZE,
        page * QUESTION_PAGE_SIZE
      ),
      [],
      { required: true, label: "topic questions" }
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < QUESTION_PAGE_SIZE) break;
  }
  return all;
}

async function fetchQuestionById(questionId) {
  const found = await withRateLimitRetry(
    () => contentBase44.entities.Question.filter({ id: questionId }, "-updated_date", 1),
    [],
    { label: "referenced question" }
  );
  return Array.isArray(found) ? found[0] || null : null;
}

async function fetchNotesForSubjectTopics(subjectId, topics) {
  const topicIds = new Set(topics.map((topic) => topic.id).filter(Boolean));
  const byId = new Map();
  const subjectNotes = await withRateLimitRetry(
    () => contentBase44.entities.Note.filter({ subject_id: subjectId }, "-updated_date", 5000),
    [],
    { required: true, label: "subject notes" }
  );

  (Array.isArray(subjectNotes) ? subjectNotes : [])
    .filter((note) => note?.is_active !== false)
    .forEach((note) => {
      if (note?.id) byId.set(note.id, note);
    });

  for (const topicId of topicIds) {
    if (byId.size > 0) await wait(TOPIC_CONTENT_DELAY_MS);
    const topicNotes = await withRateLimitRetry(
      () => contentBase44.entities.Note.filter({ topic_id: topicId }, "-updated_date", 100),
      [],
      { required: true, label: "topic notes" }
    );
    (Array.isArray(topicNotes) ? topicNotes : [])
      .filter((note) => note?.is_active !== false)
      .forEach((note) => {
        if (note?.id) byId.set(note.id, note);
      });
  }

  return [...byId.values()];
}

async function fetchQuestionsForSubjectTopics(subjectId, topics) {
  const topicIds = new Set(topics.map((topic) => topic.id).filter(Boolean));
  const byId = new Map();
  const subjectQuestions = await fetchAllQuestionsForSubject(subjectId);
  putById(byId, subjectQuestions);

  for (const topicId of topicIds) {
    await wait(TOPIC_CONTENT_DELAY_MS);
    const topicQuestions = await fetchTopicQuestions(topicId);
    putById(byId, topicQuestions);
  }

  return [...byId.values()].filter((question) => question.subject_id === subjectId || topicIds.has(question.topic_id));
}

async function fetchPracticeTestsForSubjectTopics(subjectId, topics) {
  const topicIds = new Set(topics.map((topic) => topic.id).filter(Boolean));
  const byId = new Map();
  const subjectTests = await withRateLimitRetry(
    () => contentBase44.entities.PracticeTest.filter({ subject_id: subjectId }, "test_number", 2000),
    [],
    { required: true, label: "subject exercises" }
  );
  putById(byId, subjectTests);

  for (const topicId of topicIds) {
    await wait(TOPIC_CONTENT_DELAY_MS);
    const topicTests = await withRateLimitRetry(
      () => contentBase44.entities.PracticeTest.filter({ topic_id: topicId }, "test_number", 100),
      [],
      { required: true, label: "topic exercises" }
    );
    putById(byId, topicTests);
  }

  return [...byId.values()].filter((test) => test.subject_id === subjectId || topicIds.has(test.topic_id));
}

async function backfillReferencedQuestions(questionMap, records) {
  const referencedIds = new Set();
  (Array.isArray(records) ? records : []).forEach((record) => {
    (record?.question_ids || []).forEach((id) => {
      if (id) referencedIds.add(id);
    });
  });

  const missingIds = [...referencedIds].filter((id) => !questionMap.has(id));
  for (const id of missingIds) {
    await wait(TOPIC_CONTENT_DELAY_MS);
    const question = await fetchQuestionById(id);
    if (question?.id && question.is_active !== false) questionMap.set(question.id, question);
  }

  return {
    referenced: referencedIds.size,
    missing: [...referencedIds].filter((id) => !questionMap.has(id)).length,
  };
}

export async function loadContentPackageSummary() {
  const [subjects, packages, topics, notes, questions, practiceTests, mockExams] = await Promise.all([
    offlineDB.getAll(offlineDB.STORES.subjects).catch(() => []),
    offlineDB.getAll(offlineDB.STORES.contentPackages).catch(() => []),
    offlineDB.getAll(offlineDB.STORES.topics).catch(() => []),
    offlineDB.getAll(offlineDB.STORES.notes).catch(() => []),
    offlineDB.getAll(offlineDB.STORES.questions).catch(() => []),
    offlineDB.getAll(offlineDB.STORES.practiceTests).catch(() => []),
    offlineDB.getAll(offlineDB.STORES.mockExams).catch(() => []),
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
        practiceTests: practiceTests.filter((test) => test.subject_id === subject.id || topicIds.has(test.topic_id)).length,
        mockExams: mockExams.filter((exam) => exam.subject_id === subject.id).length,
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
    const cachedSubjects = await offlineDB.getAll(offlineDB.STORES.subjects).catch(() => []);
    const staleSubjects = cachedSubjects.filter((subject) =>
      !isSeedRecord(subject) && !subjectMatchesRemote(subject, subjects)
    );

    await Promise.all(
      staleSubjects.flatMap((subject) => [
        offlineDB.deleteOne(offlineDB.STORES.subjects, subject.id),
        offlineDB.deleteEntityRecord("Subject", subject.id),
        offlineDB.deleteOne(offlineDB.STORES.contentPackages, packageIdFor(subject)),
      ])
    );

    await offlineDB.putMany(offlineDB.STORES.subjects, subjects);
    await offlineDB.putEntityRecords("Subject", subjects);
  }
  return subjects;
}

export async function syncSubjectContentPackage(subject) {
  if (!subject?.id) throw new Error("Subject is required");
  if (!navigator.onLine) throw new Error("Connect to the internet to sync content");

  const [topicsRaw, examsRaw] = await Promise.all([
    withRateLimitRetry(() => contentBase44.entities.Topic.filter({ subject_id: subject.id, is_active: true }, "order", 2000)),
    withRateLimitRetry(() => contentBase44.entities.MockExam.filter({ subject_id: subject.id, is_active: true }, "exam_number", 200)),
  ]);

  const topics = Array.isArray(topicsRaw) ? topicsRaw : [];
  const notes = await fetchNotesForSubjectTopics(subject.id, topics);
  const questions = await fetchQuestionsForSubjectTopics(subject.id, topics);
  const questionById = new Map(questions.map((question) => [question.id, question]));
  const practiceTests = await fetchPracticeTestsForSubjectTopics(subject.id, topics);
  const mockExams = Array.isArray(examsRaw) ? examsRaw : [];
  const referencedQuestionCoverage = await backfillReferencedQuestions(questionById, [...practiceTests, ...mockExams]);
  const completeQuestions = [...questionById.values()];

  await Promise.all([
    offlineDB.putOne(offlineDB.STORES.subjects, subject),
    offlineDB.putMany(offlineDB.STORES.topics, topics),
    offlineDB.putMany(offlineDB.STORES.notes, notes),
    offlineDB.putMany(offlineDB.STORES.questions, completeQuestions),
    offlineDB.putMany(offlineDB.STORES.practiceTests, practiceTests),
    offlineDB.putMany(offlineDB.STORES.mockExams, mockExams),
    offlineDB.putEntityRecord("Subject", subject),
    offlineDB.putEntityRecords("Topic", topics),
    offlineDB.putEntityRecords("Note", notes),
    offlineDB.putEntityRecords("Question", completeQuestions),
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
    latest_content_at: latestDate([subject, ...topics, ...notes, ...completeQuestions, ...practiceTests, ...mockExams])
      ? new Date(latestDate([subject, ...topics, ...notes, ...completeQuestions, ...practiceTests, ...mockExams])).toISOString()
      : syncedAt,
    counts: {
      topics: topics.length,
      notes: notes.length,
      questions: completeQuestions.length,
      practiceTests: practiceTests.length,
      mockExams: mockExams.length,
      referencedQuestions: referencedQuestionCoverage.referenced,
      missingReferencedQuestions: referencedQuestionCoverage.missing,
    },
  };
  await offlineDB.putOne(offlineDB.STORES.contentPackages, metadata);
  return metadata;
}
