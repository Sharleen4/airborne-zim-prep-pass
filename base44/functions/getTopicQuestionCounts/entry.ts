import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const withRetry = async (fn, label) => {
  const delays = [500, 1500, 4000, 10000, 25000, 60000];
  let lastErr;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      const status = err?.status || err?.response?.status;
      const is429 = status === 429 || /rate limit/i.test(err?.message || "");
      const isTransient = is429 || status === 503 || status === 502 || status === 504;
      if (!isTransient || attempt === delays.length) throw err;
      const delay = delays[attempt];
      console.warn(`[${label}] retry ${attempt + 1} after ${delay}ms (${err.message})`);
      await sleep(delay);
    }
  }
  throw lastErr;
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  // 1. Load all subjects & topics so we can map legacy topic_id codes onto real Topic.ids.
  const [subjects, topics] = await Promise.all([
    withRetry(() => base44.asServiceRole.entities.Subject.list('name', 500), 'subjects-list'),
    withRetry(() => base44.asServiceRole.entities.Topic.list('order', 5000), 'topics-list'),
  ]);

  const topicById = new Map();
  const topicByName = new Map();
  for (const t of topics) {
    topicById.set(t.id, t);
    if (t.name) topicByName.set(t.name.trim().toLowerCase(), t.id);
  }

  // Legacy subject codes used in questions (e.g. "SS7" = Social Science G7).
  // Map: legacy code → real Subject.id, by guessing from grade + name keywords.
  const legacyToSubject = (code) => {
    const m = code.match(/^([A-Z]+)(\d)$/);
    if (!m) return null;
    const [, prefix, gradeNum] = m;
    const grade = `Grade ${gradeNum}`;
    const candidates = subjects.filter(s => s.grade === grade);
    const nameMatchers = {
      SS: /social/i,
      SCI: /science/i,
      PE: /physical|arts/i,
      MATH: /math/i,
      ENG: /english/i,
      AGRI: /agric/i,
      ICT: /ict|computer/i,
      RE: /religious/i,
      FAM: /family|home/i,
    };
    const re = nameMatchers[prefix];
    if (!re) return null;
    return candidates.find(s => re.test(s.name || ""))?.id || null;
  };

  // Pre-build legacy-topic-code → real Topic.id resolver.
  // "SS7-T3" = topic with order=3 in the subject mapped from "SS7".
  const legacyTopicCache = new Map();
  const resolveLegacyTopicCode = (rawTopicId) => {
    if (legacyTopicCache.has(rawTopicId)) return legacyTopicCache.get(rawTopicId);
    const m = String(rawTopicId).match(/^([A-Z]+\d)-T(\d+)$/i);
    if (!m) { legacyTopicCache.set(rawTopicId, null); return null; }
    const [, subjectCode, orderStr] = m;
    const subjectId = legacyToSubject(subjectCode.toUpperCase());
    if (!subjectId) { legacyTopicCache.set(rawTopicId, null); return null; }
    const order = Number(orderStr);
    const match = topics.find(t => t.subject_id === subjectId && Number(t.order) === order);
    const resolved = match?.id || null;
    legacyTopicCache.set(rawTopicId, resolved);
    return resolved;
  };

  // Resolve a question's topic_id to the canonical Topic.id.
  const resolveTopicId = (rawTopicId) => {
    if (!rawTopicId) return null;
    if (topicById.has(rawTopicId)) return rawTopicId;
    // Try legacy code pattern e.g. "SS7-T1"
    const legacy = resolveLegacyTopicCode(rawTopicId);
    if (legacy) return legacy;
    // Try matching as a topic name (case-insensitive)
    const byName = topicByName.get(String(rawTopicId).trim().toLowerCase());
    if (byName) return byName;
    return rawTopicId; // keep raw key so it still shows up somewhere
  };

  const PAGE = 500;
  let offset = 0;

  const seen = new Set();
  const counts = {};
  const readyCounts = {};
  const totalCounts = {};
  let totalScanned = 0;
  let pagesFetched = 0;

  while (true) {
    let batch;
    try {
      batch = await withRetry(
        () => base44.asServiceRole.entities.Question.list('created_date', PAGE, offset),
        `page@${offset}`
      );
    } catch (err) {
      console.error(`[page@${offset}] permanently failed:`, err.message);
      return Response.json({
        error: `Failed to fetch page at offset ${offset}: ${err.message}`,
        partial: { counts, readyCounts, totalCounts, totalScanned, pagesFetched },
      }, { status: 503 });
    }

    if (!batch || batch.length === 0) break;
    pagesFetched++;

    for (const q of batch) {
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      totalScanned++;

      const topicKey = resolveTopicId(q.topic_id);
      if (!topicKey) continue;

      totalCounts[topicKey] = (totalCounts[topicKey] || 0) + 1;

      const isApproved = q.review_status === 'approved';
      const isLive = q.is_active !== false && q.review_status !== 'pending_review' && q.review_status !== 'rejected';

      if (isLive) {
        counts[topicKey] = (counts[topicKey] || 0) + 1;
        readyCounts[topicKey] = (readyCounts[topicKey] || 0) + 1;
      } else if (isApproved) {
        readyCounts[topicKey] = (readyCounts[topicKey] || 0) + 1;
      }
    }

    if (batch.length < PAGE) break;
    offset += PAGE;
    await sleep(600);
    if (offset > 200000) break;
  }

  return Response.json({
    counts,
    readyCounts,
    totalCounts,
    totalScanned,
    pagesFetched,
    topicsWithQuestions: Object.keys(totalCounts).length,
    complete: true,
  });
});