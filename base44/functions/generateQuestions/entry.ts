import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { topicId } = await req.json();

    if (!topicId) {
      return Response.json({ error: 'topicId is required' }, { status: 400 });
    }

    // Fetch topic
    const topics = await base44.asServiceRole.entities.Topic.filter({ id: topicId });
    const topic = topics[0];

    if (!topic) {
      return Response.json({ error: 'Topic not found' }, { status: 404 });
    }

    // Check if enough questions already exist (we want at least 10 per topic)
    const existing = await base44.asServiceRole.entities.Question.filter({ 
      topic_id: topicId, 
      is_active: true
    }, "-created_date", 50);
    
    if (existing.length >= 10) {
      return Response.json({ message: 'Topic already has enough questions', count: existing.length });
    }

    const isEnglish = topic.name?.toLowerCase().includes("english") || topic.name?.toLowerCase().includes("comprehension") || topic.name?.toLowerCase().includes("reading");

    // Generate questions
    const result = await base44.integrations.Core.InvokeLLM({
      model: "gemini_3_flash",
      prompt: `You are a ZIMSEC exam question setter for Grade 7 Zimbabwe students.

Generate 10 MCQ practice questions for:
Topic: ${topic.name}

Rules:
- Use simple, clear English that a 12-year-old can understand.
- Short sentences. No difficult words unless needed, and if needed, keep the question context clear.
- Use Zimbabwe-based examples and contexts where possible.
- Spread correct answers evenly across A, B, C and D. Do NOT always use A.
- explanation must be 1-2 simple sentences a child can understand.
${isEnglish ? `- For comprehension/reading topics: include a short reading passage (3-6 sentences, Zimbabwe context) in the comprehension_passage field. Multiple questions can share the same passage. For non-comprehension questions leave comprehension_passage empty.` : "- Leave comprehension_passage empty."}

For each question provide:
- question_text
- comprehension_passage (optional passage text, only for comprehension/reading questions)
- options: array of 4 objects with label (A/B/C/D) and text
- correct_answer (letter only: A, B, C or D)
- explanation (simple, 1-2 sentences)
- difficulty (Easy, Standard, or Advanced)

Return as JSON array.`,
      response_json_schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question_text: { type: "string" },
                comprehension_passage: { type: "string" },
                options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string" } } } },
                correct_answer: { type: "string" },
                explanation: { type: "string" },
                difficulty: { type: "string" }
              }
            }
          }
        }
      }
    });

    if (!result.questions || result.questions.length === 0) {
      console.warn("AI generated no questions for topic:", topic.name);
      return Response.json({ error: 'No questions generated' }, { status: 500 });
    }

    // Save all questions in parallel for speed (was sequential — much slower)
    const created = await Promise.all(result.questions.map(q =>
      base44.asServiceRole.entities.Question.create({
        topic_id: topicId,
        subject_id: topic.subject_id,
        question_text: q.question_text,
        comprehension_passage: q.comprehension_passage || "",
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty || "Standard",
        question_type: q.comprehension_passage ? "comprehension" : "mcq",
        marks: 1,
        is_active: true
      })
    ));

    return Response.json({ success: true, count: created.length, questions: created });
  } catch (error) {
    console.error("Question generation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});