import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get Mathematics subject
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: 'Mathematics', grade: 'Grade 7' });
    if (!subjects.length) {
      return Response.json({ error: 'Mathematics subject not found' }, { status: 404 });
    }
    const subjectId = subjects[0].id;

    // Get all active topics for Mathematics
    const topics = await base44.asServiceRole.entities.Topic.filter({ subject_id: subjectId, is_active: true }, 'order', 100);

    // Get all existing questions for this subject to find which topics already have questions
    const existingQuestions = await base44.asServiceRole.entities.Question.filter({ subject_id: subjectId, is_active: true }, '-created_date', 500);
    const topicsWithQuestions = new Set(existingQuestions.map(q => q.topic_id));

    const emptyTopics = topics.filter(t => !topicsWithQuestions.has(t.id));

    if (emptyTopics.length === 0) {
      return Response.json({ message: 'All Mathematics topics already have questions', topics_checked: topics.length });
    }

    const results = { generated: 0, skipped: 0, errors: [] };

    for (const topic of emptyTopics) {
      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          model: 'gemini_3_flash',
          prompt: `You are a ZIMSEC exam question setter for Grade 7 Mathematics in Zimbabwe.

Generate exactly 10 high-quality MCQ practice questions for:
Topic: ${topic.name}
Learning Objectives: ${topic.learning_objectives || 'General understanding of ' + topic.name}

STRICT RULES:
- Use simple, clear English a 12-year-old can understand.
- All questions must be directly relevant to the topic and learning objectives.
- Use Zimbabwe-based contexts where possible (e.g. Zimbabwe dollars, local names, distances between local cities).
- Spread correct answers evenly — do NOT always put the answer as A. Mix A, B, C and D fairly.
- Each explanation must be 1-2 simple sentences a child can understand.
- For calculation questions, show the working in the explanation.
- Vary difficulty: 3 Easy, 5 Standard, 2 Advanced questions.
- All 4 options must be plausible — avoid obviously wrong distractors.

Return a JSON object with a "questions" array. Each question must have:
- question_text (string)
- options: array of 4 objects each with "label" (A/B/C/D) and "text"
- correct_answer (single letter: A, B, C or D)
- explanation (string, simple 1-2 sentences)
- difficulty ("Easy", "Standard", or "Advanced")`,
          response_json_schema: {
            type: 'object',
            properties: {
              questions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    question_text: { type: 'string' },
                    options: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          label: { type: 'string' },
                          text: { type: 'string' }
                        }
                      }
                    },
                    correct_answer: { type: 'string' },
                    explanation: { type: 'string' },
                    difficulty: { type: 'string' }
                  }
                }
              }
            }
          }
        });

        if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
          results.errors.push({ topic: topic.name, error: 'No questions returned by AI' });
          continue;
        }

        for (const q of result.questions) {
          // Validate required fields and options
          if (!q.question_text || !q.correct_answer || !Array.isArray(q.options) || q.options.length < 4) continue;
          if (!['A', 'B', 'C', 'D'].includes(q.correct_answer.trim().toUpperCase())) continue;

          await base44.asServiceRole.entities.Question.create({
            topic_id: topic.id,
            subject_id: subjectId,
            question_text: q.question_text.trim(),
            comprehension_passage: '',
            options: q.options.map((o, i) => ({
              label: o.label || ['A', 'B', 'C', 'D'][i],
              text: String(o.text || '').trim()
            })),
            correct_answer: q.correct_answer.trim().toUpperCase(),
            explanation: q.explanation?.trim() || '',
            difficulty: q.difficulty || 'Standard',
            question_type: 'mcq',
            marks: 1,
            is_active: true
          });
          results.generated++;
        }

        console.log(`✅ Generated ${result.questions.length} questions for: ${topic.name}`);

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));

      } catch (err) {
        console.error(`❌ Error for topic "${topic.name}":`, err.message);
        results.errors.push({ topic: topic.name, error: err.message });
      }
    }

    return Response.json({
      success: true,
      topics_processed: emptyTopics.length,
      questions_generated: results.generated,
      errors: results.errors
    });

  } catch (error) {
    console.error('Function error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});