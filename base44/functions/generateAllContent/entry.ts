import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Universal scheduled function: generates missing questions AND notes for ALL subjects
// Skips topics that already have content — safe to run repeatedly

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active subjects
    const subjects = await base44.asServiceRole.entities.Subject.filter({ is_active: true });
    if (!subjects.length) {
      return Response.json({ error: 'No subjects found' }, { status: 404 });
    }

    const stats = { questions_generated: 0, notes_generated: 0, skipped: 0, errors: [] };

    for (const subject of subjects) {
      const topics = await base44.asServiceRole.entities.Topic.filter(
        { subject_id: subject.id, is_active: true },
        'order',
        100
      );

      // Fetch all existing questions and notes for this subject at once
      const [existingQuestions, existingNotes] = await Promise.all([
        base44.asServiceRole.entities.Question.filter({ subject_id: subject.id, is_active: true }, '-created_date', 500),
        base44.asServiceRole.entities.Note.filter({ subject_id: subject.id }, '-created_date', 200),
      ]);

      const topicsWithQuestions = new Set(existingQuestions.map(q => q.topic_id));
      const topicsWithNotes = new Set(existingNotes.map(n => n.topic_id));

      for (const topic of topics) {
        const needsQuestions = !topicsWithQuestions.has(topic.id);
        const needsNotes = !topicsWithNotes.has(topic.id);

        if (!needsQuestions && !needsNotes) {
          stats.skipped++;
          continue;
        }

        const isEnglish = subject.name?.toLowerCase().includes('english') ||
          topic.name?.toLowerCase().includes('comprehension') ||
          topic.name?.toLowerCase().includes('reading');

        // Generate questions if missing
        if (needsQuestions) {
          try {
            const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
              model: 'gemini_3_flash',
              prompt: `You are a ZIMSEC exam question setter for Grade 7 Zimbabwe students.

Generate 10 MCQ practice questions for:
Subject: ${subject.name}
Topic: ${topic.name}
Learning Objectives: ${topic.learning_objectives || 'General understanding of ' + topic.name}

Rules:
- Simple clear English a 12-year-old can understand.
- Use Zimbabwe-based contexts and examples where possible.
- Spread correct answers evenly across A, B, C and D. Do NOT always use A.
- Explanation must be 1-2 simple sentences.
- Vary difficulty: 3 Easy, 5 Standard, 2 Advanced.
${isEnglish ? '- For comprehension topics: include a short reading passage (3-6 sentences, Zimbabwe context) in comprehension_passage. Leave empty for others.' : '- Leave comprehension_passage empty.'}

Return JSON with a "questions" array. Each question:
- question_text, comprehension_passage, options (array of {label, text}), correct_answer (A/B/C/D), explanation, difficulty`,
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
                        options: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, text: { type: 'string' } } } },
                        correct_answer: { type: 'string' },
                        explanation: { type: 'string' },
                        difficulty: { type: 'string' }
                      }
                    }
                  }
                }
              }
            });

            for (const q of (result.questions || [])) {
              if (!q.question_text || !q.correct_answer || !Array.isArray(q.options) || q.options.length < 4) continue;
              if (!['A', 'B', 'C', 'D'].includes(q.correct_answer.trim().toUpperCase())) continue;

              await base44.asServiceRole.entities.Question.create({
                topic_id: topic.id,
                subject_id: subject.id,
                question_text: q.question_text.trim(),
                comprehension_passage: q.comprehension_passage || '',
                options: q.options.map((o, i) => ({ label: o.label || ['A','B','C','D'][i], text: String(o.text || '').trim() })),
                correct_answer: q.correct_answer.trim().toUpperCase(),
                explanation: q.explanation?.trim() || '',
                difficulty: q.difficulty || 'Standard',
                question_type: q.comprehension_passage ? 'comprehension' : 'mcq',
                marks: 1,
                is_active: true
              });
              stats.questions_generated++;
            }

            console.log(`✅ Questions generated for: ${subject.name} > ${topic.name}`);
            await new Promise(r => setTimeout(r, 400));
          } catch (e) {
            console.error(`❌ Questions error: ${subject.name} > ${topic.name}:`, e.message);
            stats.errors.push({ subject: subject.name, topic: topic.name, type: 'questions', error: e.message });
          }
        }

        // Generate notes if missing
        if (needsNotes) {
          try {
            const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
              model: 'gemini_3_flash',
              prompt: `You are a friendly teacher writing study notes for Grade 7 pupils in Zimbabwe aged 12-13.

Subject: ${subject.name}
Topic: ${topic.name}
Learning Objectives: ${topic.learning_objectives || 'General understanding'}

RULES:
- VERY simple words. Short sentences (max 15 words each).
- Explain hard words in brackets: e.g. photosynthesis (how plants make food).
- Use real Zimbabwe examples: sadza, school, market, Harare, Victoria Falls, etc.
- No long paragraphs. Keep sections SHORT.
- No academic language.

Output JSON with these exact keys (all strings):
overview, key_definitions, key_concepts, zimbabwe_examples, important_facts, common_mistakes, summary, exam_tips`,
              response_json_schema: {
                type: 'object',
                properties: {
                  overview: { type: 'string' },
                  key_definitions: { type: 'string' },
                  key_concepts: { type: 'string' },
                  zimbabwe_examples: { type: 'string' },
                  important_facts: { type: 'string' },
                  common_mistakes: { type: 'string' },
                  summary: { type: 'string' },
                  exam_tips: { type: 'string' }
                }
              }
            });

            await base44.asServiceRole.entities.Note.create({
              topic_id: topic.id,
              subject_id: subject.id,
              overview: result.overview || '',
              key_definitions: result.key_definitions || '',
              key_concepts: result.key_concepts || '',
              zimbabwe_examples: result.zimbabwe_examples || '',
              important_facts: result.important_facts || '',
              common_mistakes: result.common_mistakes || '',
              summary: result.summary || '',
              exam_tips: result.exam_tips || '',
              is_ai_generated: true
            });

            stats.notes_generated++;
            console.log(`✅ Notes generated for: ${subject.name} > ${topic.name}`);
            await new Promise(r => setTimeout(r, 400));
          } catch (e) {
            console.error(`❌ Notes error: ${subject.name} > ${topic.name}:`, e.message);
            stats.errors.push({ subject: subject.name, topic: topic.name, type: 'notes', error: e.message });
          }
        }
      }
    }

    return Response.json({
      success: true,
      subjects_processed: subjects.length,
      questions_generated: stats.questions_generated,
      notes_generated: stats.notes_generated,
      topics_skipped: stats.skipped,
      errors: stats.errors
    });

  } catch (error) {
    console.error('generateAllContent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});