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

    // Get all topics and map by their names
    const allTopics = await base44.asServiceRole.entities.Topic.filter({ subject_id: subjectId });
    const topicMap = {};
    const topicNames = {
      "SS7-T1": "Identity",
      "SS7-T5": "Transport and Communication",
      "SS7-T7": "Global Issues",
      "SS7-T10": "Rights and Responsibilities",
      "SS7-T11": "Health"
    };
    
    allTopics.forEach(t => {
      for (const [code, name] of Object.entries(topicNames)) {
        if (t.name === name) {
          topicMap[code] = t.id;
        }
      }
    });

    // Questions data
    const questionsData = [
      { id: "Q1", topicId: "SS7-T1", optA: "Shouting", optB: "Respect", optC: "Ignoring", optD: "Selfishness", correct: "B", explain: "Respect builds strong relationships", difficulty: "Easy", bloom: "Remember" },
      { id: "Q2", topicId: "SS7-T1", optA: "Good communication", optB: "Teamwork", optC: "Financial stress", optD: "Happiness", correct: "C", explain: "Money problems cause disputes", difficulty: "Easy", bloom: "Understand" },
      { id: "Q3", topicId: "SS7-T1", optA: "Good communication", optB: "Poor communication", optC: "Trust", optD: "Respect", correct: "B", explain: "Poor communication causes disputes", difficulty: "Medium", bloom: "Understand" },
      { id: "Q4", topicId: "SS7-T7", optA: "Land improvement", optB: "Land degradation", optC: "Soil watering", optD: "Tree planting", correct: "B", explain: "Desertification means land degradation", difficulty: "Easy", bloom: "Remember" },
      { id: "Q5", topicId: "SS7-T11", optA: "Sharing needles", optB: "Unprotected sex", optC: "Abstinence", optD: "Ignoring health advice", correct: "C", explain: "Abstinence prevents HIV", difficulty: "Easy", bloom: "Remember" },
      { id: "Q6", topicId: "SS7-T5", optA: "Decoration", optB: "Safety", optC: "Advertising", optD: "None", correct: "B", explain: "Road signs promote safety", difficulty: "Easy", bloom: "Understand" },
      { id: "Q7", topicId: "SS7-T10", optA: "Right to cheat", optB: "Right to safe products", optC: "Right to steal", optD: "Right to lie", correct: "B", explain: "Consumers deserve safe products", difficulty: "Medium", bloom: "Understand" }
    ];

    let created = 0, skipped = 0;

    for (const q of questionsData) {
      const topicId = topicMap[q.topicId];
      if (!topicId) {
        console.warn(`Topic ${q.topicId} not found`);
        skipped++;
        continue;
      }

      // Check if question already exists
      const existing = await base44.asServiceRole.entities.Question.filter({ 
        topic_id: topicId, 
        question_text: `Which is a characteristic of a good marriage?` 
      });
      
      // Create the question with options array
      const saved = await base44.asServiceRole.entities.Question.create({
        topic_id: topicId,
        subject_id: subjectId,
        question_text: getQuestionText(q.id, q),
        options: [
          { label: "A", text: q.optA },
          { label: "B", text: q.optB },
          { label: "C", text: q.optC },
          { label: "D", text: q.optD }
        ],
        correct_answer: q.correct,
        explanation: q.explain,
        difficulty: q.difficulty,
        bloom_level: q.bloom,
        question_type: "mcq",
        marks: 1,
        is_active: true
      });
      created++;
    }

    return Response.json({
      success: true,
      message: `Imported Social Sciences questions`,
      stats: {
        created,
        skipped,
        total: questionsData.length
      }
    });
  } catch (error) {
    console.error("Import error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getQuestionText(id, q) {
  const questions = {
    "Q1": "Which is a characteristic of a good marriage?",
    "Q2": "Which is a cause of marital disputes?",
    "Q3": "Which of the following is a cause of family conflict?",
    "Q4": "What is desertification?",
    "Q5": "Which is a method of preventing HIV?",
    "Q6": "Why are road signs important?",
    "Q7": "What is a consumer right?"
  };
  return questions[id] || "Question";
}