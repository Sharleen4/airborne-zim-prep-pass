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

    // Check if notes already exist
    const existing = await base44.asServiceRole.entities.Note.filter({ topic_id: topicId });
    if (existing.length > 0) {
      return Response.json({ message: 'Notes already exist for this topic', note: existing[0] });
    }

    // Generate notes
    const result = await base44.integrations.Core.InvokeLLM({
      model: "gemini_3_flash",
      prompt: `You are a friendly teacher writing notes for a Grade 7 pupil in Zimbabwe aged 12-13.

Topic: ${topic.name}
Learning Objectives: ${topic.learning_objectives || "General understanding"}

RULES — follow these strictly:
- Write like you are talking to a 12-year-old. Use VERY simple words.
- Short sentences only. Maximum 15 words per sentence.
- If you use a hard word, explain it right away in brackets like this: photosynthesis (how plants make food).
- Use examples from everyday Zimbabwe life: sadza, school, market, farm, Harare, etc.
- No long paragraphs. Keep every section short and easy to read.
- No academic or formal language.

Output JSON with these keys:
- overview: 2-3 simple sentences saying what this topic is about
- key_definitions: key words with their simple meanings, one per line
- key_concepts: the main ideas explained step by step, like a simple story
- zimbabwe_examples: real Zimbabwe examples that pupils will know
- important_facts: bullet points of the most important things to remember
- common_mistakes: mistakes pupils make in exams and how to avoid them
- summary: 4-5 short bullet points summing up the topic
- exam_tips: simple tips to do well in the exam`,
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

    // Save notes
    const saved = await base44.asServiceRole.entities.Note.create({
      topic_id: topicId,
      subject_id: topic.subject_id,
      overview: result.overview,
      key_definitions: result.key_definitions,
      key_concepts: result.key_concepts,
      zimbabwe_examples: result.zimbabwe_examples,
      important_facts: result.important_facts,
      common_mistakes: result.common_mistakes,
      summary: result.summary,
      exam_tips: result.exam_tips,
      is_ai_generated: true
    });

    return Response.json({ success: true, note: saved });
  } catch (error) {
    console.error("Note generation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});