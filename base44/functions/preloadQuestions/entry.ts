import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Bulk-generates MCQ questions for all topics in a subject that currently have fewer than `minCount` questions.
// Admin-only. Streams progress via JSON lines, or returns a final summary if streaming isn't needed.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { subjectId, minCount = 20 } = await req.json();

    if (!subjectId) {
      return Response.json({ error: 'subjectId is required' }, { status: 400 });
    }

    // Fetch subject and its topics
    const subjects = await base44.asServiceRole.entities.Subject.filter({ id: subjectId, is_active: true });
    const subject = subjects[0];
    if (!subject) {
      return Response.json({ error: 'Subject not found' }, { status: 404 });
    }

    const topics = await base44.asServiceRole.entities.Topic.filter(
      { subject_id: subjectId, is_active: true },
      'order',
      200
    );

    const results = [];
    let totalGenerated = 0;
    let totalSkipped = 0;
    let errors = [];

    for (const topic of topics) {
      try {
        // Check how many questions already exist
        const existing = await base44.asServiceRole.entities.Question.filter(
          { topic_id: topic.id, is_active: true, question_type: 'mcq' },
          'created_date',
          200
        );

        if (existing.length >= minCount) {
          totalSkipped++;
          results.push({ topicId: topic.id, topicName: topic.name, status: 'skipped', count: existing.length });
          continue;
        }

        const needed = minCount - existing.length;
        const isEnglish = topic.name?.toLowerCase().includes('english') ||
          topic.name?.toLowerCase().includes('comprehension') ||
          topic.name?.toLowerCase().includes('reading');

        // Generate questions via LLM
        const result = await base44.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          prompt: `You are a ZIMSEC exam question setter for Grade 7 Zimbabwe students.

Generate ${needed} MCQ practice questions for:
Subject: ${subject.name}
Topic: ${topic.name}
Learning Objectives: ${topic.learning_objectives || 'General understanding'}

Rules:
- Use simple, clear English that a 12-year-old can understand.
- Short sentences. No difficult words unless the topic requires them.
- Use Zimbabwe-based examples and contexts where possible.
- Spread correct answers evenly across A, B, C and D. Do NOT always use A.
- explanation must be 1-2 simple sentences a child can understand.
- difficulty mix: 40% Easy, 40% Standard, 20% Advanced.
${isEnglish ? '- For comprehension topics include a short passage (3-6 sentences) in comprehension_passage field.' : '- Leave comprehension_passage empty.'}

Return JSON with questions array. Each question needs:
- question_text
- comprehension_passage (optional)
- options: [{label: "A"/"B"/"C"/"D", text: "..."}]
- correct_answer (letter only)
- explanation
- difficulty`,
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
                    options: { type: 'array', items: { type: 'object' } },
                    correct_answer: { type: 'string' },
                    explanation: { type: 'string' },
                    difficulty: { type: 'string' }
                  }
                }
              }
            }
          }
        });

        const generated = result.questions || [];
        let saved = 0;

        // Deduplicate against existing
        const existingTexts = new Set(existing.map(q => q.question_text?.trim().toLowerCase()));

        for (const q of generated) {
          const textKey = q.question_text?.trim().toLowerCase();
          if (!textKey || existingTexts.has(textKey)) continue;
          if (!q.options || q.options.length < 2) continue;

          await base44.asServiceRole.entities.Question.create({
            topic_id: topic.id,
            subject_id: subjectId,
            question_text: q.question_text,
            comprehension_passage: q.comprehension_passage || '',
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation || '',
            difficulty: q.difficulty || 'Standard',
            question_type: q.comprehension_passage ? 'comprehension' : 'mcq',
            marks: 1,
            is_active: true
          });
          existingTexts.add(textKey);
          saved++;
        }

        totalGenerated += saved;
        results.push({ topicId: topic.id, topicName: topic.name, status: 'generated', generated: saved, existingBefore: existing.length });

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));

      } catch (topicError) {
        console.error(`Error generating for topic ${topic.name}:`, topicError.message);
        errors.push({ topicId: topic.id, topicName: topic.name, error: topicError.message });
      }
    }

    return Response.json({
      success: true,
      subject: subject.name,
      totalTopics: topics.length,
      totalGenerated,
      totalSkipped,
      errors,
      results
    });

  } catch (error) {
    console.error('preloadQuestions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});