import { createClient } from "@base44/sdk";
import { base44 } from "@/api/base44Client";
import { offlineDB } from "@/lib/offlineDB";

const QUESTION_PAGE_SIZE = 500;

const contentClient = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  ...(import.meta.env.VITE_BASE44_API_KEY ? { headers: { api_key: import.meta.env.VITE_BASE44_API_KEY } } : {}),
});

const contentBase44 = import.meta.env.VITE_BASE44_API_KEY ? contentClient : base44;

function packageIdFor(subject) {
  const grade = subject.grade || "Ungraded";
  return `${grade}:${subject.id}`;
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
    const batch = await contentBase44.entities.Question.filter(
      { subject_id: subjectId, is_active: true },
      "-updated_date",
      QUESTION_PAGE_SIZE,
      page * QUESTION_PAGE_SIZE
    ).catch(() => []);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < QUESTION_PAGE_SIZE) break;
  }
  return all;
}

async function fetchNotesForSubjectTopics(subjectId, topics) {
  const topicIds = topics.map((topic) => topic.id).filter(Boolean);
  const byId = new Map();

  const subjectNotes = await contentBase44.entities.Note.filter(
    { subject_id: subjectId },
    "-updated_date",
    5000
  ).catch(() => []);
  (Array.isArray(subjectNotes) ? subjectNotes : []).forEach((note) => {
    if (note?.id) byId.set(note.id, note);
  });

  for (let i = 0; i < topicIds.length; i += 8) {
    const batchIds = topicIds.slice(i, i + 8);
    const batches = await Promise.all(
      batchIds.map((topicId) =>
        contentBase44.entities.Note.filter({ topic_id: topicId }, "-updated_date", 100).catch(() => [])
      )
    );
    batches.flat().forEach((note) => {
      if (note?.id) byId.set(note.id, note);
    });
  }

  return [...byId.values()].filter((note) => note.is_active !== false);
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
  return subjects.map((subject) => {
    const id = packageIdFor(subject);
    const subjectTopics = topics.filter((topic) => topic.subject_id === subject.id);
    const topicIds = new Set(subjectTopics.map((topic) => topic.id));
    return {
      id,
      subject,
      package: packageById.get(id) || null,
      counts: {
        topics: subjectTopics.length,
        notes: notes.filter((note) => note.subject_id === subject.id || topicIds.has(note.topic_id)).length,
        questions: questions.filter((question) => question.subject_id === subject.id || topicIds.has(question.topic_id)).length,
      },
    };
  });
}

export async function fetchRemoteSubjects() {
  const remote = await contentBase44.entities.Subject.filter({ is_active: true }, "grade", 500);
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
    contentBase44.entities.Topic.filter({ subject_id: subject.id, is_active: true }, "order", 2000).catch(() => []),
    fetchAllQuestionsForSubject(subject.id),
    contentBase44.entities.PracticeTest.filter({ subject_id: subject.id }, "test_number", 2000).catch(() => []),
    contentBase44.entities.MockExam.filter({ subject_id: subject.id, is_active: true }, "exam_number", 200).catch(() => []),
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
