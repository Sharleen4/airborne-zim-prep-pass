import { offlineDB } from "./offlineDB";
import { offlineSeed } from "./offlineSeedData";

let seedPromise = null;

export async function ensureOfflineSeedData({ force = false } = {}) {
  if (seedPromise && !force) return seedPromise;

  seedPromise = (async () => {
    const existingSubjects = await offlineDB.getAll(offlineDB.STORES.subjects).catch(() => []);

    await Promise.all([
      offlineDB.putMany(offlineDB.STORES.subjects, offlineSeed.subjects),
      offlineDB.putMany(offlineDB.STORES.topics, offlineSeed.topics),
      offlineDB.putMany(offlineDB.STORES.questions, offlineSeed.questions),
      offlineDB.putMany(offlineDB.STORES.notes, offlineSeed.notes),
      offlineDB.putMany(offlineDB.STORES.practiceTests, offlineSeed.practiceTests),
      offlineDB.putMany(offlineDB.STORES.mockExams, offlineSeed.mockExams),
      offlineDB.putEntityRecords("ChildProfile", offlineSeed.childProfiles),
      offlineDB.putEntityRecords("Subject", offlineSeed.subjects),
      offlineDB.putEntityRecords("Topic", offlineSeed.topics),
      offlineDB.putEntityRecords("Question", offlineSeed.questions),
      offlineDB.putEntityRecords("Note", offlineSeed.notes),
      offlineDB.putEntityRecords("PracticeTest", offlineSeed.practiceTests),
      offlineDB.putEntityRecords("MockExam", offlineSeed.mockExams),
    ]);

    try {
      localStorage.setItem("zama_active_child_id", offlineSeed.childProfiles[0].id);
    } catch {}

    return force || existingSubjects.length === 0;
  })();

  return seedPromise;
}
