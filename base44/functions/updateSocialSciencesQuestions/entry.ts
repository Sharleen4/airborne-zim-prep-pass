import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get Social Sciences subject
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: "Social Science" });
    if (!subjects.length) {
      return Response.json({ error: 'Social Science subject not found' }, { status: 404 });
    }

    const subjectId = subjects[0].id;

    // Get all topics and create mapping
    const allTopics = await base44.asServiceRole.entities.Topic.filter({ subject_id: subjectId });
    const topicMap = {};
    allTopics.forEach(t => {
      const match = t.name.match(/Identity|Global Issues|Transport|Health|Rights/i);
      if (t.name === "Identity") topicMap["SS7-T1"] = t.id;
      if (t.name === "Global Issues") topicMap["SS7-T7"] = t.id;
      if (t.name === "Transport and Communication") topicMap["SS7-T5"] = t.id;
      if (t.name === "Health") topicMap["SS7-T11"] = t.id;
      if (t.name === "Rights and Responsibilities") topicMap["SS7-T10"] = t.id;
    });

    // Delete existing questions for these topics
    const existingQuestions = await base44.asServiceRole.entities.Question.filter({ subject_id: subjectId });
    for (const q of existingQuestions) {
      await base44.asServiceRole.entities.Question.delete(q.id);
    }

    // Create new questions
    const questionsData = [
      { topicId: "SS7-T1", text: "Which is a characteristic of a good marriage?", optA: "Shouting", optB: "Respect", optC: "Ignoring", optD: "Selfishness", correct: "B", explanation: "Respect builds strong relationships", difficulty: "Easy", bloom: "Remember" },
      { topicId: "SS7-T1", text: "Which is a cause of marital disputes?", optA: "Good communication", optB: "Teamwork", optC: "Financial stress", optD: "Happiness", correct: "C", explanation: "Money problems cause disputes", difficulty: "Easy", bloom: "Understand" },
      { topicId: "SS7-T1", text: "Which of the following is a cause of family conflict?", optA: "Good communication", optB: "Poor communication", optC: "Trust", optD: "Respect", correct: "B", explanation: "Poor communication causes disputes", difficulty: "Medium", bloom: "Understand" },
      { topicId: "SS7-T7", text: "What is desertification?", optA: "Land improvement", optB: "Land degradation", optC: "Soil watering", optD: "Tree planting", correct: "B", explanation: "Desertification means land degradation", difficulty: "Easy", bloom: "Remember" },
      { topicId: "SS7-T11", text: "Which is a method of preventing HIV?", optA: "Sharing needles", optB: "Unprotected sex", optC: "Abstinence", optD: "Ignoring health advice", correct: "C", explanation: "Abstinence prevents HIV", difficulty: "Easy", bloom: "Remember" },
      { topicId: "SS7-T5", text: "Why are road signs important?", optA: "Decoration", optB: "Safety", optC: "Advertising", optD: "None", correct: "B", explanation: "Road signs promote safety", difficulty: "Easy", bloom: "Understand" },
      { topicId: "SS7-T10", text: "What is a consumer right?", optA: "Right to cheat", optB: "Right to safe products", optC: "Right to steal", optD: "Right to lie", correct: "B", explanation: "Consumers deserve safe products", difficulty: "Medium", bloom: "Understand" }
    ];

    const created = [];
    for (const q of questionsData) {
      const topicId = topicMap[q.topicId];
      if (!topicId) {
        console.warn(`Topic ${q.topicId} not found`);
        continue;
      }

      const question = await base44.asServiceRole.entities.Question.create({
        topic_id: topicId,
        subject_id: subjectId,
        question_text: q.text,
        options: [
          { label: "A", text: q.optA },
          { label: "B", text: q.optB },
          { label: "C", text: q.optC },
          { label: "D", text: q.optD }
        ],
        correct_answer: q.correct,
        explanation: q.explanation,
        difficulty: q.difficulty,
        bloom_level: q.bloom,
        question_type: "mcq",
        marks: 1,
        is_active: true
      });
      created.push(question);
    }

    return Response.json({
      success: true,
      message: `Updated Social Sciences questions: ${created.length} questions created`,
      count: created.length
    });
  } catch (error) {
    console.error("Update error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});