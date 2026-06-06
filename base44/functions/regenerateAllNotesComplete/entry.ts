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

    // Delete all existing notes for this subject
    const existingNotes = await base44.asServiceRole.entities.Note.filter({ subject_id: subjectId });
    for (const note of existingNotes) {
      await base44.asServiceRole.entities.Note.delete(note.id);
    }

    // Get all active topics
    const topics = await base44.asServiceRole.entities.Topic.filter({ 
      subject_id: subjectId, 
      is_active: true 
    }, "order", 100);

    if (!topics.length) {
      return Response.json({ error: 'No topics found' }, { status: 404 });
    }

    let generated = 0, errors = [];

    // Generate complete notes for each topic
    for (const topic of topics) {
      try {
        // Generate comprehensive notes using LLM
        const result = await base44.integrations.Core.InvokeLLM({
          model: "gemini_3_flash",
          prompt: `You are a friendly teacher writing study notes for Grade 7 pupils in Zimbabwe aged 12-13.

Topic: ${topic.name}
Learning Objectives: ${topic.learning_objectives || "General understanding"}

Write SIMPLE study notes that a 12-year-old can easily understand and remember for exams.

RULES:
- Use VERY simple words. Short sentences (max 15 words each).
- Explain hard words in brackets: photosynthesis (how plants make food).
- Use real Zimbabwe examples: sadza, school, market, farm, Harare, Victoria Falls, families, etc.
- No long paragraphs. Keep sections SHORT and easy to read.
- No academic language. Write like talking to a friend.
- Every field must have content (never leave empty).

Output JSON with these exact keys (all strings, no empty values):
- overview: 2-3 simple sentences about what the topic is about
- key_definitions: list key words with simple meanings (one per line)
- key_concepts: explain the 3-4 main ideas step by step using simple language
- zimbabwe_examples: give 2-3 real Zimbabwe examples pupils know and understand
- important_facts: list 5-6 important things to remember for the exam (bullet points)
- common_mistakes: list 3-4 common exam mistakes pupils make and how to avoid them
- summary: 4-5 short bullet point summary of the main topic
- exam_tips: 3-4 simple tips to get good marks in exam questions on this topic`,
          response_json_schema: {
            type: "object",
            properties: {
              overview: { type: "string" },
              key_definitions: { type: "string" },
              key_concepts: { type: "string" },
              zimbabwe_examples: { type: "string" },
              important_facts: { type: "string" },
              common_mistakes: { type: "string" },
              summary: { type: "string" },
              exam_tips: { type: "string" }
            }
          }
        });

        // Save complete notes to database
        await base44.asServiceRole.entities.Note.create({
          topic_id: topic.id,
          subject_id: subjectId,
          overview: result.overview || "Topic overview",
          key_definitions: result.key_definitions || "Key terms",
          key_concepts: result.key_concepts || "Main concepts",
          zimbabwe_examples: result.zimbabwe_examples || "Local examples",
          important_facts: result.important_facts || "Important points",
          common_mistakes: result.common_mistakes || "Common errors",
          summary: result.summary || "Summary points",
          exam_tips: result.exam_tips || "Exam advice",
          is_ai_generated: true
        });

        generated++;
      } catch (e) {
        errors.push({ topicName: topic.name, error: e.message });
      }
    }

    return Response.json({
      success: true,
      message: `Regenerated complete notes for all Social Sciences topics`,
      stats: {
        generated,
        total: topics.length,
        errors: errors.length > 0 ? errors : null
      }
    });
  } catch (error) {
    console.error("Regenerate error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});