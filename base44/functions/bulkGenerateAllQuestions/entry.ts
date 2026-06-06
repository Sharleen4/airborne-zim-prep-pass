import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Admin-only: ensures every active topic across every grade & subject has at least
// `minQuestions` (default 10) active questions. Generates ONLY for topics that are
// short. Runs in batches to stay within function time limits — call repeatedly until
// `remaining` is 0.
//
// Payload: { minQuestions?: number (default 10), batchSize?: number (default 8) }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { minQuestions = 10, batchSize = 8 } = await req.json().catch(() => ({}));

    // Load active subjects and topics
    const [subjects, topics] = await Promise.all([
      base44.asServiceRole.entities.Subject.list('-created_date', 500),
      base44.asServiceRole.entities.Topic.list('-created_date', 2000),
    ]);

    const subjectsById = new Map(subjects.map(s => [s.id, s]));
    const activeTopics = topics.filter(t =>
      t.is_active !== false && subjectsById.get(t.subject_id)?.is_active !== false
    );

    // Find topics that are short on questions
    const shortTopics = [];
    for (const topic of activeTopics) {
      const existing = await base44.asServiceRole.entities.Question.filter(
        { topic_id: topic.id, is_active: true }, '-created_date', minQuestions + 1
      );
      if (existing.length < minQuestions) {
        shortTopics.push({ topic, existingCount: existing.length });
      }
    }

    if (shortTopics.length === 0) {
      return Response.json({
        success: true,
        message: 'All topics already have enough questions',
        topicsChecked: activeTopics.length,
        remaining: 0,
      });
    }

    // Process up to `batchSize` topics this run
    const toProcess = shortTopics.slice(0, batchSize);
    const results = [];

    for (const { topic, existingCount } of toProcess) {
      const subject = subjectsById.get(topic.subject_id);
      const grade = subject?.grade || 'Grade 7';
      const subjectName = subject?.name || 'this subject';
      const needed = minQuestions - existingCount;

      const isEnglish = (subjectName + ' ' + topic.name).toLowerCase().match(/english|comprehension|reading|grammar/);

      try {
        const result = await base44.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          prompt: `You are a ZIMSEC exam question setter for ${grade} Zimbabwe students.

Generate ${Math.max(needed, 10)} MCQ practice questions for:
Subject: ${subjectName}
Topic: ${topic.name}
Grade level: ${grade}

Rules:
- Use simple, clear English appropriate for ${grade} pupils.
- Short sentences. Age-appropriate vocabulary.
- Use Zimbabwe-based examples and contexts where possible.
- Spread correct answers evenly across A, B, C and D. Do NOT always use A.
- Explanations must be 1-2 simple sentences a child can understand.
${isEnglish ? '- For comprehension/reading topics: include a short reading passage (3-6 sentences, Zimbabwe context) in the comprehension_passage field. Multiple questions can share the same passage. For non-comprehension questions leave comprehension_passage empty.' : '- Leave comprehension_passage empty.'}

For each question provide:
- question_text
- comprehension_passage (optional)
- options: array of 4 objects with label (A/B/C/D) and text
- correct_answer (letter only: A, B, C or D)
- explanation (simple, 1-2 sentences)
- difficulty (Easy, Standard, or Advanced)

Return as JSON array.`,
          response_json_schema: {
            type: 'object',
            properties: {
              questions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    question_text: { type: 'string' },
                    comprehension_passage: { type: 'string' },
                    options: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: { label: { type: 'string' }, text: { type: 'string' } },
                      },
                    },
                    correct_answer: { type: 'string' },
                    explanation: { type: 'string' },
                    difficulty: { type: 'string' },
                  },
                },
              },
            },
          },
        });

        const qs = result?.questions || [];
        if (qs.length > 0) {
          const created = await Promise.all(
            qs.map(q =>
              base44.asServiceRole.entities.Question.create({
                topic_id: topic.id,
                subject_id: topic.subject_id,
                question_text: q.question_text,
                comprehension_passage: q.comprehension_passage || '',
                options: q.options,
                correct_answer: q.correct_answer,
                explanation: q.explanation,
                difficulty: q.difficulty || 'Standard',
                question_type: q.comprehension_passage ? 'comprehension' : 'mcq',
                marks: 1,
                is_active: true,
              }).catch(() => null)
            )
          );
          results.push({
            topic: topic.name,
            grade,
            subject: subjectName,
            generated: created.filter(Boolean).length,
          });
        } else {
          results.push({ topic: topic.name, grade, subject: subjectName, generated: 0, error: 'no questions returned' });
        }
      } catch (e) {
        results.push({ topic: topic.name, grade, subject: subjectName, generated: 0, error: e.message });
      }
    }

    return Response.json({
      success: true,
      processed: results.length,
      remaining: shortTopics.length - toProcess.length,
      totalShortTopics: shortTopics.length,
      results,
    });
  } catch (error) {
    console.error('bulkGenerateAllQuestions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});