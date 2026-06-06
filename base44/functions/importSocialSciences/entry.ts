import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results = { subject: null, topics: [], notes: [], questions: [], exams: [], errors: [] };

    // 1. Create Subject
    try {
      const subject = await base44.asServiceRole.entities.Subject.create({
        name: "Social Science",
        grade: "Grade 7",
        icon: "🌍",
        description: "Heritage based social science Zimbabwe syllabus",
        is_active: true
      });
      results.subject = subject;
    } catch (e) {
      results.errors.push(`Subject creation failed: ${e.message}`);
    }

    if (!results.subject) {
      return Response.json({ error: 'Failed to create subject' }, { status: 500 });
    }

    const subjectId = results.subject.id;

    // 2. Create Topics
    const topicsData = [
      { id: "SS7-T1", name: "Identity", description: "Family relationships and conflict management", learning_objectives: "Understand marital relationships and conflict resolution" },
      { id: "SS7-T2", name: "National History and Governance", description: "Independence and governance", learning_objectives: "Explain independence and Zimbabwe governance systems" },
      { id: "SS7-T3", name: "Heritage", description: "Cultural preservation and food preservation", learning_objectives: "Understand heritage preservation methods" },
      { id: "SS7-T4", name: "Work and Leisure", description: "Human capital and tourism", learning_objectives: "Understand employment creation and tourism" },
      { id: "SS7-T5", name: "Transport and Communication", description: "Transport systems and safety", learning_objectives: "Understand transport choices and safety" },
      { id: "SS7-T6", name: "Shelter", description: "Housing challenges", learning_objectives: "Understand housing solutions and settlement patterns" },
      { id: "SS7-T7", name: "Global Issues", description: "Desertification and environment", learning_objectives: "Understand environmental challenges" },
      { id: "SS7-T8", name: "Managing Change", description: "Puberty and social changes", learning_objectives: "Understand adolescent development" },
      { id: "SS7-T9", name: "Social Etiquette", description: "Workplace behaviour", learning_objectives: "Understand communication skills" },
      { id: "SS7-T10", name: "Rights and Responsibilities", description: "Consumer rights and gender equity", learning_objectives: "Understand citizen rights" },
      { id: "SS7-T11", name: "Health", description: "Diseases and first aid", learning_objectives: "Understand disease prevention" },
      { id: "SS7-T12", name: "Career Guidance", description: "Study skills and careers", learning_objectives: "Understand career choices" },
      { id: "SS7-T13", name: "Religion", description: "World religions", learning_objectives: "Understand religious practices" },
      { id: "SS7-T14", name: "Social Services", description: "Volunteerism", learning_objectives: "Understand social services roles" }
    ];

    const topicMap = {};
    for (let i = 0; i < topicsData.length; i++) {
      const t = topicsData[i];
      const topic = await base44.asServiceRole.entities.Topic.create({
        subject_id: subjectId,
        name: t.name,
        order: i + 1,
        learning_objectives: t.learning_objectives,
        is_active: true
      });
      topicMap[t.id] = topic.id;
      results.topics.push(topic);
    }

    // 3. Create Notes
    const notesData = [
      { topicId: "SS7-T1", title: "Marital Relationships", overview: "A marital relationship is the relationship between husband and wife built on love trust respect and communication. Good marriages are built on teamwork honesty and loyalty." },
      { topicId: "SS7-T1", title: "Causes of Family Conflict", overview: "Conflicts may be caused by poor communication financial problems jealousy substance abuse and stress." },
      { topicId: "SS7-T1", title: "Conflict Resolution", overview: "Conflicts can be resolved through communication counselling respect and seeking advice from elders." },
      { topicId: "SS7-T7", title: "Desertification", overview: "Desertification is land degradation caused by drought deforestation and poor farming methods." },
      { topicId: "SS7-T11", title: "HIV and AIDS", overview: "HIV is a virus that weakens the immune system. AIDS is the advanced stage of HIV infection." }
    ];

    for (const note of notesData) {
      const created = await base44.asServiceRole.entities.Note.create({
        topic_id: topicMap[note.topicId],
        subject_id: subjectId,
        overview: note.overview,
        key_definitions: "",
        key_concepts: "",
        zimbabwe_examples: "",
        important_facts: "",
        common_mistakes: "",
        summary: "",
        exam_tips: "",
        is_ai_generated: false
      });
      results.notes.push(created);
    }

    // 4. Create Questions
    const questionsData = [
      { topicId: "SS7-T1", text: "Which is a characteristic of a good marriage?", optA: "Shouting", optB: "Respect", optC: "Ignoring", optD: "Selfishness", correct: "B", explanation: "Respect builds strong relationships", difficulty: "Easy" },
      { topicId: "SS7-T1", text: "Which is a cause of marital disputes?", optA: "Good communication", optB: "Teamwork", optC: "Financial stress", optD: "Happiness", correct: "C", explanation: "Money problems cause disputes", difficulty: "Easy" },
      { topicId: "SS7-T7", text: "What is desertification?", optA: "Land improvement", optB: "Land degradation", optC: "Soil watering", optD: "Tree planting", correct: "B", explanation: "Desertification means land degradation", difficulty: "Easy" },
      { topicId: "SS7-T5", text: "Why are road signs important?", optA: "Decoration", optB: "Safety", optC: "Advertising", optD: "None", correct: "B", explanation: "Road signs promote safety", difficulty: "Easy" },
      { topicId: "SS7-T10", text: "What is a consumer right?", optA: "Right to cheat", optB: "Right to safe products", optC: "Right to steal", optD: "Right to lie", correct: "B", explanation: "Consumers deserve safe products", difficulty: "Medium" }
    ];

    for (const q of questionsData) {
      const created = await base44.asServiceRole.entities.Question.create({
        topic_id: topicMap[q.topicId],
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
        question_type: "mcq",
        marks: 1,
        is_active: true
      });
      results.questions.push(created);
    }

    // 5. Create Mock Exam
    const exam = await base44.asServiceRole.entities.MockExam.create({
      subject_id: subjectId,
      title: "Grade 7 Social Science Term 1 Exam",
      grade: "Grade 7",
      duration_minutes: 90,
      total_marks: results.questions.length,
      question_ids: results.questions.map(q => q.id),
      instructions: "Answer all questions",
      is_active: true
    });
    results.exams.push(exam);

    return Response.json({
      success: true,
      message: `Social Sciences content imported: 1 subject, ${results.topics.length} topics, ${results.notes.length} notes, ${results.questions.length} questions, 1 exam`,
      results
    });
  } catch (error) {
    console.error("Import error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});