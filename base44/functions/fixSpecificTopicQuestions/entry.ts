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

    // Target topics: Shelter, Managing Change, Social Etiquette, Career Guidance
    const targetTopicNames = ["Shelter", "Managing Change", "Social Etiquette", "Career Guidance"];
    
    // Get all topics for Social Science
    const allTopics = await base44.asServiceRole.entities.Topic.filter({ subject_id: subjectId });
    const targetTopics = allTopics.filter(t => targetTopicNames.includes(t.name));

    if (targetTopics.length === 0) {
      return Response.json({ error: 'Target topics not found' }, { status: 404 });
    }

    let fixed = 0, deleted = 0;
    const topicIds = targetTopics.map(t => t.id);

    // Get all questions for these topics
    const allQs = await base44.asServiceRole.entities.Question.filter(
      { question_type: "mcq", is_active: true },
      "-created_date",
      500
    );

    const targetQuestions = allQs.filter(q => topicIds.includes(q.topic_id));

    // Delete questions with insufficient options
    for (const q of targetQuestions) {
      const opts = q.options;
      
      // If options are malformed or less than 2, delete and regenerate
      if (!opts || !Array.isArray(opts) || opts.length < 2) {
        await base44.asServiceRole.entities.Question.delete(q.id);
        deleted++;
      } else {
        // Validate each option has label and text
        const hasInvalid = opts.some(opt => !opt.label || !opt.text);
        if (hasInvalid) {
          await base44.asServiceRole.entities.Question.delete(q.id);
          deleted++;
        }
      }
    }

    // Now regenerate questions for these topics
    for (const topic of targetTopics) {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          model: "gemini_3_flash",
          prompt: `Generate 8 simple MCQ questions for Grade 7 Zimbabwe students.

Topic: ${topic.name}
Learning Objectives: ${topic.learning_objectives || "General understanding"}

Rules:
- Use simple English a 12-year-old understands
- Short sentences
- Zimbabwe examples where possible
- Spread correct answers across A, B, C, D evenly
- explanation: 1-2 simple sentences
- difficulty: mostly Easy/Standard

Return JSON with "questions" array. Each question must have:
- question_text
- options: exactly 4 items with {label: "A"/"B"/"C"/"D", text: "..."}
- correct_answer: letter only (A, B, C, or D)
- explanation
- difficulty`,
          response_json_schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question_text: { type: "string" },
                    options: { type: "array", items: { type: "object" } },
                    correct_answer: { type: "string" },
                    explanation: { type: "string" },
                    difficulty: { type: "string" }
                  }
                }
              }
            }
          }
        });

        if (result.questions && result.questions.length > 0) {
          for (const q of result.questions) {
            await base44.asServiceRole.entities.Question.create({
              topic_id: topic.id,
              subject_id: subjectId,
              question_text: q.question_text || "",
              options: q.options || [
                { label: "A", text: "" },
                { label: "B", text: "" },
                { label: "C", text: "" },
                { label: "D", text: "" }
              ],
              correct_answer: q.correct_answer || "A",
              explanation: q.explanation || "",
              difficulty: q.difficulty || "Standard",
              question_type: "mcq",
              marks: 1,
              is_active: true
            });
            fixed++;
          }
        }
      } catch (e) {
        console.error(`Error regenerating ${topic.name}:`, e.message);
      }
    }

    return Response.json({
      success: true,
      message: `Fixed questions for Shelter, Managing Change, Social Etiquette, Career Guidance`,
      stats: {
        topicsFixed: targetTopics.length,
        questionsDeleted: deleted,
        questionsGenerated: fixed
      }
    });
  } catch (error) {
    console.error("Fix error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});