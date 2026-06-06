import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Create or get subject
    let subjects = await base44.asServiceRole.entities.Subject.filter({ name: "Physical Education and Arts", grade: "Grade 7" });
    let subject = subjects.length > 0 ? subjects[0] : await base44.asServiceRole.entities.Subject.create({
      name: "Physical Education and Arts",
      grade: "Grade 7",
      icon: "🤸‍♀️🎨",
      description: "Physical Education and Arts for Grade 7 ZIMSEC students",
      is_active: true
    });

    const subjectId = subject.id;

    // Topics with notes
    const topicsData = [
      {
        name: "Safety and Health",
        learning_objectives: "Understand safety rules, warm-up, cool-down, healthy living habits, first aid",
        overview: "Safety rules help prevent injuries during physical activities. Learners must wear proper clothing, follow instructions and use equipment correctly. Warm-up activities prepare the body for exercise while cool-down activities help the body recover after exercise.",
        key_concepts: "Safety Rules:\n• Wear correct sports clothing\n• Check equipment before use\n• Follow teacher instructions\n• Avoid dangerous play\n• Practice sportsmanship\n\nWarm Up Activities:\n• Jogging\n• Stretching\n• Jumping jacks\n\nCool Down Activities:\n• Stretching\n• Walking\n• Deep breathing\n\nHealthy Living Habits:\n• Balanced diet\n• Exercise\n• Personal hygiene\n• Enough sleep\n\nFirst Aid (DRABC):\n• Danger\n• Response\n• Airway\n• Breathing\n• Circulation",
        important_facts: "• Prevent injuries\n• Prepare muscles\n• Improve performance\n• Reduce muscle pain\n• Improve recovery\n• Relax the body",
        exam_tips: "Explain importance of warm up and cool down."
      },
      {
        name: "Human Body",
        learning_objectives: "Identify organs and their functions in the body",
        overview: "The human body is made of organs that perform important functions. Organs transport food, air and blood.",
        key_concepts: "Examples:\n• Heart – pumps blood\n• Lungs – breathing\n• Stomach – digestion\n• Brain – control centre",
        important_facts: "• Body systems work together\n• Exercise strengthens body systems\n• Healthy living protects body organs",
        exam_tips: "Identify functions of body organs."
      },
      {
        name: "History of Arts",
        learning_objectives: "Understand arts forms and their roles in society",
        overview: "Arts include music, dance, visual arts and theatre. Arts reflect culture and history.",
        key_concepts: "Music and Dance:\n• Used in ceremonies\n• Used for communication\n• Used for entertainment\n\nVisual Arts:\n• Painting\n• Sculpture\n• Craftwork\n\nTheatre:\n• Acting\n• Drama\n• Storytelling",
        important_facts: "• Preserve culture\n• Promote identity\n• Provide careers",
        exam_tips: "State roles of arts in society."
      },
      {
        name: "Gymnastics",
        learning_objectives: "Understand gymnastics movements and their benefits",
        overview: "Gymnastics involves balance, coordination and body control. Learners perform static and dynamic balances.",
        key_concepts: "Types of Movements:\n\nBalances:\n• Static balance\n• Dynamic balance\n\nLocomotion:\n• Jumping\n• Rolling\n• Turning",
        important_facts: "• Improves flexibility\n• Improves coordination\n• Develops strength\n• Use mats\n• Warm up\n• Follow instructions",
        exam_tips: "Differentiate static and dynamic balance."
      },
      {
        name: "Sports and Game Skills",
        learning_objectives: "Develop basic sports skills and teamwork",
        overview: "Sports develop teamwork and fitness.",
        key_concepts: "Invasion Games Skills:\n• Space awareness\n• Positioning\n• Attacking\n• Defending\n\nNet Games Skills:\n• Grip\n• Strokes\n• Footwork\n\nAthletics Skills:\nRunning:\n• Sprinting\n• Endurance running\n\nJumping:\n• Long jump\n• High jump\n\nThrowing:\n• Javelin\n• Target throwing\n\nAquatic Skills:\n• Floating\n• Gliding\n• Water safety",
        important_facts: "• Skills improve through practice\n• Teamwork is important\n• Rules must be followed",
        exam_tips: "Explain importance of teamwork."
      },
      {
        name: "Creative Processes and Performance",
        learning_objectives: "Explore creative processes in arts",
        overview: "Creative processes involve making and performing art.",
        key_concepts: "Music:\n• Singing\n• Playing instruments\n• Rhythm\n\nVisual Arts:\n• Drawing\n• Painting\n• Craftwork\n\nTheatre:\n• Acting\n• Script writing\n• Improvisation",
        important_facts: "• Creativity develops expression\n• Practice improves performance\n• Arts communicate ideas",
        exam_tips: "Identify elements of music and art."
      },
      {
        name: "Aesthetic Values and Appreciation",
        learning_objectives: "Appreciate beauty in arts",
        overview: "Aesthetic appreciation means understanding beauty in arts.",
        key_concepts: "Elements of art:\n• Colour\n• Shape\n• Texture\n• Line\n\nPrinciples:\n• Balance\n• Harmony\n• Contrast\n\nAppreciation Skills:\n• Observing artwork\n• Describing artwork\n• Interpreting meaning",
        important_facts: "• Develops creativity\n• Encourages cultural pride",
        exam_tips: "Define aesthetic appreciation."
      },
      {
        name: "Physical Education and Arts Technology",
        learning_objectives: "Understand technology's role in PE and Arts",
        overview: "Technology helps improve sports and arts.",
        key_concepts: "Examples:\n• Recording performances\n• Digital drawing\n• Music software\n\nTechnology skills:\n• Using cameras\n• Using computers\n• Graphic design",
        important_facts: "• Technology improves learning\n• Digital tools support creativity\n• Internet ethics are important",
        exam_tips: "Give examples of technology used in arts."
      },
      {
        name: "Physical Education and Arts Enterprise",
        learning_objectives: "Identify career opportunities in PE and Arts",
        overview: "Enterprise involves using skills to earn income.",
        key_concepts: "Examples:\n• Selling artwork\n• Performing for money\n• Coaching sports\n\nBusiness Skills:\n• Marketing\n• Customer care\n• Teamwork\n\nValues:\n• Ubuntu\n• Honesty\n• Hard work\n\nCareer Opportunities:\n• Artist\n• Coach\n• Musician\n• Designer",
        important_facts: "• Ubuntu\n• Honesty\n• Hard work",
        exam_tips: "Explain how arts can create income."
      }
    ];

    let topicsCreated = 0;
    let notesCreated = 0;
    let questionsCreated = 0;
    const topicIds = [];

    for (let i = 0; i < topicsData.length; i++) {
      const t = topicsData[i];
      
      // Create topic
      let topics = await base44.asServiceRole.entities.Topic.filter({ subject_id: subjectId, name: t.name });
      let topic = topics.length > 0 ? topics[0] : await base44.asServiceRole.entities.Topic.create({
        subject_id: subjectId,
        name: t.name,
        order: i + 1,
        learning_objectives: t.learning_objectives,
        is_active: true
      });
      topicIds.push(topic.id);
      topicsCreated++;

      // Create note for topic
      let notes = await base44.asServiceRole.entities.Note.filter({ topic_id: topic.id });
      if (notes.length === 0) {
        await base44.asServiceRole.entities.Note.create({
          topic_id: topic.id,
          subject_id: subjectId,
          overview: t.overview || "",
          key_definitions: "",
          key_concepts: t.key_concepts || "",
          zimbabwe_examples: "",
          important_facts: t.important_facts || "",
          common_mistakes: "",
          summary: "",
          exam_tips: t.exam_tips || "",
          is_ai_generated: false
        });
        notesCreated++;
      }

      // Generate questions for this topic
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          model: "gemini_3_flash",
          prompt: `Generate 8 simple MCQ questions for Grade 7 Zimbabwe students on Physical Education and Arts.

Topic: ${t.name}
Learning Objectives: ${t.learning_objectives}

Return ONLY valid JSON. Every field must be filled:

{
  "questions": [
    {
      "question_text": "Simple question here?",
      "options_A": "Option A text",
      "options_B": "Option B text", 
      "options_C": "Option C text",
      "options_D": "Option D text",
      "correct_answer": "A",
      "explanation": "Why this answer is correct",
      "difficulty": "Easy"
    }
  ]
}

Rules:
- 8 questions minimum
- All option texts must be filled (non-empty strings)
- Simple English for 12-year-olds
- Answers spread across A, B, C, D`,
          response_json_schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    question_text: { type: "string" },
                    options_A: { type: "string" },
                    options_B: { type: "string" },
                    options_C: { type: "string" },
                    options_D: { type: "string" },
                    correct_answer: { type: "string" },
                    explanation: { type: "string" },
                    difficulty: { type: "string" }
                  },
                  required: ["question_text", "options_A", "options_B", "options_C", "options_D", "correct_answer"]
                }
              }
            }
          }
        });

        if (result.questions && Array.isArray(result.questions)) {
          for (const q of result.questions) {
            // Validate all options are filled
            if (!q.options_A || !q.options_B || !q.options_C || !q.options_D) {
              console.warn(`Skipping question for ${t.name} - missing options`);
              continue;
            }

            const options = [
              { label: "A", text: String(q.options_A).trim() },
              { label: "B", text: String(q.options_B).trim() },
              { label: "C", text: String(q.options_C).trim() },
              { label: "D", text: String(q.options_D).trim() }
            ];

            await base44.asServiceRole.entities.Question.create({
              topic_id: topic.id,
              subject_id: subjectId,
              question_text: String(q.question_text || "").trim(),
              options: options,
              correct_answer: String(q.correct_answer || "A").trim(),
              explanation: String(q.explanation || "").trim(),
              difficulty: q.difficulty || "Standard",
              question_type: "mcq",
              marks: 1,
              is_active: true
            });
            questionsCreated++;
          }
        }
      } catch (e) {
        console.error(`Error generating questions for "${t.name}":`, e.message);
      }
    }

    // Create mock exam with all questions
    if (topicIds.length > 0) {
      const allQuestions = await base44.asServiceRole.entities.Question.filter({ subject_id: subjectId });
      const questionIds = allQuestions.map(q => q.id).slice(0, 50);
      
      if (questionIds.length > 0) {
        await base44.asServiceRole.entities.MockExam.create({
          subject_id: subjectId,
          title: "Grade 7 Physical Education and Arts Mock Exam",
          grade: "Grade 7",
          duration_minutes: 90,
          total_marks: questionIds.length,
          question_ids: questionIds,
          instructions: "Answer all questions. Choose the correct answer from A to D.",
          is_active: true
        });
      }
    }

    return Response.json({
      success: true,
      message: `Physical Education and Arts imported successfully`,
      stats: {
        subject: subject.name,
        topics_created: topicsCreated,
        notes_created: notesCreated,
        questions_created: questionsCreated
      }
    });
  } catch (error) {
    console.error("Import error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});