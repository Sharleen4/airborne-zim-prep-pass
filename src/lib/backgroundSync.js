// Silently pre-caches ALL app content in the background after login.
// Called once per session when online. Safe to call multiple times (has lock).

import { offlineDB } from "./offlineDB";
import { base44 } from "@/api/base44Client";

let _running = false;
let _lastSuccess = 0;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function safeFetch(fn, label, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt < retries - 1) {
        const backoff = 1000 * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s, 8s
        console.warn(`[backgroundCacheAll] Attempt ${attempt + 1} failed for ${label}, retrying in ${backoff}ms...`);
        await delay(backoff);
      } else {
        console.warn(`[backgroundCacheAll] Failed after ${retries} attempts: ${label}`, e?.message || e);
      }
    }
  }
  return null;
}

export async function backgroundCacheAll({ force = false } = {}) {
  if (!navigator.onLine) return;
  if (_running) return;

  // Only re-run if it's been >1 hour since last SUCCESS, or forced
  const now = Date.now();
  if (!force && _lastSuccess && now - _lastSuccess < 60 * 60 * 1000) return;

  _running = true;

  try {
    // 1. Subjects
    const subjects = await safeFetch(
      () => base44.entities.Subject.filter({ is_active: true }),
      "subjects"
    );
    if (subjects?.length) await offlineDB.putMany(offlineDB.STORES.subjects, subjects);
    await delay(3000);

    // 2. Topics
    const topics = await safeFetch(
      () => base44.entities.Topic.list("order", 200),
      "topics"
    );
    if (topics?.length) await offlineDB.putMany(offlineDB.STORES.topics, topics);
    await delay(3000);

    // 3. Mock Exams
    const exams = await safeFetch(
      () => base44.entities.MockExam.filter({ is_active: true }),
      "mockExams"
    );
    if (exams?.length) await offlineDB.putMany(offlineDB.STORES.mockExams, exams);
    await delay(3000);

    // 4. Questions — paginate to ensure ALL active questions are cached (not just first 500)
    await delay(5000);
    let allQuestions = [];
    const PAGE_SIZE = 500;
    for (let page = 0; page < 10; page++) { // up to 5,000 questions
      const batch = await safeFetch(
        () => base44.entities.Question.filter({ is_active: true }, "-created_date", PAGE_SIZE, page * PAGE_SIZE),
        `questions page ${page + 1}`
      );
      if (!batch?.length) break;
      allQuestions = allQuestions.concat(batch);
      await offlineDB.putMany(offlineDB.STORES.questions, batch);
      if (batch.length < PAGE_SIZE) break;
      await delay(3000);
    }
    console.log(`[backgroundCacheAll] Cached ${allQuestions.length} questions`);
    await delay(5000);

    // 5. Notes — paginate to cache all notes
    let allNotes = [];
    for (let page = 0; page < 5; page++) { // up to 1,000 notes
      const batch = await safeFetch(
        () => base44.entities.Note.list("-created_date", 200, page * 200),
        `notes page ${page + 1}`,
        3
      );
      if (!batch?.length) break;
      allNotes = allNotes.concat(batch);
      await offlineDB.putMany(offlineDB.STORES.notes, batch);
      if (batch.length < 200) break;
      await delay(3000);
    }
    console.log(`[backgroundCacheAll] Cached ${allNotes.length} notes`);
    await delay(8000);

    // 6. Diagrams
    const allDiagrams = await safeFetch(
      () => base44.entities.Diagram.list("-created_date", 100),
      "diagrams",
      2
    );
    if (allDiagrams?.length) await offlineDB.putMany(offlineDB.STORES.diagrams, allDiagrams);

    _lastSuccess = Date.now();
    console.log("[backgroundCacheAll] All content cached successfully");
  } catch (e) {
    console.warn("[backgroundCacheAll] Unexpected error:", e);
  } finally {
    _running = false;
  }
}