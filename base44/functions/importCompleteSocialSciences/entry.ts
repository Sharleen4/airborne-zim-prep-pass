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

    // Get all topics and create mapping
    const allTopics = await base44.asServiceRole.entities.Topic.filter({ subject_id: subjectId });
    const topicMap = {};
    allTopics.forEach(t => {
      const nameMap = {
        "Identity": "SS7-T1",
        "National History and Governance": "SS7-T2",
        "Heritage": "SS7-T3",
        "Work and Leisure": "SS7-T4",
        "Transport and Communication": "SS7-T5",
        "Shelter": "SS7-T6",
        "Global Issues": "SS7-T7",
        "Managing and Coping with Change": "SS7-T8",
        "Social Etiquette": "SS7-T9",
        "Rights and Responsibilities": "SS7-T10",
        "Health": "SS7-T11",
        "Career Guidance and Financial Literacy": "SS7-T12",
        "Religion": "SS7-T13",
        "Social Services and Volunteerism": "SS7-T14"
      };
      const key = nameMap[t.name];
      if (key) topicMap[key] = t.id;
    });

    let notesCreated = 0, questionsCreated = 0, diagramsCreated = 0, examsCreated = 0;

    // 1. CREATE NOTES
    const notesData = [
      { topicId: "SS7-T1", title: "Marital relationships", overview: "A marital relationship is a union between a husband and wife based on love respect trust and communication." },
      { topicId: "SS7-T1", title: "Causes of family conflict", overview: "Family conflicts can be caused by poor communication money problems jealousy and substance abuse." },
      { topicId: "SS7-T1", title: "Conflict resolution", overview: "Conflicts can be solved through discussion counselling forgiveness and respect." },
      { topicId: "SS7-T1", title: "Family values", overview: "Family values include honesty respect responsibility and cooperation." },
      { topicId: "SS7-T1", title: "Family roles", overview: "Each family member has roles like providing caring and protecting." },
      { topicId: "SS7-T2", title: "Independence", overview: "Independence means a country rules itself without foreign control." },
      { topicId: "SS7-T2", title: "National symbols", overview: "National symbols include the flag coat of arms and Zimbabwe bird." },
      { topicId: "SS7-T2", title: "Government structure", overview: "Government includes executive legislature and judiciary." },
      { topicId: "SS7-T2", title: "Citizenship", overview: "Citizens must obey laws pay taxes and respect national symbols." },
      { topicId: "SS7-T2", title: "National events", overview: "National events include Independence Day and Heroes Day." },
      { topicId: "SS7-T3", title: "Heritage definition", overview: "Heritage includes traditions culture monuments and history." },
      { topicId: "SS7-T3", title: "Tangible heritage", overview: "Tangible heritage includes buildings monuments and artefacts." },
      { topicId: "SS7-T3", title: "Intangible heritage", overview: "Includes songs dances customs and beliefs." },
      { topicId: "SS7-T3", title: "Preserving heritage", overview: "Heritage is preserved through education conservation and culture teaching." },
      { topicId: "SS7-T3", title: "Indigenous knowledge", overview: "Local knowledge like herbal medicine farming and weather prediction." },
      { topicId: "SS7-T4", title: "Work definition", overview: "Work is any activity done to earn income or produce goods." },
      { topicId: "SS7-T4", title: "Leisure", overview: "Leisure is free time used for rest or recreation." },
      { topicId: "SS7-T4", title: "Human capital", overview: "Human capital refers to skills knowledge and education of people." },
      { topicId: "SS7-T4", title: "Tourism", overview: "Tourism is travel for leisure which brings income." },
      { topicId: "SS7-T4", title: "Self reliance", overview: "Self reliance means depending on your own skills." },
      { topicId: "SS7-T5", title: "Transport", overview: "Transport is movement of people and goods." },
      { topicId: "SS7-T5", title: "Communication", overview: "Communication is sending and receiving information." },
      { topicId: "SS7-T5", title: "Road safety", overview: "Road safety includes following signs and using crossings." },
      { topicId: "SS7-T5", title: "ICT", overview: "ICT means Information Communication Technology." },
      { topicId: "SS7-T5", title: "Road accidents", overview: "Accidents are caused by speeding careless driving and ignoring rules." },
      { topicId: "SS7-T6", title: "Shelter", overview: "Shelter protects people from weather and danger." },
      { topicId: "SS7-T6", title: "Types of shelter", overview: "Traditional huts modern houses and flats." },
      { topicId: "SS7-T6", title: "Settlement patterns", overview: "People settle where there is water jobs and transport." },
      { topicId: "SS7-T6", title: "Housing problems", overview: "Overcrowding homelessness and poor sanitation." },
      { topicId: "SS7-T6", title: "Housing solutions", overview: "Building more houses and proper planning." },
      { topicId: "SS7-T7", title: "Global issues", overview: "Global issues affect many countries like pollution and poverty." },
      { topicId: "SS7-T7", title: "Pollution", overview: "Pollution is contamination of air water and land." },
      { topicId: "SS7-T7", title: "Desertification", overview: "Desertification is land becoming dry and unproductive." },
      { topicId: "SS7-T7", title: "Conservation", overview: "Conservation protects environment and resources." },
      { topicId: "SS7-T7", title: "Poverty", overview: "Poverty is lack of basic needs like food and shelter." },
      { topicId: "SS7-T8", title: "Puberty", overview: "Puberty is stage where body changes from child to adult." },
      { topicId: "SS7-T8", title: "Physical changes", overview: "Includes growth voice change and body development." },
      { topicId: "SS7-T8", title: "Peer influence", overview: "Peer influence is pressure from friends." },
      { topicId: "SS7-T8", title: "Decision making", overview: "Good decisions help avoid risky behaviour." },
      { topicId: "SS7-T8", title: "Risky behaviour", overview: "Includes drugs alcohol and unsafe actions." },
      { topicId: "SS7-T9", title: "Ubuntu", overview: "Ubuntu means humanity kindness and respect." },
      { topicId: "SS7-T9", title: "Social etiquette", overview: "Social etiquette means good behaviour in society." },
      { topicId: "SS7-T9", title: "Communication skills", overview: "Includes listening speaking and body language." },
      { topicId: "SS7-T9", title: "Workplace behaviour", overview: "Includes punctuality respect and teamwork." },
      { topicId: "SS7-T9", title: "Assertiveness", overview: "Assertiveness is expressing ideas confidently without violence." },
      { topicId: "SS7-T10", title: "Child rights", overview: "Children have rights to education protection and health." },
      { topicId: "SS7-T10", title: "Responsibilities", overview: "Responsibilities include obeying rules and respecting others." },
      { topicId: "SS7-T10", title: "Gender equality", overview: "Gender equality means equal opportunities for all." },
      { topicId: "SS7-T10", title: "Consumer rights", overview: "Consumers have right to safe products and information." },
      { topicId: "SS7-T10", title: "Inheritance", overview: "Inheritance is receiving property after death." }
    ];

    for (const n of notesData) {
      const tid = topicMap[n.topicId];
      if (tid) {
        await base44.asServiceRole.entities.Note.create({
          topic_id: tid,
          subject_id: subjectId,
          overview: n.overview,
          key_definitions: "",
          key_concepts: "",
          zimbabwe_examples: "",
          important_facts: "",
          common_mistakes: "",
          summary: "",
          exam_tips: "",
          is_ai_generated: false
        });
        notesCreated++;
      }
    }

    // 2. CREATE QUESTIONS (Health, Career, Religion, Social Services)
    const questionsData = [
      // Health - SS7-T11
      { topicId: "SS7-T11", text: "Which is a communicable disease?", opts: ["Cholera", "Cancer", "Diabetes", "Asthma"], correct: "A", explain: "Cholera spreads through contaminated water", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T11", text: "Which practice prevents diseases?", opts: ["Hand washing", "Dirty water", "Poor hygiene", "Sharing cups"], correct: "A", explain: "Hygiene prevents disease", diff: "Easy", bloom: "Apply" },
      { topicId: "SS7-T11", text: "Which is non communicable disease?", opts: ["Diabetes", "Measles", "Cholera", "TB"], correct: "A", explain: "Diabetes does not spread", diff: "Medium", bloom: "Understand" },
      { topicId: "SS7-T11", text: "HIV is mainly spread through?", opts: ["Unprotected sex", "Talking", "Eating together", "Sharing desks"], correct: "A", explain: "HIV spreads through body fluids", diff: "Medium", bloom: "Understand" },
      { topicId: "SS7-T11", text: "First aid is?", opts: ["Immediate help", "Surgery", "Hospitalisation", "Xray"], correct: "A", explain: "First aid is first help given", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T11", text: "Which is healthy diet?", opts: ["Balanced diet", "Junk food", "Alcohol", "Drugs"], correct: "A", explain: "Balanced diet improves health", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T11", text: "Which improves personal hygiene?", opts: ["Bathing daily", "Wearing dirty clothes", "Avoiding water", "Not washing hands"], correct: "A", explain: "Cleanliness prevents infection", diff: "Easy", bloom: "Apply" },
      { topicId: "SS7-T11", text: "Which is STI?", opts: ["HIV", "Malaria", "Flu", "Headache"], correct: "A", explain: "HIV is sexually transmitted", diff: "Medium", bloom: "Remember" },
      { topicId: "SS7-T11", text: "Which health service treats patients?", opts: ["Hospital", "Shop", "Market", "Garage"], correct: "A", explain: "Hospitals provide treatment", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T11", text: "Which prevents HIV infection?", opts: ["Abstinence", "Sharing needles", "Unsafe sex", "Drug abuse"], correct: "A", explain: "Abstinence prevents infection", diff: "Medium", bloom: "Apply" },
      
      // Career - SS7-T12
      { topicId: "SS7-T12", text: "What is a career?", opts: ["Life profession", "Holiday", "Game", "Music"], correct: "A", explain: "Career is long term job", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T12", text: "Which affects career choice?", opts: ["Skills", "Toys", "Games", "Fear"], correct: "A", explain: "Skills determine career", diff: "Easy", bloom: "Understand" },
      { topicId: "SS7-T12", text: "Which is professional job?", opts: ["Doctor", "Baby", "Student", "Player"], correct: "A", explain: "Doctor needs training", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T12", text: "Budget means?", opts: ["Spending plan", "Shopping list", "Food list", "Money loss"], correct: "A", explain: "Budget controls spending", diff: "Medium", bloom: "Understand" },
      { topicId: "SS7-T12", text: "Which shows saving?", opts: ["Keeping money", "Spending all", "Stealing", "Wasting"], correct: "A", explain: "Saving prepares future", diff: "Easy", bloom: "Apply" },
      { topicId: "SS7-T12", text: "Entrepreneur is?", opts: ["Business starter", "Employee only", "Student", "Farmer only"], correct: "A", explain: "Entrepreneurs start businesses", diff: "Medium", bloom: "Understand" },
      { topicId: "SS7-T12", text: "Which is income?", opts: ["Money earned", "Money spent", "Money lost", "Debt"], correct: "A", explain: "Income is earnings", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T12", text: "Which study habit improves results?", opts: ["Time table", "Noise", "Skipping", "Fighting"], correct: "A", explain: "Planning improves success", diff: "Easy", bloom: "Apply" },
      { topicId: "SS7-T12", text: "Financial literacy means?", opts: ["Money management", "Singing", "Driving", "Reading only"], correct: "A", explain: "Financial literacy manages money", diff: "Medium", bloom: "Remember" },
      { topicId: "SS7-T12", text: "Which improves academic success?", opts: ["Hard work", "Laziness", "Absence", "Cheating"], correct: "A", explain: "Effort improves results", diff: "Easy", bloom: "Apply" },
      
      // Religion - SS7-T13
      { topicId: "SS7-T13", text: "Founder of Christianity?", opts: ["Jesus", "Moses", "Muhammad", "Buddha"], correct: "A", explain: "Jesus founded Christianity", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T13", text: "Islam holy book?", opts: ["Quran", "Bible", "Torah", "Dictionary"], correct: "A", explain: "Quran is Islamic text", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T13", text: "Christian worship place?", opts: ["Church", "Mosque", "Temple", "Shrine"], correct: "A", explain: "Christians worship in church", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T13", text: "Muslim worship place?", opts: ["Mosque", "Church", "Temple", "Shrine"], correct: "A", explain: "Mosque is Muslim place", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T13", text: "Religion teaches?", opts: ["Good morals", "Crime", "Violence", "Theft"], correct: "A", explain: "Religion teaches values", diff: "Easy", bloom: "Understand" },
      { topicId: "SS7-T13", text: "Which is religion?", opts: ["Christianity", "Soccer", "Dance", "Shopping"], correct: "A", explain: "Christianity is religion", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T13", text: "Religious tolerance means?", opts: ["Respect beliefs", "Fight others", "Reject others", "Ignore others"], correct: "A", explain: "Tolerance means respect", diff: "Medium", bloom: "Understand" },
      { topicId: "SS7-T13", text: "Which is sacred practice?", opts: ["Prayer", "Stealing", "Fighting", "Violence"], correct: "A", explain: "Prayer is worship", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T13", text: "Which promotes peace?", opts: ["Religion", "Violence", "Hate", "Crime"], correct: "A", explain: "Religion promotes harmony", diff: "Medium", bloom: "Understand" },
      { topicId: "SS7-T13", text: "Which is religious festival?", opts: ["Christmas", "Shopping day", "Sports day", "Market day"], correct: "A", explain: "Christmas is Christian festival", diff: "Easy", bloom: "Remember" },
      
      // Social Services - SS7-T14
      { topicId: "SS7-T14", text: "Volunteerism means?", opts: ["Helping freely", "Paid work", "Crime", "Business"], correct: "A", explain: "Volunteer work is unpaid", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T14", text: "Which organisation helps disasters?", opts: ["Red Cross", "Gangs", "Cartels", "Thieves"], correct: "A", explain: "Red Cross helps victims", diff: "Medium", bloom: "Understand" },
      { topicId: "SS7-T14", text: "Which is community service?", opts: ["Cleaning area", "Fighting", "Crime", "Noise"], correct: "A", explain: "Service improves environment", diff: "Easy", bloom: "Apply" },
      { topicId: "SS7-T14", text: "Which supports poor people?", opts: ["Donations", "Neglect", "Violence", "Abuse"], correct: "A", explain: "Donations help needy", diff: "Easy", bloom: "Understand" },
      { topicId: "SS7-T14", text: "Which is NGO?", opts: ["Red Cross", "Gang", "Cartel", "Thieves"], correct: "A", explain: "Red Cross is NGO", diff: "Medium", bloom: "Remember" },
      { topicId: "SS7-T14", text: "Which shows compassion?", opts: ["Helping sick", "Ignoring sick", "Hurting sick", "Abusing"], correct: "A", explain: "Compassion means care", diff: "Easy", bloom: "Understand" },
      { topicId: "SS7-T14", text: "Which builds community unity?", opts: ["Volunteer work", "Crime", "Violence", "Theft"], correct: "A", explain: "Volunteerism builds society", diff: "Medium", bloom: "Apply" },
      { topicId: "SS7-T14", text: "Which is social service?", opts: ["Hospital", "Gang", "Robber", "Thief"], correct: "A", explain: "Hospitals serve people", diff: "Easy", bloom: "Remember" },
      { topicId: "SS7-T14", text: "Which promotes kindness?", opts: ["Helping elderly", "Fighting", "Hate", "Crime"], correct: "A", explain: "Helping elderly shows care", diff: "Easy", bloom: "Apply" },
      { topicId: "SS7-T14", text: "Which organisation supports children?", opts: ["UNICEF", "Gangs", "Cartels", "Thieves"], correct: "A", explain: "UNICEF supports children", diff: "Medium", bloom: "Remember" }
    ];

    for (const q of questionsData) {
      const tid = topicMap[q.topicId];
      if (tid) {
        await base44.asServiceRole.entities.Question.create({
          topic_id: tid,
          subject_id: subjectId,
          question_text: q.text,
          options: q.opts.map((t, i) => ({ label: String.fromCharCode(65 + i), text: t })),
          correct_answer: q.correct,
          explanation: q.explain,
          difficulty: q.diff,
          bloom_level: q.bloom,
          question_type: "mcq",
          marks: 1,
          is_active: true
        });
        questionsCreated++;
      }
    }

    // 3. CREATE DIAGRAMS
    const diagramsData = [
      { topicId: "SS7-T1", title: "Family structure diagram", type: "illustration", file: "family_structure.png" },
      { topicId: "SS7-T1", title: "Conflict resolution process", type: "flowchart", file: "conflict_resolution.png" },
      { topicId: "SS7-T2", title: "Zimbabwe national flag", type: "image", file: "zimbabwe_flag.png" },
      { topicId: "SS7-T2", title: "Government structure diagram", type: "chart", file: "government_structure.png" },
      { topicId: "SS7-T3", title: "Great Zimbabwe monument", type: "image", file: "great_zimbabwe.png" },
      { topicId: "SS7-T3", title: "Tangible vs intangible heritage", type: "chart", file: "heritage_types.png" },
      { topicId: "SS7-T4", title: "Tourism benefits diagram", type: "concept map", file: "tourism_benefits.png" },
      { topicId: "SS7-T4", title: "Human capital diagram", type: "flowchart", file: "human_capital.png" },
      { topicId: "SS7-T5", title: "Road safety signs", type: "image", file: "road_signs.png" },
      { topicId: "SS7-T5", title: "Transport systems diagram", type: "chart", file: "transport_types.png" },
      { topicId: "SS7-T6", title: "Types of shelter", type: "image", file: "shelter_types.png" },
      { topicId: "SS7-T6", title: "Rural vs urban settlement", type: "chart", file: "settlement_types.png" },
      { topicId: "SS7-T6", title: "Housing problems diagram", type: "image", file: "housing_problems.png" },
      { topicId: "SS7-T7", title: "Pollution types diagram", type: "chart", file: "pollution_types.png" },
      { topicId: "SS7-T7", title: "Desertification process", type: "process diagram", file: "desertification.png" },
      { topicId: "SS7-T7", title: "Tree planting conservation", type: "image", file: "tree_planting.png" },
      { topicId: "SS7-T8", title: "Puberty changes diagram", type: "illustration", file: "puberty_changes.png" },
      { topicId: "SS7-T8", title: "Peer influence diagram", type: "chart", file: "peer_pressure.png" },
      { topicId: "SS7-T8", title: "Decision making steps", type: "flowchart", file: "decision_steps.png" },
      { topicId: "SS7-T9", title: "Ubuntu values diagram", type: "concept map", file: "ubuntu_values.png" },
      { topicId: "SS7-T9", title: "Communication process diagram", type: "chart", file: "communication_process.png" },
      { topicId: "SS7-T9", title: "Workplace etiquette diagram", type: "image", file: "workplace_behaviour.png" },
      { topicId: "SS7-T10", title: "Child rights diagram", type: "chart", file: "child_rights.png" },
      { topicId: "SS7-T10", title: "Gender equality diagram", type: "image", file: "gender_equality.png" },
      { topicId: "SS7-T10", title: "Consumer rights process", type: "flowchart", file: "consumer_rights.png" }
    ];

    for (const d of diagramsData) {
      const tid = topicMap[d.topicId];
      if (tid) {
        await base44.asServiceRole.entities.Diagram.create({
          topic_id: tid,
          subject_id: subjectId,
          title: d.title,
          description: d.title,
          diagram_type: d.type,
          file_name: d.file,
          keywords: d.title,
          is_active: true
        });
        diagramsCreated++;
      }
    }

    // 4. CREATE MOCK EXAMS
    const examsData = [
      { title: "Grade 7 Social Science Term 3 Mock Exam 1", duration: 90, marks: 40, instructions: "Answer all questions. Choose the correct answer from A to D." },
      { title: "Grade 7 Social Science Term 3 Mock Exam 2", duration: 90, marks: 40, instructions: "Attempt all questions. Read each question carefully." },
      { title: "Grade 7 Social Science Term 3 Final Mock Exam", duration: 120, marks: 50, instructions: "Answer all questions. Check your answers before submitting." },
      { title: "Grade 7 Health Topic Test", duration: 30, marks: 20, instructions: "Answer all questions on Health and Disease Prevention." },
      { title: "Grade 7 Career Guidance Topic Test", duration: 30, marks: 20, instructions: "Answer all questions on Career Guidance and Financial Literacy." },
      { title: "Grade 7 Religion Topic Test", duration: 30, marks: 20, instructions: "Answer all questions on Religion." },
      { title: "Grade 7 Social Services Topic Test", duration: 30, marks: 20, instructions: "Answer all questions on Social Services and Volunteerism." }
    ];

    for (const e of examsData) {
      await base44.asServiceRole.entities.MockExam.create({
        subject_id: subjectId,
        title: e.title,
        grade: "Grade 7",
        duration_minutes: e.duration,
        total_marks: e.marks,
        instructions: e.instructions,
        question_ids: [],
        is_active: true
      });
      examsCreated++;
    }

    return Response.json({
      success: true,
      message: `Complete Social Sciences import successful`,
      counts: {
        notes: notesCreated,
        questions: questionsCreated,
        diagrams: diagramsCreated,
        exams: examsCreated
      }
    });
  } catch (error) {
    console.error("Import error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});