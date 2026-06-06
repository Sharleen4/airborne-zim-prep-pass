import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { referenceId, subjectId, topicId, contentType = 'questions', numItems = 10, minThreshold = 0, grade } = await req.json();

    if (!subjectId) {
      return Response.json({ error: 'subjectId is required' }, { status: 400 });
    }

    // 1. Fetch the subject
    const subjects = await base44.asServiceRole.entities.Subject.filter({ is_active: true });
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) {
      return Response.json({ error: 'Subject not found' }, { status: 404 });
    }

    // 2. Fetch curriculum references — use specified one or all matching this subject/grade
    const allRefs = await base44.asServiceRole.entities.CurriculumReference.filter({ is_active: true });
    let relevantRefs = [];

    if (referenceId) {
      const ref = allRefs.find(r => r.id === referenceId);
      if (ref) relevantRefs = [ref];
    } else {
      // Auto-select all refs for this subject and grade with extracted text
      relevantRefs = allRefs.filter(r =>
        (r.subject_id === subjectId || (!r.subject_id && r.grade === (grade || subject.grade))) &&
        r.extracted_text &&
        r.extracted_text.length > 50
      );
    }

    // Build combined curriculum context from all relevant references
    const combinedContext = relevantRefs
      .map(r => `[${r.reference_type.toUpperCase()} - "${r.title}" (${r.grade || ''})]\n${r.extracted_text}`)
      .join('\n\n---\n\n')
      .slice(0, 8000); // cap to avoid token overflow

    const hasCurriculumContext = combinedContext.length > 50;

    // 3. Determine target topics
    let targetTopics = [];
    if (topicId) {
      const allTopics = await base44.asServiceRole.entities.Topic.filter({ subject_id: subjectId, is_active: true });
      const t = allTopics.find(t => t.id === topicId);
      targetTopics = t ? [t] : [];
    } else {
      targetTopics = await base44.asServiceRole.entities.Topic.filter({ subject_id: subjectId, is_active: true });
    }

    if (targetTopics.length === 0) {
      return Response.json({ error: 'No active topics found for this subject' }, { status: 404 });
    }

    let totalGenerated = 0;
    const results = [];

    for (const t of targetTopics) {
      try {
        if (contentType === 'notes') {
          // --- GENERATE NOTES ---
          const existing = await base44.asServiceRole.entities.Note.filter({ topic_id: t.id });
          if (existing.length > 0) {
            results.push({ topicName: t.name, generated: 0, status: 'skipped', reason: 'Notes already exist' });
            continue;
          }

          const prompt = `You are a friendly, encouraging teacher writing study notes for a Grade 7 pupil in Zimbabwe aged 12-13.

Topic: ${t.name}
Subject: ${subject.name}
Learning Objectives: ${t.learning_objectives || 'General understanding'}
${hasCurriculumContext ? `\nZIMSEC CURRICULUM REFERENCE (use this as your PRIMARY guide for accuracy and syllabus alignment):\n---\n${combinedContext}\n---\n` : ''}

STRICT RULES:
1. Write like you are talking directly to a 12-year-old. Use VERY simple everyday words only.
2. Short sentences ONLY — max 15 words per sentence.
3. EVERY example MUST use Zimbabwe real-life context: sadza, mealie meal, Harare, school fees, bus fare, farm, maize, cattle, Victoria Falls, river, market, ZIMSEC exam, soccer, braai, etc.
4. Align ALL content to the ZIMSEC syllabus objectives shown in the curriculum reference above.
5. Provide EXACTLY 3 concept_examples objects, each with EXACTLY 3 worked examples (Easy, Standard, Advanced).
6. In EVERY solution show ALL working steps: "Step 1: ... Step 2: ... Answer = ..."

Output ONLY valid JSON with these exact keys:
- overview: 2-3 simple sentences about what this topic is.
- key_definitions: the 4-5 most important words with simple meanings.
- key_concepts: the 3 main ideas explained simply with mini Zimbabwe examples.
- concept_examples: array of 3 concept objects: { "concept": "name", "examples": [{difficulty, problem, solution}, ...] }
- zimbabwe_examples: 3-4 sentences showing where this topic appears in real Zimbabwe life.
- important_facts: exactly 4 bullet points of the most important things to remember.
- common_mistakes: 3 common errors pupils make with a short fix for each.
- summary: exactly 5 short bullet points summarising the whole topic.
- exam_tips: 4 practical tips to score marks in the ZIMSEC exam for this topic.`;

          const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            model: 'gemini_3_flash',
            response_json_schema: {
              type: 'object',
              properties: {
                overview: { type: 'string' },
                key_definitions: { type: 'string' },
                key_concepts: { type: 'string' },
                concept_examples: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      concept: { type: 'string' },
                      examples: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            difficulty: { type: 'string' },
                            problem: { type: 'string' },
                            solution: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                },
                zimbabwe_examples: { type: 'string' },
                important_facts: { type: 'string' },
                common_mistakes: { type: 'string' },
                summary: { type: 'string' },
                exam_tips: { type: 'string' }
              }
            }
          });

          await base44.asServiceRole.entities.Note.create({
            topic_id: t.id,
            subject_id: subjectId,
            overview: result.overview || '',
            key_definitions: result.key_definitions || '',
            key_concepts: result.key_concepts || '',
            concept_examples: result.concept_examples || [],
            zimbabwe_examples: result.zimbabwe_examples || '',
            important_facts: result.important_facts || '',
            common_mistakes: result.common_mistakes || '',
            summary: result.summary || '',
            exam_tips: result.exam_tips || '',
            is_ai_generated: true,
            is_active: false,
          });

          totalGenerated++;
          results.push({ topicName: t.name, generated: 1, status: 'success' });

        } else {
          // --- GENERATE QUESTIONS ---
          // Skip if topic already has enough questions
          if (minThreshold > 0) {
            const existingQs = await base44.asServiceRole.entities.Question.filter({ topic_id: t.id, is_active: true });
            if (existingQs.length >= minThreshold) {
              results.push({ topicName: t.name, generated: 0, status: 'skipped', reason: `Already has ${existingQs.length} questions` });
              continue;
            }
          }

          const prompt = `You are an expert ZIMSEC exam paper setter for Grade 7 students in Zimbabwe.
${hasCurriculumContext ? `\nCURRICULUM REFERENCE - use this as your PRIMARY guide:\n---\n${combinedContext}\n---\n` : ''}
Generate ${numItems} high-quality MCQ practice questions for:
Subject: ${subject.name}
Topic: ${t.name}
Grade: ${subject.grade || 'Grade 7'}
${t.learning_objectives ? `Learning Objectives: ${t.learning_objectives}` : ''}

RULES:
- Base ALL questions directly on the syllabus objectives and curriculum content above.
- Use simple, clear English a 12-year-old can read.
- Use Zimbabwe-based examples and contexts.
- Spread correct answers evenly across A, B, C, D — do NOT overuse A.
- Each explanation must be 1–2 simple sentences.
- Mix difficulty: 40% Easy, 40% Standard, 20% Advanced.

Return valid JSON with array "questions", each having:
- question_text, comprehension_passage (empty if not applicable), options [{label, text}], correct_answer (A/B/C/D), explanation, difficulty`;

          const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt,
            model: 'gemini_3_flash',
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

          const questions = (result?.questions || []).filter(q => q.question_text && q.correct_answer && q.options?.length);

          const saved = await Promise.all(questions.map(q =>
            base44.asServiceRole.entities.Question.create({
              topic_id: t.id,
              subject_id: subjectId,
              question_text: q.question_text,
              comprehension_passage: q.comprehension_passage || '',
              options: q.options,
              correct_answer: q.correct_answer,
              explanation: q.explanation || '',
              difficulty: q.difficulty || 'Standard',
              question_type: q.comprehension_passage ? 'comprehension' : 'mcq',
              marks: 1,
              is_active: false,
            })
          ));

          totalGenerated += saved.length;
          results.push({ topicName: t.name, generated: saved.length, status: 'success' });
        }

        if (targetTopics.length > 1) await delay(500); // rate-limit only when processing multiple topics
      } catch (err) {
        results.push({ topicName: t.name, generated: 0, status: 'error', error: err.message });
      }
    }

    return Response.json({
      generated: totalGenerated,
      contentType,
      referenceCount: relevantRefs.length,
      referencesTitles: relevantRefs.map(r => r.title),
      topics: results,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});