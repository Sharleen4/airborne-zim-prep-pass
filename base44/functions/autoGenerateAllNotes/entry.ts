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

    // Get all active topics
    const topics = await base44.asServiceRole.entities.Topic.filter({ 
      subject_id: subjectId, 
      is_active: true 
    }, "order", 100);

    if (!topics.length) {
      return Response.json({ error: 'No topics found' }, { status: 404 });
    }

    let generated = 0, skipped = 0, errors = [];

    // Generate notes for each topic
    for (const topic of topics) {
      // Check if notes already exist
      const existing = await base44.asServiceRole.entities.Note.filter({ topic_id: topic.id });
      
      if (existing.length > 0) {
        skipped++;
        continue;
      }

      try {
        // Generate notes using LLM
        const result = await base44.integrations.Core.InvokeLLM({
          model: "gemini_3_flash",
          prompt: `You are a friendly teacher writing study notes for Grade 7 pupils in Zimbabwe aged 12-13.

Topic: ${topic.name}
Learning Objectives: ${topic.learning_objectives || "General understanding"}

Write SIMPLE notes that a 12-year-old can easily understand and remember for exams.

RULES:
- Use VERY simple words. Short sentences (max 15 words each).
- Explain hard words in brackets like this: photosynthesis (how plants make food).
- Use real Zimbabwe examples: sadza, school, market, farm, Harare, Victoria Falls, etc.
- No long paragraphs. Keep sections SHORT and easy to read.
- No academic language. Write like talking to a friend.

Output JSON with these exact keys (all strings):
- overview: 2-3 simple sentences about what the topic is
- key_definitions: key words with simple meanings
- key_concepts: main ideas explained simply
- zimbabwe_examples: real Zimbabwe examples pupils know
- important_facts: things to remember for exams
- common_mistakes: exam mistakes to avoid
- summary: 4-5 short bullet points
- exam_tips: simple tips to get good marks`,
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

        // Save notes to database
        await base44.asServiceRole.entities.Note.create({
          topic_id: topic.id,
          subject_id: subjectId,
          overview: result.overview || "",
          key_definitions: result.key_definitions || "",
          key_concepts: result.key_concepts || "",
          zimbabwe_examples: result.zimbabwe_examples || "",
          important_facts: result.important_facts || "",
          common_mistakes: result.common_mistakes || "",
          summary: result.summary || "",
          exam_tips: result.exam_tips || "",
          is_ai_generated: true
        });

        generated++;
      } catch (e) {
        errors.push({ topicName: topic.name, error: e.message });
      }
    }

    return Response.json({
      success: true,
      message: `Auto-generated notes for Social Sciences`,
      stats: {
        generated,
        skipped,
        total: topics.length,
        errors: errors.length > 0 ? errors : null
      }
    });
  } catch (error) {
    console.error("Auto-generate error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});