import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get Social Science subject
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: "Social Science" });
    if (!subjects.length) {
      return Response.json({ error: 'Social Science subject not found' }, { status: 404 });
    }
    const subjectId = subjects[0].id;

    // Get all questions for this subject
    const allQuestions = await base44.asServiceRole.entities.Question.filter(
      { subject_id: subjectId, is_active: true },
      "-created_date",
      1000
    );

    // Track seen questions by topic
    const seenByTopic = {};
    let duplicatesDeleted = 0;

    for (const q of allQuestions) {
      const topicId = q.topic_id;
      const questionText = q.question_text.trim().toLowerCase();

      if (!seenByTopic[topicId]) {
        seenByTopic[topicId] = new Set();
      }

      // If we've seen this question text before in this topic, delete it
      if (seenByTopic[topicId].has(questionText)) {
        await base44.asServiceRole.entities.Question.delete(q.id);
        duplicatesDeleted++;
      } else {
        seenByTopic[topicId].add(questionText);
      }
    }

    return Response.json({
      success: true,
      message: `Removed duplicate questions from exercises`,
      stats: {
        totalQuestionsChecked: allQuestions.length,
        duplicatesDeleted
      }
    });
  } catch (error) {
    console.error("Dedup error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});