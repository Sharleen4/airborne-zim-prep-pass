import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns per-topic performance trends for a single class — used by the teacher
// "Topic Trends" dashboard to spot consistently weak topics that need re-teaching.
//
// Output shape:
// {
//   class: { id, name },
//   subjects: [
//     {
//       subject_id, subject_name,
//       topics: [{ topic_id, topic_name, avg_score, attempts, students, weak }]
//     }
//   ],
//   weakest: [ {subject_name, topic_name, avg_score, attempts} ]  // top 5 lowest
// }

const WEAK_THRESHOLD = 60; // <60% average = flagged weak

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    let body = {};
    try { body = await req.json(); } catch { /* GET fallback */ }
    const class_id = body.class_id || url.searchParams.get("class_id");
    if (!class_id) return Response.json({ error: "class_id required" }, { status: 400 });

    const cls = (await base44.asServiceRole.entities.SchoolClass.filter({ id: class_id }, "-created_date", 1))[0];
    if (!cls) return Response.json({ error: "Class not found" }, { status: 404 });
    // Only the assigned teacher or an admin can view
    if (user.role !== "admin" && cls.teacher_email !== user.email) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const students = await base44.asServiceRole.entities.StudentProfile
      .filter({ class_id, is_active: true }, "-created_date", 500).catch(() => []);
    const studentEmails = students.map(s => s.user_email).filter(Boolean);

    if (studentEmails.length === 0) {
      return Response.json({ class: { id: cls.id, name: cls.name }, subjects: [], weakest: [] });
    }

    // Pull all StudentResult records for these students (per-topic quiz outcomes)
    // We page by student to keep within entity filter contract.
    const resultsByTopic = new Map(); // topic_id -> { scores:[], students:Set, subject_id }
    for (const email of studentEmails) {
      const rs = await base44.asServiceRole.entities.StudentResult
        .filter({ student_email: email }, "-created_date", 200).catch(() => []);
      for (const r of rs) {
        if (!r.topic_id || typeof r.score_percent !== "number") continue;
        const key = r.topic_id;
        if (!resultsByTopic.has(key)) {
          resultsByTopic.set(key, { scores: [], students: new Set(), subject_id: r.subject_id });
        }
        const bucket = resultsByTopic.get(key);
        bucket.scores.push(r.score_percent);
        bucket.students.add(email);
        if (!bucket.subject_id && r.subject_id) bucket.subject_id = r.subject_id;
      }
    }

    if (resultsByTopic.size === 0) {
      return Response.json({ class: { id: cls.id, name: cls.name }, subjects: [], weakest: [] });
    }

    // Resolve topic + subject names
    const topicIds = [...resultsByTopic.keys()];
    const topics = await base44.asServiceRole.entities.Topic
      .filter({ id: { $in: topicIds } }, "-created_date", 500).catch(() => []);
    const topicMap = Object.fromEntries(topics.map(t => [t.id, t]));

    const subjectIds = [...new Set(topics.map(t => t.subject_id).filter(Boolean))];
    const subjects = subjectIds.length > 0
      ? await base44.asServiceRole.entities.Subject
          .filter({ id: { $in: subjectIds } }, "name", 100).catch(() => [])
      : [];
    const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

    // Build subject->topics structure
    const grouped = new Map(); // subject_id -> { subject_name, topics:[] }
    const flat = [];

    for (const [topicId, bucket] of resultsByTopic.entries()) {
      const topic = topicMap[topicId];
      const subjectId = topic?.subject_id || bucket.subject_id || "_other";
      const subjectName = subjectMap[subjectId]?.name || "Other";
      const avg = bucket.scores.reduce((a, b) => a + b, 0) / bucket.scores.length;
      const entry = {
        topic_id: topicId,
        topic_name: topic?.name || "Unknown topic",
        avg_score: Math.round(avg * 10) / 10,
        attempts: bucket.scores.length,
        students: bucket.students.size,
        weak: avg < WEAK_THRESHOLD,
      };
      if (!grouped.has(subjectId)) grouped.set(subjectId, { subject_id: subjectId, subject_name: subjectName, topics: [] });
      grouped.get(subjectId).topics.push(entry);
      flat.push({ subject_name: subjectName, ...entry });
    }

    // Sort topics inside each subject by avg ascending (weakest first)
    const result = [...grouped.values()].map(g => ({
      ...g,
      topics: g.topics.sort((a, b) => a.avg_score - b.avg_score),
    })).sort((a, b) => a.subject_name.localeCompare(b.subject_name));

    const weakest = flat
      .filter(e => e.attempts >= 2) // ignore one-off attempts
      .sort((a, b) => a.avg_score - b.avg_score)
      .slice(0, 5);

    return Response.json({
      class: { id: cls.id, name: cls.name },
      subjects: result,
      weakest,
    });
  } catch (err) {
    console.error("getClassTopicTrends error:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});